import { describe, expect, it } from 'vitest'
import { formatRequestedAt } from './formatRequestedAt'

describe('formatRequestedAt', () => {
  it('formats requests from today in the browser local time', () => {
    const now = new Date(2026, 10, 7, 22, 0)
    const requestedAt = new Date(2026, 10, 7, 21, 35)

    expect(formatRequestedAt(requestedAt.toISOString(), now)).toBe('Hoje, 21:35')
  })

  it('labels requests from the previous local calendar day as yesterday', () => {
    const now = new Date(2026, 10, 7, 1, 0)
    const requestedAt = new Date(2026, 10, 6, 20, 10)

    expect(formatRequestedAt(requestedAt.toISOString(), now)).toBe('Ontem, 20:10')
  })

  it('uses a local date and time for older requests', () => {
    const now = new Date(2026, 10, 8, 10, 0)
    const requestedAt = new Date(2026, 10, 6, 19, 45)

    expect(formatRequestedAt(requestedAt.toISOString(), now)).toBe('06/11/2026, 19:45')
  })

  it('returns null for an invalid timestamp', () => {
    expect(formatRequestedAt('invalid timestamp')).toBeNull()
  })
})
