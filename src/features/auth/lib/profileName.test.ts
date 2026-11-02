import { describe, expect, it } from 'vitest'
import { makeAuthUser } from '../../../test/authTestDoubles'
import { resolveProfileDisplayName } from './profileName'

describe('resolveProfileDisplayName', () => {
  it('uses and normalizes a valid metadata name', () => {
    expect(
      resolveProfileDisplayName(
        makeAuthUser({ metadataDisplayName: '  DJ   Normandy  ' }),
      ),
    ).toBe('DJ Normandy')
  })

  it('uses a non-identifying fallback when metadata is invalid', () => {
    expect(
      resolveProfileDisplayName(
        makeAuthUser({ email: 'normandy.dj@example.com', metadataDisplayName: ' ' }),
      ),
    ).toBe('DJ')
  })

  it('uses a safe fallback when no usable name exists', () => {
    expect(
      resolveProfileDisplayName(
        makeAuthUser({ email: null, metadataDisplayName: null }),
      ),
    ).toBe('DJ')
  })
})
