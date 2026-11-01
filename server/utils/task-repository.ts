import { createError } from 'h3'
import type { Storage } from 'unstorage'
import type { CreateTaskInput, Task, UpdateTaskInput } from '#shared/types/task'
import { taskSchema } from '../../shared/schemas/task'
import seedTasks from '../data/tasks.json'

const TASKS_KEY = 'list'

export interface TaskRepository {
  list(): Promise<Task[]>
  create(input: CreateTaskInput): Promise<Task>
  update(id: string, patch: UpdateTaskInput): Promise<Task | null>
  remove(id: string): Promise<boolean>
}

function createCorruptedDataError() {
  return createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
}

export function createTaskRepository(storage: Storage, seed: unknown): TaskRepository {
  let queue: Promise<unknown> = Promise.resolve()

  function parseTasks(value: unknown): Task[] {
    const result = taskSchema.array().safeParse(value)
    if (!result.success) {
      throw createCorruptedDataError()
    }
    return result.data
  }

  async function readTasks(): Promise<Task[]> {
    const stored = await storage.getItem<unknown>(TASKS_KEY)
    if (stored === null) {
      const seeded = parseTasks(seed)
      await storage.setItem(TASKS_KEY, seeded)
      return seeded
    }
    return parseTasks(stored)
  }

  // Both reads and writes chain on this single queue, in call order, so a read
  // never observes a write that is still in flight and writes never overlap.
  function enqueueRead<T>(read: (tasks: Task[]) => T): Promise<T> {
    const run = queue.then(async () => read(await readTasks()))
    // Keep the queue alive even if this step fails, so later operations still run.
    queue = run.catch(() => undefined)
    return run
  }

  function enqueueWrite<T>(mutate: (tasks: Task[]) => Promise<{ tasks: Task[], result: T }>): Promise<T> {
    const run = queue.then(async () => {
      const tasks = await readTasks()
      const { tasks: nextTasks, result } = await mutate(tasks)
      await storage.setItem(TASKS_KEY, nextTasks)
      return result
    })
    queue = run.catch(() => undefined)
    return run
  }

  return {
    list() {
      return enqueueRead((tasks) => tasks)
    },

    create(input) {
      return enqueueWrite(async (tasks) => {
        const now = new Date().toISOString()
        const task: Task = {
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          createdAt: now,
          updatedAt: now
        }
        return { tasks: [...tasks, task], result: task }
      })
    },

    update(id, patch) {
      return enqueueWrite(async (tasks) => {
        const index = tasks.findIndex((task) => task.id === id)
        const existing = tasks[index]
        if (!existing) {
          return { tasks, result: null }
        }
        const updated: Task = {
          ...existing,
          ...patch,
          updatedAt: new Date().toISOString()
        }
        const nextTasks = [...tasks]
        nextTasks[index] = updated
        return { tasks: nextTasks, result: updated }
      })
    },

    remove(id) {
      return enqueueWrite(async (tasks) => {
        const exists = tasks.some((task) => task.id === id)
        if (!exists) {
          return { tasks, result: false }
        }
        return { tasks: tasks.filter((task) => task.id !== id), result: true }
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
