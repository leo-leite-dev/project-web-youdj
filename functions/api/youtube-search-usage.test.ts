import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestGet } from './youtube-search-usage'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-key-never-returned',
}

afterEach(() => vi.restoreAllMocks())

describe('YouTube search usage endpoint', () => {
  it('returns only the global estimate and Pacific reset metadata', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({
      callsToday: 17,
      dailyQuota: 100,
      quotaDay: '2026-11-05',
      nextResetAt: '2026-11-06T08:00:00+00:00',
      internalDetail: 'not-for-clients',
    }))

    const response = await onRequestGet({ request: new Request('https://example.test/api/youtube-search-usage'), env })
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      callsToday: 17,
      dailyQuota: 100,
      quotaDay: '2026-11-05',
      nextResetAt: '2026-11-06T08:00:00+00:00',
    })
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/rpc/youtube_search_usage_snapshot')
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({ p_record_call: false })
    expect(JSON.stringify(body)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('does not leak backend details when the private RPC is unavailable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json({ message: 'private backend detail' }, { status: 403 }))

    const response = await onRequestGet({ request: new Request('https://example.test/api/youtube-search-usage'), env })

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'O contador está temporariamente indisponível.' })
  })
})
