import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './youtube-search'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-key-never-returned',
  YOUTUBE_API_KEY: 'youtube-key-never-returned',
}

function request(query = 'artista teste') {
  return new Request('https://localhost/api/youtube-search', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ roomCode: 'A1B2C3D4E5', query }),
  })
}

function supabaseResponse(body: unknown, status = 200) {
  return Response.json(body, { status })
}

afterEach(() => vi.restoreAllMocks())

describe('YouTube Pages Function', () => {
  it('reports missing server configuration without pretending the search succeeded', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({ request: request(), env: { ...env, YOUTUBE_API_KEY: undefined } })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ code: 'youtube_key_missing' })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('parses YouTube results and stores them in the existing shared cache', async () => {
    const video = {
      id: { videoId: 'abcdefghijk' },
      snippet: {
        title: 'Canção real',
        channelTitle: 'Canal real',
        thumbnails: { medium: { url: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' } },
      },
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ cached: false }))
      .mockResolvedValueOnce(supabaseResponse({ items: [video] }))
      .mockResolvedValueOnce(supabaseResponse({ callsToday: 1 }))
      .mockResolvedValueOnce(supabaseResponse(true))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({
      available: true,
      videos: [{
        videoId: 'abcdefghijk',
        title: 'Canção real',
        channel: 'Canal real',
        thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
      }],
    })
    expect(fetchSpy).toHaveBeenCalledTimes(4)
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('youtube/v3/search')
    expect(fetchSpy.mock.calls.filter(([url]) => String(url).includes('youtube/v3/search'))).toHaveLength(1)
    expect(String(fetchSpy.mock.calls[2]?.[0])).toContain('/rpc/youtube_search_usage_snapshot')
    expect(JSON.parse(String(fetchSpy.mock.calls[2]?.[1]?.body))).toEqual({ p_record_call: true })
    expect(JSON.stringify(payload)).not.toContain(env.YOUTUBE_API_KEY)
    expect(JSON.stringify(payload)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('distinguishes an invalid YouTube API key without exposing provider details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ cached: false }))
      .mockResolvedValueOnce(supabaseResponse({ error: { errors: [{ reason: 'keyInvalid' }] } }, 400))
      .mockResolvedValueOnce(supabaseResponse({ callsToday: 1 }))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ code: 'youtube_key_invalid' })
    expect(JSON.stringify(payload)).not.toContain(env.YOUTUBE_API_KEY)
  })

  it('distinguishes YouTube quota exhaustion from an invalid key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ cached: false }))
      .mockResolvedValueOnce(supabaseResponse({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403))
      .mockResolvedValueOnce(supabaseResponse({ callsToday: 1 }))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload).toMatchObject({ code: 'youtube_quota_exceeded' })
    expect(fetchSpy.mock.calls.filter(([url]) => String(url).includes('youtube/v3/search'))).toHaveLength(1)
    expect(fetchSpy.mock.calls.some(([url]) => String(url).includes('/rpc/youtube_search_usage_snapshot'))).toBe(true)
  })

  it('reports Supabase authentication failure separately from YouTube failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(supabaseResponse({ code: 'PGRST301' }, 401))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ code: 'backend_auth_failed' })
  })

  it('keeps duplicate in-flight query protection without a local daily quota response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(supabaseResponse({ pending: true }))
    const pending = await onRequestPost({ request: request(), env })
    expect(pending.status).toBe(429)
    expect(await pending.json()).toMatchObject({ code: 'search_in_progress' })
  })

  it('does not send a per-user search identity to the global gate', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(supabaseResponse({ pending: true }))
    const response = await onRequestPost({
      request: new Request('https://localhost/api/youtube-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
        body: JSON.stringify({ roomCode: 'A1B2C3D4E5', query: 'artista teste' }),
      }),
      env,
    })
    const rpcBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { p_ip: string }

    expect(response.status).toBe(429)
    expect(rpcBody.p_ip).toBe('not-tracked')
  })

  it('uses the shared result cache without another YouTube search.list call', async () => {
    const videos = [{
      videoId: 'abcdefghijk',
      title: 'Cached song',
      channel: 'Cached artist',
      thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg',
    }]
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      supabaseResponse({ cached: true, videos }),
    )

    const response = await onRequestPost({ request: request('same cached query'), env })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ available: true, videos })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/rpc/guest_search_gate')
  })
})
