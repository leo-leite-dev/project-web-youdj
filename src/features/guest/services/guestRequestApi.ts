export interface YoutubeVideo {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

export type GuestRequestInput =
  | { kind: 'youtube'; video: YoutubeVideo }
  | { kind: 'manual'; title: string; artist: string; url: string }

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

export const searchGuestVideos = (roomCode: string, query: string) =>
  post<{ videos: YoutubeVideo[]; available: boolean }>('/api/youtube-search', { roomCode, query })

export const submitGuestRequest = (roomCode: string, request: GuestRequestInput) =>
  post<{ received: true }>('/api/guest-requests', { roomCode, request })
