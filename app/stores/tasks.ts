import type { CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { toApiError, type ApiErrorState } from '~/utils/api-error'

export type StatusFilter = TaskStatus | 'all'
export type PriorityFilter = TaskPriority | 'all'

export interface TaskFilters {
  status: StatusFilter
  priority: PriorityFilter
}

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref<Task[]>([])
  const filters = reactive<TaskFilters>({ status: 'all', priority: 'all' })
  const pendingIds = ref<string[]>([])
  // A plain object, not the `ApiError` class: the SSR payload (devalue) cannot serialize a class instance.
  const error = ref<ApiErrorState | null>(null)

  const visibleTasks = computed(() =>
    tasks.value
      .filter((task) => filters.status === 'all' || task.status === filters.status)
      .filter((task) => filters.priority === 'all' || task.priority === filters.priority)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  )

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
      error.value = apiError.toState()
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
      error.value = apiError.toState()
      throw apiError
    }
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index === -1) return

    const previous = tasks.value[index]!
    const optimistic: Task = { ...previous, status }
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
      error.value = toApiError(cause).toState()
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
        error.value = apiError.toState()
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
    visibleTasks,
    countsByStatus,
    isPending,
    fetchTasks,
    createTask,
    updateStatus,
    removeTask,
    setFilters,
    clearError
  }
})
