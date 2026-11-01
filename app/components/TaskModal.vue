<script setup lang="ts">
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '#shared/types/task'

const props = defineProps<{
  pending: boolean
  errorMessage?: string | null
  serverFieldErrors?: Record<string, string[]>
  serverFormErrors?: string[]
}>()

const emit = defineEmits<{
  create: [input: CreateTaskInput]
  save: [id: string, patch: UpdateTaskInput]
  delete: [id: string]
  closed: []
}>()

const TITLE_ID = 'task-modal-title'

const dialogRef = ref<HTMLDialogElement | null>(null)
const formRef = ref<{ resetForCreate: (status?: TaskStatus) => void, loadForEdit: (task: Task) => void } | null>(null)
const mode = ref<'create' | 'edit'>('create')
const editingTask = ref<Task | null>(null)
const confirmingDelete = ref(false)
let confirmTimeout: ReturnType<typeof setTimeout> | undefined

function cancelDeleteConfirm() {
  confirmingDelete.value = false
  clearTimeout(confirmTimeout)
}

// A 400 already shows field/form errors inline in the form: a generic
// banner on top would just repeat it. Anything else (network, 500...) has no
// field to attach to, so this is the only place it can surface while the
// modal hides the page banner behind its backdrop.
const hasDetailedError = computed(
  () => Object.keys(props.serverFieldErrors ?? {}).length > 0 || (props.serverFormErrors ?? []).length > 0
)
const showGenericError = computed(() => Boolean(props.errorMessage) && !hasDetailedError.value)

function openCreate(status: TaskStatus = 'todo') {
  mode.value = 'create'
  editingTask.value = null
  cancelDeleteConfirm()
  formRef.value?.resetForCreate(status)
  dialogRef.value?.showModal()
}

function openEdit(task: Task) {
  mode.value = 'edit'
  editingTask.value = task
  cancelDeleteConfirm()
  formRef.value?.loadForEdit(task)
  dialogRef.value?.showModal()
}

function close() {
  // `<dialog>` restores focus to the element that triggered `showModal()` on
  // `close()`; the `close` event below keeps the rest of our state in sync.
  dialogRef.value?.close()
}

// The backdrop is the `<dialog>` element itself; a press on its content
// targets a descendant. Both ends of the click must hit the backdrop, so a
// text selection that ends outside the form does not close the modal.
let pressStartedOnBackdrop = false

function handleBackdropMousedown(event: MouseEvent) {
  pressStartedOnBackdrop = event.target === dialogRef.value
}

function handleBackdropClick(event: MouseEvent) {
  if (pressStartedOnBackdrop && event.target === dialogRef.value) {
    close()
  }
  pressStartedOnBackdrop = false
}

function handleDialogClosed() {
  cancelDeleteConfirm()
  emit('closed')
}

function handleCreate(input: CreateTaskInput) {
  emit('create', input)
}

function handleSave(patch: UpdateTaskInput) {
  if (!editingTask.value) return
  // Nothing actually changed: closing is the only outcome, an empty patch
  // would otherwise fail the server's "at least one field" validation.
  if (Object.keys(patch).length === 0) {
    close()
    return
  }
  emit('save', editingTask.value.id, patch)
}

function handleDeleteClick() {
  if (!editingTask.value) return
  if (!confirmingDelete.value) {
    confirmingDelete.value = true
    confirmTimeout = setTimeout(cancelDeleteConfirm, 4000)
    return
  }
  clearTimeout(confirmTimeout)
  confirmingDelete.value = false
  emit('delete', editingTask.value.id)
}

onBeforeUnmount(() => clearTimeout(confirmTimeout))

defineExpose({ openCreate, openEdit, close })
</script>

<template>
  <dialog
    ref="dialogRef"
    :aria-labelledby="TITLE_ID"
    class="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card border border-border bg-surface p-0 text-ink backdrop:bg-ink/50"
    @close="handleDialogClosed"
    @cancel="cancelDeleteConfirm"
    @mousedown="handleBackdropMousedown"
    @click="handleBackdropClick"
  >
    <div class="flex flex-col gap-4 p-5">
      <div class="flex items-center justify-between gap-3">
        <h2 :id="TITLE_ID" class="text-sm font-semibold tracking-tight text-ink">
          {{ mode === 'create' ? 'Nouvelle tâche' : 'Modifier la tâche' }}
        </h2>
        <button
          type="button"
          aria-label="Fermer"
          class="shrink-0 rounded-control px-1 text-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          @click="close"
        >
          &times;
        </button>
      </div>

      <p v-if="showGenericError" role="alert" class="text-sm text-danger">{{ errorMessage }}</p>

      <TaskForm
        ref="formRef"
        :pending="pending"
        :server-field-errors="serverFieldErrors"
        :server-form-errors="serverFormErrors"
        @create="handleCreate"
        @save="handleSave"
      />

      <div v-if="mode === 'edit'" class="flex justify-end border-t border-border pt-3">
        <button
          type="button"
          :disabled="pending"
          class="rounded-control px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
          :class="
            confirmingDelete
              ? 'bg-danger text-white focus-visible:outline-danger'
              : 'text-danger hover:bg-danger-soft focus-visible:outline-danger'
          "
          @click="handleDeleteClick"
          @blur="cancelDeleteConfirm"
        >
          {{ confirmingDelete ? 'Confirmer ?' : 'Supprimer' }}
        </button>
      </div>
    </div>
  </dialog>
</template>
