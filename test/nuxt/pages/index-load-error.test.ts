import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

// Isolated in its own file: the `useAsyncData` 'tasks' cache is shared
// across mounts within one test file, so a failing fetch here must not run
// alongside a test file whose earlier mount already cached a success.
describe('index page SSR load error', () => {
  it('shows a retry block when the initial load fails', async () => {
    registerEndpoint('/api/tasks', {
      method: 'GET',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })

    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de charger les tâches.')
    expect(wrapper.find('[role="alert"] button').text()).toBe('Réessayer')
  })
})
