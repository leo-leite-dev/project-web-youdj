const DEFAULT_DJ_REDIRECT = '/dj/painel'

export function getDjRedirectTarget(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) {
    return DEFAULT_DJ_REDIRECT
  }

  const { from } = state

  if (typeof from !== 'string' || !from.startsWith('/dj/') || from.startsWith('//')) {
    return DEFAULT_DJ_REDIRECT
  }

  return from
}

export function isAnonymousRedirect(state: unknown): boolean {
  return (
    typeof state === 'object' &&
    state !== null &&
    'reason' in state &&
    state.reason === 'anonymous'
  )
}
