interface Env { SUPABASE_URL?: string; SUPABASE_SERVICE_ROLE_KEY?: string }
type PagesFunction<E> = (context: { request: Request; env: E }) => Response | Promise<Response>

const MAX_PRIVATE_CODES = 100
const PRIVATE_CODE_PATTERN = /^[a-f0-9]{64}$/
const ROOM_CODE_PATTERN = /^[A-Z0-9]{10}$/
const REQUEST_STATUSES = new Set(['pending', 'approved', 'rejected'])

interface GuestRequestStatus {
  title: string
  artist: string
  status: string
  created_at: string
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isGuestRequestStatus(value: unknown): value is GuestRequestStatus {
  return isRecord(value)
    && typeof value.title === 'string' && value.title.trim().length > 0 && value.title.length <= 120
    && typeof value.artist === 'string' && value.artist.trim().length > 0 && value.artist.length <= 120
    && typeof value.status === 'string' && REQUEST_STATUSES.has(value.status)
    && typeof value.created_at === 'string' && Number.isFinite(Date.parse(value.created_at))
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: unknown
  try {
    const raw = await request.text()
    if (raw.length > 12_000) return json({ error: 'Solicitação inválida.' }, 413)
    body = JSON.parse(raw) as unknown
  } catch {
    return json({ error: 'Solicitação inválida.' }, 400)
  }

  if (!isRecord(body) || typeof body.roomCode !== 'string' || !Array.isArray(body.privateCodes)) {
    return json({ error: 'Solicitação inválida.' }, 400)
  }

  const roomCode = body.roomCode.trim().toUpperCase()
  if (!ROOM_CODE_PATTERN.test(roomCode)
    || body.privateCodes.length > MAX_PRIVATE_CODES
    || !body.privateCodes.every((code) => typeof code === 'string' && PRIVATE_CODE_PATTERN.test(code.toLowerCase()))) {
    return json({ error: 'Solicitação inválida.' }, 400)
  }

  const privateCodes = Array.from(new Set((body.privateCodes as string[]).map((code) => code.toLowerCase())))
  if (!privateCodes.length) return json({ requests: [] })
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Meus pedidos está temporariamente indisponível.' }, 503)
  }

  try {
    const receiptHashes = await Promise.all(privateCodes.map(sha256Hex))
    const response = await fetch(
      `${env.SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/rpc/guest_list_requests_by_receipt_hashes`,
      {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ p_room_code: roomCode, p_receipt_hashes: receiptHashes }),
      },
    )
    if (!response.ok) {
      console.error('[guest-request-status] backend_rpc_failure', { status: response.status })
      return json({ error: 'Meus pedidos está temporariamente indisponível.' }, 503)
    }

    const result: unknown = await response.json().catch(() => null)
    if (!Array.isArray(result) || result.length > MAX_PRIVATE_CODES || !result.every(isGuestRequestStatus)) {
      console.error('[guest-request-status] invalid_backend_response')
      return json({ error: 'Meus pedidos está temporariamente indisponível.' }, 503)
    }

    return json({ requests: result.map((item) => ({
      title: item.title,
      artist: item.artist,
      status: item.status,
      createdAt: item.created_at,
    })) })
  } catch {
    console.error('[guest-request-status] backend_network_failure')
    return json({ error: 'Meus pedidos está temporariamente indisponível.' }, 503)
  }
}
