import { describe, expect, it } from 'vitest'
import { applyMove, assignColumnPositions, columnOf, replaceColumn } from '../../../shared/utils/task-order'
import type { Task } from '../../../shared/types/task'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('columnOf', () => {
  it('returns only the tasks of that status, ranked by position', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'todo', position: 1 }),
      makeTask({ id: 'b', status: 'in_progress', position: 0 }),
      makeTask({ id: 'c', status: 'todo', position: 0 })
    ]

    expect(columnOf(tasks, 'todo').map((task) => task.id)).toEqual(['c', 'a'])
    expect(columnOf(tasks, 'done')).toEqual([])
  })
})

describe('assignColumnPositions', () => {
  it('renumbers the given order to 0..n-1', () => {
    const column = [makeTask({ id: 'a', position: 5 }), makeTask({ id: 'b', position: 9 })]

    const result = assignColumnPositions(column)

    expect(result.map((task) => task.position)).toEqual([0, 1])
    expect(result.map((task) => task.id)).toEqual(['a', 'b'])
  })
})

describe('replaceColumn', () => {
  it('swaps one status column, leaving every other task untouched', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'todo' }),
      makeTask({ id: 'b', status: 'in_progress' })
    ]
    const newTodoColumn = [makeTask({ id: 'c', status: 'todo' })]

    const result = replaceColumn(tasks, 'todo', newTodoColumn)

    expect(result.map((task) => task.id)).toEqual(['b', 'c'])
  })
})

describe('applyMove', () => {
  const todo1 = makeTask({ id: 'todo-1', status: 'todo', position: 0 })
  const todo2 = makeTask({ id: 'todo-2', status: 'todo', position: 1 })
  const prog1 = makeTask({ id: 'prog-1', status: 'in_progress', position: 0 })

  it('returns not-found for an unknown id', () => {
    const result = applyMove([todo1, todo2], 'unknown', 'todo', null, '2026-02-01T00:00:00.000Z')

    expect(result).toEqual({ outcome: 'not-found' })
  })

  it('returns invalid-before-id when beforeId is not in the target column', () => {
    const result = applyMove([todo1, todo2, prog1], 'todo-1', 'todo', 'prog-1', '2026-02-01T00:00:00.000Z')

    expect(result).toEqual({ outcome: 'invalid-before-id' })
  })

  it('reorders within a column, ranks staying 0..n-1', () => {
    const result = applyMove([todo1, todo2], 'todo-2', 'todo', 'todo-1', '2026-02-01T00:00:00.000Z')

    expect(result.outcome).toBe('ok')
    if (result.outcome !== 'ok') return
    expect(columnOf(result.tasks, 'todo').map((task) => task.id)).toEqual(['todo-2', 'todo-1'])
    expect(columnOf(result.tasks, 'todo').map((task) => task.position)).toEqual([0, 1])
    expect(result.task.id).toBe('todo-2')
  })

  it('moves to another column at the end (beforeId: null), renumbering both columns', () => {
    const result = applyMove([todo1, todo2, prog1], 'todo-1', 'in_progress', null, '2026-02-01T00:00:00.000Z')

    expect(result.outcome).toBe('ok')
    if (result.outcome !== 'ok') return
    expect(columnOf(result.tasks, 'todo').map((task) => task.id)).toEqual(['todo-2'])
    expect(columnOf(result.tasks, 'todo').map((task) => task.position)).toEqual([0])
    expect(columnOf(result.tasks, 'in_progress').map((task) => task.id)).toEqual(['prog-1', 'todo-1'])
    expect(result.task).toMatchObject({ id: 'todo-1', status: 'in_progress', position: 1, updatedAt: '2026-02-01T00:00:00.000Z' })
  })

  it('moves to another column before a task, inserting it there', () => {
    const prog2 = makeTask({ id: 'prog-2', status: 'in_progress', position: 1 })
    const result = applyMove([todo1, prog1, prog2], 'todo-1', 'in_progress', 'prog-2', '2026-02-01T00:00:00.000Z')

    expect(result.outcome).toBe('ok')
    if (result.outcome !== 'ok') return
    expect(columnOf(result.tasks, 'in_progress').map((task) => task.id)).toEqual(['prog-1', 'todo-1', 'prog-2'])
  })

  it('is pure: never mutates the input array or its tasks', () => {
    const tasks = [makeTask({ id: 'todo-1', status: 'todo', position: 0 }), makeTask({ id: 'todo-2', status: 'todo', position: 1 })]
    const snapshot = JSON.parse(JSON.stringify(tasks))

    applyMove(tasks, 'todo-2', 'todo', 'todo-1', '2026-02-01T00:00:00.000Z')

    expect(tasks).toEqual(snapshot)
  })
})
