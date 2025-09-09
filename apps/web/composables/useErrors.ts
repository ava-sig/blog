export type ApiErrorLike = Error & { status?: number; code?: string; description?: string }

const messages: Record<string, string> = {
  token_missing: 'Authentication required. Please provide your token.',
  token_invalid: 'Your token is invalid. Please check and try again.',
  token_expired: 'Your token has expired. Generate a new one and try again.',
  insufficient_scope: 'Your token lacks permission to edit. Admin scope required.',
  auth_required: 'Authentication is required to perform this action.',
}

export function useErrors() {
  function messageForCode(code?: string, fallback?: string) {
    if (!code) return fallback || 'Request failed'
    return messages[code] || fallback || 'Request failed'
  }

  function formatApiError(e: unknown): { title: string; detail?: string; code?: string } {
    const err = (e || {}) as ApiErrorLike
    const code = err.code || ''
    const desc = err.description || ''
    const title = messageForCode(code, err.message)
    const detail = desc || undefined
    return { title, detail, code }
  }

  return { formatApiError }
}
