<script setup lang="ts">
import { taskStatusSchema } from '#shared/schemas/task'
import type { Task, TaskStatus } from '#shared/types/task'
import type { StatusFilter } from '~/stores/tasks'

const props = defineProps<{
  tasksByStatus: Record<TaskStatus, Task[]>
  statusFilter: StatusFilter
  pendingIds: string[]
}>()

const emit = defineEmits<{
  move: [id: string, status: TaskStatus, beforeId: string | null]
  createInColumn: [status: TaskStatus]
  open: [id: string]
}>()

const STATUSES = taskStatusSchema.options

// 'all' shows every column; a specific status narrows the board to that one
// column, so the status filter keeps selecting what it always selected, now
// a column instead of a row.
const visibleStatuses = computed<TaskStatus[]>(() => (props.statusFilter === 'all' ? STATUSES : [props.statusFilter]))

interface ColumnHandle {
  focusAddButton: () => void
}

// Only the currently rendered columns register here (a status filter can
// hide the rest); focusing a hidden column is a silent no-op.
const columnRefs = new Map<TaskStatus, ColumnHandle>()

function registerColumnRef(status: TaskStatus, instance: ColumnHandle | null) {
  if (instance) columnRefs.set(status, instance)
  else columnRefs.delete(status)
}

function focusColumnAddButton(status: TaskStatus) {
  columnRefs.get(status)?.focusAddButton()
}

defineExpose({ focusColumnAddButton })
</script>

<template>
  <div class="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 lg:snap-none lg:overflow-visible">
    <TaskColumn
      v-for="status in visibleStatuses"
      :key="status"
      :ref="(instance) => registerColumnRef(status, instance as ColumnHandle | null)"
      :status="status"
      :tasks="tasksByStatus[status]"
      :pending-ids="pendingIds"
      @move="(id, beforeId) => emit('move', id, status, beforeId)"
      @create="emit('createInColumn', status)"
      @open="(id) => emit('open', id)"
    />
  </div>
</template>
