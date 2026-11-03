import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../../integrations/supabase/database.types'
import { createSupabasePublicRoomStore } from './publicRoomStore'

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

describe('SupabasePublicRoomStore', () => {
  it('queries the public rpc with the normalized code and maps only public fields', async () => {
    let requestUrl = ''
    let requestBody: unknown
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = getUrl(input)
      requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null

      return new Response(
        JSON.stringify([{ code: 'AB12CD34EF', name: 'Festa Teste', status: 'active', surprise_mode: true, show_playlist: false, show_now_playing: true, show_guest_requests: false }]),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const store = createSupabasePublicRoomStore(createTestClient(fetcher))
    const room = await store.findByCode(' ab12cd34ef ')

    expect(requestUrl).toContain('/rest/v1/rpc/room_by_code')
    expect(requestBody).toEqual({ p_code: 'AB12CD34EF' })
    expect(room).toEqual({ code: 'AB12CD34EF', name: 'Festa Teste', status: 'active', musicPreferences: { surpriseMode: true, showPlaylist: false, showNowPlaying: true, showGuestRequests: false } })
  })

  it('returns null when the code does not exist', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })

    const store = createSupabasePublicRoomStore(createTestClient(fetcher))

    await expect(store.findByCode('ZZ99ZZ99ZZ')).resolves.toBeNull()
  })

  it('propagates rpc errors to the caller', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 403,
      })

    const store = createSupabasePublicRoomStore(createTestClient(fetcher))

    await expect(store.findByCode('AB12CD34EF')).rejects.toMatchObject({ code: '42501' })
  })
})
