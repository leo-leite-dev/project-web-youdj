import { describe, expect, it } from 'vitest'
import { isValidRoomCode, normalizeRoomCode } from './roomCode'

describe('normalizeRoomCode', () => {
  it('removes surrounding spaces and converts to uppercase', () => {
    expect(normalizeRoomCode('  a1b2c3 ')).toBe('A1B2C3')
  })

  it('handles missing values safely', () => {
    expect(normalizeRoomCode(undefined)).toBe('')
    expect(normalizeRoomCode(null)).toBe('')
  })
})

describe('isValidRoomCode', () => {
  it('accepts six alphanumeric characters', () => {
    expect(isValidRoomCode('A1B2C3')).toBe(true)
    expect(isValidRoomCode('a1b2c3')).toBe(true)
  })

  it.each(['', 'ABC', 'ABCDEFG', 'ABC-12', 'ABC 12', 'ÁBC123'])(
    'rejects the invalid code %s',
    (code) => {
      expect(isValidRoomCode(code)).toBe(false)
    },
  )
})
