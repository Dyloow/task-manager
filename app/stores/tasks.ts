import type { CreateTaskInput, MoveTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { taskStatusSchema } from '#shared/schemas/task'
import { toApiError, type ApiError, type ApiErrorState } from '~/utils/api-error'

export type StatusFilter = TaskStatus | 'all'
export type PriorityFilter = TaskPriority | 'all'

export interface TaskFilters {
  status: StatusFilter
  priority: PriorityFilter
}

const STATUSES = taskStatusSchema.options

// The banner shows one French sentence per action, named by what the user
// tried to do and what happened to their change, not the server's own
// (English, HTTP-flavoured) message. `statusCode`/`fieldErrors`/`formErrors`
// are still kept, for the create form and for callers that need them.
export const ACTION_ERROR_MESSAGES = {
  load: 'Impossible de charger les tâches.',
  create: 'Impossible de créer la tâche.',
  update: 'Impossible de mettre à jour la tâche. Modification annulée.',
  delete: 'Impossible de supprimer la tâche. Elle a été restaurée.',
  move: 'Impossible de déplacer la tâche. Le tableau a été resynchronisé.'
} as const

function toActionErrorState(apiError: ApiError, action: keyof typeof ACTION_ERROR_MESSAGES): ApiErrorState {
  return { ...apiError.toState(), message: ACTION_ERROR_MESSAGES[action] }
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
 * Mirrors the server's `move` ordering rules locally, for the optimistic
 * update: `null` when `id` is unknown or `beforeId` is not in the target
 * column (the move is then left to the server call, which will 404/400).
 */
function applyMove(tasks: Task[], id: string, status: TaskStatus, beforeId: string | null): Task[] | null {
  const existing = tasks.find((task) => task.id === id)
  if (!existing) return null

  const withoutExisting = tasks.filter((task) => task.id !== id)
  const targetColumnBefore = columnOf(withoutExisting, status)
  if (beforeId !== null && !targetColumnBefore.some((task) => task.id === beforeId)) return null

  const moved: Task = { ...existing, status, position: 0 }
  const insertIndex = beforeId === null ? targetColumnBefore.length : targetColumnBefore.findIndex((task) => task.id === beforeId)
  const targetColumn = assignColumnPositions([
    ...targetColumnBefore.slice(0, insertIndex),
    moved,
    ...targetColumnBefore.slice(insertIndex)
  ])

  if (existing.status === status) {
    return replaceColumn(withoutExisting, status, targetColumn)
  }

  const sourceColumn = assignColumnPositions(columnOf(withoutExisting, existing.status))
  const rest = withoutExisting.filter((task) => task.status !== existing.status && task.status !== status)
  return [...rest, ...sourceColumn, ...targetColumn]
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const filters = reactive<TaskFilters>({ status: 'all', priority: 'all' })
  const pendingIds = ref<string[]>([])
  // A plain object, not the `ApiError` class: the SSR payload (devalue) cannot serialize a class instance.
  const error = ref<ApiErrorState | null>(null)

  // One column per status, priority filter applied, ranked by position. The
  // status filter is not applied here: it selects which column(s) the board
  // renders, it does not remove tasks from the columns that do render.
  const tasksByStatus = computed<Record<TaskStatus, Task[]>>(() => {
    const result: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] }
    for (const task of tasks.value) {
      if (filters.priority !== 'all' && task.priority !== filters.priority) continue
      result[task.status].push(task)
    }
    for (const status of STATUSES) {
      result[status].sort((a, b) => a.position - b.position)
    }
    return result
  })

  const countsByStatus = computed<Record<TaskStatus, number>>(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, in_progress: 0, done: 0 }
    for (const task of tasks.value) {
      counts[task.status]++
    }
    return counts
  })

  function isPending(id: string) {
    return pendingIds.value.includes(id)
  }

  // One array entry per in-flight call on that id, so a concurrent mutation on the same task doesn't clear it early.
  function markPending(id: string) {
    pendingIds.value = [...pendingIds.value, id]
  }

  function clearPending(id: string) {
    const index = pendingIds.value.indexOf(id)
    if (index === -1) return
    pendingIds.value = [...pendingIds.value.slice(0, index), ...pendingIds.value.slice(index + 1)]
  }

  async function fetchTasks() {
    try {
      tasks.value = await $fetch<Task[]>('/api/tasks')
      error.value = null
      return tasks.value
    } catch (cause) {
      const apiError = toApiError(cause)
      error.value = toActionErrorState(apiError, 'load')
      throw apiError
    }
  }

  async function createTask(input: CreateTaskInput) {
    try {
      const task = await $fetch<Task>('/api/tasks', { method: 'POST', body: input })
      tasks.value = [...tasks.value, task]
      return task
    } catch (cause) {
      const apiError = toApiError(cause)
      error.value = toActionErrorState(apiError, 'create')
      throw apiError
    }
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index === -1) return

    const previous = tasks.value[index]!
    // Mirrors the server: a status change (with no beforeId to place it more
    // precisely) appends to the end of the target column.
    const targetColumnLength = tasks.value.filter((task) => task.status === status && task.id !== id).length
    const optimistic: Task = { ...previous, status, position: targetColumnLength }
    tasks.value[index] = optimistic
    markPending(id)

    try {
      const body = { status } satisfies UpdateTaskInput
      const updated = await $fetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body })
      const currentIndex = tasks.value.findIndex((task) => task.id === id)
      if (currentIndex !== -1) tasks.value[currentIndex] = updated
    } catch (cause) {
      const currentIndex = tasks.value.findIndex((task) => task.id === id)
      // Only roll back if this task still holds the object WE wrote: a
      // concurrent call on the same id may have already replaced it with a
      // newer (possibly successful) state, which must not be clobbered.
      // `toRaw` is required: reading a reactive array element returns a
      // fresh proxy wrapping `optimistic`, never `optimistic` itself.
      if (currentIndex !== -1 && toRaw(tasks.value[currentIndex]) === optimistic) {
        tasks.value[currentIndex] = previous
      }
      error.value = toActionErrorState(toApiError(cause), 'update')
    } finally {
      clearPending(id)
    }
  }

  async function removeTask(id: string) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index === -1) return

    const removed = tasks.value[index]!
    tasks.value = tasks.value.filter((task) => task.id !== id)
    markPending(id)

    try {
      await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch (cause) {
      const apiError = toApiError(cause)
      if (apiError.statusCode !== 404) {
        // Reinsert only the task we removed, at its original (bounded) index:
        // other mutations may have changed the rest of the list meanwhile.
        const insertAt = Math.min(index, tasks.value.length)
        tasks.value = [...tasks.value.slice(0, insertAt), removed, ...tasks.value.slice(insertAt)]
        error.value = toActionErrorState(apiError, 'delete')
      }
    } finally {
      clearPending(id)
    }
  }

  /**
   * Reorders a task within or across columns, optimistically (mirroring the
   * server's ranking rules), then persists it. A failed move does not try to
   * compute a targeted rollback: a move rewrites ranks across two columns, so
   * the only reliable recovery is resynchronizing the whole board from the
   * server, which also repairs anything else that changed meanwhile.
   */
  async function moveTask(id: string, status: TaskStatus, beforeId: string | null) {
    const optimistic = applyMove(tasks.value, id, status, beforeId)
    if (!optimistic) return

    tasks.value = optimistic
    markPending(id)

    try {
      const body = { status, beforeId } satisfies MoveTaskInput
      await $fetch<Task>(`/api/tasks/${id}/move`, { method: 'POST', body })
    } catch (cause) {
      const apiError = toApiError(cause)
      try {
        await fetchTasks()
      } catch {
        // `fetchTasks` already recorded its own load error; nothing more to do.
      }
      // `fetchTasks`, on success, clears `error`: set the move's own message after it.
      error.value = toActionErrorState(apiError, 'move')
    } finally {
      clearPending(id)
    }
  }

  function setFilters(patch: Partial<TaskFilters>) {
    Object.assign(filters, patch)
  }

  function clearError() {
    error.value = null
  }

  return {
    tasks,
    filters,
    pendingIds,
    error,
    tasksByStatus,
    countsByStatus,
    isPending,
    fetchTasks,
    createTask,
    updateStatus,
    removeTask,
    moveTask,
    setFilters,
    clearError
  }
})
