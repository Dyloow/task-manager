import { createError } from 'h3'
import { z } from 'zod'
import type { Storage } from 'unstorage'
import type { CreateTaskInput, MoveTaskInput, Task, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { taskSchema, taskStatusSchema } from '../../shared/schemas/task'
import seedTasks from '../data/tasks.json'

const TASKS_KEY = 'list'

// Data written before `position` existed still loads: accept it missing on
// read, `normalizePositions` always fills it in before any task leaves this file.
const storedTaskSchema = taskSchema.extend({ position: taskSchema.shape.position.optional() })
type StoredTask = z.infer<typeof storedTaskSchema>

const STATUS_ORDER = taskStatusSchema.options

export type MoveResult =
  | { outcome: 'ok', task: Task }
  | { outcome: 'not-found' }
  | { outcome: 'invalid-before-id' }

export interface TaskRepository {
  list(): Promise<Task[]>
  create(input: CreateTaskInput): Promise<Task>
  update(id: string, patch: UpdateTaskInput): Promise<Task | null>
  remove(id: string): Promise<boolean>
  move(id: string, input: MoveTaskInput): Promise<MoveResult>
}

function createCorruptedDataError() {
  return createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
}

/** Tasks of one status, ranked by current `position` ascending. */
function columnOf(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position)
}

/** Renumbers a column, already in the order it should keep, to contiguous `0..n-1`. */
function assignColumnPositions(column: Task[]): Task[] {
  return column.map((task, index) => ({ ...task, position: index }))
}

function replaceColumn(tasks: Task[], status: TaskStatus, column: Task[]): Task[] {
  return [...tasks.filter((task) => task.status !== status), ...column]
}

/**
 * Fills in any missing `position`: a column where every task already has one
 * keeps it (just compacted to `0..n-1`); a column with any legacy task
 * (missing `position`) is instead ranked by `createdAt` ascending.
 */
function normalizePositions(tasks: StoredTask[]): Task[] {
  const byStatus = new Map<TaskStatus, StoredTask[]>()
  for (const task of tasks) {
    const column = byStatus.get(task.status) ?? []
    column.push(task)
    byStatus.set(task.status, column)
  }

  const normalized: Task[] = []
  for (const column of byStatus.values()) {
    const ordered = column.every((task) => task.position !== undefined)
      ? [...column].sort((a, b) => a.position! - b.position!)
      : [...column].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    ordered.forEach((task, index) => normalized.push({ ...task, position: index }))
  }
  return normalized
}

/** Final API order: by status column (`todo`, `in_progress`, `done`), then rank within it. */
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const statusDiff = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
    return statusDiff !== 0 ? statusDiff : a.position - b.position
  })
}

export function createTaskRepository(storage: Storage, seed: unknown): TaskRepository {
  let queue: Promise<unknown> = Promise.resolve()

  function parseStoredTasks(value: unknown): StoredTask[] {
    const result = storedTaskSchema.array().safeParse(value)
    if (!result.success) {
      // Keep the details in the server log, never in the response.
      console.error(`[tasks] stored data is invalid:\n${z.prettifyError(result.error)}`)
      throw createCorruptedDataError()
    }
    return result.data
  }

  async function readTasks(): Promise<Task[]> {
    const stored = await storage.getItem<unknown>(TASKS_KEY)
    if (stored === null) {
      const seeded = normalizePositions(parseStoredTasks(seed))
      await storage.setItem(TASKS_KEY, seeded)
      return seeded
    }
    return normalizePositions(parseStoredTasks(stored))
  }

  // Reads and writes chain on this single queue, in call order, so a read
  // never observes a write that is still in flight and writes never overlap.
  function enqueue<T>(step: (tasks: Task[]) => Promise<T> | T): Promise<T> {
    const run = queue.then(async () => step(await readTasks()))
    // Keep the queue alive even if this step fails, so later operations still run.
    queue = run.catch(() => undefined)
    return run
  }

  function enqueueWrite<T>(mutate: (tasks: Task[]) => { tasks: Task[], result: T }): Promise<T> {
    return enqueue(async (tasks) => {
      const { tasks: nextTasks, result } = mutate(tasks)
      await storage.setItem(TASKS_KEY, nextTasks)
      return result
    })
  }

  return {
    list() {
      return enqueue((tasks) => sortTasks(tasks))
    },

    create(input) {
      return enqueueWrite((tasks) => {
        const now = new Date().toISOString()
        const task: Task = {
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          position: columnOf(tasks, input.status).length,
          createdAt: now,
          updatedAt: now
        }
        return { tasks: [...tasks, task], result: task }
      })
    },

    update(id, patch) {
      return enqueueWrite((tasks) => {
        const existing = tasks.find((task) => task.id === id)
        if (!existing) {
          return { tasks, result: null }
        }

        const now = new Date().toISOString()
        const statusChanged = patch.status !== undefined && patch.status !== existing.status

        if (!statusChanged) {
          const updated: Task = { ...existing, ...patch, updatedAt: now }
          return { tasks: tasks.map((task) => (task.id === id ? updated : task)), result: updated }
        }

        // A status change always appends to the end of the target column: it
        // has no `beforeId` to place it more precisely, unlike `move`.
        const targetStatus = patch.status!
        const withoutExisting = tasks.filter((task) => task.id !== id)
        const sourceColumn = assignColumnPositions(columnOf(withoutExisting, existing.status))
        const targetColumnBefore = columnOf(withoutExisting, targetStatus)
        const updated: Task = { ...existing, ...patch, position: targetColumnBefore.length, updatedAt: now }

        let nextTasks = withoutExisting.filter(
          (task) => task.status !== existing.status && task.status !== targetStatus
        )
        nextTasks = [...nextTasks, ...sourceColumn, ...targetColumnBefore, updated]

        return { tasks: nextTasks, result: updated }
      })
    },

    remove(id) {
      return enqueueWrite((tasks) => {
        const existing = tasks.find((task) => task.id === id)
        if (!existing) {
          return { tasks, result: false }
        }
        const withoutExisting = tasks.filter((task) => task.id !== id)
        const compacted = assignColumnPositions(columnOf(withoutExisting, existing.status))
        return { tasks: replaceColumn(withoutExisting, existing.status, compacted), result: true }
      })
    },

    move(id, input) {
      return enqueueWrite<MoveResult>((tasks) => {
        const existing = tasks.find((task) => task.id === id)
        if (!existing) {
          return { tasks, result: { outcome: 'not-found' } }
        }

        const { status: targetStatus, beforeId } = input
        const sourceStatus = existing.status
        const withoutExisting = tasks.filter((task) => task.id !== id)
        const targetColumnBefore = columnOf(withoutExisting, targetStatus)

        if (beforeId !== null && !targetColumnBefore.some((task) => task.id === beforeId)) {
          return { tasks, result: { outcome: 'invalid-before-id' } }
        }

        const now = new Date().toISOString()
        // `position` is a placeholder here: `assignColumnPositions` below renumbers the whole column.
        const moved: Task = { ...existing, status: targetStatus, updatedAt: now, position: 0 }
        const insertIndex = beforeId === null ? targetColumnBefore.length : targetColumnBefore.findIndex((task) => task.id === beforeId)
        const targetColumn = assignColumnPositions([
          ...targetColumnBefore.slice(0, insertIndex),
          moved,
          ...targetColumnBefore.slice(insertIndex)
        ])

        let nextTasks: Task[]
        if (sourceStatus === targetStatus) {
          nextTasks = replaceColumn(withoutExisting, targetStatus, targetColumn)
        } else {
          const sourceColumn = assignColumnPositions(columnOf(withoutExisting, sourceStatus))
          const rest = withoutExisting.filter((task) => task.status !== sourceStatus && task.status !== targetStatus)
          nextTasks = [...rest, ...sourceColumn, ...targetColumn]
        }

        const movedTask = targetColumn.find((task) => task.id === id)!
        return { tasks: nextTasks, result: { outcome: 'ok', task: movedTask } }
      })
    }
  }
}

// One repository per server process: its write queue only serializes
// concurrent requests if every request shares the same instance.
let repository: TaskRepository | undefined

export function useTaskRepository(): TaskRepository {
  return (repository ??= createTaskRepository(useStorage('tasks'), seedTasks))
}
