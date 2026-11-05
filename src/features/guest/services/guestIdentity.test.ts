import { afterEach, describe, expect, it } from 'vitest'
import { createGuestIdentity, readGuestIdentity, saveGuestIdentity } from './guestIdentity'

afterEach(() => localStorage.clear())

describe('guest browser identity', () => {
  it('normalizes a nickname and reuses the same unverified id from browser storage', () => {
    const identity = createGuestIdentity('  Ana   DJ  ')
    if (!identity) throw new Error('Expected a valid guest nickname.')
    expect(identity).toMatchObject({ nickname: 'Ana DJ' })
    expect(identity.guestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(saveGuestIdentity(identity)).toBe(true)
    expect(readGuestIdentity()).toEqual(identity)
  })

  it('does not create an identity from an empty or oversized nickname', () => {
    expect(createGuestIdentity('  ')).toBeNull()
    expect(createGuestIdentity('a'.repeat(41))).toBeNull()
  })

  it('ignores malformed browser storage', () => {
    localStorage.setItem('youdj.guest.identity.v1', '{broken')
    expect(readGuestIdentity()).toBeNull()
  })
})
