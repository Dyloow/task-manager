<script setup lang="ts">
import { taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { PriorityFilter, StatusFilter } from '~/stores/tasks'
import { PRIORITY_FILTER_LABELS, STATUS_FILTER_LABELS } from '~/utils/task-labels'

defineProps<{
  status: StatusFilter
  priority: PriorityFilter
  counts: Record<StatusFilter, number>
}>()

const emit = defineEmits<{
  'update:status': [status: StatusFilter]
  'update:priority': [priority: PriorityFilter]
}>()

const statusOptions: StatusFilter[] = ['all', ...taskStatusSchema.options]
const priorityOptions: PriorityFilter[] = ['all', ...taskPrioritySchema.options]
</script>

<template>
  <div class="flex flex-col gap-3">
    <div role="group" aria-label="Filtrer par statut" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="option in statusOptions"
        :key="option"
        type="button"
        :aria-pressed="status === option"
        class="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        :class="
          status === option
            ? 'border-accent bg-accent text-white'
            : 'border-border-control bg-surface text-ink-soft hover:border-ink-soft hover:text-ink'
        "
        @click="emit('update:status', option)"
      >
        {{ STATUS_FILTER_LABELS[option] }}
        <span class="font-mono text-xs" :class="status === option ? 'text-white/80' : 'text-ink-soft'">{{ counts[option] }}</span>
      </button>
    </div>

    <div class="flex flex-col gap-1.5 sm:w-56">
      <label for="priority-filter" class="text-xs font-medium text-ink-soft">Priorité</label>
      <select
        id="priority-filter"
        :value="priority"
        class="rounded-control border border-border-control bg-surface px-3 py-2 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        @change="emit('update:priority', ($event.target as HTMLSelectElement).value as PriorityFilter)"
      >
        <option v-for="option in priorityOptions" :key="option" :value="option">{{ PRIORITY_FILTER_LABELS[option] }}</option>
      </select>
    </div>
  </div>
</template>
