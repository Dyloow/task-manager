<script setup lang="ts">
import type { CreateTaskInput, TaskStatus } from '#shared/types/task'
import { ApiError, type ApiErrorState } from '~/utils/api-error'
import { ACTION_ERROR_MESSAGES } from '~/stores/tasks'

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
  <main class="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
    <header class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-4">
      <h1 class="text-xl font-semibold tracking-tight text-ink">Tâches</h1>
      <p class="font-mono text-sm text-ink-soft">
        {{ filterCounts.all }} tâche{{ filterCounts.all > 1 ? 's' : '' }} · {{ filterCounts.done }}
        {{ filterCounts.done > 1 ? 'terminées' : 'terminée' }}
      </p>
    </header>

    <!-- Mutation errors only: a load failure already has its own retry block below, so this never doubles up. -->
    <AppAlert v-if="store.error && !error" :message="store.error.message" @dismiss="store.clearError" />

    <button
      type="button"
      class="flex items-center justify-between rounded-control border border-border-control bg-surface px-4 py-2.5 text-sm font-medium text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent lg:hidden"
      :aria-expanded="isFormOpen"
      @click="isFormOpen = !isFormOpen"
    >
      {{ isFormOpen ? 'Fermer le formulaire' : '+ Nouvelle tâche' }}
    </button>

    <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
      <section
        :class="isFormOpen ? 'block' : 'hidden'"
        class="rounded-card border border-border bg-surface p-4 lg:sticky lg:top-8 lg:block lg:w-72 lg:shrink-0"
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
