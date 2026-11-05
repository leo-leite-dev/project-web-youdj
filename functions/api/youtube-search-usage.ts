interface Env {
  SUPABASE_URL?: string
  SUPABASE_SERVICE_ROLE_KEY?: string
}

type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'O contador está temporariamente indisponível.' }, 503)
  }

  let response: Response
  try {
    response = await fetch(`${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/youtube_search_usage_snapshot`, {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ p_record_call: false }),
    })
  } catch {
    console.error('[youtube-search-usage] backend_network_failure')
    return json({ error: 'O contador está temporariamente indisponível.' }, 503)
  }

  if (!response.ok) {
    console.error('[youtube-search-usage] backend_rpc_failure', { status: response.status })
    return json({ error: 'O contador está temporariamente indisponível.' }, 503)
  }

  let payload: unknown
  try {
    payload = await response.json() as unknown
  } catch {
    console.error('[youtube-search-usage] backend_invalid_json')
    return json({ error: 'O contador está temporariamente indisponível.' }, 503)
  }

  if (!isRecord(payload)
    || !Number.isSafeInteger(payload.callsToday) || (payload.callsToday as number) < 0
    || !Number.isSafeInteger(payload.dailyQuota) || (payload.dailyQuota as number) < 0
    || typeof payload.quotaDay !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(payload.quotaDay)
    || typeof payload.nextResetAt !== 'string' || !Number.isFinite(Date.parse(payload.nextResetAt))) {
    console.error('[youtube-search-usage] backend_invalid_payload')
    return json({ error: 'O contador está temporariamente indisponível.' }, 503)
  }

  return json({
    callsToday: payload.callsToday,
    dailyQuota: payload.dailyQuota,
    quotaDay: payload.quotaDay,
    nextResetAt: payload.nextResetAt,
  })
}
