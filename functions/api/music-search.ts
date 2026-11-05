interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>

interface MusicRecordingResult {
  recordingMbid: string
  title: string
  artist: string
}

const PAGE_SIZE = 10
const MAX_OFFSET = 240
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeQuery(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ')
}

function responseForError(code: string): Response {
  switch (code) {
    case 'invalid_search':
      return json({ error: 'Informe o nome de uma música ou artista.', code }, 400)
    case 'room_unavailable':
      return json({ error: 'Esta sala não está disponível para pesquisa.', code }, 404)
    case 'rate_limited':
      return json({ error: 'Muitas pesquisas em sequência. Aguarde um pouco ou faça um pedido manual.', code }, 429)
    default:
      return json({ error: 'A busca musical está temporariamente indisponível. Faça um pedido manual.', code: 'catalog_unavailable' }, 503)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 4096) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch {
    return json({ error: 'Solicitação inválida.' }, 400)
  }

  if (!isRecord(body) || typeof body.roomCode !== 'string' || typeof body.query !== 'string') {
    return json({ error: 'Informe uma pesquisa válida.' }, 400)
  }

  const roomCode = body.roomCode.trim().toUpperCase()
  const query = normalizeQuery(body.query)
  const offset = body.offset === undefined ? 0 : body.offset
  if (!/^[A-Z0-9]{10}$/.test(roomCode) || query.length < 3 || query.length > 80
    || typeof offset !== 'number' || !Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    return json({ error: 'Informe uma pesquisa válida.' }, 400)
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'A busca musical está sem configuração de servidor.' }, 503)
  }

  let response: Response
  try {
    response = await fetch(
      `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/guest_music_catalog_search`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          p_code: roomCode,
          p_query: query,
          p_ip: request.headers.get('CF-Connecting-IP') ?? 'unknown',
          p_limit: PAGE_SIZE,
          p_offset: offset,
        }),
      },
    )
  } catch {
    console.error('[music-search] backend_network_failure')
    return responseForError('catalog_unavailable')
  }

  if (!response.ok) {
    console.error('[music-search] backend_rpc_failure', { status: response.status })
    return responseForError('catalog_unavailable')
  }

  let payload: unknown
  try {
    payload = await response.json() as unknown
  } catch {
    console.error('[music-search] backend_invalid_json')
    return responseForError('catalog_unavailable')
  }

  if (isRecord(payload) && typeof payload.error === 'string') {
    return responseForError(payload.error)
  }
  if (!isRecord(payload) || !Array.isArray(payload.results) || payload.results.length > PAGE_SIZE
    || typeof payload.has_more !== 'boolean'
    || (payload.next_offset !== null && (typeof payload.next_offset !== 'number'
      || !Number.isInteger(payload.next_offset) || payload.next_offset < 0 || payload.next_offset > MAX_OFFSET))
    || (payload.has_more && payload.next_offset === null)
    || (!payload.has_more && payload.next_offset !== null)) {
    console.error('[music-search] backend_invalid_payload')
    return responseForError('catalog_unavailable')
  }

  const results: MusicRecordingResult[] = []
  for (const item of payload.results) {
    if (!isRecord(item) || typeof item.recordingMbid !== 'string' || !UUID_PATTERN.test(item.recordingMbid)
      || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
      || typeof item.artist !== 'string' || !item.artist.trim() || item.artist.length > 120) {
      console.error('[music-search] backend_invalid_record')
      return responseForError('catalog_unavailable')
    }
    results.push({
      recordingMbid: item.recordingMbid,
      title: item.title,
      artist: item.artist,
    })
  }

  return json({
    results,
    hasMore: payload.has_more,
    nextOffset: payload.next_offset,
  })
}
