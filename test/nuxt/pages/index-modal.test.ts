import type { Task } from '#shared/types/task'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { afterEach, describe, expect, it } from 'vitest'
import IndexPage from '~/pages/index.vue'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'seed-1',
    title: 'Tâche existante',
    description: 'Description existante',
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

describe('index page task modal', () => {
  // One continuous mount for the same cache reason as the other page test files.
  it('covers opening the modal from a card, saving an edit, creating from a column, an invalid edit and a delete', async () => {
    const existing = makeTask({ id: 'seed-1', title: 'Tâche existante' })
    mockEndpoint('/api/tasks', { method: 'GET', handler: () => [existing] })

    const wrapper = await mountSuspended(IndexPage, { route: '/' })

    // --- clicking a card opens the modal prefilled with its values ---
    await wrapper.find('button.cursor-grab').trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.text()).toContain('Modifier la tâche')
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('Tâche existante')
    expect((wrapper.find('#task-description').element as HTMLTextAreaElement).value).toBe('Description existante')

    // --- editing the title and saving closes the modal and updates the card ---
    let savedBody: unknown
    mockEndpoint('/api/tasks/seed-1', {
      method: 'PATCH',
      handler: async (event) => {
        savedBody = await readBody(event)
        return { ...existing, title: 'Titre modifié', updatedAt: '2026-01-02T00:00:00.000Z' }
      }
    })

    await wrapper.find('#task-title').setValue('Titre modifié')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    await flushPromises()

    expect(savedBody).toEqual({ title: 'Titre modifié' })
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(cardTitles(wrapper)).toEqual(['Titre modifié'])

    // --- the column "+" button opens the modal in create mode, status preselected ---
    const addButtons = wrapper.findAll('button').filter((button) => button.text() === '+ Ajouter une tâche')
    // First column is "À faire" (todo).
    await addButtons[0]!.trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.text()).toContain('Nouvelle tâche')
    expect((wrapper.find('#task-status').element as HTMLSelectElement).value).toBe('todo')

    const created = makeTask({ id: 'new-task', title: 'Tâche créée', status: 'todo' })
    mockEndpoint('/api/tasks', { method: 'POST', handler: () => created })

    await wrapper.find('#task-title').setValue('Tâche créée')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(cardTitles(wrapper)).toEqual(expect.arrayContaining(['Titre modifié', 'Tâche créée']))

    // --- an invalid edit keeps the modal open with an inline error ---
    await wrapper.find('button.cursor-grab').trigger('click')
    await flushPromises()
    await wrapper.find('#task-title').setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.find('#task-title-error').exists()).toBe(true)

    // --- delete from the modal, with the second-click confirmation ---
    mockEndpoint('/api/tasks/seed-1', { method: 'DELETE', handler: () => null })
    const deleteButton = wrapper.findAll('button').find((button) => button.text() === 'Supprimer')!
    await deleteButton.trigger('click')
    expect(deleteButton.text()).toBe('Confirmer ?')
    await deleteButton.trigger('click')
    await flushPromises()

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(cardTitles(wrapper)).toEqual(['Tâche créée'])
  })
})
