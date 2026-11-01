<script setup lang="ts">
import { taskStatusSchema } from '#shared/schemas/task'
import type { Task, TaskStatus } from '#shared/types/task'
import { PRIORITY_LABELS, STATUS_LABELS } from '~/utils/task-labels'

const props = defineProps<{
  task: Task
  pending: boolean
}>()

const emit = defineEmits<{
  'update:status': [status: TaskStatus]
  delete: []
}>()

const statusOptions = taskStatusSchema.options

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
  <li class="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4" :aria-busy="pending">
    <div class="flex items-start justify-between gap-3">
      <span class="inline-flex w-fit items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
        {{ PRIORITY_LABELS[task.priority] }}
      </span>
    </div>

    <h3 class="font-medium text-slate-900">{{ task.title }}</h3>
    <p v-if="task.description" class="line-clamp-2 text-sm text-slate-600">{{ task.description }}</p>

    <div class="mt-2 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-col gap-1">
        <label :for="`task-status-${task.id}`" class="sr-only">Statut de {{ task.title }}</label>
        <select
          :id="`task-status-${task.id}`"
          :value="task.status"
          :disabled="pending"
          class="rounded-md border border-slate-300 px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
          @change="handleStatusChange"
        >
          <option v-for="option in statusOptions" :key="option" :value="option">{{ STATUS_LABELS[option] }}</option>
        </select>
      </div>

      <button
        type="button"
        :disabled="pending"
        class="rounded-md px-3 py-1 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
        :class="
          confirmingDelete
            ? 'bg-red-600 text-white focus-visible:outline-red-600'
            : 'text-red-700 hover:bg-red-50 focus-visible:outline-red-700'
        "
        @click="handleDeleteClick"
        @blur="cancelConfirm"
      >
        {{ confirmingDelete ? 'Confirmer ?' : 'Supprimer' }}
      </button>
    </div>
  </li>
</template>
