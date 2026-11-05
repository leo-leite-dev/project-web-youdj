import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './music-search'

const env = {
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
}

function request(body: unknown, headers: HeadersInit = {}) {
  return new Request('https://youdj.example.test/api/music-search', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/music-search', () => {
  afterEach(() => vi.restoreAllMocks())

  it('validates input and rejects malformed requests before calling Supabase', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({ roomCode: 'bad', query: 'x' }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('queries the private catalog RPC and returns only bounded music metadata', async () => {
    const recordingMbid = '5a6b7c8d-1234-4abc-8def-0123456789ab'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [{ recordingMbid, title: 'Livin’ on a Prayer', artist: 'Bon Jovi' }],
      has_more: true,
      next_offset: 10,
    }), { status: 200 }))

    const response = await onRequestPost({
      request: request({ roomCode: 'SAJPZU3YDE', query: '  bon   jovi ', offset: 0 }, { 'CF-Connecting-IP': '192.0.2.10' }),
      env,
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      results: [{ recordingMbid, title: 'Livin’ on a Prayer', artist: 'Bon Jovi' }],
      hasMore: true,
      nextOffset: 10,
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://db.example.test/rest/v1/rpc/guest_music_catalog_search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apikey: env.SUPABASE_SERVICE_ROLE_KEY }),
        body: JSON.stringify({
          p_code: 'SAJPZU3YDE',
          p_query: 'bon jovi',
          p_ip: '192.0.2.10',
          p_limit: 10,
          p_offset: 0,
        }),
      }),
    )
    expect(JSON.stringify(body)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('maps catalog rate limiting without contacting YouTube', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'rate_limited' }), { status: 200 }))
    const response = await onRequestPost({
      request: request({ roomCode: 'SAJPZU3YDE', query: 'bon jovi' }),
      env,
    })

    expect(response.status).toBe(429)
    expect(await response.json()).toMatchObject({ code: 'rate_limited' })
  })

  it('rejects malformed catalog rows from the backend', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [{ recordingMbid: 'invalid', title: 'song', artist: 'artist' }],
      has_more: false,
      next_offset: null,
    }), { status: 200 }))
    const response = await onRequestPost({
      request: request({ roomCode: 'SAJPZU3YDE', query: 'bon jovi' }),
      env,
    })

    expect(response.status).toBe(503)
    expect(await response.json()).toMatchObject({ code: 'catalog_unavailable' })
  })
})
