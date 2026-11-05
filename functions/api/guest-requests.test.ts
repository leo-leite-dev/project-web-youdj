import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './guest-requests'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'request-server-key-never-returned',
}
const guestId = 'a1111111-1111-4111-8111-111111111111'

function request(body: unknown) {
  return new Request('https://example.test/api/guest-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

afterEach(() => vi.restoreAllMocks())

describe('guest request endpoint', () => {
  it('sends the persistent browser identity to the private request RPC', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { p_private_code: string }
      return Response.json({ received: true, private_code: body.p_private_code })
    })

    const response = await onRequestPost({
      request: request({
        roomCode: 'A1B2C3D4E5',
        guestId,
        request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
        acceptedLegal: true,
      }),
      env,
    })

    const rpcBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    const responseBody = await response.json()
    expect(response.status).toBe(201)
    expect(rpcBody.p_guest_id).toBe(guestId)
    expect(rpcBody.p_private_code).toMatch(/^[a-f0-9]{64}$/)
    expect(responseBody).toMatchObject({ received: true, privateCode: rpcBody.p_private_code })
    expect(JSON.stringify(responseBody)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('rejects a missing or malformed guest identity before the backend call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({
        roomCode: 'A1B2C3D4E5',
        guestId: 'not-a-uuid',
        request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
        acceptedLegal: true,
      }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('continues to require the existing terms acceptance', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({
        roomCode: 'A1B2C3D4E5',
        guestId,
        request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
      }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
