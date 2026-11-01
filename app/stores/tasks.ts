import type { CreateTaskInput, MoveTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { taskStatusSchema } from '#shared/schemas/task'
import { applyMove } from '#shared/utils/task-order'
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
  delete: 'Impossible de supprimer la tâche. Elle a été restaurée.',
  move: 'Impossible de déplacer la tâche. Le tableau a été resynchronisé.',
  save: "Impossible d'enregistrer les modifications."
} as const

function toActionErrorState(apiError: ApiError, action: keyof typeof ACTION_ERROR_MESSAGES): ApiErrorState {
  return { ...apiError.toState(), message: ACTION_ERROR_MESSAGES[action] }
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

  // Set by a failed `moveTask` that found another mutation still in flight:
  // resyncing now could be overwritten by (or overwrite) that other call's
  // own write, so the resync is deferred to the moment every call settles.
  let pendingMoveResync: ApiErrorState | null = null

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

    if (pendingMoveResync && pendingIds.value.length === 0) {
      const failureState = pendingMoveResync
      pendingMoveResync = null
      void resyncAfterMoveFailure(failureState)
    }
  }

  /** Resyncs from the server, then re-applies the move's own banner message: `fetchTasks` clears `error` on success. */
  async function resyncAfterMoveFailure(failureState: ApiErrorState) {
    try {
      await fetchTasks()
    } catch {
      // `fetchTasks` already recorded its own load error; nothing more to do.
      return
    }
    error.value = failureState
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

  /**
   * Pessimistic: waits for the server so a 400 can report field errors back
   * to the modal before anything on the board changes. A status change in
   * `patch` keeps the server's column rules (append to the target column's
   * end), applied through the returned task, not computed here.
   */
  async function updateTask(id: string, patch: UpdateTaskInput) {
    markPending(id)
    try {
      const updated = await $fetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: patch })
      const index = tasks.value.findIndex((task) => task.id === id)
      if (index !== -1) tasks.value[index] = updated
      return updated
    } catch (cause) {
      const apiError = toApiError(cause)
      error.value = toActionErrorState(apiError, 'save')
      throw apiError
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
   * Reorders a task within or across columns, optimistically (the same
   * ordering rules as the server, from `shared/utils/task-order`), then
   * persists it. A failed move does not try to compute a targeted rollback:
   * a move rewrites ranks across two columns, so the only reliable recovery
   * is resynchronizing the whole board from the server, which also repairs
   * anything else that changed meanwhile.
   *
   * That resync only runs once no other mutation is in flight: another
   * pending call's own write could otherwise race a resync `GET` either way
   * (the resync overwriting that call's not-yet-applied result, or that
   * call's later write undoing the resync) — `clearPending` runs it instead,
   * the moment `pendingIds` actually reaches zero.
   */
  async function moveTask(id: string, status: TaskStatus, beforeId: string | null) {
    const result = applyMove(tasks.value, id, status, beforeId, new Date().toISOString())
    if (result.outcome !== 'ok') return

    tasks.value = result.tasks
    markPending(id)

    try {
      const body = { status, beforeId } satisfies MoveTaskInput
      await $fetch<Task>(`/api/tasks/${id}/move`, { method: 'POST', body })
    } catch (cause) {
      // The banner says the board was resynced: `resyncAfterMoveFailure` sets it once that is true.
      const failureState = toActionErrorState(toApiError(cause), 'move')
      if (pendingIds.value.length === 1) {
        // Only this call is pending (its own entry, not yet cleared): safe to resync right away.
        await resyncAfterMoveFailure(failureState)
      } else {
        pendingMoveResync = failureState
      }
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
    updateTask,
    removeTask,
    moveTask,
    setFilters,
    clearError
  }
})
