import type { TaskPriority, TaskStatus } from '#shared/types/task'
import type { PriorityFilter, StatusFilter } from '~/stores/tasks'

/** French labels for the status enum, as shown on tabs, selects and badges. */
export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminée'
}

/** French labels for the priority enum, as shown on selects and badges. */
export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Élevée'
}

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  all: 'Toutes',
  todo: STATUS_LABELS.todo,
  in_progress: STATUS_LABELS.in_progress,
  // Plural as a filter name ("the completed ones"), unlike the singular
  // status label used on a single task's select or badge.
  done: 'Terminées'
}

export const PRIORITY_FILTER_LABELS: Record<PriorityFilter, string> = {
  all: 'Toutes',
  ...PRIORITY_LABELS
}
