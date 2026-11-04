import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchGuestVideos } from './guestRequestApi'

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
})
