export interface YoutubeVideo {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

export type GuestRequestInput =
  | { kind: 'youtube'; video: YoutubeVideo }
  | { kind: 'manual'; title: string; artist: string; url: string }

export interface GuestRequestReceipt {
  received: true
  privateCode: string
}

export interface YoutubeSearchUsage {
  callsToday: number
  dailyQuota: number
  quotaDay: string
  nextResetAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
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

export async function getYoutubeSearchUsage(): Promise<YoutubeSearchUsage> {
  let response: Response
  try {
    response = await fetch('/api/youtube-search-usage', { cache: 'no-store' })
  } catch {
    throw new Error('O contador de pesquisas está temporariamente indisponível.')
  }

  if (!response.ok) throw new Error('O contador de pesquisas está temporariamente indisponível.')
  const payload: unknown = await response.json().catch(() => null)
  if (!isRecord(payload)
    || !isNonNegativeSafeInteger(payload.callsToday)
    || !isNonNegativeSafeInteger(payload.dailyQuota)
    || typeof payload.quotaDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.quotaDay)
    || typeof payload.nextResetAt !== 'string' || !Number.isFinite(Date.parse(payload.nextResetAt))) {
    throw new Error('O contador de pesquisas está temporariamente indisponível.')
  }

  return {
    callsToday: payload.callsToday,
    dailyQuota: payload.dailyQuota,
    quotaDay: payload.quotaDay,
    nextResetAt: payload.nextResetAt,
  }
}

export async function submitGuestRequest(
  roomCode: string,
  request: GuestRequestInput,
  acceptedLegal: boolean,
  guestId: string,
): Promise<GuestRequestReceipt> {
  const payload = await post<unknown>('/api/guest-requests', { roomCode, request, acceptedLegal, guestId })
  if (typeof payload !== 'object' || payload === null
    || !('received' in payload) || payload.received !== true
    || !('privateCode' in payload) || typeof payload.privateCode !== 'string'
    || !/^[a-f0-9]{64}$/.test(payload.privateCode)) {
    throw new Error('Não foi possível validar o comprovante do pedido.')
  }
  return { received: true, privateCode: payload.privateCode }
}
