import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './guest-presence'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'presence-server-key-never-returned',
}
const guestId = 'a1111111-1111-4111-8111-111111111111'

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
      request: request({ roomCode: 'room000001', guestId, nickname: '  DJ   Ana  ' }),
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
    })
    expect(JSON.stringify(payload)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('rejects malformed identity without contacting Supabase', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId: 'not-a-uuid', nickname: 'Ana' }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not expose backend details for an inactive or unavailable room', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(Response.json(false))
    const response = await onRequestPost({
      request: request({ roomCode: 'ROOM000001', guestId, nickname: 'Ana' }),
      env,
    })

    expect(response.status).toBe(409)
    expect(await response.json()).toEqual({ error: 'Esta sala não está disponível para entrada.' })
  })
})
