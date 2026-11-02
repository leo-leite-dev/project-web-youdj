import { describe, expect, it } from 'vitest'
import { getRoomNameError, normalizeRoomName } from './roomValidation'

describe('roomValidation', () => {
  it('normalizes room names', () => {
    expect(normalizeRoomName('  Festa   da Ana  ')).toBe('Festa da Ana')
  })

  it('requires a non-empty name', () => {
    expect(getRoomNameError('')).toBe('Informe o nome da sala.')
    expect(getRoomNameError('    ')).toBe('Informe o nome da sala.')
  })

  it('enforces the length limits', () => {
    expect(getRoomNameError('a')).toBe('O nome da sala deve ter pelo menos 2 caracteres.')
    expect(getRoomNameError('a'.repeat(61))).toBe(
      'O nome da sala deve ter no máximo 60 caracteres.',
    )
    expect(getRoomNameError(' Festa da Ana ')).toBeNull()
  })
})
