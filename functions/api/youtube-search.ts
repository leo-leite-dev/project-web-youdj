interface Env {
  YOUTUBE_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>

interface Video { videoId: string; title: string; channel: string; thumbnail: string }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const normalize = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')

async function rpc(env: Env, name: string, args: Record<string, unknown>) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('backend_unconfigured')
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify(args),
  })
  if (!response.ok) throw new Error('backend_unavailable')
  return response.json() as Promise<unknown>
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 8192) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch { return json({ error: 'Solicitação inválida.' }, 400) }
  if (typeof body !== 'object' || body === null || !('roomCode' in body) || !('query' in body) || typeof body.roomCode !== 'string' || typeof body.query !== 'string') return json({ error: 'Informe uma pesquisa válida.' }, 400)
  const roomCode = body.roomCode.trim().toUpperCase()
  const query = body.query.normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!/^[A-Z0-9]{10}$/.test(roomCode) || query.length < 2 || query.length > 100) return json({ error: 'Informe uma pesquisa válida.' }, 400)
  if (!env.YOUTUBE_API_KEY) return json({ available: false, videos: [] })
  try {
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const gate = await rpc(env, 'guest_search_gate', { p_code: roomCode, p_query: normalize(query), p_ip: ip })
    if (typeof gate === 'object' && gate !== null && 'error' in gate) return json({ error: 'Busca temporariamente indisponível ou limite atingido.' }, 429)
    if (typeof gate === 'object' && gate !== null && 'pending' in gate) return json({ error: 'Esta pesquisa já está em andamento. Tente novamente em instantes.' }, 429)
    if (typeof gate === 'object' && gate !== null && 'cached' in gate && gate.cached === true && 'videos' in gate) return json({ available: true, videos: gate.videos })
    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.search = new URLSearchParams({ part: 'snippet', type: 'video', maxResults: '5', q: query, key: env.YOUTUBE_API_KEY }).toString()
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return json({ error: response.status === 403 ? 'Cota de pesquisa indisponível. Você ainda pode enviar um pedido manual.' : 'Pesquisa indisponível. Você ainda pode enviar um pedido manual.' }, 503)
    const data: unknown = await response.json()
    const items = typeof data === 'object' && data !== null && 'items' in data && Array.isArray(data.items) ? data.items : []
    const videos: Video[] = items.flatMap((item) => {
      if (typeof item !== 'object' || item === null) return []
      const snippet = 'snippet' in item && typeof item.snippet === 'object' && item.snippet !== null ? item.snippet : null
      const id = 'id' in item && typeof item.id === 'object' && item.id !== null ? item.id : null
      const videoId = id && 'videoId' in id && typeof id.videoId === 'string' ? id.videoId : ''
      const title = snippet && 'title' in snippet && typeof snippet.title === 'string' ? snippet.title : ''
      const channel = snippet && 'channelTitle' in snippet && typeof snippet.channelTitle === 'string' ? snippet.channelTitle : ''
      const thumbnails = snippet && 'thumbnails' in snippet && typeof snippet.thumbnails === 'object' && snippet.thumbnails !== null ? snippet.thumbnails : null
      const medium = thumbnails && 'medium' in thumbnails && typeof thumbnails.medium === 'object' && thumbnails.medium !== null ? thumbnails.medium : null
      const thumbnail = medium && 'url' in medium && typeof medium.url === 'string' ? medium.url : ''
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) && title && channel && thumbnail.startsWith('https://') ? [{ videoId, title, channel, thumbnail }] : []
    })
    await rpc(env, 'guest_search_cache_store', { p_code: roomCode, p_query: normalize(query), p_videos: videos })
    return json({ available: true, videos })
  } catch {
    return json({ error: 'Pesquisa indisponível. Você ainda pode enviar um pedido manual.' }, 503)
  }
}
