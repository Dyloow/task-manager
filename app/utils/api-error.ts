import type { FetchError } from 'ofetch'

export interface ApiErrorOptions {
  statusCode: number | undefined
  message: string
  fieldErrors?: Record<string, string[]>
  formErrors?: string[]
}

/** A `$fetch` failure normalized to one shape, so components never touch fetch internals. */
export class ApiError extends Error {
  statusCode: number | undefined
  fieldErrors: Record<string, string[]>
  formErrors: string[]

  constructor(options: ApiErrorOptions) {
    super(options.message)
    this.name = 'ApiError'
    this.statusCode = options.statusCode
    this.fieldErrors = options.fieldErrors ?? {}
    this.formErrors = options.formErrors ?? []
  }
}

interface ErrorIssues {
  formErrors?: string[]
  fieldErrors?: Record<string, string[]>
}

interface ErrorResponseBody {
  data?: {
    issues?: ErrorIssues
  }
}

function isFetchError(error: unknown): error is FetchError<ErrorResponseBody> {
  return error instanceof Error && 'statusCode' in error
}

const FALLBACK_MESSAGES: Record<number, string> = {
  404: 'Task not found.',
  500: 'Something went wrong on the server. Please try again.'
}

function networkError(): ApiError {
  return new ApiError({
    statusCode: undefined,
    message: 'Network error. Check your connection and try again.'
  })
}

/**
 * Normalizes any error thrown by `$fetch` against `/api/tasks` into one
 * shape: field and form issues for a 400, a readable message otherwise.
 */
export function toApiError(error: unknown): ApiError {
  // A non-fetch error (a bug in our own code) is not a connectivity problem:
  // say so distinctly instead of implying a network issue.
  if (!isFetchError(error)) {
    return new ApiError({ statusCode: undefined, message: 'Unexpected error.' })
  }

  // ofetch defines `statusCode` on every FetchError it throws, even when the
  // request never got a response (network failure): it is just `undefined`.
  const statusCode = error.statusCode
  if (statusCode === undefined) {
    return networkError()
  }

  const issues = error.data?.data?.issues

  if (statusCode === 400 && issues) {
    const formErrors = issues.formErrors ?? []
    const fieldErrors = issues.fieldErrors ?? {}
    return new ApiError({
      statusCode,
      message: formErrors[0] ?? Object.values(fieldErrors)[0]?.[0] ?? 'Invalid request.',
      fieldErrors,
      formErrors
    })
  }

  return new ApiError({
    statusCode,
    message: error.statusMessage || FALLBACK_MESSAGES[statusCode] || 'Something went wrong.'
  })
}
