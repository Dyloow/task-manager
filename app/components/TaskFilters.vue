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
    <div role="tablist" aria-label="Filtrer par statut" class="flex gap-2 overflow-x-auto pb-1">
      <button
        v-for="option in statusOptions"
        :key="option"
        type="button"
        role="tab"
        :aria-selected="status === option"
        class="shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        :class="
          status === option
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
        "
        @click="emit('update:status', option)"
      >
        {{ STATUS_FILTER_LABELS[option] }} ({{ counts[option] }})
      </button>
    </div>

    <div class="flex flex-col gap-1 sm:w-56">
      <label for="priority-filter" class="text-sm font-medium">Priorité</label>
      <select
        id="priority-filter"
        :value="priority"
        class="rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        @change="emit('update:priority', ($event.target as HTMLSelectElement).value as PriorityFilter)"
      >
        <option v-for="option in priorityOptions" :key="option" :value="option">{{ PRIORITY_FILTER_LABELS[option] }}</option>
      </select>
    </div>
  </div>
</template>
