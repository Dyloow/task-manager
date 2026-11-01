<script setup lang="ts">
import type { CreateTaskInput, TaskStatus } from '#shared/types/task'
import { ApiError, type ApiErrorState } from '~/utils/api-error'
import { STATUS_LABELS } from '~/utils/task-labels'

const store = useTasksStore()
const { status: statusFilter, priority: priorityFilter, setStatus, setPriority } = useTaskFilters()

const { pending, error, refresh } = await useAsyncData('tasks', () => store.fetchTasks())

const isFormOpen = ref(false)
const isCreating = ref(false)
const createFormError = ref<ApiErrorState | null>(null)
const taskFormRef = ref<{ reset: () => void } | null>(null)

const filterCounts = computed(() => ({
  all: store.tasks.length,
  ...store.countsByStatus
}))

async function handleCreate(input: CreateTaskInput) {
  createFormError.value = null
  isCreating.value = true
  try {
    await store.createTask(input)
    taskFormRef.value?.reset()
    isFormOpen.value = false
  } catch (cause) {
    // A 400 is a validation issue the form already reports inline: showing
    // it again in the banner would duplicate the same message.
    if (cause instanceof ApiError && cause.statusCode === 400) {
      createFormError.value = cause.toState()
      store.clearError()
    }
  } finally {
    isCreating.value = false
  }
}

function handleStatusChange(id: string, status: TaskStatus) {
  store.updateStatus(id, status)
}

function handleDelete(id: string) {
  store.removeTask(id)
}

function resetFilters() {
  setStatus('all')
  setPriority('all')
}
</script>

<template>
  <main class="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6">
    <header class="flex flex-wrap items-baseline justify-between gap-2">
      <h1 class="text-2xl font-semibold text-slate-900">Tâches</h1>
      <p class="text-sm text-slate-600">
        {{ filterCounts.all }} tâche{{ filterCounts.all > 1 ? 's' : '' }} · {{ filterCounts.done }}
        {{ STATUS_LABELS.done.toLowerCase() }}{{ filterCounts.done > 1 ? 's' : '' }}
      </p>
    </header>

    <AppAlert v-if="store.error" :message="store.error.message" @dismiss="store.clearError" />

    <button
      type="button"
      class="rounded-md border border-slate-300 px-4 py-2 text-left text-sm font-medium text-slate-700 lg:hidden"
      @click="isFormOpen = !isFormOpen"
    >
      {{ isFormOpen ? 'Fermer le formulaire' : '+ Nouvelle tâche' }}
    </button>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section
        :class="isFormOpen ? 'block' : 'hidden'"
        class="rounded-lg border border-slate-200 bg-white p-4 lg:sticky lg:top-6 lg:block lg:w-72 lg:shrink-0"
      >
        <TaskForm
          ref="taskFormRef"
          :pending="isCreating"
          :server-field-errors="createFormError?.fieldErrors"
          :server-form-errors="createFormError?.formErrors"
          @submit="handleCreate"
        />
      </section>

      <section class="flex min-w-0 flex-1 flex-col gap-4">
        <TaskFilters
          :status="statusFilter"
          :priority="priorityFilter"
          :counts="filterCounts"
          @update:status="setStatus"
          @update:priority="setPriority"
        />

        <div v-if="error" role="alert" class="flex flex-col items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{{ error.message }}</p>
          <button
            type="button"
            class="rounded-md border border-red-300 px-3 py-1.5 font-medium hover:bg-red-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            @click="refresh()"
          >
            Réessayer
          </button>
        </div>

        <TaskList
          v-else
          :tasks="store.visibleTasks"
          :loading="pending"
          :has-any-task="store.tasks.length > 0"
          :pending-ids="store.pendingIds"
          @update:status="handleStatusChange"
          @delete="handleDelete"
          @reset-filters="resetFilters"
        />
      </section>
    </div>
  </main>
</template>
