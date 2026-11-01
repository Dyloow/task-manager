import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

// Isolated in its own file for the same `useAsyncData` cache reason as
// index-modal-save-error.test.ts.
describe('index page task modal create error', () => {
  it('a 500 on create shows the French banner inside the dialog, not behind it', async () => {
    registerEndpoint('/api/tasks', { method: 'GET', handler: () => [] })
    registerEndpoint('/api/tasks', {
      method: 'POST',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })

    await wrapper.find('button').trigger('click') // "+ Nouvelle tâche" in the header
    await flushPromises()
    await wrapper.find('#task-title').setValue('Nouvelle tâche')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    const dialog = wrapper.find('dialog')
    expect(dialog.attributes('open')).toBeDefined()
    expect(dialog.find('[role="alert"]').text()).toContain('Impossible de créer la tâche.')
    expect(wrapper.findAll('main > [role="alert"]')).toHaveLength(0)
  })
})
