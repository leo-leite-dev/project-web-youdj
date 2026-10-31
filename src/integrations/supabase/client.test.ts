import { describe, expect, it } from 'vitest'
import { createSupabaseClient } from './client'

const validEnvironment = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
}

describe('createSupabaseClient', () => {
  it('creates a client when the public configuration is present', () => {
    const client = createSupabaseClient(validEnvironment)

    expect(client).toBeDefined()
  })

  it('rejects a missing URL', () => {
    expect(() =>
      createSupabaseClient({ ...validEnvironment, VITE_SUPABASE_URL: undefined }),
    ).toThrow(/VITE_SUPABASE_URL/)
  })

  it('rejects a missing publishable key', () => {
    expect(() =>
      createSupabaseClient({
        ...validEnvironment,
        VITE_SUPABASE_PUBLISHABLE_KEY: undefined,
      }),
    ).toThrow(/VITE_SUPABASE_PUBLISHABLE_KEY/)
  })

  it('rejects blank values', () => {
    expect(() =>
      createSupabaseClient({ ...validEnvironment, VITE_SUPABASE_URL: '   ' }),
    ).toThrow(/VITE_SUPABASE_URL/)
  })
})
