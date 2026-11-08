import { afterEach, describe, expect, it, vi } from 'vitest'
import { onRequestPost } from './guest-requests'
import { onRequestPost as onRequestStatus } from './guest-request-status'

const env = {
  SUPABASE_URL: 'https://supabase.example.test',
  SUPABASE_SERVICE_ROLE_KEY: 'request-server-key-never-returned',
}
const guestId = 'a1111111-1111-4111-8111-111111111111'
const guestCredential = 'b'.repeat(64)

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
      return Response.json({ received: true, private_code: body.p_private_code, auto_approved: true })
    })

    const response = await onRequestPost({
      request: request({
        roomCode: 'A1B2C3D4E5',
        guestId,
        guestCredential,
        request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
        acceptedLegal: true,
      }),
      env,
    })

    const rpcBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as Record<string, unknown>
    const responseBody = await response.json()
    expect(response.status).toBe(201)
    expect(rpcBody.p_guest_id).toBe(guestId)
    expect(rpcBody.p_guest_credential).toBe(guestCredential)
    expect(rpcBody.p_private_code).toMatch(/^[a-f0-9]{64}$/)
    expect(responseBody).toMatchObject({ received: true, privateCode: rpcBody.p_private_code, autoApproved: true })
    expect(JSON.stringify(responseBody)).not.toContain(guestCredential)
    expect(JSON.stringify(responseBody)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })

  it('rejects a missing or malformed guest identity before the backend call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const response = await onRequestPost({
      request: request({
        roomCode: 'A1B2C3D4E5',
        guestId: 'not-a-uuid',
        guestCredential,
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
        guestCredential,
        request: { kind: 'manual', title: 'Song', artist: 'Artist', url: '' },
      }),
      env,
    })

    expect(response.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('guest request status endpoint', () => {
  const privateCode = 'a'.repeat(64)
  const statusRequest = (body: unknown) => new Request('https://example.test/api/guest-request-status', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })

  it('hashes private receipts server-side and returns only validated status fields', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { p_room_code: string; p_receipt_hashes: string[] }
      expect(body.p_room_code).toBe('A1B2C3D4E5')
      expect(body.p_receipt_hashes[0]).toMatch(/^[a-f0-9]{64}$/)
      expect(body.p_receipt_hashes[0]).not.toBe(privateCode)
      return Response.json([{ title: 'Song', artist: 'Artist', status: 'pending', created_at: '2026-11-06T12:00:00Z' }])
    })

    const response = await onRequestStatus({
      request: statusRequest({ roomCode: 'a1b2c3d4e5', privateCodes: [privateCode] }), env,
    })
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const responseBody = await response.json()
    expect(responseBody).toEqual({ requests: [{ title: 'Song', artist: 'Artist', status: 'pending', createdAt: '2026-11-06T12:00:00Z' }] })
    expect(JSON.stringify(responseBody)).not.toContain(privateCode)
    expect(fetchSpy).toHaveBeenCalledOnce()
  })

  it('rejects malformed or oversized proof collections before contacting the backend', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const malformed = await onRequestStatus({ request: statusRequest({ roomCode: 'A1B2C3D4E5', privateCodes: ['guess'] }), env })
    const oversized = await onRequestStatus({ request: statusRequest({ roomCode: 'A1B2C3D4E5', privateCodes: Array(101).fill(privateCode) }), env })
    expect(malformed.status).toBe(400)
    expect(oversized.status).toBe(400)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('does not expose private backend errors or invalid backend payloads', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([{ title: 'Song', artist: 'Artist', status: 'unknown', created_at: 'invalid' }]))
    const response = await onRequestStatus({ request: statusRequest({ roomCode: 'A1B2C3D4E5', privateCodes: [privateCode] }), env })
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Meus pedidos está temporariamente indisponível.' })
    expect(String(fetchSpy.mock.calls[0]?.[1]?.headers)).not.toContain(env.SUPABASE_SERVICE_ROLE_KEY)
  })
})
