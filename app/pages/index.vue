<script setup lang="ts">
import { z } from 'zod'
import { taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { PriorityFilter, StatusFilter } from '~/stores/tasks'

const statusFilterSchema = z.union([taskStatusSchema, z.literal('all')])
const priorityFilterSchema = z.union([taskPrioritySchema, z.literal('all')])

const statusOptions: StatusFilter[] = ['all', ...taskStatusSchema.options]
const priorityOptions: PriorityFilter[] = ['all', ...taskPrioritySchema.options]

function parseFilter<T extends string>(value: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : ('all' as T)
}

function queryValue(filter: string): string | undefined {
  return filter === 'all' ? undefined : filter
}

function formatLabel(value: string) {
  return value.replace('_', ' ')
}

const route = useRoute()
const router = useRouter()
const store = useTasksStore()

// Seed the store filters from the URL before the first fetch so a shared,
// filtered link renders the same list on first paint.
const initialStatus = parseFilter(route.query.status, statusFilterSchema)
const initialPriority = parseFilter(route.query.priority, priorityFilterSchema)
store.setFilters({ status: initialStatus, priority: initialPriority })

// An invalid query value (e.g. `?status=foo`) silently fell back to 'all':
// drop it from the URL so it doesn't keep claiming a filter that isn't applied.
if (queryValue(initialStatus) !== route.query.status || queryValue(initialPriority) !== route.query.priority) {
  router.replace({
    query: { ...route.query, status: queryValue(initialStatus), priority: queryValue(initialPriority) }
  })
}

const { pending, error, refresh } = await useAsyncData('tasks', () => store.fetchTasks())

const statusFilter = computed<StatusFilter>({
  get: () => store.filters.status,
  set: (value) => store.setFilters({ status: value })
})

const priorityFilter = computed<PriorityFilter>({
  get: () => store.filters.priority,
  set: (value) => store.setFilters({ priority: value })
})

// Keep the URL and the store filters in sync both ways: picking a filter
// updates the query, and navigating (back/forward, a shared link) updates
// the filters. The flag stops the two watchers from bouncing off each other.
let syncingFromRoute = false

watch([statusFilter, priorityFilter], ([status, priority]) => {
  if (syncingFromRoute) return
  router.replace({ query: { ...route.query, status: queryValue(status), priority: queryValue(priority) } })
})

watch(
  () => route.query,
  (query) => {
    syncingFromRoute = true
    store.setFilters({
      status: parseFilter(query.status, statusFilterSchema),
      priority: parseFilter(query.priority, priorityFilterSchema)
    })
    nextTick(() => {
      syncingFromRoute = false
    })
  }
)
</script>

<template>
  <main class="min-h-screen bg-slate-50 p-6 text-slate-900">
    <h1 class="text-2xl font-semibold">Task Manager</h1>

    <form class="mt-4 flex gap-4" @submit.prevent>
      <label class="flex flex-col gap-1">
        <span>Status</span>
        <select v-model="statusFilter">
          <option v-for="option in statusOptions" :key="option" :value="option">{{ formatLabel(option) }}</option>
        </select>
      </label>
      <label class="flex flex-col gap-1">
        <span>Priority</span>
        <select v-model="priorityFilter">
          <option v-for="option in priorityOptions" :key="option" :value="option">{{ formatLabel(option) }}</option>
        </select>
      </label>
    </form>

    <p v-if="pending" class="mt-4">Loading tasks…</p>

    <div v-else-if="error" role="alert" class="mt-4">
      <p>{{ error.message }}</p>
      <button type="button" @click="refresh()">Retry</button>
    </div>

    <p v-else-if="store.visibleTasks.length === 0" class="mt-4">No tasks match the current filters.</p>

    <ul v-else class="mt-4 flex flex-col gap-2">
      <li v-for="task in store.visibleTasks" :key="task.id" class="rounded border border-slate-200 p-3">
        <h2 class="font-medium">{{ task.title }}</h2>
        <p>Status: {{ formatLabel(task.status) }}</p>
        <p>Priority: {{ task.priority }}</p>
      </li>
    </ul>
  </main>
</template>
