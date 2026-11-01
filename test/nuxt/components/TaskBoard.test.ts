import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Task, TaskStatus } from '#shared/types/task'
import TaskBoard from '~/components/TaskBoard.vue'
import TaskColumn from '~/components/TaskColumn.vue'

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Task',
    description: '',
    status: 'todo',
    priority: 'medium',
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

function tasksByStatus(overrides: Partial<Record<TaskStatus, Task[]>> = {}): Record<TaskStatus, Task[]> {
  return { todo: [], in_progress: [], done: [], ...overrides }
}

describe('TaskBoard', () => {
  it('renders the three columns when the status filter is "all"', async () => {
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus(), statusFilter: 'all', pendingIds: [] }
    })

    expect(wrapper.text()).toContain('À faire')
    expect(wrapper.text()).toContain('En cours')
    expect(wrapper.text()).toContain('Terminées')
  })

  it('renders only the filtered column when a single status is selected', async () => {
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus(), statusFilter: 'done', pendingIds: [] }
    })

    expect(wrapper.text()).toContain('Terminées')
    expect(wrapper.text()).not.toContain('À faire')
    expect(wrapper.text()).not.toContain('En cours')
  })

  it('forwards a column move with that column status', async () => {
    const todo = makeTask({ id: 'task-1', status: 'todo' })
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus({ todo: [todo] }), statusFilter: 'all', pendingIds: [] }
    })

    await wrapper.findComponent(TaskColumn).vm.$emit('move', 'task-1', null)

    expect(wrapper.emitted('move')).toEqual([['task-1', 'todo', null]])
  })

  it('forwards createInColumn with the column status', async () => {
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus(), statusFilter: 'in_progress', pendingIds: [] }
    })

    await wrapper.findComponent(TaskColumn).vm.$emit('create')

    expect(wrapper.emitted('createInColumn')).toEqual([['in_progress']])
  })

  it('focusColumnAddButton(status) focuses that column\'s "+" button', async () => {
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus(), statusFilter: 'all', pendingIds: [] },
      attachTo: document.body
    })

    ;(wrapper.vm as unknown as { focusColumnAddButton: (status: TaskStatus) => void }).focusColumnAddButton('in_progress')

    const inProgressColumn = wrapper.findAllComponents(TaskColumn)[1]!
    expect(document.activeElement).toBe(inProgressColumn.find('button').element)
    wrapper.unmount()
  })

  it('focusColumnAddButton(status) is a silent no-op for a column hidden by the status filter', async () => {
    const wrapper = await mountSuspended(TaskBoard, {
      props: { tasksByStatus: tasksByStatus(), statusFilter: 'todo', pendingIds: [] },
      attachTo: document.body
    })

    expect(() =>
      (wrapper.vm as unknown as { focusColumnAddButton: (status: TaskStatus) => void }).focusColumnAddButton('done')
    ).not.toThrow()
    wrapper.unmount()
  })
})
