<script setup lang="ts">
import type { CreateTaskInput, Task, TaskStatus, UpdateTaskInput } from '#shared/types/task'
import type { ApiErrorState } from '~/utils/api-error'
import { ACTION_ERROR_MESSAGES } from '~/stores/tasks'

const store = useTasksStore()
const { status: statusFilter, priority: priorityFilter, setStatus, setPriority, resetFilters } = useTaskFilters()

const { pending, error, refresh } = await useAsyncData('tasks', () => store.fetchTasks())

const modalRef = ref<{
  openCreate: (status?: TaskStatus) => void
  openEdit: (task: Task) => void
  close: () => void
} | null>(null)
const boardRef = ref<{ focusColumnAddButton: (status: TaskStatus) => void } | null>(null)
const isSubmitting = ref(false)
const modalError = ref<ApiErrorState | null>(null)
const isCreatedTaskHidden = ref(false)

const filterCounts = computed(() => ({
  all: store.tasks.length,
  ...store.countsByStatus
}))

// The notice is only valid for the filters it was raised under: any change
// (including the notice's own "Tout afficher" action) clears it.
watch([statusFilter, priorityFilter], () => {
  isCreatedTaskHidden.value = false
})

function handleMove(id: string, status: TaskStatus, beforeId: string | null) {
  store.moveTask(id, status, beforeId)
}

function handleOpenCreate(status: TaskStatus = 'todo') {
  modalError.value = null
  modalRef.value?.openCreate(status)
}

function handleOpenTask(id: string) {
  const task = store.tasks.find((task) => task.id === id)
  if (!task) return
  modalError.value = null
  modalRef.value?.openEdit(task)
}

function handleModalClosed() {
  modalError.value = null
}

async function handleCreate(input: CreateTaskInput) {
  modalError.value = null
  isSubmitting.value = true
  try {
    const task = await store.createTask(input)
    const matchesStatus = statusFilter.value === 'all' || task.status === statusFilter.value
    const matchesPriority = priorityFilter.value === 'all' || task.priority === priorityFilter.value
    isCreatedTaskHidden.value = !(matchesStatus && matchesPriority)
    modalRef.value?.close()
  } catch {
    // The store action already recorded this failure as `store.error`, with
    // a French message and, on a 400, the field/form details: reuse all of
    // it here rather than the page's own banner, hidden behind the modal's
    // backdrop while it is open.
    modalError.value = store.error
    store.clearError()
  } finally {
    isSubmitting.value = false
  }
}

async function handleSave(id: string, patch: UpdateTaskInput) {
  modalError.value = null
  isSubmitting.value = true
  try {
    const updated = await store.updateTask(id, patch)
    modalRef.value?.close()
    if (patch.status) {
      // The card just left this column for another one: the dialog's native
      // focus-return would target a now-unmounted trigger, so send focus to
      // where the task landed instead.
      nextTick(() => boardRef.value?.focusColumnAddButton(updated.status))
    }
  } catch {
    modalError.value = store.error
    store.clearError()
  } finally {
    isSubmitting.value = false
  }
}

function handleDelete(id: string) {
  const deletedStatus = store.tasks.find((task) => task.id === id)?.status
  modalRef.value?.close()
  store.removeTask(id)
  if (deletedStatus) {
    // The card (and the dialog's focus-return target) is gone: land focus
    // on its column instead of letting it fall back to <body>.
    nextTick(() => boardRef.value?.focusColumnAddButton(deletedStatus))
  }
}
</script>

<template>
  <main class="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <header class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border pb-4">
      <h1 class="text-xl font-semibold tracking-tight text-ink">Tâches</h1>
      <div class="flex items-center gap-4">
        <p class="font-mono text-sm text-ink-soft">
          {{ filterCounts.all }} tâche{{ filterCounts.all > 1 ? 's' : '' }} · {{ filterCounts.done }}
          {{ filterCounts.done > 1 ? 'terminées' : 'terminée' }}
        </p>
        <button
          type="button"
          class="shrink-0 rounded-control bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          @click="handleOpenCreate()"
        >
          + Nouvelle tâche
        </button>
      </div>
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

    <TaskHiddenNotice v-if="isCreatedTaskHidden" @show-all="resetFilters" />

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
      ref="boardRef"
      :tasks-by-status="store.tasksByStatus"
      :status-filter="statusFilter"
      :pending-ids="store.pendingIds"
      @move="handleMove"
      @create-in-column="handleOpenCreate"
      @open="handleOpenTask"
    />

    <TaskModal
      ref="modalRef"
      :pending="isSubmitting"
      :error-message="modalError?.message"
      :server-field-errors="modalError?.fieldErrors"
      :server-form-errors="modalError?.formErrors"
      @create="handleCreate"
      @save="handleSave"
      @delete="handleDelete"
      @closed="handleModalClosed"
    />
  </main>
</template>
