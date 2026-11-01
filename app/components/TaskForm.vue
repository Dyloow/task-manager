<script setup lang="ts">
import { z } from 'zod'
import { createTaskSchema, taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { CreateTaskInput, TaskPriority, TaskStatus } from '#shared/types/task'
import { PRIORITY_LABELS, STATUS_LABELS } from '~/utils/task-labels'

const props = defineProps<{
  pending: boolean
  serverFieldErrors?: Record<string, string[]>
  serverFormErrors?: string[]
}>()

const emit = defineEmits<{
  submit: [input: CreateTaskInput]
}>()

const priorityOptions = taskPrioritySchema.options
const statusOptions = taskStatusSchema.options

const title = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const priority = ref<TaskPriority>('medium')

// Client errors take over the display the moment they exist: they mean the
// server errors we may still be holding from a previous attempt are stale.
const clientFieldErrors = ref<Record<string, string[]>>({})
const clientFormErrors = ref<string[]>([])

const fieldErrors = computed(() =>
  Object.keys(clientFieldErrors.value).length ? clientFieldErrors.value : (props.serverFieldErrors ?? {})
)
const formErrors = computed(() => (clientFormErrors.value.length ? clientFormErrors.value : (props.serverFormErrors ?? [])))

const titleError = computed(() => fieldErrors.value.title?.[0])
const descriptionError = computed(() => fieldErrors.value.description?.[0])

function reset() {
  title.value = ''
  description.value = ''
  status.value = 'todo'
  priority.value = 'medium'
  clientFieldErrors.value = {}
  clientFormErrors.value = []
}

function handleSubmit() {
  clientFieldErrors.value = {}
  clientFormErrors.value = []

  const result = createTaskSchema.safeParse({
    title: title.value,
    description: description.value,
    status: status.value,
    priority: priority.value
  })

  if (!result.success) {
    const flattened = z.flattenError(result.error)
    clientFieldErrors.value = flattened.fieldErrors
    clientFormErrors.value = flattened.formErrors
    return
  }

  emit('submit', result.data)
}

defineExpose({ reset })
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
    <h2 class="text-base font-semibold">Nouvelle tâche</h2>

    <p v-for="message in formErrors" :key="message" role="alert" class="text-sm text-red-700">
      {{ message }}
    </p>

    <div class="flex flex-col gap-1">
      <label for="task-title" class="text-sm font-medium">Titre</label>
      <input
        id="task-title"
        v-model="title"
        type="text"
        :disabled="pending"
        :aria-invalid="!!titleError"
        :aria-describedby="titleError ? 'task-title-error' : undefined"
        class="rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
      >
      <p v-if="titleError" id="task-title-error" class="text-sm text-red-700">{{ titleError }}</p>
    </div>

    <div class="flex flex-col gap-1">
      <label for="task-description" class="text-sm font-medium">Description</label>
      <textarea
        id="task-description"
        v-model="description"
        rows="3"
        :disabled="pending"
        :aria-invalid="!!descriptionError"
        :aria-describedby="descriptionError ? 'task-description-error' : undefined"
        class="resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
      />
      <p v-if="descriptionError" id="task-description-error" class="text-sm text-red-700">{{ descriptionError }}</p>
    </div>

    <div class="flex gap-3">
      <div class="flex flex-1 flex-col gap-1">
        <label for="task-priority" class="text-sm font-medium">Priorité</label>
        <select
          id="task-priority"
          v-model="priority"
          :disabled="pending"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
        >
          <option v-for="option in priorityOptions" :key="option" :value="option">{{ PRIORITY_LABELS[option] }}</option>
        </select>
      </div>

      <div class="flex flex-1 flex-col gap-1">
        <label for="task-status" class="text-sm font-medium">Statut</label>
        <select
          id="task-status"
          v-model="status"
          :disabled="pending"
          class="rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:opacity-60"
        >
          <option v-for="option in statusOptions" :key="option" :value="option">{{ STATUS_LABELS[option] }}</option>
        </select>
      </div>
    </div>

    <button
      type="submit"
      :disabled="pending"
      class="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60"
    >
      {{ pending ? 'Ajout…' : 'Ajouter la tâche' }}
    </button>
  </form>
</template>
