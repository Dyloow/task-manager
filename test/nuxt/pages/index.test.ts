import type { Task } from '#shared/types/task'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import IndexPage from '~/pages/index.vue'
import TaskBoard from '~/components/TaskBoard.vue'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

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

function cardTitles(wrapper: { findAll: (selector: string) => { text: () => string }[] }) {
  return wrapper.findAll('h3').map((h3) => h3.text())
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('index page', () => {
  // A single continuous mount: the Nuxt app (router, pinia, the `useAsyncData`
  // 'tasks' cache) is shared across a test file, so a second `mountSuspended`
  // call does not reliably start from a clean state. One session, several
  // ordered steps, mirrors real usage anyway.
  it('covers the board rendering, the filter/URL sync and a move failure banner with resync', async () => {
    const todo = makeTask({ id: 'todo-1', title: 'Tâche à faire', status: 'todo', priority: 'high', position: 0 })
    const inProgress = makeTask({ id: 'prog-1', title: 'Tâche en cours', status: 'in_progress', priority: 'low', position: 0 })
    const done = makeTask({ id: 'done-1', title: 'Tâche faite', status: 'done', priority: 'medium', position: 0 })
    const seed = [todo, inProgress, done]
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => seed })

    let rejectMove!: (error: unknown) => void
    mockEndpoint('/api/tasks/todo-1/move', {
      method: 'POST',
      handler: () => new Promise((_resolve, reject) => { rejectMove = reject })
    })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })
    const currentQuery = () => wrapper.vm.$router.currentRoute.value.query

    // --- the board renders every column with its task ---
    expect(cardTitles(wrapper)).toEqual(['Tâche à faire', 'Tâche en cours', 'Tâche faite'])

    // --- status filter narrows the board to one column, stays in sync with the URL ---
    await wrapper.vm.$router.push({ query: { status: 'done' } })
    await flushPromises()

    expect(cardTitles(wrapper)).toEqual(['Tâche faite'])

    // An invalid query value is cleaned up back to "all" by the filters watcher.
    await wrapper.vm.$router.push({ query: { status: 'bogus' } })
    await vi.waitUntil(() => currentQuery().status === undefined)
    await flushPromises()

    expect(cardTitles(wrapper)).toEqual(['Tâche à faire', 'Tâche en cours', 'Tâche faite'])

    // --- priority filter narrows every column, without hiding the others ---
    await wrapper.vm.$router.push({ query: { priority: 'high' } })
    await flushPromises()

    expect(cardTitles(wrapper)).toEqual(['Tâche à faire'])

    await wrapper.vm.$router.push({ query: { priority: undefined } })
    await flushPromises()

    // --- a failed move shows the French banner and resyncs from the server ---
    const serverList = [todo, inProgress, done]
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => serverList })

    const taskBoard = wrapper.findComponent(TaskBoard)
    taskBoard.vm.$emit('move', 'todo-1', 'in_progress', null)
    await flushPromises()

    rejectMove(createError({ statusCode: 500, statusMessage: 'Task data is corrupted' }))
    // Two flushes: one for the rejected move, one for the `fetchTasks()` resync it triggers.
    await flushPromises()
    await flushPromises()

    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
    expect(wrapper.find('[role="alert"]').text()).toContain('Impossible de déplacer la tâche. Le tableau a été resynchronisé.')

    await wrapper.find('[role="alert"] button').trigger('click')
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(0)
  })
})
