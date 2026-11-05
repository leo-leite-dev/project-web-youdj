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

  it('returns real YouTube videos and stores them in the existing shared cache', async () => {
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
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    expect(String(fetchSpy.mock.calls[1]?.[0])).toContain('youtube/v3/search')
    expect(JSON.stringify(payload)).not.toContain(env.YOUTUBE_API_KEY)
    expect(JSON.stringify(payload)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('distinguishes an invalid YouTube API key without exposing provider details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ cached: false }))
      .mockResolvedValueOnce(supabaseResponse({ error: { errors: [{ reason: 'keyInvalid' }] } }, 400))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ code: 'youtube_key_invalid' })
    expect(JSON.stringify(payload)).not.toContain(env.YOUTUBE_API_KEY)
  })

  it('distinguishes YouTube quota exhaustion from an invalid key', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ cached: false }))
      .mockResolvedValueOnce(supabaseResponse({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(429)
    expect(payload).toMatchObject({ code: 'youtube_quota_exceeded' })
  })

  it('reports Supabase authentication failure separately from YouTube failure', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(supabaseResponse({ code: 'PGRST301' }, 401))

    const response = await onRequestPost({ request: request(), env })
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload).toMatchObject({ code: 'backend_auth_failed' })
  })

  it('keeps search throttling and pending-search responses distinct', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(supabaseResponse({ error: 'rate_limited' }))
    const throttled = await onRequestPost({ request: request(), env })
    expect(throttled.status).toBe(429)
    expect(await throttled.json()).toMatchObject({ code: 'search_rate_limited' })

    fetchSpy.mockResolvedValueOnce(supabaseResponse({ error: 'daily_budget' }))
    const dailyBudget = await onRequestPost({ request: request(), env })
    expect(dailyBudget.status).toBe(429)
    expect(await dailyBudget.json()).toMatchObject({ code: 'search_daily_budget' })

    fetchSpy.mockResolvedValueOnce(supabaseResponse({ pending: true }))
    const pending = await onRequestPost({ request: request(), env })
    expect(pending.status).toBe(429)
    expect(await pending.json()).toMatchObject({ code: 'search_in_progress' })
  })

  it('uses a local-only rate-limit identity instead of Wrangler loopback IP', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(supabaseResponse({ error: 'daily_budget' }))
    const response = await onRequestPost({
      request: new Request('https://localhost/api/youtube-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
        body: JSON.stringify({ roomCode: 'A1B2C3D4E5', query: 'artista teste' }),
      }),
      env: { ...env, YOUDJ_LOCAL_DEV: 'true' },
    })
    const rpcBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { p_ip: string }

    expect(response.status).toBe(429)
    expect(rpcBody.p_ip).toBe('127.0.0.2')
  })
})
