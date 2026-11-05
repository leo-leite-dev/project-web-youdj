export interface YoutubeVideo {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

export interface MusicCatalogRecording {
  recordingMbid: string
  title: string
  artist: string
}

export interface MusicCatalogSearchPage {
  results: MusicCatalogRecording[]
  hasMore: boolean
  nextOffset: number | null
}

export type GuestRequestInput =
  | { kind: 'catalog'; recordingMbid: string; title: string; artist: string }
  | { kind: 'youtube-link'; title: string; artist: string; url: string }
  | { kind: 'youtube'; video: YoutubeVideo }
  | { kind: 'manual'; title: string; artist: string; url: string }

export interface GuestRequestReceipt {
  received: true
  privateCode: string
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message = typeof payload === 'object' && payload !== null && 'error' in payload && typeof payload.error === 'string'
      ? payload.error
      : 'Não foi possível concluir a solicitação.'
    throw new Error(message)
  }
  return payload as T
}

export async function searchGuestVideos(roomCode: string, query: string): Promise<{ videos: YoutubeVideo[]; available: boolean }> {
  const payload: unknown = await post<unknown>('/api/youtube-search', { roomCode, query })
  if (typeof payload !== 'object' || payload === null || !('available' in payload) || typeof payload.available !== 'boolean' || !('videos' in payload) || !Array.isArray(payload.videos) || payload.videos.length > 5) {
    throw new Error('Não foi possível validar os resultados da pesquisa.')
  }
  const videos = payload.videos.map((item): YoutubeVideo => {
    let trustedThumbnail = false
    if (typeof item === 'object' && item !== null && 'thumbnail' in item && typeof item.thumbnail === 'string') {
      try {
        const thumbnailUrl = new URL(item.thumbnail)
        trustedThumbnail = thumbnailUrl.protocol === 'https:' && ['i.ytimg.com', 'img.youtube.com'].includes(thumbnailUrl.hostname)
      } catch { trustedThumbnail = false }
    }
    if (typeof item !== 'object' || item === null || !('videoId' in item) || typeof item.videoId !== 'string' || !/^[A-Za-z0-9_-]{11}$/.test(item.videoId)
      || !('title' in item) || typeof item.title !== 'string' || !item.title.trim()
      || !('channel' in item) || typeof item.channel !== 'string' || !item.channel.trim()
      || !trustedThumbnail) {
      throw new Error('Não foi possível validar os resultados da pesquisa.')
    }
    return { videoId: item.videoId, title: item.title, channel: item.channel, thumbnail: item.thumbnail }
  })
  return { available: payload.available, videos }
}

const RECORDING_MBID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function searchMusicCatalog(
  roomCode: string,
  query: string,
  offset = 0,
): Promise<MusicCatalogSearchPage> {
  const payload: unknown = await post<unknown>('/api/music-search', { roomCode, query, offset })
  if (typeof payload !== 'object' || payload === null
    || !('results' in payload) || !Array.isArray(payload.results) || payload.results.length > 10
    || !('hasMore' in payload) || typeof payload.hasMore !== 'boolean'
    || !('nextOffset' in payload)
    || (payload.nextOffset !== null && (typeof payload.nextOffset !== 'number'
      || !Number.isInteger(payload.nextOffset) || payload.nextOffset < 0 || payload.nextOffset > 240))) {
    throw new Error('Não foi possível validar os resultados da pesquisa musical.')
  }

  const results = payload.results.map((item): MusicCatalogRecording => {
    if (typeof item !== 'object' || item === null
      || !('recordingMbid' in item) || typeof item.recordingMbid !== 'string'
      || !RECORDING_MBID_PATTERN.test(item.recordingMbid)
      || !('title' in item) || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
      || !('artist' in item) || typeof item.artist !== 'string' || !item.artist.trim() || item.artist.length > 120) {
      throw new Error('Não foi possível validar os resultados da pesquisa musical.')
    }
    return { recordingMbid: item.recordingMbid, title: item.title, artist: item.artist }
  })

  if ((payload.hasMore && payload.nextOffset === null)
    || (!payload.hasMore && payload.nextOffset !== null)) {
    throw new Error('Não foi possível validar a paginação da pesquisa musical.')
  }
  return { results, hasMore: payload.hasMore, nextOffset: payload.nextOffset }
}

export async function submitGuestRequest(
  roomCode: string,
  request: GuestRequestInput,
  acceptedLegal: boolean,
): Promise<GuestRequestReceipt> {
  const payload = await post<unknown>('/api/guest-requests', { roomCode, request, acceptedLegal })
  if (typeof payload !== 'object' || payload === null
    || !('received' in payload) || payload.received !== true
    || !('privateCode' in payload) || typeof payload.privateCode !== 'string'
    || !/^[a-f0-9]{64}$/.test(payload.privateCode)) {
    throw new Error('Não foi possível validar o comprovante do pedido.')
  }
  return { received: true, privateCode: payload.privateCode }
}
