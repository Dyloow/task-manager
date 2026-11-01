import type { Task } from '#shared/types/task'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

// Isolated in its own file: the `useAsyncData` 'tasks' cache is shared
// across mounts within one test file, so this fresh GET mock would
// otherwise be shadowed by whatever an earlier test in the same file left
// cached (see test/nuxt/pages/index-modal.test.ts).
function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'seed-1',
    title: 'Tâche existante',
    description: '',
    status: 'todo',
    priority: 'medium',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('index page task modal save error', () => {
  it('a 500 on save shows the French banner, keeps the modal open with the field values', async () => {
    const existing = makeTask()
    registerEndpoint('/api/tasks', { method: 'GET', handler: () => [existing] })
    registerEndpoint('/api/tasks/seed-1', {
      method: 'PATCH',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })

    await wrapper.find('button.cursor-grab').trigger('click')
    await flushPromises()
    await wrapper.find('#task-title').setValue('Nouveau titre')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(wrapper.find('[role="alert"]').text()).toContain("Impossible d'enregistrer les modifications.")
    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('Nouveau titre')
  })
})
