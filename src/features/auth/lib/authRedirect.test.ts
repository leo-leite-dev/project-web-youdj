import { describe, expect, it } from 'vitest'
import { getDjRedirectTarget, isAnonymousRedirect } from './authRedirect'

describe('authRedirect', () => {
  it('accepts internal panel paths and rejects external targets', () => {
    expect(getDjRedirectTarget({ from: '/dj/painel' })).toBe('/dj/painel')
    expect(getDjRedirectTarget({ from: '/dj/painel?aba=salas' })).toBe(
      '/dj/painel?aba=salas',
    )
    expect(getDjRedirectTarget({ from: 'https://example.com' })).toBe('/dj/painel')
    expect(getDjRedirectTarget({ from: '//example.com' })).toBe('/dj/painel')
    expect(getDjRedirectTarget('/dj/painel')).toBe('/dj/painel')
  })

  it('reads the anonymous redirect reason safely', () => {
    expect(isAnonymousRedirect({ reason: 'anonymous' })).toBe(true)
    expect(isAnonymousRedirect({ reason: 'unauthenticated' })).toBe(false)
    expect(isAnonymousRedirect(null)).toBe(false)
  })
})
