import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TaskFilters from '~/components/TaskFilters.vue'

const counts = { all: 12, todo: 5, in_progress: 3, done: 4 }

describe('TaskFilters', () => {
  it('renders a status filter group with counts and marks the active one pressed', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'done', priority: 'all', counts } })

    expect(wrapper.find('[role="group"]').exists()).toBe(true)
    const doneButton = wrapper.findAll('button').find((button) => button.text().startsWith('Terminées'))!

    expect(doneButton.text()).toContain('4')
    expect(doneButton.attributes('aria-pressed')).toBe('true')
  })

  it('emits update:status when a status button is clicked', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'all', priority: 'all', counts } })
    const todoButton = wrapper.findAll('button').find((button) => button.text().startsWith('À faire'))!

    await todoButton.trigger('click')

    expect(wrapper.emitted('update:status')?.[0]).toEqual(['todo'])
  })

  it('emits update:priority when the priority select changes', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'all', priority: 'all', counts } })

    await wrapper.find('select').setValue('high')

    expect(wrapper.emitted('update:priority')?.[0]).toEqual(['high'])
  })
})
