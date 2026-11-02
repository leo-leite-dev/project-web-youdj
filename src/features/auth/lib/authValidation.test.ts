import { describe, expect, it } from 'vitest'
import {
  getDisplayNameError,
  getEmailError,
  getLoginPasswordError,
  getPasswordConfirmationError,
  getSignUpPasswordError,
  normalizeDisplayName,
  normalizeEmail,
} from './authValidation'

describe('authValidation', () => {
  it('normalizes e-mail and display name', () => {
    expect(normalizeEmail('  DJ@Example.COM ')).toBe('dj@example.com')
    expect(normalizeDisplayName('  DJ   Teste  ')).toBe('DJ Teste')
  })

  it('validates e-mail', () => {
    expect(getEmailError('dj@example.com')).toBeNull()
    expect(getEmailError(' ')).toMatch(/informe seu e-mail/i)
    expect(getEmailError('email-invalido')).toMatch(/e-mail válido/i)
  })

  it('requires a display name between 2 and 80 characters', () => {
    expect(getDisplayNameError('DJ Teste')).toBeNull()
    expect(getDisplayNameError('A')).toMatch(/pelo menos 2/i)
    expect(getDisplayNameError('A'.repeat(81))).toMatch(/máximo 80/i)
  })

  it('applies different password rules for login and signup', () => {
    expect(getLoginPasswordError('123456')).toBeNull()
    expect(getSignUpPasswordError('123456')).toMatch(/pelo menos 8/i)
    expect(getSignUpPasswordError('12345678')).toBeNull()
    expect(getSignUpPasswordError('a'.repeat(73))).toMatch(/máximo 72/i)
  })

  it('requires matching password confirmation', () => {
    expect(getPasswordConfirmationError('senha123', 'senha123')).toBeNull()
    expect(getPasswordConfirmationError('senha123', 'senha124')).toMatch(/não coincidem/i)
  })
})
