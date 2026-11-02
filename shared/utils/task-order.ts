import type { Task, TaskStatus } from '#shared/types/task'

/**
 * The per-column ordering rules: both the server (the source of truth, in
 * `server/utils/task-repository.ts`) and the client (the store's optimistic
 * update, in `app/stores/tasks.ts`) compute a move the same way, through
 * these functions, so the two can never drift apart.
 */

/** Tasks of one status, ranked by current `position` ascending. */
export function columnOf(tasks: Task[], status: TaskStatus): Task[] {
  return tasks.filter((task) => task.status === status).sort((a, b) => a.position - b.position)
}

/** Renumbers a column, already in the order it should keep, to contiguous `0..n-1`. */
export function assignColumnPositions(column: Task[]): Task[] {
  return column.map((task, index) => ({ ...task, position: index }))
}

/** Replaces one status column in `tasks` with `column`, keeping every other task untouched. */
export function replaceColumn(tasks: Task[], status: TaskStatus, column: Task[]): Task[] {
  return [...tasks.filter((task) => task.status !== status), ...column]
}

export type MoveOutcome =
  | { outcome: 'ok', tasks: Task[], task: Task }
  | { outcome: 'not-found' }
  | { outcome: 'invalid-before-id' }

/**
 * Computes the result of moving `id` to `status`, inserted right before
 * `beforeId` (`null` = end of the column). Pure: never mutates `tasks`,
 * returns a new array on success.
 *
 * `beforeId` is looked up in the target column's full order (every task of
 * that status), not a client-visible subset: a priority filter hiding cards
 * must not shift what a drop between two visible cards means.
 *
 * `updatedAt` is passed in rather than read from `Date.now()` here, so this
 * stays pure and deterministic to test.
 */
export function applyMove(tasks: Task[], id: string, status: TaskStatus, beforeId: string | null, updatedAt: string): MoveOutcome {
  const existing = tasks.find((task) => task.id === id)
  if (!existing) {
    return { outcome: 'not-found' }
  }

  const sourceStatus = existing.status
  const withoutExisting = tasks.filter((task) => task.id !== id)
  const targetColumnBefore = columnOf(withoutExisting, status)

  if (beforeId !== null && !targetColumnBefore.some((task) => task.id === beforeId)) {
    return { outcome: 'invalid-before-id' }
  }

  // `position` is a placeholder here: `assignColumnPositions` below renumbers the whole column.
  const moved: Task = { ...existing, status, updatedAt, position: 0 }
  const insertIndex = beforeId === null ? targetColumnBefore.length : targetColumnBefore.findIndex((task) => task.id === beforeId)
  const targetColumn = assignColumnPositions([
    ...targetColumnBefore.slice(0, insertIndex),
    moved,
    ...targetColumnBefore.slice(insertIndex)
  ])

  let nextTasks: Task[]
  if (sourceStatus === status) {
    nextTasks = replaceColumn(withoutExisting, status, targetColumn)
  } else {
    const sourceColumn = assignColumnPositions(columnOf(withoutExisting, sourceStatus))
    const rest = withoutExisting.filter((task) => task.status !== sourceStatus && task.status !== status)
    nextTasks = [...rest, ...sourceColumn, ...targetColumn]
  }

  const movedTask = targetColumn.find((task) => task.id === id)!
  return { outcome: 'ok', tasks: nextTasks, task: movedTask }
}
