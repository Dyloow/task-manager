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
    position: 0,
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

describe('ordering and move', () => {
  // Two columns with two ranked tasks each, so a move can change rank
  // within a column and across columns.
  const orderedSeed: Task[] = [
    {
      id: 'todo-1',
      title: 'Todo 1',
      description: '',
      status: 'todo',
      priority: 'medium',
      position: 0,
      createdAt: '2026-02-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z'
    },
    {
      id: 'todo-2',
      title: 'Todo 2',
      description: '',
      status: 'todo',
      priority: 'medium',
      position: 1,
      createdAt: '2026-02-02T00:00:00.000Z',
      updatedAt: '2026-02-02T00:00:00.000Z'
    },
    {
      id: 'prog-1',
      title: 'In progress 1',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      position: 0,
      createdAt: '2026-02-03T00:00:00.000Z',
      updatedAt: '2026-02-03T00:00:00.000Z'
    },
    {
      id: 'prog-2',
      title: 'In progress 2',
      description: '',
      status: 'in_progress',
      priority: 'medium',
      position: 1,
      createdAt: '2026-02-04T00:00:00.000Z',
      updatedAt: '2026-02-04T00:00:00.000Z'
    }
  ]

  function createOrderedRepository() {
    const storage = createStorage({ driver: memoryDriver() })
    return { storage, repository: createTaskRepository(storage, orderedSeed) }
  }

  function idsOf(tasks: Task[], status: Task['status']) {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position)
      .map((task) => task.id)
  }

  it('list() returns tasks sorted by status then position, every column 0..n-1', async () => {
    const { repository } = createOrderedRepository()

    const tasks = await repository.list()

    expect(idsOf(tasks, 'todo')).toEqual(['todo-1', 'todo-2'])
    expect(idsOf(tasks, 'in_progress')).toEqual(['prog-1', 'prog-2'])
    for (const task of tasks) {
      expect(Number.isInteger(task.position)).toBe(true)
      expect(task.position).toBeGreaterThanOrEqual(0)
    }
  })

  it('create() appends to the end of its column', async () => {
    const { repository } = createOrderedRepository()

    const created = await repository.create({ title: 'Todo 3', description: '', status: 'todo', priority: 'medium' })

    expect(created.position).toBe(2)
    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-1', 'todo-2', created.id])
  })

  it('update() with a status change appends to the target column and renumbers the source column', async () => {
    const { repository } = createOrderedRepository()

    const updated = await repository.update('todo-1', { status: 'in_progress' })

    expect(updated?.status).toBe('in_progress')
    expect(updated?.position).toBe(2)

    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-2'])
    expect(idsOf(tasks, 'in_progress')).toEqual(['prog-1', 'prog-2', 'todo-1'])
  })

  it('move() within a column before another task reorders it, ranks stay 0..n-1', async () => {
    const { repository } = createOrderedRepository()

    const result = await repository.move('todo-2', { status: 'todo', beforeId: 'todo-1' })

    expect(result.outcome).toBe('ok')
    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-2', 'todo-1'])
    expect(tasks.filter((task) => task.status === 'todo').map((task) => task.position)).toEqual([0, 1])
  })

  it('move() to another column at the end changes status and renumbers both columns', async () => {
    const { repository } = createOrderedRepository()

    const result = await repository.move('todo-1', { status: 'in_progress', beforeId: null })

    expect(result.outcome).toBe('ok')
    if (result.outcome !== 'ok') return
    expect(result.task.status).toBe('in_progress')
    expect(result.task.position).toBe(2)

    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-2'])
    expect(tasks.filter((task) => task.status === 'todo').map((task) => task.position)).toEqual([0])
    expect(idsOf(tasks, 'in_progress')).toEqual(['prog-1', 'prog-2', 'todo-1'])
  })

  it('move() to another column before a task inserts it there and renumbers both columns', async () => {
    const { repository } = createOrderedRepository()

    const result = await repository.move('todo-1', { status: 'in_progress', beforeId: 'prog-2' })

    expect(result.outcome).toBe('ok')
    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-2'])
    expect(idsOf(tasks, 'in_progress')).toEqual(['prog-1', 'todo-1', 'prog-2'])
  })

  it('move() with a beforeId from another column returns invalid-before-id, list unchanged', async () => {
    const { repository } = createOrderedRepository()
    const before = await repository.list()

    const result = await repository.move('todo-1', { status: 'todo', beforeId: 'prog-1' })

    expect(result.outcome).toBe('invalid-before-id')
    const after = await repository.list()
    expect(after).toEqual(before)
  })

  it('move() with an unknown id returns not-found', async () => {
    const { repository } = createOrderedRepository()

    const result = await repository.move('unknown-id', { status: 'todo', beforeId: null })

    expect(result.outcome).toBe('not-found')
  })

  it('remove() renumbers the remaining column', async () => {
    const { repository } = createOrderedRepository()

    await repository.remove('todo-1')

    const tasks = await repository.list()
    expect(idsOf(tasks, 'todo')).toEqual(['todo-2'])
    expect(tasks.find((task) => task.id === 'todo-2')?.position).toBe(0)
  })

  it('normalizes legacy tasks stored without a position, ranked by createdAt per status, without throwing', async () => {
    const storage = createStorage({ driver: memoryDriver() })
    const legacy = orderedSeed.map(({ position: _position, ...task }) => task)
    await storage.setItem('list', legacy)
    const repository = createTaskRepository(storage, seed)

    const tasks = await repository.list()

    expect(idsOf(tasks, 'todo')).toEqual(['todo-1', 'todo-2'])
    expect(idsOf(tasks, 'in_progress')).toEqual(['prog-1', 'prog-2'])
    for (const task of tasks) {
      expect(Number.isInteger(task.position)).toBe(true)
    }
  })

  it('10 parallel moves within a column keep ranks contiguous and every task present', async () => {
    const { repository } = createOrderedRepository()

    const moves = Array.from({ length: 10 }, (_, index) =>
      repository.move(index % 2 === 0 ? 'todo-1' : 'todo-2', { status: 'todo', beforeId: null })
    )
    const results = await Promise.all(moves)

    expect(results.every((result) => result.outcome === 'ok')).toBe(true)
    const tasks = await repository.list()
    const todoPositions = tasks.filter((task) => task.status === 'todo').map((task) => task.position).sort()
    expect(todoPositions).toEqual([0, 1])
    expect(idsOf(tasks, 'todo').sort()).toEqual(['todo-1', 'todo-2'])
  })
})
