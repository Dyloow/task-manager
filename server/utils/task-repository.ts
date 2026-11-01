import type { Storage } from 'unstorage'
import type { CreateTaskInput, Task, UpdateTaskInput } from '#shared/types/task'
import seedTasks from '../data/tasks.json'

const TASKS_KEY = 'list'

export interface TaskRepository {
  list(): Promise<Task[]>
  create(input: CreateTaskInput): Promise<Task>
  update(id: string, patch: UpdateTaskInput): Promise<Task | null>
  remove(id: string): Promise<boolean>
}

export function createTaskRepository(storage: Storage, seed: Task[]): TaskRepository {
  let queue: Promise<unknown> = Promise.resolve()

  async function readTasks(): Promise<Task[]> {
    const stored = await storage.getItem<Task[]>(TASKS_KEY)
    if (stored === null) {
      await storage.setItem(TASKS_KEY, seed)
      return seed
    }
    return stored
  }

  function enqueue<T>(mutate: (tasks: Task[]) => Promise<{ tasks: Task[], result: T }>): Promise<T> {
    const run = queue.then(async () => {
      const tasks = await readTasks()
      const { tasks: nextTasks, result } = await mutate(tasks)
      await storage.setItem(TASKS_KEY, nextTasks)
      return result
    })
    // Keep the queue alive even if this mutation fails, so later mutations still run.
    queue = run.catch(() => undefined)
    return run
  }

  return {
    list() {
      return readTasks()
    },

    create(input) {
      return enqueue(async (tasks) => {
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
      return enqueue(async (tasks) => {
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
      return enqueue(async (tasks) => {
        const exists = tasks.some((task) => task.id === id)
        if (!exists) {
          return { tasks, result: false }
        }
        return { tasks: tasks.filter((task) => task.id !== id), result: true }
      })
    }
  }
}

export function useTaskRepository(): TaskRepository {
  return createTaskRepository(useStorage('tasks'), seedTasks as Task[])
}
