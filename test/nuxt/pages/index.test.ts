import type { VueWrapper } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '~/pages/index.vue'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

function findStatusTab(wrapper: VueWrapper, label: string) {
  return wrapper.findAll('[role="tab"]').find((tab) => tab.text().startsWith(label))!
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('index page', () => {
  // A single continuous mount: the Nuxt app (router, pinia) is shared across
  // a test file, so a second `mountSuspended` call does not reliably reset
  // navigation state. One session, several steps, mirrors real usage anyway.
  it('keeps the filter tabs and the URL query in sync both ways', async () => {
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => [] })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })
    // `wrapper.vm.$route` is a snapshot taken at mount and does not track
    // later navigation in this harness; the router's own reactive
    // `currentRoute` is the one the page's composable actually reads.
    const currentQuery = () => wrapper.vm.$router.currentRoute.value.query

    expect(findStatusTab(wrapper, 'Toutes').attributes('aria-selected')).toBe('true')
    expect(findStatusTab(wrapper, 'Terminées').attributes('aria-selected')).toBe('false')

    await wrapper.vm.$router.push({ query: { status: 'done' } })
    await flushPromises()

    expect(findStatusTab(wrapper, 'Toutes').attributes('aria-selected')).toBe('false')
    expect(findStatusTab(wrapper, 'Terminées').attributes('aria-selected')).toBe('true')

    // The invalid-query cleanup is itself an async `router.replace` fired
    // from inside the watcher, with no promise the test can await directly:
    // poll until the navigation it triggers has actually landed.
    await wrapper.vm.$router.push({ query: { status: 'bogus' } })
    await vi.waitUntil(() => currentQuery().status === undefined)

    expect(findStatusTab(wrapper, 'Toutes').attributes('aria-selected')).toBe('true')
  })
})
