import type { FetchError } from 'ofetch'

/** The plain, devalue-serializable shape of an `ApiError`, safe to hold in Pinia state. */
export interface ApiErrorState {
  statusCode: number | undefined
  message: string
  fieldErrors: Record<string, string[]>
  formErrors: string[]
}

/** A `$fetch` failure normalized to one shape, so components never touch fetch internals. */
export class ApiError extends Error implements ApiErrorState {
  statusCode: number | undefined
  fieldErrors: Record<string, string[]>
  formErrors: string[]

  constructor(state: ApiErrorState) {
    super(state.message)
    this.name = 'ApiError'
    this.statusCode = state.statusCode
    this.fieldErrors = state.fieldErrors
    this.formErrors = state.formErrors
  }

  /** A plain-object snapshot for state that gets serialized (the SSR payload cannot devalue a class instance). */
  toState(): ApiErrorState {
    return {
      statusCode: this.statusCode,
      message: this.message,
      fieldErrors: this.fieldErrors,
      formErrors: this.formErrors
    }
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

// Our own fallback wording when there is nothing more specific to show. A
// server `statusMessage` (English, set by the API) still wins when present:
// this utility normalizes shape, not translation of arbitrary server text —
// callers that display a message to the user (the store, in French) replace
// it with their own copy instead of relying on this fallback.
const FALLBACK_MESSAGES: Record<number, string> = {
  404: 'Tâche introuvable.',
  500: 'Une erreur est survenue côté serveur. Réessayez.'
}

/**
 * Normalizes any error thrown by `$fetch` against `/api/tasks` into one
 * shape: field and form issues for a 400, a readable message otherwise.
 */
export function toApiError(error: unknown): ApiError {
  // A non-fetch error (a bug in our own code) is not a connectivity problem:
  // say so distinctly instead of implying a network issue.
  if (!isFetchError(error)) {
    return new ApiError({ statusCode: undefined, message: 'Erreur inattendue.', fieldErrors: {}, formErrors: [] })
  }

  // ofetch defines `statusCode` on every FetchError it throws, even when the
  // request never got a response (network failure): it is just `undefined`.
  const statusCode = error.statusCode
  if (statusCode === undefined) {
    return new ApiError({
      statusCode: undefined,
      message: 'Erreur réseau. Vérifiez votre connexion et réessayez.',
      fieldErrors: {},
      formErrors: []
    })
  }

  const issues = error.data?.data?.issues

  if (statusCode === 400 && issues) {
    const formErrors = issues.formErrors ?? []
    const fieldErrors = issues.fieldErrors ?? {}
    return new ApiError({
      statusCode,
      message: formErrors[0] ?? Object.values(fieldErrors)[0]?.[0] ?? 'Requête invalide.',
      fieldErrors,
      formErrors
    })
  }

  return new ApiError({
    statusCode,
    message: error.statusMessage || FALLBACK_MESSAGES[statusCode] || 'Une erreur est survenue.',
    fieldErrors: {},
    formErrors: []
  })
}
