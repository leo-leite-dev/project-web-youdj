import { afterEach, describe, expect, it } from 'vitest'
import { readGuestRequestReceipts, saveGuestRequestReceipt } from './guestRequestReceipts'

afterEach(() => localStorage.clear())

describe('guest request receipt storage', () => {
  it('stores private receipts by room and expires them after 30 days', () => {
    const now = Date.parse('2026-11-06T12:00:00Z')
    const receipt = 'a'.repeat(64)
    expect(saveGuestRequestReceipt('A1B2C3D4E5', receipt, now)).toBe(true)
    expect(readGuestRequestReceipts('A1B2C3D4E5', now)).toEqual([{ privateCode: receipt, savedAt: new Date(now).toISOString() }])
    expect(readGuestRequestReceipts('OTHER00001', now)).toEqual([])
    expect(readGuestRequestReceipts('A1B2C3D4E5', now + 30 * 24 * 60 * 60 * 1000 + 1)).toEqual([])
  })

  it('rejects invalid receipt values and ignores malformed storage', () => {
    expect(saveGuestRequestReceipt('A1B2C3D4E5', 'not-a-receipt')).toBe(false)
    localStorage.setItem('youdj.guest.request-receipts.v1.A1B2C3D4E5', '{invalid')
    expect(readGuestRequestReceipts('A1B2C3D4E5')).toEqual([])
  })
})
