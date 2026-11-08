import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost as submitGuestRequest } from './guest-requests'
import { onRequestPost as searchYoutube } from './youtube-search'

const secretKey = 'sb_secret_test_only'
const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: secretKey }

afterEach(() => vi.restoreAllMocks())

describe('Supabase server key compatibility', () => {
  it('sends the modern secret key only as apikey for guest request RPCs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { p_private_code: string }
      return Response.json({ received: true, private_code: body.p_private_code })
    })
    const response = await submitGuestRequest({
      request: new Request('https://example.test/api/guest-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roomCode: 'A1B2C3D4E5',
          guestId: 'a1111111-1111-4111-8111-111111111111',
          guestCredential: 'b'.repeat(64),
          request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
          acceptedLegal: true,
        }),
      }),
      env,
    })

    const init = fetchSpy.mock.calls[0]?.[1]
    const headers = new Headers(init?.headers)
    expect(response.status).toBe(201)
    const payload = await response.json() as { privateCode: string }
    expect(payload.privateCode).toMatch(/^[a-f0-9]{64}$/)
    expect(headers.get('apikey')).toBe(secretKey)
    expect(headers.has('authorization')).toBe(false)
    const rpcBody = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/rpc/submit_guest_request_with_identity')
    expect(rpcBody.p_guest_id).toBe('a1111111-1111-4111-8111-111111111111')
    expect(rpcBody.p_private_code).toMatch(/^[a-f0-9]{64}$/)
    expect(rpcBody.p_terms_version).toBe('2026-11-05')
    expect(rpcBody.p_privacy_version).toBe('2026-11-05')
  })

  it('rejects guest requests without explicit legal acceptance before calling the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await submitGuestRequest({
      request: new Request('https://example.test/api/guest-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          roomCode: 'A1B2C3D4E5',
          guestId: 'a1111111-1111-4111-8111-111111111111',
          guestCredential: 'b'.repeat(64),
          request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
        }),
      }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('uses the same apikey-only authentication for YouTube search RPCs', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ cached: true, videos: [] }),
    )
    const response = await searchYoutube({
      request: new Request('https://example.test/api/youtube-search', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomCode: 'A1B2C3D4E5', query: 'song name' }),
      }),
      env: { ...env, YOUTUBE_API_KEY: 'not-a-real-key' },
    })

    const init = fetchSpy.mock.calls[0]?.[1]
    const headers = new Headers(init?.headers)
    expect(response.status).toBe(200)
    expect(headers.get('apikey')).toBe(secretKey)
    expect(headers.has('authorization')).toBe(false)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
