export interface GuestIdentity {
  guestId: string
  nickname: string
}

const STORAGE_KEY = 'youdj.guest.identity.v1'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isControlCharacter(character: string): boolean {
  const code = character.charCodeAt(0)
  return code <= 0x1f || code === 0x7f
}

function normalizeNickname(value: string): string {
  const sanitized = Array.from(value.normalize('NFKC'), (character) => (isControlCharacter(character) ? ' ' : character)).join('')
  return sanitized.trim().replace(/\s+/g, ' ')
}

export function createGuestIdentity(nickname: string): GuestIdentity | null {
  const normalizedNickname = normalizeNickname(nickname)
  if (!normalizedNickname || [...normalizedNickname].length > 40) return null

  const bytes = new Uint8Array(16)
  const browserCrypto = globalThis.crypto
  if (browserCrypto?.getRandomValues) {
    browserCrypto.getRandomValues(bytes)
  } else {
    // This identifier only links one browser to its own room requests/presence;
    // it is not a credential, authenticator or proof of identity.
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  const guestId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`

  return { guestId, nickname: normalizedNickname }
}

export function readGuestIdentity(): GuestIdentity | null {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || !('guestId' in value) || !('nickname' in value)
      || typeof value.guestId !== 'string' || !UUID_PATTERN.test(value.guestId)
      || typeof value.nickname !== 'string') return null

    const nickname = normalizeNickname(value.nickname)
    return nickname && [...nickname].length <= 40 ? { guestId: value.guestId, nickname } : null
  } catch {
    return null
  }
}

export function saveGuestIdentity(identity: GuestIdentity): boolean {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
    return true
  } catch {
    return false
  }
}
