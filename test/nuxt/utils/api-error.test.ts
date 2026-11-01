import { createError } from 'h3'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import { afterEach, describe, expect, it } from 'vitest'
import type { ApiError } from '~/utils/api-error'
import { toApiError } from '~/utils/api-error'

const cleanups: Array<() => void> = []

function mockEndpoint(url: string, options: Parameters<typeof registerEndpoint>[1]) {
  cleanups.push(registerEndpoint(url, options))
}

/** Calls `$fetch` and expects it to reject, normalizing the rejection into an `ApiError`. */
async function expectApiError(call: () => Promise<unknown>): Promise<ApiError> {
  try {
    await call()
  } catch (error) {
    return toApiError(error)
  }
  throw new Error('expected the request to fail')
}

afterEach(() => {
  while (cleanups.length) cleanups.pop()!()
})

describe('toApiError', () => {
  it('reads field and form issues out of a 400 response', async () => {
    mockEndpoint('/__mock/create-task', {
      method: 'POST',
      handler: () => {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid request body',
          data: { issues: { formErrors: [], fieldErrors: { title: ['Title is required'] } } }
        })
      }
    })

    const apiError = await expectApiError(() => $fetch<unknown>('/__mock/create-task', { method: 'POST', body: {} }))

    expect(apiError.statusCode).toBe(400)
    expect(apiError.fieldErrors.title).toEqual(['Title is required'])
    expect(apiError.message).toBe('Title is required')
  })

  it('reads a root (form) issue out of a 400 response', async () => {
    mockEndpoint('/__mock/patch-task', {
      method: 'PATCH',
      handler: () => {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid request body',
          data: { issues: { formErrors: ['At least one field is required'], fieldErrors: {} } }
        })
      }
    })

    const apiError = await expectApiError(() => $fetch<unknown>('/__mock/patch-task', { method: 'PATCH', body: {} }))

    expect(apiError.statusCode).toBe(400)
    expect(apiError.formErrors).toEqual(['At least one field is required'])
    expect(apiError.message).toBe('At least one field is required')
  })

  it('falls back to a readable message on a 404', async () => {
    mockEndpoint('/__mock/missing-task', {
      method: 'DELETE',
      handler: () => {
        throw createError({ statusCode: 404, statusMessage: 'Task not found' })
      }
    })

    const apiError = await expectApiError(() => $fetch<unknown>('/__mock/missing-task', { method: 'DELETE' }))

    expect(apiError.statusCode).toBe(404)
    expect(apiError.message).toBe('Task not found')
    expect(apiError.fieldErrors).toEqual({})
    expect(apiError.formErrors).toEqual([])
  })

  it('falls back to a readable message on a 500', async () => {
    mockEndpoint('/__mock/corrupted', {
      method: 'GET',
      handler: () => {
        throw createError({ statusCode: 500, statusMessage: 'Task data is corrupted' })
      }
    })

    const apiError = await expectApiError(() => $fetch<unknown>('/__mock/corrupted'))

    expect(apiError.statusCode).toBe(500)
    expect(apiError.message).toBe('Task data is corrupted')
  })

  it('yields a readable message when the request never gets a response', () => {
    // Shaped like the `FetchError` ofetch throws when a request never gets a
    // response: `statusCode` is defined on the instance, just `undefined`
    // (see node_modules/ofetch/dist/shared/ofetch.CWycOUEr.mjs, createFetchError).
    const networkError = Object.assign(new Error('fetch failed'), { statusCode: undefined })

    const apiError = toApiError(networkError)

    expect(apiError.statusCode).toBeUndefined()
    expect(apiError.message).toBe('Network error. Check your connection and try again.')
  })

  it('yields a generic message for a non-fetch error (a bug, not a connectivity issue)', () => {
    const apiError = toApiError(new Error('boom'))

    expect(apiError.statusCode).toBeUndefined()
    expect(apiError.message).toBe('Unexpected error.')
  })

  it('is an instance of Error', () => {
    const apiError = toApiError(new Error('boom'))

    expect(apiError).toBeInstanceOf(Error)
  })
})
