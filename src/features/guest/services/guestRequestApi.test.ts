import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchGuestVideos, submitGuestRequest } from './guestRequestApi'

describe('searchGuestVideos', () => {
  afterEach(() => vi.restoreAllMocks())

  it('validates and returns bounded YouTube results', async () => {
    const video = { videoId: 'abcdefghijk', title: 'Canção', channel: 'Canal', thumbnail: 'https://i.ytimg.com/thumb.jpg' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ available: true, videos: [video] })))
    await expect(searchGuestVideos('ROOM000001', 'canção')).resolves.toEqual({ available: true, videos: [video] })
  })

  it('rejects malformed provider results at the client boundary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ available: true, videos: [{ videoId: 'invalid', title: 'x', channel: 'y', thumbnail: 'javascript:alert(1)' }] })))
    await expect(searchGuestVideos('ROOM000001', 'canção')).rejects.toThrow(/validar os resultados/i)
  })

  it('associates a request with the unverified guest id stored by the browser', async () => {
    const guestId = 'a1111111-1111-4111-8111-111111111111'
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ received: true, privateCode: 'a'.repeat(64), autoApproved: true }), { status: 201 }))

    await expect(submitGuestRequest('ROOM000001', { kind: 'manual', title: 'Canção', artist: 'Artista', url: '' }, true, guestId, 'b'.repeat(64)))
      .resolves.toMatchObject({ received: true, autoApproved: true })

    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { guestId: string; guestCredential: string }
    expect(body.guestId).toBe(guestId)
    expect(body.guestCredential).toBe('b'.repeat(64))
  })
})
