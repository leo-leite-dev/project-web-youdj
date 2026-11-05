import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchGuestVideos, searchMusicCatalog, submitGuestRequest } from './guestRequestApi'

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

describe('searchMusicCatalog', () => {
  afterEach(() => vi.restoreAllMocks())

  it('validates paginated catalog metadata without video fields', async () => {
    const result = {
      recordingMbid: '5a6b7c8d-1234-4abc-8def-0123456789ab',
      title: 'Livin’ on a Prayer',
      artist: 'Bon Jovi',
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [result],
      hasMore: true,
      nextOffset: 10,
    })))

    await expect(searchMusicCatalog('ROOM000001', 'Bon Jovi')).resolves.toEqual({
      results: [result],
      hasMore: true,
      nextOffset: 10,
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/music-search', expect.objectContaining({ method: 'POST' }))
    expect(Object.keys(result)).toEqual(['recordingMbid', 'title', 'artist'])
  })

  it('rejects invalid MusicBrainz identifiers and unbounded pages', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      results: [{ recordingMbid: 'not-an-mbid', title: 'Song', artist: 'Artist' }],
      hasMore: false,
      nextOffset: null,
    })))
    await expect(searchMusicCatalog('ROOM000001', 'Bon Jovi')).rejects.toThrow(/validar/i)
  })
})

describe('submitGuestRequest', () => {
  afterEach(() => vi.restoreAllMocks())

  it('posts a catalog MBID and validates the private receipt', async () => {
    const privateCode = 'a'.repeat(64)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ received: true, privateCode }), { status: 201 }))
    const recordingMbid = '5a6b7c8d-1234-4abc-8def-0123456789ab'

    await expect(submitGuestRequest('ROOM000001', {
      kind: 'catalog', recordingMbid, title: 'Song', artist: 'Artist',
    }, true)).resolves.toEqual({ received: true, privateCode })
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { request: { kind: string; recordingMbid: string } }
    expect(requestBody.request).toEqual({ kind: 'catalog', recordingMbid, title: 'Song', artist: 'Artist' })
  })
})
