import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { DraggableEvent } from 'vue-draggable-plus'
import type { Task } from '#shared/types/task'
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

describe('TaskColumn', () => {
  it('renders the status label, the visible count and every card', async () => {
    const tasks = [makeTask({ id: 'task-1' }), makeTask({ id: 'task-2' })]
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks, pendingIds: [] } })

    expect(wrapper.text()).toContain('À faire')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.findAll('li')).toHaveLength(2)
  })

  it('emits create when "+ Ajouter une tâche" is clicked', async () => {
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks: [], pendingIds: [] } })

    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('forwards a card open event with its id', async () => {
    const tasks = [makeTask({ id: 'task-1' })]
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks, pendingIds: [] } })

    // The card button is the first button rendered before the column's own "+" button.
    await wrapper.findAll('button')[0]!.trigger('click')

    expect(wrapper.emitted('open')).toEqual([['task-1']])
  })

  // Driving a real SortableJS drag in a headless DOM is not practical, so
  // these call the exposed handlers directly with a synthetic `newIndex`,
  // exactly as the library calls them after it has reordered `localTasks`
  // (vue-draggable-plus applies the new order to the bound array before
  // invoking the `update`/`add` callback).
  it('update: emits move with the next task in the column as beforeId', async () => {
    const tasks = [makeTask({ id: 'task-1', position: 0 }), makeTask({ id: 'task-2', position: 1 }), makeTask({ id: 'task-3', position: 2 })]
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks, pendingIds: [] } })

    // task-1 dragged to index 1: task-2 now follows it.
    ;(wrapper.vm as unknown as { handleUpdate: (event: DraggableEvent<Task>) => void }).handleUpdate({
      newIndex: 0
    } as DraggableEvent<Task>)

    expect(wrapper.emitted('move')).toEqual([['task-1', 'task-2']])
  })

  it('update: emits move with beforeId null when dropped at the end of the column', async () => {
    const tasks = [makeTask({ id: 'task-1', position: 0 }), makeTask({ id: 'task-2', position: 1 })]
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks, pendingIds: [] } })

    ;(wrapper.vm as unknown as { handleUpdate: (event: DraggableEvent<Task>) => void }).handleUpdate({
      newIndex: 1
    } as DraggableEvent<Task>)

    expect(wrapper.emitted('move')).toEqual([['task-2', null]])
  })

  it('add: a priority-filtered column only has the visible tasks, so beforeId is the next visible card', async () => {
    // The store already excludes the medium/low priority cards before this
    // prop is passed in: the column itself never sees them.
    const tasks = [makeTask({ id: 'high-1', priority: 'high', position: 0 }), makeTask({ id: 'high-2', priority: 'high', position: 3 })]
    const wrapper = await mountSuspended(TaskColumn, { props: { status: 'todo', tasks, pendingIds: [] } })

    ;(wrapper.vm as unknown as { handleAdd: (event: DraggableEvent<Task>) => void }).handleAdd({
      newIndex: 0
    } as DraggableEvent<Task>)

    expect(wrapper.emitted('move')).toEqual([['high-1', 'high-2']])
  })

  it('focusAddButton() moves focus to the "+ Ajouter une tâche" button', async () => {
    const wrapper = await mountSuspended(TaskColumn, {
      props: { status: 'todo', tasks: [], pendingIds: [] },
      attachTo: document.body
    })

    ;(wrapper.vm as unknown as { focusAddButton: () => void }).focusAddButton()

    expect(document.activeElement).toBe(wrapper.find('button').element)
    wrapper.unmount()
  })
})
