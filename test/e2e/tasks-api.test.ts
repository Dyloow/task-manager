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

interface ApiRequestInit {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

function api(path: string, options: ApiRequestInit = {}): Promise<Response> {
  const { method, body, headers } = options
  return fetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
}

interface ValidationErrorBody {
  data?: {
    issues?: {
      formErrors?: string[]
      fieldErrors?: Record<string, string[]>
    }
  }
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
      body: { title: 'Write e2e tests' }
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
      body: { title: 'Task to update' }
    })
    const created = (await createResponse.json()) as Task

    const response = await api(`/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: { status: 'in_progress' }
    })

    expect(response.status).toBe(200)
    const updated = (await response.json()) as Task
    expect(updated.status).toBe('in_progress')
  })

  it('DELETE /api/tasks/:id removes the task', async () => {
    const createResponse = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Task to delete' }
    })
    const created = (await createResponse.json()) as Task

    const deleteResponse = await api(`/api/tasks/${created.id}`, { method: 'DELETE' })
    expect(deleteResponse.status).toBe(204)

    const listResponse = await api('/api/tasks')
    const tasks = (await listResponse.json()) as Task[]
    expect(tasks.find((task) => task.id === created.id)).toBeUndefined()
  })

  it('POST /api/tasks with an empty title returns 400 with a field issue', async () => {
    const response = await api('/api/tasks', {
      method: 'POST',
      body: { title: '' }
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as ValidationErrorBody
    expect(body.data?.issues?.fieldErrors?.title).toBeTruthy()
  })

  it('POST /api/tasks with forged id and createdAt returns 400', async () => {
    const response = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Forged fields', id: 'forged-id', createdAt: '2020-01-01T00:00:00.000Z' }
    })

    expect(response.status).toBe(400)
  })

  it('PATCH /api/tasks/:id with an empty body returns 400 with a root issue', async () => {
    const createResponse = await api('/api/tasks', {
      method: 'POST',
      body: { title: 'Task for empty patch' }
    })
    const created = (await createResponse.json()) as Task

    const response = await api(`/api/tasks/${created.id}`, {
      method: 'PATCH',
      body: {}
    })

    expect(response.status).toBe(400)
    const body = (await response.json()) as ValidationErrorBody
    expect(body.data?.issues?.formErrors?.length).toBeGreaterThan(0)
  })

  it('PATCH /api/tasks/:id with an unknown id returns 404', async () => {
    const response = await api('/api/tasks/unknown-id', {
      method: 'PATCH',
      body: { status: 'done' }
    })

    expect(response.status).toBe(404)
  })

  it('DELETE /api/tasks/:id with an unknown id returns 404', async () => {
    const response = await api('/api/tasks/unknown-id', { method: 'DELETE' })

    expect(response.status).toBe(404)
  })

  it('persists exactly 20 more tasks after 20 parallel POSTs', async () => {
    const beforeResponse = await api('/api/tasks')
    const before = (await beforeResponse.json()) as Task[]

    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, index) =>
        api('/api/tasks', { method: 'POST', body: { title: `Parallel task ${index}` } })
      )
    )
    expect(responses.every((response) => response.status === 201)).toBe(true)

    const afterResponse = await api('/api/tasks')
    expect(afterResponse.status).toBe(200)
    const after = (await afterResponse.json()) as Task[]

    expect(Array.isArray(after)).toBe(true)
    expect(after).toHaveLength(before.length + 20)
    for (const task of after) {
      expect(typeof task.id).toBe('string')
      expect(typeof task.title).toBe('string')
    }
    expect(new Set(after.map((task) => task.id)).size).toBe(after.length)
  })
})
