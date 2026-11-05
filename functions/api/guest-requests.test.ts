import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './guest-requests'

const env = {
  SUPABASE_URL: 'https://db.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
}

function request(payload: unknown) {
  return new Request('https://youdj.example.test/api/guest-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '192.0.2.10' },
    body: JSON.stringify({ roomCode: 'SAJPZU3YDE', request: payload, acceptedLegal: true }),
  })
}

function mockReceivedRequest() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    const requestBody = JSON.parse(String(init?.body)) as { p_private_code: string }
    return new Response(JSON.stringify({
      received: true,
      private_code: requestBody.p_private_code,
    }), { status: 200 })
  })
}

describe('POST /api/guest-requests', () => {
  afterEach(() => vi.restoreAllMocks())

  it('submits a MusicBrainz ID, not client-supplied metadata or audio', async () => {
    const recordingMbid = '5a6b7c8d-1234-4abc-8def-0123456789ab'
    const fetchSpy = mockReceivedRequest()
    const response = await onRequestPost({
      request: request({ kind: 'catalog', recordingMbid, title: 'ignored', artist: 'ignored' }),
      env,
    })
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { p_request: unknown; p_private_code: string }

    expect(response.status).toBe(201)
    expect(requestBody.p_request).toEqual({ kind: 'catalog', recordingMbid })
    expect(await response.json()).toEqual({ received: true, privateCode: requestBody.p_private_code })
  })

  it('validates and stores a YouTube URL as a reference via the existing manual request RPC', async () => {
    const fetchSpy = mockReceivedRequest()
    const response = await onRequestPost({
      request: request({ kind: 'youtube-link', title: 'Livin’ on a Prayer', artist: 'Bon Jovi', url: 'https://youtu.be/abcdefghijk' }),
      env,
    })
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { p_request: unknown }

    expect(response.status).toBe(201)
    expect(requestBody.p_request).toEqual({
      kind: 'manual',
      title: 'Livin’ on a Prayer',
      artist: 'Bon Jovi',
      url: 'https://youtu.be/abcdefghijk',
    })
  })

  it('rejects a non-video or untrusted YouTube URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({ kind: 'youtube-link', title: 'song', artist: 'artist', url: 'https://youtube.com/' }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps compatibility with legacy cached YouTube video requests', async () => {
    const fetchSpy = mockReceivedRequest()
    const response = await onRequestPost({
      request: request({ kind: 'youtube', video: { videoId: 'abcdefghijk' } }),
      env,
    })
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { p_request: unknown }

    expect(response.status).toBe(201)
    expect(requestBody.p_request).toEqual({ kind: 'youtube', videoId: 'abcdefghijk' })
  })
})
