<script setup lang="ts">
import { taskStatusSchema } from '#shared/schemas/task'
import type { Task, TaskPriority, TaskStatus } from '#shared/types/task'
import { PRIORITY_LABELS, STATUS_LABELS } from '~/utils/task-labels'

defineProps<{
  task: Task
  pending: boolean
}>()

const emit = defineEmits<{
  'update:status': [status: TaskStatus]
  delete: []
}>()

const statusOptions = taskStatusSchema.options

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: 'bg-danger',
  medium: 'bg-amber',
  low: 'bg-ink-faint'
}

const confirmingDelete = ref(false)
let confirmTimeout: ReturnType<typeof setTimeout> | undefined

function cancelConfirm() {
  confirmingDelete.value = false
  clearTimeout(confirmTimeout)
}

function handleDeleteClick() {
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    confirmTimeout = setTimeout(cancelConfirm, 4000)
    return
  }
  clearTimeout(confirmTimeout)
  confirmingDelete.value = false
  emit('delete')
}

function handleStatusChange(event: Event) {
  emit('update:status', (event.target as HTMLSelectElement).value as TaskStatus)
}

onBeforeUnmount(() => clearTimeout(confirmTimeout))
</script>

<template>
  <li
    class="flex flex-col gap-2 rounded-card border border-border p-4"
    :class="task.status === 'done' ? 'bg-canvas' : 'bg-surface'"
    :aria-busy="pending"
  >
    <span class="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-ink-soft">
      <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="PRIORITY_DOT[task.priority]" />
      {{ PRIORITY_LABELS[task.priority] }}
    </span>

    <h3 class="wrap-break-word font-medium" :class="task.status === 'done' ? 'text-ink-soft line-through' : 'text-ink'">
      {{ task.title }}
    </h3>
    <p v-if="task.description" class="line-clamp-2 wrap-break-word text-sm text-ink-soft">{{ task.description }}</p>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <label :for="`task-status-${task.id}`" class="text-xs font-medium text-ink-soft">Statut</label>
        <select
          :id="`task-status-${task.id}`"
          :value="task.status"
          :disabled="pending"
          :aria-label="`Statut de ${task.title}`"
          class="rounded-control border border-border-control bg-surface px-2 py-1 text-sm text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:text-ink-faint"
          @change="handleStatusChange"
        >
          <option v-for="option in statusOptions" :key="option" :value="option">{{ STATUS_LABELS[option] }}</option>
        </select>
      </div>

      <button
        type="button"
        :disabled="pending"
        class="rounded-control px-3 py-1 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          confirmingDelete
            ? 'bg-danger text-white focus-visible:outline-danger'
            : 'text-danger hover:bg-danger-soft focus-visible:outline-danger'
        "
        @click="handleDeleteClick"
        @blur="cancelConfirm"
      >
        {{ confirmingDelete ? 'Confirmer ?' : 'Supprimer' }}
      </button>
    </div>
  </li>
</template>
