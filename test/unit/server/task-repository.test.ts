import { createStorage } from 'unstorage'
import memoryDriver from 'unstorage/drivers/memory'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTaskRepository, type TaskRepository } from '../../../server/utils/task-repository'
import type { CreateTaskInput, Task } from '../../../shared/types/task'

const seed: Task[] = [
  {
    id: 'seed-1',
    title: 'Seeded task',
    description: '',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
]

const validInput: CreateTaskInput = {
  title: 'New task',
  description: '',
  status: 'todo',
  priority: 'medium'
}

function createRepository(): TaskRepository {
  const storage = createStorage({ driver: memoryDriver() })
  return createTaskRepository(storage, seed)
}

describe('createTaskRepository', () => {
  let repository: TaskRepository

  beforeEach(() => {
    repository = createRepository()
  })

  it('returns and persists the seed on first read', async () => {
    const tasks = await repository.list()

    expect(tasks).toEqual(seed)
  })

  it('creates a task with a generated id and timestamps', async () => {
    const task = await repository.create(validInput)

    expect(task.id).toBeTruthy()
    expect(task.title).toBe('New task')
    expect(task.createdAt).toBe(task.updatedAt)

    const tasks = await repository.list()
    expect(tasks).toHaveLength(seed.length + 1)
    expect(tasks).toContainEqual(task)
  })

  it('updates a task and refreshes updatedAt', async () => {
    const created = await repository.create(validInput)
    await new Promise((resolve) => setTimeout(resolve, 2))

    const updated = await repository.update(created.id, { status: 'done' })

    expect(updated).not.toBeNull()
    expect(updated?.status).toBe('done')
    expect(updated?.createdAt).toBe(created.createdAt)
    expect(updated?.updatedAt).not.toBe(created.createdAt)
  })

  it('removes an existing task', async () => {
    const created = await repository.create(validInput)

    const removed = await repository.remove(created.id)

    expect(removed).toBe(true)
    const tasks = await repository.list()
    expect(tasks.find((task) => task.id === created.id)).toBeUndefined()
  })

  it('returns null when updating an unknown id, list unchanged', async () => {
    const before = await repository.list()

    const result = await repository.update('unknown-id', { status: 'done' })

    expect(result).toBeNull()
    const after = await repository.list()
    expect(after).toEqual(before)
  })

  it('returns false when removing an unknown id, list unchanged', async () => {
    const before = await repository.list()

    const result = await repository.remove('unknown-id')

    expect(result).toBe(false)
    const after = await repository.list()
    expect(after).toEqual(before)
  })

  it('persists exactly 20 more tasks after 20 parallel creates', async () => {
    await repository.list()

    await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        repository.create({ ...validInput, title: `Parallel task ${index}` })
      )
    )

    const tasks = await repository.list()
    expect(tasks).toHaveLength(seed.length + 20)

    const ids = new Set(tasks.map((task) => task.id))
    expect(ids.size).toBe(tasks.length)
  })
})
