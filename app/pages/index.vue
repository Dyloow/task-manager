<script setup lang="ts">
import { z } from 'zod'
import { taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { PriorityFilter, StatusFilter } from '~/stores/tasks'

const statusFilterSchema = z.union([taskStatusSchema, z.literal('all')])
const priorityFilterSchema = z.union([taskPrioritySchema, z.literal('all')])

const statusOptions: StatusFilter[] = ['all', 'todo', 'in_progress', 'done']
const priorityOptions: PriorityFilter[] = ['all', 'low', 'medium', 'high']

function parseFilter<T extends string>(value: unknown, schema: z.ZodType<T>): T {
  const result = schema.safeParse(value)
  return result.success ? result.data : ('all' as T)
}

function formatLabel(value: string) {
  return value.replace('_', ' ')
}

const route = useRoute()
const router = useRouter()
const store = useTasksStore()

// Seed the store filters from the URL before the first fetch so a shared,
// filtered link renders the same list on first paint.
store.setFilters({
  status: parseFilter(route.query.status, statusFilterSchema),
  priority: parseFilter(route.query.priority, priorityFilterSchema)
})

const { pending, error, refresh } = await useAsyncData('tasks', () => store.fetchTasks())

const statusFilter = computed<StatusFilter>({
  get: () => store.filters.status,
  set: (value) => store.setFilters({ status: value })
})

const priorityFilter = computed<PriorityFilter>({
  get: () => store.filters.priority,
  set: (value) => store.setFilters({ priority: value })
})

// Keep the URL in sync so a filtered view stays shareable and reloadable.
watch([statusFilter, priorityFilter], ([status, priority]) => {
  router.replace({
    query: {
      ...route.query,
      status: status === 'all' ? undefined : status,
      priority: priority === 'all' ? undefined : priority
    }
  })
})
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
      <p>Could not load tasks.</p>
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
