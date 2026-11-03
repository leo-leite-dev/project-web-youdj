import { describe, expect, it } from 'vitest'
import { isValidRoomCode, normalizeRoomCode } from './roomCode'

describe('normalizeRoomCode', () => {
  it('removes surrounding spaces and converts to uppercase', () => {
    expect(normalizeRoomCode('  a1b2c3d4e5 ')).toBe('A1B2C3D4E5')
  })

  it('handles missing values safely', () => {
    expect(normalizeRoomCode(undefined)).toBe('')
    expect(normalizeRoomCode(null)).toBe('')
  })
})

describe('isValidRoomCode', () => {
  it('accepts ten alphanumeric characters', () => {
    expect(isValidRoomCode('A1B2C3D4E5')).toBe(true)
    expect(isValidRoomCode('a1b2c3d4e5')).toBe(true)
  })

  it.each(['', 'ABC', 'A1B2C3D4E', 'A1B2C3D4E5F', 'ABC-123456', 'ABC 123456', 'ÁBC1234567'])(
    'rejects the invalid code %s',
    (code) => {
      expect(isValidRoomCode(code)).toBe(false)
    },
  )
})
