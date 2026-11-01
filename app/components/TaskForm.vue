<script setup lang="ts">
import { z } from 'zod'
import { createTaskSchema, taskPrioritySchema, taskStatusSchema } from '#shared/schemas/task'
import type { CreateTaskInput, Task, TaskPriority, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import { PRIORITY_LABELS, STATUS_LABELS } from '~/utils/task-labels'

const props = defineProps<{
  pending: boolean
  serverFieldErrors?: Record<string, string[]>
  serverFormErrors?: string[]
}>()

const emit = defineEmits<{
  create: [input: CreateTaskInput]
  save: [patch: UpdateTaskInput]
}>()

const priorityOptions = taskPrioritySchema.options
const statusOptions = taskStatusSchema.options

const title = ref('')
const description = ref('')
const status = ref<TaskStatus>('todo')
const priority = ref<TaskPriority>('medium')

// 'create': submit emits the full input. 'edit': submit diffs against
// `originalTask` and emits only the fields that changed, so the server
// receives a minimal patch. Set by the parent modal through `resetForCreate`/
// `loadForEdit`, not by a prop: the form is one persistent instance reused
// across every open, imperatively repopulated each time (native `<dialog>`
// stays mounted; only `showModal()`/`close()` toggle its visibility).
const mode = ref<'create' | 'edit'>('create')
const originalTask = ref<Task | null>(null)

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

const submitLabel = computed(() => {
  if (mode.value === 'create') return props.pending ? 'Ajout…' : 'Ajouter la tâche'
  return props.pending ? 'Enregistrement…' : 'Enregistrer'
})

// Placeholder stays `ink-soft` (not `ink-faint`, which fails 4.5:1 on white)
// and adds `italic` so it reads as an example, not as text the user typed.
const fieldClass =
  'rounded-control border border-border-control bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-soft placeholder:italic focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:text-ink-faint'

function clearErrors() {
  clientFieldErrors.value = {}
  clientFormErrors.value = []
}

function resetForCreate(defaultStatus: TaskStatus = 'todo') {
  mode.value = 'create'
  originalTask.value = null
  title.value = ''
  description.value = ''
  status.value = defaultStatus
  priority.value = 'medium'
  clearErrors()
}

function loadForEdit(task: Task) {
  mode.value = 'edit'
  originalTask.value = task
  title.value = task.title
  description.value = task.description
  status.value = task.status
  priority.value = task.priority
  clearErrors()
}

function handleSubmit() {
  clearErrors()

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

  if (mode.value === 'create') {
    emit('create', result.data)
    return
  }

  const original = originalTask.value
  const patch: UpdateTaskInput = {}
  if (!original || result.data.title !== original.title) patch.title = result.data.title
  if (!original || result.data.description !== original.description) patch.description = result.data.description
  if (!original || result.data.status !== original.status) patch.status = result.data.status
  if (!original || result.data.priority !== original.priority) patch.priority = result.data.priority

  emit('save', patch)
}

defineExpose({ resetForCreate, loadForEdit })
</script>

<template>
  <form class="flex flex-col gap-4" novalidate @submit.prevent="handleSubmit">
    <p v-for="message in formErrors" :key="message" role="alert" class="text-sm text-danger">
      {{ message }}
    </p>

    <div class="flex flex-col gap-1.5">
      <label for="task-title" class="text-xs font-medium text-ink-soft">Titre</label>
      <input
        id="task-title"
        v-model="title"
        type="text"
        placeholder="Préparer la démo"
        :disabled="pending"
        :aria-invalid="!!titleError"
        :aria-describedby="titleError ? 'task-title-error' : undefined"
        :class="fieldClass"
      >
      <p v-if="titleError" id="task-title-error" class="text-sm text-danger">{{ titleError }}</p>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="task-description" class="text-xs font-medium text-ink-soft">Description</label>
      <textarea
        id="task-description"
        v-model="description"
        rows="3"
        placeholder="Détails utiles pour la réaliser"
        :disabled="pending"
        :aria-invalid="!!descriptionError"
        :aria-describedby="descriptionError ? 'task-description-error' : undefined"
        class="resize-none"
        :class="fieldClass"
      />
      <p v-if="descriptionError" id="task-description-error" class="text-sm text-danger">{{ descriptionError }}</p>
    </div>

    <div class="flex gap-3">
      <div class="flex flex-1 flex-col gap-1.5">
        <label for="task-priority" class="text-xs font-medium text-ink-soft">Priorité</label>
        <select id="task-priority" v-model="priority" :disabled="pending" :class="fieldClass">
          <option v-for="option in priorityOptions" :key="option" :value="option">{{ PRIORITY_LABELS[option] }}</option>
        </select>
      </div>

      <div class="flex flex-1 flex-col gap-1.5">
        <label for="task-status" class="text-xs font-medium text-ink-soft">Statut</label>
        <select id="task-status" v-model="status" :disabled="pending" :class="fieldClass">
          <option v-for="option in statusOptions" :key="option" :value="option">{{ STATUS_LABELS[option] }}</option>
        </select>
      </div>
    </div>

    <button
      type="submit"
      :disabled="pending"
      class="w-full rounded-control bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:bg-ink-faint"
    >
      {{ submitLabel }}
    </button>
  </form>
</template>
