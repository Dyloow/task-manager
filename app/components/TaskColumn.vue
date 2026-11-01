<script setup lang="ts">
import { VueDraggable, type DraggableEvent } from 'vue-draggable-plus'
import type { Task, TaskStatus } from '#shared/types/task'
import { STATUS_FILTER_LABELS } from '~/utils/task-labels'

const props = defineProps<{
  status: TaskStatus
  tasks: Task[]
  pendingIds: string[]
}>()

const emit = defineEmits<{
  move: [id: string, beforeId: string | null]
  create: []
  open: [id: string]
}>()

// Shared by every column instance: SortableJS links lists into one
// drag-and-drop group by matching this name, which is how a card can be
// dropped from one column into another.
const DRAG_GROUP = 'task-board-column'

// A local, presentational copy: the library reorders this array directly as
// the user drags, it never touches the store. The watcher below replaces it
// with the store's own (authoritative) order once the move is applied.
const localTasks = ref<Task[]>([...props.tasks])
watch(
  () => props.tasks,
  (next) => {
    localTasks.value = [...next]
  }
)

function emitMove(newIndex: number | null | undefined) {
  if (newIndex === null || newIndex === undefined) return
  const moved = localTasks.value[newIndex]
  if (!moved) return
  const next = localTasks.value[newIndex + 1]
  emit('move', moved.id, next ? next.id : null)
}

// Reordered within this column.
function handleUpdate(event: DraggableEvent<Task>) {
  emitMove(event.newIndex)
}

// Dropped into this column from another one.
function handleAdd(event: DraggableEvent<Task>) {
  emitMove(event.newIndex)
}

// Exposed for tests: driving a real SortableJS drag in a headless DOM is not
// practical, so tests call these directly with a synthetic `newIndex`,
// exactly as the library would after it has reordered `localTasks`.
defineExpose({ handleUpdate, handleAdd })
</script>

<template>
  <section class="flex w-[85vw] shrink-0 snap-center flex-col gap-3 lg:w-0 lg:min-w-0 lg:flex-1 lg:shrink lg:snap-align-none">
    <header class="flex items-center justify-between gap-2 px-0.5">
      <h2 class="text-sm font-semibold tracking-tight text-ink">{{ STATUS_FILTER_LABELS[status] }}</h2>
      <span class="font-mono text-xs text-ink-soft">{{ tasks.length }}</span>
    </header>

    <VueDraggable
      v-model="localTasks"
      tag="ul"
      :group="DRAG_GROUP"
      :animation="150"
      ghost-class="opacity-40"
      chosen-class="ring-2 ring-accent"
      class="flex min-h-24 flex-col gap-2 rounded-card border border-dashed border-border p-2"
      @update="handleUpdate"
      @add="handleAdd"
    >
      <TaskCard
        v-for="task in localTasks"
        :key="task.id"
        :task="task"
        :pending="pendingIds.includes(task.id)"
        @open="emit('open', task.id)"
      />
    </VueDraggable>

    <button
      type="button"
      class="rounded-control border border-dashed border-border-control px-3 py-2 text-left text-sm font-medium text-ink-soft hover:border-ink-soft hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      @click="emit('create')"
    >
      + Ajouter une tâche
    </button>
  </section>
</template>
