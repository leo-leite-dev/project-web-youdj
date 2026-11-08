interface Env { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function isMissingCredentialRpc(response: Response): Promise<boolean> {
  if (response.status !== 404) return false
  const payload: unknown = await response.clone().json().catch(() => null)
  return isRecord(payload) && (payload.code === 'PGRST202' || payload.code === '42883')
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 4096) return json({ error: 'Dados de entrada inválidos.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch {
    return json({ error: 'Dados de entrada inválidos.' }, 400)
  }

  if (!isRecord(body) || typeof body.roomCode !== 'string' || typeof body.guestId !== 'string'
    || typeof body.nickname !== 'string' || typeof body.credential !== 'string') {
    return json({ error: 'Informe um apelido válido para entrar na sala.' }, 400)
  }

  const roomCode = body.roomCode.trim().toUpperCase()
  const guestId = body.guestId.toLowerCase()
  const sanitizedNickname = Array.from(body.nickname.normalize('NFKC'), (character) => {
    const code = character.charCodeAt(0)
    return code <= 0x1f || code === 0x7f ? ' ' : character
  }).join('')
  const nickname = sanitizedNickname.trim().replace(/\s+/g, ' ')
  if (!/^[A-Z0-9]{10}$/.test(roomCode)
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(guestId)
    || !/^[a-f0-9]{64}$/.test(body.credential)
    || !nickname || [...nickname].length > 40) {
    return json({ error: 'Informe um apelido válido para entrar na sala.' }, 400)
  }
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'A entrada na sala está temporariamente indisponível.' }, 503)
  }

  try {
    const rpcUrl = `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/register_guest_presence`
    const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'content-type': 'application/json' }
    let response = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_code: roomCode, p_guest_id: guestId, p_guest_name: nickname, p_guest_credential: body.credential }),
    })

    // Keep standard guest access working while an environment is on the older
    // three-argument RPC. This fallback never grants VIP: only the credential-
    // aware RPC and VIP migration can do that. Do not hide other backend errors.
    if (await isMissingCredentialRpc(response)) {
      response = await fetch(rpcUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ p_code: roomCode, p_guest_id: guestId, p_guest_name: nickname }),
      })
    }

    if (!response.ok) {
      console.error('[guest-presence] backend_rpc_failure', { status: response.status })
      return json({ error: 'A entrada na sala está temporariamente indisponível.' }, 503)
    }

    const registered: unknown = await response.json().catch(() => null)
    if (registered !== true) return json({ error: 'Esta sala não está disponível para entrada.' }, 409)
    return json({ online: true })
  } catch {
    console.error('[guest-presence] backend_network_failure')
    return json({ error: 'A entrada na sala está temporariamente indisponível.' }, 503)
  }
}
