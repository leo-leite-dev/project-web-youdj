interface Env { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const TERMS_VERSION = '2026-11-05'
const PRIVACY_VERSION = '2026-11-05'

function createPrivateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isAllowedYoutubeUrl(url: string): boolean {
  if (!url) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
      && ['youtube.com', 'www.youtube.com', 'youtu.be', 'music.youtube.com'].includes(parsed.hostname)
  } catch { return false }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 8192) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch { return json({ error: 'Solicitação inválida.' }, 400) }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: 'Envio temporariamente indisponível.' }, 503)
  if (typeof body !== 'object' || body === null || !('roomCode' in body) || !('request' in body)
    || !('guestId' in body) || !('guestCredential' in body)
    || typeof body.roomCode !== 'string' || typeof body.guestId !== 'string'
    || typeof body.guestCredential !== 'string' || !/^[a-f0-9]{64}$/.test(body.guestCredential)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.guestId)) {
    return json({ error: 'Pedido inválido.' }, 400)
  }
  if (!('acceptedLegal' in body) || body.acceptedLegal !== true) return json({ error: 'Aceite os Termos de Uso e a Política de Privacidade para enviar o pedido.' }, 400)
  const payload = body.request
  if (typeof payload !== 'object' || payload === null || !('kind' in payload)) return json({ error: 'Pedido inválido.' }, 400)
  let requestData: Record<string, unknown>
  if (payload.kind === 'youtube' && 'video' in payload && typeof payload.video === 'object' && payload.video !== null && 'videoId' in payload.video && typeof payload.video.videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(payload.video.videoId)) {
    requestData = { kind: 'youtube', videoId: payload.video.videoId }
  } else if (payload.kind === 'manual' && 'title' in payload && typeof payload.title === 'string' && 'artist' in payload && typeof payload.artist === 'string' && 'url' in payload && typeof payload.url === 'string') {
    const title = payload.title.trim(); const artist = payload.artist.trim(); const url = payload.url.trim()
    if (!title || title.length > 120 || artist.length > 120 || !artist || url.length > 500 || !isAllowedYoutubeUrl(url)) return json({ error: 'Confira título, artista e um link válido do YouTube (opcional).' }, 400)
    requestData = { kind: 'manual', title, artist, url: url || null }
  } else return json({ error: 'Pedido inválido.' }, 400)
  try {
    const privateCode = createPrivateCode()
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/submit_guest_request_with_identity`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ p_code: body.roomCode.trim().toUpperCase(), p_ip: request.headers.get('CF-Connecting-IP') ?? 'unknown', p_request: requestData, p_private_code: privateCode, p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION, p_guest_id: body.guestId.toLowerCase(), p_guest_credential: body.guestCredential }) })
    if (!response.ok) return json({ error: 'Não foi possível enviar agora. Tente novamente em instantes.' }, response.status === 429 ? 429 : 503)
    const result: unknown = await response.json()
    if (typeof result === 'object' && result !== null && 'error' in result) return json({ error: 'Sala indisponível ou limite de pedidos atingido.' }, 429)
    if (typeof result !== 'object' || result === null || !('received' in result) || result.received !== true || !('private_code' in result) || result.private_code !== privateCode) {
      return json({ error: 'Não foi possível confirmar o recebimento. Tente novamente.' }, 503)
    }
    return json({ received: true, privateCode, autoApproved: 'auto_approved' in result && result.auto_approved === true }, 201)
  } catch { return json({ error: 'Não foi possível enviar agora. Tente novamente em instantes.' }, 503) }
}
