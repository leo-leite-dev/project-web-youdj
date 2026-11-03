interface Env { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 8192) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch { return json({ error: 'Solicitação inválida.' }, 400) }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Envio temporariamente indisponível.' }, 503)
  if (typeof body !== 'object' || body === null || !('roomCode' in body) || !('request' in body) || typeof body.roomCode !== 'string') return json({ error: 'Pedido inválido.' }, 400)
  const payload = body.request
  if (typeof payload !== 'object' || payload === null || !('kind' in payload)) return json({ error: 'Pedido inválido.' }, 400)
  let requestData: Record<string, unknown>
  if (payload.kind === 'youtube' && 'video' in payload && typeof payload.video === 'object' && payload.video !== null && 'videoId' in payload.video && typeof payload.video.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(payload.video.videoId)) {
    requestData = { kind: 'youtube', videoId: payload.video.videoId }
  } else if (payload.kind === 'manual' && 'title' in payload && typeof payload.title === 'string' && 'artist' in payload && typeof payload.artist === 'string' && 'url' in payload && typeof payload.url === 'string') {
    const title = payload.title.trim(); const artist = payload.artist.trim(); const url = payload.url.trim()
    let validYoutubeUrl = !url
    try { validYoutubeUrl = !url || (new URL(url).protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'youtu.be', 'music.youtube.com'].includes(new URL(url).hostname)) } catch { validYoutubeUrl = false }
    if (!title || title.length > 120 || artist.length > 120 || !artist || url.length > 500 || !validYoutubeUrl) return json({ error: 'Confira título, artista e um link válido do YouTube (opcional).' }, 400)
    requestData = { kind: 'manual', title, artist, url: url || null }
  } else return json({ error: 'Pedido inválido.' }, 400)
  try {
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/submit_guest_request`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_code: body.roomCode.trim().toUpperCase(), p_ip: request.headers.get('CF-Connecting-IP') ?? 'unknown', p_request: requestData }) })
    if (!response.ok) return json({ error: 'Não foi possível enviar agora. Tente novamente em instantes.' }, response.status === 429 ? 429 : 503)
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result) return json({ error: 'Sala indisponível ou limite de pedidos atingido.' }, 429)
    return json({ received: true }, 201)
  } catch { return json({ error: 'Não foi possível enviar agora. Tente novamente em instantes.' }, 503) }
}
