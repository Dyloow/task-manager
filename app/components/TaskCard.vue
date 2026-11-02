<script setup lang="ts">
import type { Task, TaskPriority } from '#shared/types/task'
import { PRIORITY_LABELS } from '~/utils/task-labels'

defineProps<{
  task: Task
  pending: boolean
}>()

const emit = defineEmits<{
  open: []
}>()

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-danger',
  medium: 'bg-amber',
  low: 'bg-ink-faint'
}
</script>

<template>
  <li class="list-none">
    <button
      type="button"
      :aria-busy="pending"
      :disabled="pending"
      class="flex w-full cursor-grab flex-col gap-2 rounded-card border border-border p-3 text-left transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent active:cursor-grabbing disabled:cursor-wait disabled:opacity-60"
      :class="task.status === 'done' ? 'bg-canvas' : 'bg-surface'"
      @click="emit('open')"
    >
      <span class="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-soft">
        <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="PRIORITY_DOT[task.priority]" />
        {{ PRIORITY_LABELS[task.priority] }}
      </span>

      <span class="block wrap-break-word text-sm font-medium" :class="task.status === 'done' ? 'text-ink-soft line-through' : 'text-ink'">
        {{ task.title }}
      </span>
      <span v-if="task.description" class="line-clamp-2 block wrap-break-word text-xs text-ink-soft">{{ task.description }}</span>
    </button>
  </li>
</template>
