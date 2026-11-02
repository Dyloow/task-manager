import type { z } from 'zod'
import type {
  createTaskSchema,
  moveTaskSchema,
  taskPrioritySchema,
  taskSchema,
  taskStatusSchema,
  updateTaskSchema
} from '#shared/schemas/task'

export type TaskStatus = z.infer<typeof taskStatusSchema>

export type TaskPriority = z.infer<typeof taskPrioritySchema>

export type Task = z.infer<typeof taskSchema>

export type CreateTaskInput = z.infer<typeof createTaskSchema>

export type UpdateTaskInput = z.infer<typeof updateTaskSchema>

export type MoveTaskInput = z.infer<typeof moveTaskSchema>
