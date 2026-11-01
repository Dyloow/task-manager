<script setup lang="ts">
import type { TaskStatus } from '#shared/types/task'
import { ACTION_ERROR_MESSAGES } from '~/stores/tasks'

const store = useTasksStore()
const { status: statusFilter, priority: priorityFilter, setStatus, setPriority } = useTaskFilters()

const { pending, error, refresh } = await useAsyncData('tasks', () => store.fetchTasks())

const filterCounts = computed(() => ({
  all: store.tasks.length,
  ...store.countsByStatus
}))

function handleMove(id: string, status: TaskStatus, beforeId: string | null) {
  store.moveTask(id, status, beforeId)
}
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-4">
      <h1 class="text-xl font-semibold tracking-tight text-ink">Tâches</h1>
      <p class="font-mono text-sm text-ink-soft">
        {{ filterCounts.all }} tâche{{ filterCounts.all > 1 ? 's' : '' }} · {{ filterCounts.done }}
        {{ filterCounts.done > 1 ? 'terminées' : 'terminée' }}
      </p>
    </header>

    <!-- Mutation errors only: a load failure already has its own retry block below, so this never doubles up. -->
    <AppAlert v-if="store.error && !error" :message="store.error.message" @dismiss="store.clearError" />

    <TaskFilters
      :status="statusFilter"
      :priority="priorityFilter"
      :counts="filterCounts"
      @update:status="setStatus"
      @update:priority="setPriority"
    />

    <div
      v-if="error"
      role="alert"
      class="flex flex-col items-start gap-2 rounded-card border border-danger/25 bg-danger-soft p-4 text-sm text-danger-strong"
    >
      <p>{{ ACTION_ERROR_MESSAGES.load }}</p>
      <button
        type="button"
        class="rounded-control border border-danger/40 px-3 py-1.5 font-medium hover:bg-danger-soft/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-danger"
        @click="refresh()"
      >
        Réessayer
      </button>
    </div>

    <div v-else-if="pending" class="flex gap-4 overflow-x-auto pb-2" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="flex w-[85vw] shrink-0 flex-col gap-2 lg:w-0 lg:min-w-0 lg:flex-1">
        <div class="h-5 w-24 animate-pulse rounded bg-border/60" />
        <div class="h-24 animate-pulse rounded-card border border-border bg-border/40" />
      </div>
    </div>

    <TaskBoard
      v-else
      :tasks-by-status="store.tasksByStatus"
      :status-filter="statusFilter"
      :pending-ids="store.pendingIds"
      @move="handleMove"
    />
  </main>
</template>
