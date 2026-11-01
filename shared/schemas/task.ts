import { z } from 'zod'

export const taskStatusSchema = z.enum(['todo', 'in_progress', 'done'])

export const taskPrioritySchema = z.enum(['low', 'medium', 'high'])

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  createdAt: z.string(),
  updatedAt: z.string()
})

const titleSchema = z.string().trim().min(1).max(120)
const descriptionSchema = z.string().trim().max(1000)

export const createTaskSchema = z.strictObject({
  title: titleSchema,
  description: descriptionSchema.default(''),
  status: taskStatusSchema.default('todo'),
  priority: taskPrioritySchema.default('medium')
})

export const updateTaskSchema = z
  .strictObject({
    title: titleSchema,
    description: descriptionSchema,
    status: taskStatusSchema,
    priority: taskPrioritySchema
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    error: 'At least one field is required'
  })
