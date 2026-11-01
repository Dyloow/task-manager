import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Task } from '#shared/types/task'
import TaskModal from '~/components/TaskModal.vue'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Existing task',
    description: 'Some description',
    status: 'todo',
    priority: 'medium',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

type ModalApi = {
  openCreate: (status?: Task['status']) => void
  openEdit: (task: Task) => void
  close: () => void
}

function api(wrapper: { vm: unknown }) {
  return wrapper.vm as unknown as ModalApi
}

describe('TaskModal', () => {
  it('openCreate() shows the dialog in create mode with the status preset', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('in_progress')
    await wrapper.vm.$nextTick()

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.text()).toContain('Nouvelle tâche')
    expect((wrapper.find('#task-status').element as HTMLSelectElement).value).toBe('in_progress')
    expect(wrapper.find('button').text()).not.toBe('Supprimer')
  })

  it('openEdit() shows the dialog in edit mode, prefilled, with a delete button', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })
    const task = makeTask({ title: 'Edit me' })

    api(wrapper).openEdit(task)
    await wrapper.vm.$nextTick()

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
    expect(wrapper.text()).toContain('Modifier la tâche')
    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('Edit me')
    expect(wrapper.text()).toContain('Supprimer')
  })

  it('submitting in create mode emits create with the form input', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    await wrapper.find('#task-title').setValue('New task')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('create')?.[0]?.[0]).toMatchObject({ title: 'New task', status: 'todo' })
  })

  it('submitting in edit mode emits save with the task id and only the changed fields', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })
    const task = makeTask()

    api(wrapper).openEdit(task)
    await wrapper.vm.$nextTick()
    await wrapper.find('#task-title').setValue('Renamed')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toEqual([['task-1', { title: 'Renamed' }]])
  })

  it('submitting in edit mode with no change closes the dialog without emitting save', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })
    const task = makeTask()

    api(wrapper).openEdit(task)
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('delete requires a second click before emitting, cancellable by blur', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })
    const task = makeTask()

    api(wrapper).openEdit(task)
    await wrapper.vm.$nextTick()
    const deleteButton = wrapper.findAll('button').find((button) => button.text() === 'Supprimer')!

    await deleteButton.trigger('click')
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(deleteButton.text()).toBe('Confirmer ?')

    await deleteButton.trigger('blur')
    expect(deleteButton.text()).toBe('Supprimer')

    await deleteButton.trigger('click')
    await deleteButton.trigger('click')
    expect(wrapper.emitted('delete')).toEqual([['task-1']])
  })

  it('the close button closes the dialog and emits closed', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    await wrapper.find('[aria-label="Fermer"]').trigger('click')

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(wrapper.emitted('closed')).toHaveLength(1)
  })

  it('the dialog is labelled by its own title for accessibility', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()

    const dialog = wrapper.find('dialog')
    const titleId = dialog.attributes('aria-labelledby')
    expect(titleId).toBeTruthy()
    expect(wrapper.find(`#${titleId}`).text()).toBe('Nouvelle tâche')
  })

  it('cancel (Escape) closes the dialog without emitting create, save or delete', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })
    const task = makeTask()

    api(wrapper).openEdit(task)
    await wrapper.vm.$nextTick()

    // A real browser fires `cancel` then closes the dialog on Escape; happy-dom
    // does not wire the key press itself, so this drives the same two native
    // events our own `@cancel`/`@close` handlers react to.
    const dialogEl = wrapper.find('dialog').element as HTMLDialogElement
    dialogEl.dispatchEvent(new Event('cancel'))
    dialogEl.close()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
    expect(wrapper.emitted('create')).toBeUndefined()
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(wrapper.emitted('closed')).toHaveLength(1)
  })

  it('the expected close() method closes the dialog', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    api(wrapper).close()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('clicking the backdrop closes the dialog', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    // A click dispatched directly on the <dialog> element is a backdrop
    // click: clicking its content would target a descendant instead.
    await wrapper.find('dialog').trigger('mousedown')
    await wrapper.find('dialog').trigger('click')

    expect(wrapper.find('dialog').attributes('open')).toBeUndefined()
  })

  it('a text selection released on the backdrop does not close the dialog', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    // The press starts in the title field, the release lands on the backdrop.
    await wrapper.find('#task-title').trigger('mousedown')
    await wrapper.find('dialog').trigger('click')

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
  })

  it('clicking inside the modal content does not close it', async () => {
    const wrapper = await mountSuspended(TaskModal, { props: { pending: false } })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()
    await wrapper.find('h2').trigger('click')

    expect(wrapper.find('dialog').attributes('open')).toBeDefined()
  })

  it('shows errorMessage as a generic alert when there is no field or form error to show instead', async () => {
    const wrapper = await mountSuspended(TaskModal, {
      props: { pending: false, errorMessage: "Impossible d'enregistrer les modifications." }
    })

    api(wrapper).openEdit(makeTask())
    await wrapper.vm.$nextTick()

    const alerts = wrapper.findAll('[role="alert"]')
    expect(alerts.some((alert) => alert.text() === "Impossible d'enregistrer les modifications.")).toBe(true)
  })

  it('hides the generic errorMessage alert when a field error already shows it', async () => {
    const wrapper = await mountSuspended(TaskModal, {
      props: {
        pending: false,
        errorMessage: 'Impossible de créer la tâche.',
        serverFieldErrors: { title: ['Titre déjà utilisé.'] }
      }
    })

    api(wrapper).openCreate('todo')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Titre déjà utilisé.')
    const alerts = wrapper.findAll('[role="alert"]')
    expect(alerts.some((alert) => alert.text() === 'Impossible de créer la tâche.')).toBe(false)
  })
})
