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

const titleSchema = z
  .string()
  .trim()
  .min(1, 'Le titre est requis.')
  .max(120, 'Le titre ne peut pas dépasser 120 caractères.')
const descriptionSchema = z.string().trim().max(1000, 'La description ne peut pas dépasser 1000 caractères.')

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
    error: 'Au moins un champ est requis.'
  })
