import { createClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../../integrations/supabase/database.types'
import { createSupabaseRoomStore } from './roomStore'

const djId = '11111111-1111-4111-8111-111111111111'
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

function roomRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    dj_id: djId,
    name: 'Festa Teste',
    status: 'active',
    code: 'AB12CD34EF',
    created_at: '2026-11-03T12:00:00.000Z',
    updated_at: '2026-11-03T12:00:00.000Z',
    ...overrides,
  }
}

describe('SupabaseRoomStore', () => {
  it('creates a room with the owner and representation returned', async () => {
    let requestUrl = ''
    let requestBody: unknown
    let prefer: string | null = null
    let accept: string | null = null
    const fetcher: typeof fetch = async (input, init) => {
      requestUrl = getUrl(input)
      requestBody = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      const headers = new Headers(init?.headers)
      prefer = headers.get('Prefer')
      accept = headers.get('Accept')

      return new Response(JSON.stringify(roomRow()), {
        headers: { 'Content-Type': 'application/json' },
        status: 201,
      })
    }

    const store = createSupabaseRoomStore(createTestClient(fetcher))
    const room = await store.create({ djId, name: 'Festa Teste' })

    expect(requestUrl).toContain('/rest/v1/rooms')
    expect(requestBody).toEqual({ dj_id: djId, name: 'Festa Teste' })
    expect(prefer).toContain('return=representation')
    expect(accept).toContain('vnd.pgrst.object')
    expect(room).toMatchObject({
      djId,
      name: 'Festa Teste',
      status: 'active',
    })
  })

  it('lists only the owner rooms ordered by creation', async () => {
    let requestUrl = ''
    const fetcher: typeof fetch = async (input) => {
      requestUrl = getUrl(input)

      return new Response(
        JSON.stringify([
          roomRow(),
          roomRow({
            id: 'bbbbbbbb-1111-4111-8111-111111111111',
            name: 'Festa Pausada',
            status: 'paused',
          }),
        ]),
        { headers: { 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const store = createSupabaseRoomStore(createTestClient(fetcher))
    const rooms = await store.listByDj(djId)

    expect(requestUrl).toContain('/rest/v1/rooms')
    expect(requestUrl).toContain(`dj_id=eq.${djId}`)
    expect(requestUrl).toContain('order=created_at.desc')
    expect(requestUrl).toContain('code')
    expect(rooms).toHaveLength(2)
    expect(rooms[0]).toMatchObject({
      name: 'Festa Teste',
      status: 'active',
      code: 'AB12CD34EF',
    })
    expect(rooms[1]).toMatchObject({ name: 'Festa Pausada', status: 'paused' })
  })

  it('propagates REST errors to the caller', async () => {
    const fetcher: typeof fetch = async () =>
      new Response(JSON.stringify({ code: '42501', message: 'permission denied' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 403,
      })

    const store = createSupabaseRoomStore(createTestClient(fetcher))

    await expect(store.create({ djId, name: 'Festa Teste' })).rejects.toMatchObject({
      code: '42501',
    })
  })
})
