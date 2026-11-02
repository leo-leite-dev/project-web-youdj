import { AuthApiError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage, getProfileErrorMessage } from './authErrors'

describe('auth error messages', () => {
  it('maps credential and email-confirmation errors to Portuguese feedback', () => {
    expect(
      getAuthErrorMessage(new AuthApiError('invalid', 400, 'invalid_credentials')),
    ).toBe('E-mail ou senha inválidos.')
    expect(
      getAuthErrorMessage(new AuthApiError('not confirmed', 400, 'email_not_confirmed')),
    ).toMatch(/confirme seu e-mail/i)
  })

  it('explains missing public configuration without exposing secret values', () => {
    const error = new Error(
      'Variável de ambiente obrigatória ausente: VITE_SUPABASE_URL. Configure o arquivo .env.local.',
    )

    expect(getAuthErrorMessage(error)).toMatch(/VITE_SUPABASE_URL/)
    expect(getProfileErrorMessage(error)).toMatch(/variáveis públicas/i)
  })

  it('does not expose raw profile errors to the interface', () => {
    const message = getProfileErrorMessage({ code: '42501', message: 'private database detail' })

    expect(message).toMatch(/permissão/i)
    expect(message).not.toContain('private database detail')
  })
})
