interface Env {
  YOUTUBE_API_KEY?: string
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
  YOUDJ_LOCAL_DEV?: string
}

type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>
type FailureCode =
  | 'backend_not_configured'
  | 'backend_auth_failed'
  | 'backend_unavailable'
  | 'backend_invalid_response'
  | 'youtube_key_missing'
  | 'youtube_key_invalid'
  | 'youtube_key_restricted'
  | 'youtube_api_disabled'
  | 'youtube_quota_exceeded'
  | 'youtube_forbidden'
  | 'youtube_unavailable'
  | 'youtube_timeout'
  | 'youtube_invalid_response'
  | 'search_rate_limited'
  | 'search_daily_budget'
  | 'search_in_progress'
  | 'room_unavailable'
  | 'search_cache_unavailable'
  | 'search_unavailable'

interface FailureResponse {
  status: number
  message: string
}

class SearchFailure extends Error {
  constructor(readonly code: FailureCode) {
    super(code)
    this.name = 'SearchFailure'
  }
}

interface Video {
  videoId: string
  title: string
  channel: string
  thumbnail: string
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

const normalize = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')

const failureResponses: Record<FailureCode, FailureResponse> = {
  backend_not_configured: { status: 503, message: 'A busca está sem configuração de servidor. O pedido manual continua disponível.' },
  backend_auth_failed: { status: 503, message: 'A conexão segura com o serviço de busca falhou. O pedido manual continua disponível.' },
  backend_unavailable: { status: 503, message: 'O serviço de busca está temporariamente indisponível. O pedido manual continua disponível.' },
  backend_invalid_response: { status: 503, message: 'O serviço de busca retornou uma resposta inválida. O pedido manual continua disponível.' },
  youtube_key_missing: { status: 503, message: 'A chave do YouTube não está configurada no servidor. O pedido manual continua disponível.' },
  youtube_key_invalid: { status: 503, message: 'A chave do YouTube está inválida. O pedido manual continua disponível.' },
  youtube_key_restricted: { status: 503, message: 'A chave do YouTube bloqueou esta chamada. Verifique as restrições da chave; o pedido manual continua disponível.' },
  youtube_api_disabled: { status: 503, message: 'A YouTube Data API não está habilitada para esta chave. O pedido manual continua disponível.' },
  youtube_quota_exceeded: { status: 429, message: 'A cota diária do YouTube foi atingida. O pedido manual continua disponível.' },
  youtube_forbidden: { status: 503, message: 'O YouTube recusou a pesquisa. Verifique as permissões da chave; o pedido manual continua disponível.' },
  youtube_unavailable: { status: 503, message: 'O YouTube está temporariamente indisponível. O pedido manual continua disponível.' },
  youtube_timeout: { status: 504, message: 'A pesquisa no YouTube demorou demais. Tente novamente ou faça um pedido manual.' },
  youtube_invalid_response: { status: 502, message: 'O YouTube retornou dados inválidos. Tente novamente ou faça um pedido manual.' },
  search_rate_limited: { status: 429, message: 'Muitas pesquisas em sequência. Aguarde um pouco ou faça um pedido manual.' },
  search_daily_budget: { status: 429, message: 'O limite diário de pesquisas foi atingido. O pedido manual continua disponível.' },
  search_in_progress: { status: 429, message: 'Esta pesquisa já está em andamento. Aguarde um instante.' },
  room_unavailable: { status: 404, message: 'Esta sala não está disponível para pesquisa.' },
  search_cache_unavailable: { status: 503, message: 'Não foi possível preparar os resultados para envio. Tente novamente ou faça um pedido manual.' },
  search_unavailable: { status: 503, message: 'Não foi possível concluir a pesquisa. O pedido manual continua disponível.' },
}

function fail(code: FailureCode): Response {
  const failure = failureResponses[code]
  return json({ error: failure.message, code }, failure.status)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isTrustedYoutubeThumbnail(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['i.ytimg.com', 'img.youtube.com'].includes(url.hostname)
  } catch {
    return false
  }
}

async function rpc(env: Env, name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new SearchFailure('backend_not_configured')
  }

  let response: Response
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify(args),
    })
  } catch {
    console.error('[youtube-search] backend_network_failure', { rpc: name })
    throw new SearchFailure('backend_unavailable')
  }

  if (!response.ok) {
    console.error('[youtube-search] backend_rpc_failure', { rpc: name, status: response.status })
    throw new SearchFailure(response.status === 401 || response.status === 403 ? 'backend_auth_failed' : 'backend_unavailable')
  }

  try {
    return await response.json() as unknown
  } catch {
    console.error('[youtube-search] backend_invalid_json', { rpc: name })
    throw new SearchFailure('backend_invalid_response')
  }
}

function getYoutubeReason(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.error) || !Array.isArray(payload.error.errors)) return null
  const first = payload.error.errors[0]
  return isRecord(first) && typeof first.reason === 'string' ? first.reason : null
}

function classifyYoutubeFailure(status: number, reason: string | null): FailureCode {
  if (reason && ['quotaExceeded', 'dailyLimitExceeded', 'rateLimitExceeded'].includes(reason)) {
    return 'youtube_quota_exceeded'
  }
  if (reason === 'keyInvalid' || reason === 'API_KEY_INVALID') return 'youtube_key_invalid'
  if (reason === 'ipRefererBlocked' || reason === 'refererNotAllowed') return 'youtube_key_restricted'
  if (reason === 'accessNotConfigured' || reason === 'serviceDisabled') return 'youtube_api_disabled'
  if (status === 401) return 'youtube_key_invalid'
  if (status === 403) return 'youtube_forbidden'
  if (status >= 500) return 'youtube_unavailable'
  return 'search_unavailable'
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 8192) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch {
    return json({ error: 'Solicitação inválida.' }, 400)
  }

  if (!isRecord(body) || typeof body.roomCode !== 'string' || typeof body.query !== 'string') {
    return json({ error: 'Informe uma pesquisa válida.' }, 400)
  }

  const roomCode = body.roomCode.trim().toUpperCase()
  const query = body.query.normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!/^[A-Z0-9]{10}$/.test(roomCode) || query.length < 3 || query.length > 100) {
    return json({ error: 'Informe uma pesquisa válida.' }, 400)
  }
  if (!env.YOUTUBE_API_KEY) return fail('youtube_key_missing')

  try {
    const normalizedQuery = normalize(query)
    const ip = env.YOUDJ_LOCAL_DEV === 'true'
      ? '127.0.0.2'
      : request.headers.get('CF-Connecting-IP') ?? 'unknown'
    const gate = await rpc(env, 'guest_search_gate', {
      p_code: roomCode,
      p_query: normalizedQuery,
      p_ip: ip,
    })

    if (isRecord(gate) && typeof gate.error === 'string') {
      const gateError = gate.error
      if (gateError === 'room_unavailable') return fail('room_unavailable')
      if (gateError === 'rate_limited') return fail('search_rate_limited')
      if (gateError === 'daily_budget') return fail('search_daily_budget')
      if (gateError === 'budget_not_configured') return fail('backend_not_configured')
      console.error('[youtube-search] search_gate_rejected', { reason: 'other' })
      return fail('backend_unavailable')
    }
    if (isRecord(gate) && gate.pending === true) return fail('search_in_progress')
    if (isRecord(gate) && gate.cached === true && Array.isArray(gate.videos)) {
      return json({ available: true, videos: gate.videos })
    }
    if (!isRecord(gate) || gate.cached !== false) {
      console.error('[youtube-search] invalid_search_gate_response')
      return fail('backend_invalid_response')
    }

    const url = new URL('https://www.googleapis.com/youtube/v3/search')
    url.search = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '5',
      q: query,
      key: env.YOUTUBE_API_KEY,
    }).toString()

    let youtubeResponse: Response
    try {
      youtubeResponse = await fetch(url, { signal: AbortSignal.timeout(8000) })
    } catch (error) {
      const isTimeout = error instanceof Error && error.name === 'TimeoutError'
      console.error('[youtube-search] youtube_network_failure', { timeout: isTimeout })
      return fail(isTimeout ? 'youtube_timeout' : 'youtube_unavailable')
    }

    if (!youtubeResponse.ok) {
      const providerPayload: unknown = await youtubeResponse.json().catch(() => null)
      const reason = getYoutubeReason(providerPayload)
      const code = classifyYoutubeFailure(youtubeResponse.status, reason)
      console.error('[youtube-search] youtube_api_rejected', {
        status: youtubeResponse.status,
        category: code,
      })
      return fail(code)
    }

    let data: unknown
    try {
      data = await youtubeResponse.json() as unknown
    } catch {
      console.error('[youtube-search] youtube_invalid_json')
      return fail('youtube_invalid_response')
    }
    if (!isRecord(data) || !Array.isArray(data.items)) {
      console.error('[youtube-search] youtube_invalid_payload')
      return fail('youtube_invalid_response')
    }
    const items = data.items
    const videos: Video[] = items.flatMap((item): Video[] => {
      if (!isRecord(item)) return []
      const snippet = isRecord(item.snippet) ? item.snippet : null
      const id = isRecord(item.id) ? item.id : null
      const videoId = id && typeof id.videoId === 'string' ? id.videoId : ''
      const title = snippet && typeof snippet.title === 'string' ? snippet.title : ''
      const channel = snippet && typeof snippet.channelTitle === 'string' ? snippet.channelTitle : ''
      const thumbnails = snippet && isRecord(snippet.thumbnails) ? snippet.thumbnails : null
      const thumbnail = thumbnails
        ? ['medium', 'high', 'default'].map((size) => thumbnails[size])
          .find((item) => isRecord(item) && typeof item.url === 'string' && isTrustedYoutubeThumbnail(item.url))
        : null
      const thumbnailUrl = isRecord(thumbnail) && typeof thumbnail.url === 'string' ? thumbnail.url : ''
      return /^[A-Za-z0-9_-]{11}$/.test(videoId) && title && channel && thumbnailUrl
        ? [{ videoId, title, channel, thumbnail: thumbnailUrl }]
        : []
    })

    const cached = await rpc(env, 'youtube_search_cache_store', {
      p_code: roomCode,
      p_query: normalizedQuery,
      p_videos: videos,
    })
    if (cached !== true) {
      console.error('[youtube-search] cache_store_rejected')
      return fail('search_cache_unavailable')
    }

    return json({ available: true, videos })
  } catch (error) {
    if (error instanceof SearchFailure) return fail(error.code)
    console.error('[youtube-search] unexpected_failure')
    return fail('search_unavailable')
  }
}
