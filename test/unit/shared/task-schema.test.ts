import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  createTaskSchema,
  taskPrioritySchema,
  taskStatusSchema,
  updateTaskSchema
} from '../../../shared/schemas/task'

describe('taskStatusSchema', () => {
  it('accepts the three known statuses', () => {
    expect(taskStatusSchema.safeParse('todo').success).toBe(true)
    expect(taskStatusSchema.safeParse('in_progress').success).toBe(true)
    expect(taskStatusSchema.safeParse('done').success).toBe(true)
  })

  it('rejects an unknown status', () => {
    expect(taskStatusSchema.safeParse('archived').success).toBe(false)
  })
})

describe('taskPrioritySchema', () => {
  it('accepts the three known priorities', () => {
    expect(taskPrioritySchema.safeParse('low').success).toBe(true)
    expect(taskPrioritySchema.safeParse('medium').success).toBe(true)
    expect(taskPrioritySchema.safeParse('high').success).toBe(true)
  })

  it('rejects an unknown priority', () => {
    expect(taskPrioritySchema.safeParse('urgent').success).toBe(false)
  })
})

describe('createTaskSchema', () => {
  it('applies defaults for description, status and priority', () => {
    const result = createTaskSchema.parse({ title: 'Write report' })

    expect(result).toEqual({
      title: 'Write report',
      description: '',
      status: 'todo',
      priority: 'medium'
    })
  })

  it('trims title and description', () => {
    const result = createTaskSchema.parse({ title: '  Write report  ', description: '  details  ' })

    expect(result.title).toBe('Write report')
    expect(result.description).toBe('details')
  })

  it('rejects an empty title with a French message', () => {
    const result = createTaskSchema.safeParse({ title: '' })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(z.flattenError(result.error).fieldErrors.title).toEqual(['Le titre est requis.'])
  })

  it('rejects a title longer than 120 characters with a French message', () => {
    const result = createTaskSchema.safeParse({ title: 'a'.repeat(121) })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(z.flattenError(result.error).fieldErrors.title).toEqual(['Le titre ne peut pas dépasser 120 caractères.'])
  })

  it('rejects a description longer than 1000 characters with a French message', () => {
    const result = createTaskSchema.safeParse({ title: 'Titre', description: 'a'.repeat(1001) })

    expect(result.success).toBe(false)
    if (result.success) return
    expect(z.flattenError(result.error).fieldErrors.description).toEqual([
      'La description ne peut pas dépasser 1000 caractères.'
    ])
  })

  it('rejects an invalid status enum', () => {
    const result = createTaskSchema.safeParse({ title: 'Write report', status: 'blocked' })

    expect(result.success).toBe(false)
  })

  it('rejects an invalid priority enum', () => {
    const result = createTaskSchema.safeParse({ title: 'Write report', priority: 'urgent' })

    expect(result.success).toBe(false)
  })

  it('rejects forged server-owned fields like id and createdAt', () => {
    const result = createTaskSchema.safeParse({
      title: 'Write report',
      id: 'forged-id',
      createdAt: '2020-01-01T00:00:00.000Z'
    })

    expect(result.success).toBe(false)
  })
})

describe('updateTaskSchema', () => {
  it('accepts a single field', () => {
    const result = updateTaskSchema.safeParse({ status: 'done' })

    expect(result.success).toBe(true)
  })

  it('rejects an empty object with a French message', () => {
    const result = updateTaskSchema.safeParse({})

    expect(result.success).toBe(false)
    if (result.success) return
    expect(z.flattenError(result.error).formErrors).toEqual(['Au moins un champ est requis.'])
  })

  it('rejects unknown keys', () => {
    const result = updateTaskSchema.safeParse({ status: 'done', unknown: 'field' })

    expect(result.success).toBe(false)
  })
})
