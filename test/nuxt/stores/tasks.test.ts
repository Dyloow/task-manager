import { createError } from 'h3'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Task } from '#shared/types/task'
import { useTasksStore } from '~/stores/tasks'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Task 1',
    description: '',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('useTasksStore', () => {
  it('starts empty', () => {
    const store = useTasksStore()

    expect(store.tasks).toEqual([])
    expect(store.visibleTasks).toEqual([])
    expect(store.filters).toEqual({ status: 'all', priority: 'all' })
    expect(store.error).toBeNull()
  })

  it('fetchTasks fills the list from GET /api/tasks', async () => {
    const seeded = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })]
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => seeded })

    const store = useTasksStore()
    const result = await store.fetchTasks()

    expect(store.tasks).toEqual(seeded)
    expect(result).toEqual(seeded)
  })

  it('createTask appends the task returned by the server', async () => {
    const created = makeTask({ id: 'task-new', title: 'New task' })
    mockEndpoint('/api/tasks', {
      method: 'POST',
      handler: () => created
    })

    const store = useTasksStore()
    const task = await store.createTask({ title: 'New task', description: '', status: 'todo', priority: 'medium' })

    expect(task).toEqual(created)
    expect(store.tasks).toEqual([created])
  })

  it('createTask with a 400 response leaves the list unchanged and returns an ApiError with fieldErrors', async () => {
    mockEndpoint('/api/tasks', {
      method: 'POST',
      handler: () => {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid request body',
          data: { issues: { formErrors: [], fieldErrors: { title: ['Title is required'] } } }
        })
      }
    })

    const store = useTasksStore()

    await expect(store.createTask({ title: '', description: '', status: 'todo', priority: 'medium' })).rejects.toMatchObject({
      statusCode: 400,
      fieldErrors: { title: ['Title is required'] }
    })
    expect(store.tasks).toEqual([])
    expect(store.error?.fieldErrors.title).toEqual(['Title is required'])
  })

  it('updateStatus changes the status immediately and keeps it after a 200', async () => {
    const original = makeTask({ id: 'task-1', status: 'todo' })
    const updated = { ...original, status: 'done' as const, updatedAt: '2026-01-02T00:00:00.000Z' }
    let resolveServer!: (task: Task) => void
    mockEndpoint('/api/tasks/task-1', {
      method: 'PATCH',
      handler: () => new Promise<Task>((resolve) => { resolveServer = resolve })
    })

    const store = useTasksStore()
    store.tasks = [original]

    const pending = store.updateStatus('task-1', 'done')
    expect(store.tasks[0]!.status).toBe('done')
    expect(store.isPending('task-1')).toBe(true)

    resolveServer(updated)
    await pending

    expect(store.tasks[0]).toEqual(updated)
    expect(store.isPending('task-1')).toBe(false)
    expect(store.error).toBeNull()
  })

  it('updateStatus restores the previous status and exposes the error on a 500', async () => {
    const original = makeTask({ id: 'task-1', status: 'todo' })
    mockEndpoint('/api/tasks/task-1', {
      method: 'PATCH',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const store = useTasksStore()
    store.tasks = [original]

    await store.updateStatus('task-1', 'done')

    expect(store.tasks).toEqual([original])
    expect(store.error?.statusCode).toBe(500)
    expect(store.isPending('task-1')).toBe(false)
  })

  it('removeTask removes the task immediately and keeps it gone after a 204', async () => {
    const task = makeTask({ id: 'task-1' })
    mockEndpoint('/api/tasks/task-1', { method: 'DELETE', handler: () => null })

    const store = useTasksStore()
    store.tasks = [task]

    const pending = store.removeTask('task-1')
    expect(store.tasks).toEqual([])

    await pending

    expect(store.tasks).toEqual([])
    expect(store.error).toBeNull()
  })

  it('removeTask restores the task at its original position on a 500', async () => {
    const first = makeTask({ id: 'task-1' })
    const second = makeTask({ id: 'task-2' })
    const third = makeTask({ id: 'task-3' })
    mockEndpoint('/api/tasks/task-2', {
      method: 'DELETE',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const store = useTasksStore()
    store.tasks = [first, second, third]

    await store.removeTask('task-2')

    expect(store.tasks).toEqual([first, second, third])
    expect(store.error?.statusCode).toBe(500)
  })

  it('removeTask on an already-deleted task (404) stays removed, with no error', async () => {
    const task = makeTask({ id: 'task-1' })
    mockEndpoint('/api/tasks/task-1', {
      method: 'DELETE',
      handler: () => {
        throw createError({ statusCode: 404, statusMessage: 'Task not found' })
      }
    })

    const store = useTasksStore()
    store.tasks = [task]

    await store.removeTask('task-1')

    expect(store.tasks).toEqual([])
    expect(store.error).toBeNull()
  })

  it('filters narrow visibleTasks while countsByStatus covers every task', () => {
    const todoOld = makeTask({ id: 'task-1', status: 'todo', priority: 'high', createdAt: '2026-01-01T00:00:00.000Z' })
    const inProgress = makeTask({ id: 'task-2', status: 'in_progress', priority: 'low', createdAt: '2026-01-02T00:00:00.000Z' })
    const done = makeTask({ id: 'task-3', status: 'done', priority: 'high', createdAt: '2026-01-03T00:00:00.000Z' })
    const todoNew = makeTask({ id: 'task-4', status: 'todo', priority: 'low', createdAt: '2026-01-04T00:00:00.000Z' })

    const store = useTasksStore()
    store.tasks = [todoOld, inProgress, done, todoNew]

    expect(store.visibleTasks.map((task) => task.id)).toEqual(['task-4', 'task-3', 'task-2', 'task-1'])

    store.setFilters({ status: 'todo' })
    expect(store.visibleTasks.map((task) => task.id)).toEqual(['task-4', 'task-1'])

    store.setFilters({ priority: 'high' })
    expect(store.visibleTasks.map((task) => task.id)).toEqual(['task-1'])

    expect(store.countsByStatus).toEqual({ todo: 2, in_progress: 1, done: 1 })
  })
})
