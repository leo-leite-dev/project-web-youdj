import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './guest-presence'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'presence-server-key-never-returned',
}
const guestId = 'a1111111-1111-4111-8111-111111111111'
const credential = 'a'.repeat(64)

function request(body: unknown) {
  return new Request('https://example.test/api/guest-presence', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('guest presence endpoint', () => {
  it('validates and registers an unverified nickname through the private RPC', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json(true))
    const response = await onRequestPost({
      request: request({ roomCode: 'room000001', guestId, nickname: '  DJ   Ana  ', credential }),
      env,
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toEqual({ online: true })
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain('/rpc/register_guest_presence')
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({
      p_code: 'ROOM000001',
      p_guest_id: guestId,
      p_guest_name: 'DJ Ana',
      p_guest_credential: credential,
    })
    expect(JSON.stringify(payload)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('rejects malformed identity without contacting Supabase', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId: 'not-a-uuid', nickname: 'Ana', credential }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not expose backend details for an inactive or unavailable room', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json(false))
    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId, nickname: 'Ana', credential }),
      env,
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Esta sala não está disponível para entrada.' })
  })

  it('falls back to the legacy presence RPC only when the credential-aware overload is missing', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ code: 'PGRST202' }, { status: 404 }))
      .mockResolvedValueOnce(Response.json(true))

    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId, nickname: 'Ana', credential }),
      env,
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ online: true })
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({ p_guest_credential: credential })
    expect(JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body))).toEqual({
      p_code: 'ROOM000001',
      p_guest_id: guestId,
      p_guest_name: 'Ana',
    })
    expect(JSON.stringify(fetchSpy.mock.calls[1]?.[1]?.body)).not.toContain(credential)
  })

  it('does not mask backend errors unrelated to an absent RPC overload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ code: 'PGRST000' }, { status: 503 }))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId, nickname: 'Ana', credential }),
      env,
    })

    expect(response.status).toBe(503)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})
