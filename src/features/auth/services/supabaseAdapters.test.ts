import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../../integrations/supabase/database.types'
import { createSupabaseAuthGateway } from './authGateway'
import { createSupabaseDjProfileStore } from './djProfileStore'

const userId = '11111111-1111-4111-8111-111111111111'
const projectUrl = 'https://example.supabase.co'
const publishableKey = 'sb_publishable_test'

function createTestClient(fetcher: typeof fetch) {
  return createClient<Database>(projectUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: { fetch: fetcher },
  })
}

function getUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input
  }

  return input instanceof URL ? input.toString() : input.url
}

describe('Supabase adapters', () => {
  it('sends signup metadata without overriding the configured confirmation redirect', async () => {
    let signupUrl = ''
    let requestBody: unknown
    const fetcher: typeof fetch = async (input, init) => {
      signupUrl = getUrl(input)
      expect(signupUrl).toContain('/auth/v1/signup')
      requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null

      return new Response(
        JSON.stringify({
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'dj@example.com',
          phone: '',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: { display_name: 'DJ Teste' },
          identities: [],
          created_at: '2026-11-02T12:00:00.000Z',
          updated_at: '2026-11-02T12:00:00.000Z',
        }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const gateway = createSupabaseAuthGateway(createTestClient(fetcher))
    const result = await gateway.signUp({
      displayName: 'DJ Teste',
      email: 'dj@example.com',
      password: 'senha-segura',
    })

    expect(result).toEqual({ needsEmailConfirmation: true, session: null })
    expect(requestBody).toMatchObject({
      data: { display_name: 'DJ Teste' },
      email: 'dj@example.com',
      password: 'senha-segura',
    })
    expect(signupUrl).not.toContain('redirect_to=')
  })

  it('creates a profile with conflict-ignore semantics and reads only that user profile', async () => {
    const urls: string[] = []
    const requestBodies: unknown[] = []
    const preferences: string[] = []
    const fetcher: typeof fetch = async (input, init) => {
      const url = getUrl(input)
      urls.push(url)

      if (url.includes('/rest/v1/dj_profiles')) {
        if (init?.method === 'POST') {
          requestBodies.push(typeof init.body === 'string' ? JSON.parse(init.body) : null)
          preferences.push(new Headers(init.headers).get('Prefer') ?? '')
          return new Response(null, { status: 204 })
        }

        return new Response(
          JSON.stringify({
            id: userId,
            display_name: 'DJ Teste',
            created_at: '2026-11-02T12:00:00.000Z',
            updated_at: '2026-11-02T12:00:00.000Z',
          }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 },
        )
      }

      throw new Error(`Unexpected request: ${url}`)
    }

    const store = createSupabaseDjProfileStore(createTestClient(fetcher))
    const profile = await store.createIfMissing(userId, 'DJ Teste')

    expect(profile).toMatchObject({ id: userId, displayName: 'DJ Teste' })
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('on_conflict=id')
    expect(urls[1]).toContain(`id=eq.${userId}`)
    expect(requestBodies).toEqual([{ display_name: 'DJ Teste', id: userId }])
    expect(preferences[0]).toContain('resolution=ignore-duplicates')
  })

  it('builds the official Google authorize URL with the authorized redirect', async () => {
    let requestCount = 0
    const fetcher: typeof fetch = async () => {
      requestCount += 1
      throw new Error('O fluxo implícito não deve realizar requisições de rede.')
    }

    const gateway = createSupabaseAuthGateway(createTestClient(fetcher))
    const result = await gateway.signInWithOAuth({
      provider: 'google',
      redirectTo: 'http://localhost:3000/',
    })

    expect(requestCount).toBe(0)
    expect(result.url).toContain('/auth/v1/authorize')
    expect(result.url).toContain('provider=google')
    expect(result.url).toContain(
      `redirect_to=${encodeURIComponent('http://localhost:3000/')}`,
    )
  })
})
