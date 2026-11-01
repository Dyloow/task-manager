import { mountSuspended } from '@nuxt/test-utils/runtime'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('index page', () => {
  it('updates the filters when the URL query changes (not just the other way around)', async () => {
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => [] })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })
    const selects = wrapper.findAll('select')
    const statusSelect = selects[0]!.element as HTMLSelectElement

    expect(statusSelect.value).toBe('all')

    await wrapper.vm.$router.push({ query: { status: 'done' } })
    await wrapper.vm.$nextTick()

    expect(statusSelect.value).toBe('done')
  })
})
