import { describe, expect, it } from 'vitest'
import {
  clearOAuthIntent,
  getDefaultDjDestination,
  getLocalDevelopmentPortError,
  getOAuthErrorFromState,
  getOAuthErrorMessage,
  getOAuthRedirectUrl,
  isSafeInternalPath,
  parseOAuthCallbackError,
  readOAuthIntent,
  storeOAuthIntent,
} from './oauthFlow'

describe('oauthFlow', () => {
  it('uses the current domain root as the OAuth redirect target', () => {
    expect(getOAuthRedirectUrl()).toBe('http://localhost:3000/')
  })

  it('stores and reads the post-login destination safely', () => {
    clearOAuthIntent()

    storeOAuthIntent('/dj/painel')
    expect(readOAuthIntent()).toBe('/dj/painel')

    clearOAuthIntent()
    expect(readOAuthIntent()).toBeNull()
  })

  it('ignores external or malformed destinations', () => {
    clearOAuthIntent()

    storeOAuthIntent('https://example.com')
    storeOAuthIntent('//example.com')
    expect(readOAuthIntent()).toBeNull()

    expect(isSafeInternalPath('/dj/painel')).toBe(true)
    expect(isSafeInternalPath('//example.com')).toBe(false)
  })

  it('parses provider errors from the query string and the fragment', () => {
    expect(parseOAuthCallbackError('?error=access_denied')).toEqual({
      code: 'access_denied',
      description: null,
    })
    expect(parseOAuthCallbackError('', '#error=server_error&error_description=boom')).toEqual({
      code: 'server_error',
      description: 'boom',
    })
    expect(parseOAuthCallbackError('?code=abc')).toBeNull()
  })

  it('translates provider errors into Portuguese messages', () => {
    expect(getOAuthErrorMessage('access_denied')).toMatch(/cancelou o login/i)
    expect(getOAuthErrorMessage('email_exists')).toMatch(/já existe uma conta/i)
    expect(getOAuthErrorMessage('desconhecido')).toMatch(/não foi possível concluir/i)
  })

  it('reads the OAuth error message from the router state', () => {
    expect(getOAuthErrorFromState({ oauthError: 'Falhou' })).toBe('Falhou')
    expect(getOAuthErrorFromState({})).toBeNull()
    expect(getOAuthErrorFromState(null)).toBeNull()
  })

  it('warns when the local development port does not match the authorized redirect', () => {
    expect(getLocalDevelopmentPortError()).toBeNull()
  })

  it('exposes the default DJ destination', () => {
    expect(getDefaultDjDestination()).toBe('/dj/painel')
  })
})
