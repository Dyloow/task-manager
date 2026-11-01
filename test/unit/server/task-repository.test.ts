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

function createRepositoryWithStorage() {
  const storage = createStorage({ driver: memoryDriver() })
  const repository = createTaskRepository(storage, seed)
  return { storage, repository }
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

  it('rejects a non-array stored value without overwriting it', async () => {
    const { storage, repository } = createRepositoryWithStorage()
    await storage.setItem('list', { a: 1 })

    await expect(repository.list()).rejects.toMatchObject({ statusCode: 500 })
    await expect(repository.create(validInput)).rejects.toMatchObject({ statusCode: 500 })
    expect(await storage.getItem('list')).toEqual({ a: 1 })
  })

  it('rejects a stored value that is not even an object without overwriting it', async () => {
    const { storage, repository } = createRepositoryWithStorage()
    await storage.setItem('list', 'not-an-array')

    await expect(repository.list()).rejects.toMatchObject({ statusCode: 500 })
    await expect(repository.create(validInput)).rejects.toMatchObject({ statusCode: 500 })
    expect(await storage.getItem('list')).toBe('not-an-array')
  })

  it('rejects a corrupted seed on first read without writing it', async () => {
    const storage = createStorage({ driver: memoryDriver() })
    const repository = createTaskRepository(storage, [{ not: 'a task' }])

    await expect(repository.list()).rejects.toMatchObject({ statusCode: 500 })
    expect(await storage.getItem('list')).toBeNull()
  })

  it('keeps accepting mutations after an earlier one rejects on corrupted data', async () => {
    const { storage, repository } = createRepositoryWithStorage()
    await storage.setItem('list', 'not-an-array')

    await expect(repository.create(validInput)).rejects.toMatchObject({ statusCode: 500 })

    await storage.setItem('list', seed)
    const created = await repository.create(validInput)

    const tasks = await repository.list()
    expect(tasks).toContainEqual(created)
    expect(tasks).toHaveLength(seed.length + 1)
  })

  it('serializes list() with in-flight writes', async () => {
    await repository.list()

    const [, , listResult] = await Promise.all([
      repository.create({ ...validInput, title: 'First' }),
      repository.create({ ...validInput, title: 'Second' }),
      repository.list()
    ])

    // The queue runs in call order, so the list sees both creates.
    expect(listResult).toHaveLength(seed.length + 2)
    expect(listResult.map((task) => task.title)).toEqual(
      expect.arrayContaining(['First', 'Second'])
    )
  })
})
