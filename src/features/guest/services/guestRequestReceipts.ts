const STORAGE_PREFIX = 'youdj.guest.request-receipts.v1.'
const PRIVATE_CODE_PATTERN = /^[a-f0-9]{64}$/
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000
const MAX_RECEIPTS_PER_ROOM = 100

export interface GuestRequestReceiptCredential {
  privateCode: string
  savedAt: string
}

function storageKey(roomCode: string): string {
  return `${STORAGE_PREFIX}${roomCode}`
}

function isReceiptCredential(value: unknown, now: number): value is GuestRequestReceiptCredential {
  if (typeof value !== 'object' || value === null
    || !('privateCode' in value) || typeof value.privateCode !== 'string'
    || !PRIVATE_CODE_PATTERN.test(value.privateCode)
    || !('savedAt' in value) || typeof value.savedAt !== 'string') return false

  const savedAt = Date.parse(value.savedAt)
  return Number.isFinite(savedAt) && savedAt <= now && now - savedAt <= RETENTION_MS
}

export function readGuestRequestReceipts(roomCode: string, now = Date.now()): GuestRequestReceiptCredential[] {
  try {
    const raw = globalThis.localStorage.getItem(storageKey(roomCode))
    if (!raw) return []
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []

    const valid = value.filter((item): item is GuestRequestReceiptCredential => isReceiptCredential(item, now))
    const deduplicated = new Map(valid.map((receipt) => [receipt.privateCode, receipt]))
    return Array.from(deduplicated.values()).slice(-MAX_RECEIPTS_PER_ROOM)
  } catch {
    return []
  }
}

export function saveGuestRequestReceipt(
  roomCode: string,
  privateCode: string,
  now = Date.now(),
): boolean {
  if (!PRIVATE_CODE_PATTERN.test(privateCode)) return false

  try {
    const receipts = readGuestRequestReceipts(roomCode, now)
      .filter((receipt) => receipt.privateCode !== privateCode)
    receipts.push({ privateCode, savedAt: new Date(now).toISOString() })
    globalThis.localStorage.setItem(
      storageKey(roomCode),
      JSON.stringify(receipts.slice(-MAX_RECEIPTS_PER_ROOM)),
    )
    return true
  } catch {
    return false
  }
}
