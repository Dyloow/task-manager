import type { Task } from '#shared/types/task'
import type { VueWrapper } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '~/pages/index.vue'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

function findStatusButton(wrapper: VueWrapper, label: string) {
  return wrapper.findAll('[role="group"] button').find((button) => button.text().startsWith(label))!
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'seed-1',
    title: 'Tâche existante',
    description: '',
    status: 'todo',
    priority: 'medium',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('index page', () => {
  // A single continuous mount: the Nuxt app (router, pinia, the `useAsyncData`
  // 'tasks' cache) is shared across a test file, so a second `mountSuspended`
  // call does not reliably start from a clean state (a later mount can see
  // the first mount's cached data instead of calling its own endpoint mock).
  // One session, several ordered steps, mirrors real usage anyway.
  it('covers the filter/URL sync, create, 400 handling, pending state and a mutation failure banner with rollback', async () => {
    const seed = makeTask()
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => [seed] })

    let resolveCreate!: (task: Task) => void
    mockEndpoint('/api/tasks', {
      method: 'POST',
      handler: async (event) => {
        const body = await readBody<{ title: string }>(event)
        if (body.title === 'Titre déjà pris') {
          throw createError({
            statusCode: 400,
            statusMessage: 'Invalid request body',
            data: { issues: { formErrors: [], fieldErrors: { title: ['Ce titre est déjà utilisé.'] } } }
          })
        }
        return new Promise<Task>((resolve) => {
          resolveCreate = resolve
        })
      }
    })

    let rejectUpdate!: (error: unknown) => void
    mockEndpoint('/api/tasks/seed-1', {
      method: 'PATCH',
      handler: () => new Promise((_resolve, reject) => { rejectUpdate = reject })
    })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })
    // `wrapper.vm.$route` is a snapshot taken at mount and does not track
    // later navigation in this harness; the router's own reactive
    // `currentRoute` is the one the page's composable actually reads.
    const currentQuery = () => wrapper.vm.$router.currentRoute.value.query

    // --- filters stay in sync with the URL both ways ---
    expect(findStatusButton(wrapper, 'Toutes').attributes('aria-pressed')).toBe('true')
    expect(findStatusButton(wrapper, 'Terminées').attributes('aria-pressed')).toBe('false')

    await wrapper.vm.$router.push({ query: { status: 'done' } })
    await flushPromises()

    expect(findStatusButton(wrapper, 'Toutes').attributes('aria-pressed')).toBe('false')
    expect(findStatusButton(wrapper, 'Terminées').attributes('aria-pressed')).toBe('true')

    // The invalid-query cleanup is itself an async `router.replace` fired
    // from inside the watcher, with no promise the test can await directly:
    // poll until the navigation it triggers has actually landed.
    await wrapper.vm.$router.push({ query: { status: 'bogus' } })
    await vi.waitUntil(() => currentQuery().status === undefined)

    expect(findStatusButton(wrapper, 'Toutes').attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('li').length).toBe(1)

    // --- 400 on create: inline field error, no banner, list unchanged, input kept ---
    await wrapper.find('#task-title').setValue('Titre déjà pris')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('#task-title-error').text()).toBe('Ce titre est déjà utilisé.')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
    expect(wrapper.findAll('li').length).toBe(1)
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('Titre déjà pris')

    // --- valid create: controls disabled while pending, list grows, form resets ---
    await wrapper.find('#task-title').setValue('Préparer la démo')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect((wrapper.find('#task-title').element as HTMLInputElement).disabled).toBe(true)
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()

    resolveCreate(makeTask({ id: 'new-task', title: 'Préparer la démo' }))
    await flushPromises()
    await vi.waitUntil(() => wrapper.findAll('li').length === 2)

    expect(wrapper.findAll('li').length).toBe(2)
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#task-title').element as HTMLInputElement).disabled).toBe(false)

    // --- mutation failure: status select disabled while pending, banner + rollback after ---
    const statusSelect = wrapper.find('select[aria-label="Statut de Tâche existante"]')
    await statusSelect.setValue('done')
    await nextTick()

    expect((statusSelect.element as HTMLSelectElement).disabled).toBe(true)

    rejectUpdate(createError({ statusCode: 500, statusMessage: 'Internal Server Error' }))
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de mettre à jour la tâche. Modification annulée.')
    expect((statusSelect.element as HTMLSelectElement).value).toBe('todo')
    expect((statusSelect.element as HTMLSelectElement).disabled).toBe(false)

    await wrapper.find('[role="alert"] button').trigger('click')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
  })
})
