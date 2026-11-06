import { describe, expect, it } from 'vitest'
import { getRoomErrorMessage } from './roomErrors'

describe('getRoomErrorMessage', () => {
  it('distinguishes missing room RPCs from an empty room result', () => {
    expect(getRoomErrorMessage({ code: 'PGRST202' }, 'fallback')).toContain('migrations locais')
    expect(getRoomErrorMessage({ code: '42883' }, 'fallback')).toContain('migrations locais')
  })

  it('explains room-level authorization failures without implying an empty result', () => {
    expect(getRoomErrorMessage({ code: '42501' }, 'fallback')).toContain('proprietário ou moderador')
  })
})
