import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import TaskForm from '~/components/TaskForm.vue'

describe('TaskForm', () => {
  it('blocks submit and shows an inline error when the title is empty', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.find('#task-title-error').exists()).toBe(true)
  })

  it('emits submit with the parsed input on a valid submission', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('#task-title').setValue('Write docs')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]?.[0]).toEqual({
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

  it('reset() clears the fields', async () => {
    const wrapper = await mountSuspended(TaskForm, { props: { pending: false } })

    await wrapper.find('#task-title').setValue('Temp title')
    ;(wrapper.vm as unknown as { reset: () => void }).reset()
    await wrapper.vm.$nextTick()

    expect((wrapper.find('#task-title').element as HTMLInputElement).value).toBe('')
  })
})
