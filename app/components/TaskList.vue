<script setup lang="ts">
import type { Task, TaskStatus } from '#shared/types/task'

defineProps<{
  tasks: Task[]
  loading: boolean
  hasAnyTask: boolean
  pendingIds: string[]
}>()

const emit = defineEmits<{
  'update:status': [id: string, status: TaskStatus]
  delete: [id: string]
  'reset-filters': []
}>()
</script>

<template>
  <div>
    <ul v-if="loading" class="flex flex-col gap-3" aria-hidden="true">
      <li v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-card border border-border bg-border/40" />
    </ul>

    <p v-else-if="!hasAnyTask" class="rounded-card border border-dashed border-border-strong p-6 text-center text-sm text-ink-soft">
      Aucune tâche pour le moment. Créez la première avec le formulaire.
    </p>

    <div
      v-else-if="tasks.length === 0"
      class="flex flex-col items-center gap-3 rounded-card border border-dashed border-border-strong p-6 text-center text-sm text-ink-soft"
    >
      <p>Aucune tâche ne correspond aux filtres actuels.</p>
      <button
        type="button"
        class="rounded-control border border-border-control px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        @click="emit('reset-filters')"
      >
        Réinitialiser les filtres
      </button>
    </div>

    <ul v-else class="flex flex-col gap-3">
      <TaskCard
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :pending="pendingIds.includes(task.id)"
        @update:status="(status) => emit('update:status', task.id, status)"
        @delete="emit('delete', task.id)"
      />
    </ul>
  </div>
</template>
