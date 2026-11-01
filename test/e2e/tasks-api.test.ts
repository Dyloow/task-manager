import { fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { Task } from '../../shared/types/task'

await setup({
  server: true,
  nuxtConfig: {
    nitro: {
      storage: {
        tasks: { driver: 'memory' }
      }
    }
  }
})

function api(path: string, options: RequestInit = {}) {
  return fetch(path, {
    ...options,
    headers: { 'content-type': 'application/json', ...options.headers },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  } as RequestInit)
}

describe('tasks API', () => {
  it('GET /api/tasks returns the seeded list', async () => {
    const response = await api('/api/tasks')

    expect(response.status).toBe(200)
    const tasks = (await response.json()) as Task[]
    expect(Array.isArray(tasks)).toBe(true)
    expect(tasks.length).toBeGreaterThan(0)
  })

  it('POST /api/tasks creates a task and returns 201', async () => {
    const response = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Write e2e tests' } as unknown as BodyInit
    })

    expect(response.status).toBe(201)
    const task = (await response.json()) as Task
    expect(task.title).toBe('Write e2e tests')
    expect(task.status).toBe('todo')
    expect(task.id).toBeTruthy()
  })

  it('PATCH /api/tasks/:id updates the status', async () => {
    const createResponse = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Task to update' } as unknown as BodyInit
    })
    const created = (await createResponse.json()) as Task

    const response = await api(`/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: { status: 'in_progress' } as unknown as BodyInit
    })

    expect(response.status).toBe(200)
    const updated = (await response.json()) as Task
    expect(updated.status).toBe('in_progress')
  })

  it('DELETE /api/tasks/:id removes the task', async () => {
    const createResponse = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Task to delete' } as unknown as BodyInit
    })
    const created = (await createResponse.json()) as Task

    const deleteResponse = await api(`/api/tasks/${created.id}`, { method: 'DELETE' })
    expect(deleteResponse.status).toBe(204)

    const listResponse = await api('/api/tasks')
    const tasks = (await listResponse.json()) as Task[]
    expect(tasks.find((task) => task.id === created.id)).toBeUndefined()
  })

  it('POST /api/tasks with an empty title returns 400 with field issues', async () => {
    const response = await api('/api/tasks', {
      method: 'POST',
      body: { title: '' } as unknown as BodyInit
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as { data?: { issues?: Record<string, string[]> } }
    expect(body.data?.issues?.title).toBeTruthy()
  })

  it('PATCH /api/tasks/:id with an unknown id returns 404', async () => {
    const response = await api('/api/tasks/unknown-id', {
      method: 'PATCH',
      body: { status: 'done' } as unknown as BodyInit
    })

    expect(response.status).toBe(404)
  })

  it('DELETE /api/tasks/:id with an unknown id returns 404', async () => {
    const response = await api('/api/tasks/unknown-id', { method: 'DELETE' })

    expect(response.status).toBe(404)
  })
})
