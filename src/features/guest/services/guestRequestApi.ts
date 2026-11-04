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
