import type { FetchError } from 'ofetch'

export interface ApiError {
  statusCode: number | undefined
  message: string
  fieldErrors: Record<string, string[]>
  formErrors: string[]
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

/**
 * Normalizes any error thrown by `$fetch` against `/api/tasks` into one
 * shape: field and form issues for a 400, a readable message otherwise.
 */
export function toApiError(error: unknown): ApiError {
  // ofetch defines `statusCode` on every FetchError it throws, even when the
  // request never got a response (network failure): it is just `undefined`.
  // A missing property means this was not thrown by `$fetch` at all.
  if (!isFetchError(error)) {
    return {
      statusCode: undefined,
      message: 'Network error. Check your connection and try again.',
      fieldErrors: {},
      formErrors: []
    }
  }

  const statusCode = error.statusCode
  if (statusCode === undefined) {
    return {
      statusCode: undefined,
      message: 'Network error. Check your connection and try again.',
      fieldErrors: {},
      formErrors: []
    }
  }

  const issues = error.data?.data?.issues

  if (statusCode === 400 && issues) {
    const formErrors = issues.formErrors ?? []
    const fieldErrors = issues.fieldErrors ?? {}
    return {
      statusCode,
      message: formErrors[0] ?? Object.values(fieldErrors)[0]?.[0] ?? 'Invalid request.',
      fieldErrors,
      formErrors
    }
  }

  return {
    statusCode,
    message: error.statusMessage || FALLBACK_MESSAGES[statusCode] || 'Something went wrong.',
    fieldErrors: {},
    formErrors: []
  }
}
