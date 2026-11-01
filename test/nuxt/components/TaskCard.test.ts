import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Task } from '#shared/types/task'
import TaskCard from '~/components/TaskCard.vue'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Write docs',
    description: 'Some description',
    status: 'todo',
    priority: 'high',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('TaskCard', () => {
  it('renders the title, description and priority label', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: false } })

    expect(wrapper.text()).toContain('Write docs')
    expect(wrapper.text()).toContain('Some description')
    expect(wrapper.text()).toContain('Élevée')
  })

  it('emits update:status when the status select changes', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: false } })

    await wrapper.find('select').setValue('done')

    expect(wrapper.emitted('update:status')?.[0]).toEqual(['done'])
  })

  it('requires a second click on delete before emitting, and the first click can be cancelled on blur', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: false } })
    const deleteButton = wrapper.find('button')

    await deleteButton.trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(deleteButton.text()).toBe('Confirmer ?')

    await deleteButton.trigger('blur')
    expect(deleteButton.text()).toBe('Supprimer')

    await deleteButton.trigger('click')
    await deleteButton.trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('disables the status select and the delete button while pending', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: true } })

    expect((wrapper.find('select').element as HTMLSelectElement).disabled).toBe(true)
    expect((wrapper.find('button').element as HTMLButtonElement).disabled).toBe(true)
  })
})
