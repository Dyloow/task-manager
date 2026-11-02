import { mountSuspended } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'

const Harness = defineComponent({
  setup() {
    return useTaskFilters()
  },
  template: '<div />'
})

describe('useTaskFilters', () => {
  // A single continuous mount: the Nuxt app (router, pinia) is shared across
  // a test file, so a second `mountSuspended` call does not reliably reset
  // navigation state. One session, several steps, mirrors real usage anyway.
  // `wrapper.vm.$route` is a snapshot taken at mount and does not track later
  // navigation in this harness, so query assertions go through the router's
  // own reactive `currentRoute`, the same one the composable reads.
  it('drives the store filters from the URL through its whole lifecycle', async () => {
    const wrapper = await mountSuspended(Harness, { route: '/' })
    const currentQuery = () => wrapper.vm.$router.currentRoute.value.query

    expect(wrapper.vm.status).toBe('all')
    expect(wrapper.vm.priority).toBe('all')

    await wrapper.vm.$router.push({ query: { status: 'done', priority: 'high' } })
    await flushPromises()
    expect(wrapper.vm.status).toBe('done')
    expect(wrapper.vm.priority).toBe('high')

    // The invalid-query cleanup is itself an async `router.replace` fired
    // from inside the watcher, with no promise the test can await directly:
    // poll until the navigation it triggers has actually landed.
    await wrapper.vm.$router.push({ query: { status: 'bogus' } })
    await vi.waitUntil(() => currentQuery().status === undefined)
    expect(wrapper.vm.status).toBe('all')
    expect(wrapper.vm.priority).toBe('all')

    await wrapper.vm.setStatus('in_progress')
    await vi.waitUntil(() => currentQuery().status === 'in_progress')
    expect(wrapper.vm.status).toBe('in_progress')

    await wrapper.vm.setPriority('low')
    await vi.waitUntil(() => currentQuery().priority === 'low')
    expect(currentQuery()).toMatchObject({ status: 'in_progress', priority: 'low' })
    expect(wrapper.vm.priority).toBe('low')

    // --- resetFilters clears both filters in a single navigation, not two ---
    const pushSpy = vi.spyOn(wrapper.vm.$router, 'push')
    await wrapper.vm.resetFilters()
    await vi.waitUntil(() => currentQuery().status === undefined)

    expect(pushSpy).toHaveBeenCalledTimes(1)
    expect(currentQuery().priority).toBeUndefined()
    expect(wrapper.vm.status).toBe('all')
    expect(wrapper.vm.priority).toBe('all')
  })
})
