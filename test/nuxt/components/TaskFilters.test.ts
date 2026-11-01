import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TaskFilters from '~/components/TaskFilters.vue'

const counts = { all: 12, todo: 5, in_progress: 3, done: 4 }

describe('TaskFilters', () => {
  it('renders status tabs with counts and marks the active one', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'done', priority: 'all', counts } })
    const doneTab = wrapper.findAll('[role="tab"]').find((tab) => tab.text().startsWith('Terminées'))!

    expect(doneTab.text()).toContain('4')
    expect(doneTab.attributes('aria-selected')).toBe('true')
  })

  it('emits update:status when a tab is clicked', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'all', priority: 'all', counts } })
    const todoTab = wrapper.findAll('[role="tab"]').find((tab) => tab.text().startsWith('À faire'))!

    await todoTab.trigger('click')

    expect(wrapper.emitted('update:status')?.[0]).toEqual(['todo'])
  })

  it('emits update:priority when the priority select changes', async () => {
    const wrapper = await mountSuspended(TaskFilters, { props: { status: 'all', priority: 'all', counts } })

    await wrapper.find('select').setValue('high')

    expect(wrapper.emitted('update:priority')?.[0]).toEqual(['high'])
  })
})
