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
    position: 0,
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

  it('strikes through the title and mutes it for a done task', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask({ status: 'done' }), pending: false } })

    expect(wrapper.find('h3').classes()).toContain('line-through')
  })

  it('emits open on click', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: false } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('is a focusable button, disabled while pending', async () => {
    const wrapper = await mountSuspended(TaskCard, { props: { task: makeTask(), pending: true } })

    const button = wrapper.find('button')
    expect(button.element.tagName).toBe('BUTTON')
    expect((button.element as HTMLButtonElement).disabled).toBe(true)
  })
})
