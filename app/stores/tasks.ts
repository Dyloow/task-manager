import type { CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { toApiError, type ApiError } from '~/utils/api-error'

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
  const error = ref<ApiError | null>(null)

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

  function markPending(id: string) {
    pendingIds.value = [...pendingIds.value, id]
  }

  function clearPending(id: string) {
    pendingIds.value = pendingIds.value.filter((pendingId) => pendingId !== id)
  }

  async function fetchTasks() {
    try {
      tasks.value = await $fetch<Task[]>('/api/tasks')
      return tasks.value
    } catch (cause) {
      const apiError = toApiError(cause)
      error.value = apiError
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
      error.value = apiError
      throw apiError
    }
  }

  async function updateStatus(id: string, status: TaskStatus) {
    const index = tasks.value.findIndex((task) => task.id === id)
    if (index === -1) return

    const previous = tasks.value[index]!
    tasks.value[index] = { ...previous, status }
    markPending(id)

    try {
      const body = { status } satisfies UpdateTaskInput
      const updated = await $fetch<Task>(`/api/tasks/${id}`, { method: 'PATCH', body })
      const currentIndex = tasks.value.findIndex((task) => task.id === id)
      if (currentIndex !== -1) tasks.value[currentIndex] = updated
    } catch (cause) {
      const currentIndex = tasks.value.findIndex((task) => task.id === id)
      if (currentIndex !== -1) tasks.value[currentIndex] = previous
      error.value = toApiError(cause)
    } finally {
      clearPending(id)
    }
  }

  async function removeTask(id: string) {
    const snapshot = tasks.value
    if (!snapshot.some((task) => task.id === id)) return

    tasks.value = snapshot.filter((task) => task.id !== id)
    markPending(id)

    try {
      await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    } catch (cause) {
      const apiError = toApiError(cause)
      if (apiError.statusCode === 404) {
        // Already gone server-side: the optimistic removal already matches reality.
      } else {
        tasks.value = snapshot
        error.value = apiError
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
