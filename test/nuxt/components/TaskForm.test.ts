import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Task } from '#shared/types/task'
import TaskForm from '~/components/TaskForm.vue'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Original title',
    description: 'Original description',
    status: 'todo',
    priority: 'medium',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

describe('TaskForm', () => {
  it('blocks submit and shows an inline error when the title is empty', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('create')).toBeUndefined()
    expect(wrapper.find('#task-title-error').exists()).toBe(true)
  })

  it('emits create with the parsed input on a valid submission (default create mode)', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('#task-title').setValue('Write docs')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('create')?.[0]?.[0]).toEqual({
      title: 'Write docs',
      description: '',
      status: 'todo',
      priority: 'medium'
    })
  })

  it('shows a server field error passed as a prop', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { pending: false, serverFieldErrors: { title: ['Title already used'] } }
    })

    expect(wrapper.find('#task-title-error').text()).toBe('Title already used')
  })

  it('lets a local validation error replace a stale server error for the same field', async () => {
    const wrapper = await mountSuspended(TaskForm, {
      props: { pending: false, serverFieldErrors: { title: ['Title already used'] } }
    })

    // Title is still empty, so the client validation now wins the display.
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('#task-title-error').text()).not.toBe('Title already used')
  })

  it('disables inputs and the submit button while pending', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: true } })

    expect((wrapper.find('#task-title').element as HTMLInputElement).disabled).toBe(true)
    expect((wrapper.find('button[type="submit"]').element as HTMLButtonElement).disabled).toBe(true)
  })

  it('resetForCreate() clears the fields and presets the status', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('#task-title').setValue('Temp title')
    ;(wrapper.vm as unknown as { resetForCreate: (status?: string) => void }).resetForCreate('in_progress')
    await wrapper.vm.$nextTick()

    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('')
    expect((wrapper.find('#task-status').element as HTMLSelectElement).value).toBe('in_progress')
  })

  it('loadForEdit() prefills every field from the task', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })
    const task = makeTask({ title: 'Edit me', priority: 'high', status: 'done' })

    ;(wrapper.vm as unknown as { loadForEdit: (task: Task) => void }).loadForEdit(task)
    await wrapper.vm.$nextTick()

    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('Edit me')
    expect((wrapper.find('#task-description').element as HTMLTextAreaElement).value).toBe('Original description')
    expect((wrapper.find('#task-priority').element as HTMLSelectElement).value).toBe('high')
    expect((wrapper.find('#task-status').element as HTMLSelectElement).value).toBe('done')
    expect(wrapper.find('button[type="submit"]').text()).toBe('Enregistrer')
  })

  it('edit mode emits save with only the changed fields', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })
    const task = makeTask()

    ;(wrapper.vm as unknown as { loadForEdit: (task: Task) => void }).loadForEdit(task)
    await wrapper.vm.$nextTick()

    await wrapper.find('#task-title').setValue('Changed title')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({ title: 'Changed title' })
    expect(wrapper.emitted('create')).toBeUndefined()
  })

  it('edit mode emits an empty save when nothing changed', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })
    const task = makeTask()

    ;(wrapper.vm as unknown as { loadForEdit: (task: Task) => void }).loadForEdit(task)
    await wrapper.vm.$nextTick()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')?.[0]?.[0]).toEqual({})
  })
})
