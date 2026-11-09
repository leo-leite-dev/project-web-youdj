import type { GuestIdentity } from './guestIdentity'

export interface GuestPresenceStore {
  heartbeat: (roomCode: string, identity: GuestIdentity, credential: string) => Promise<void>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

class PagesGuestPresenceStore implements GuestPresenceStore {
  async heartbeat(roomCode: string, identity: GuestIdentity, credential: string): Promise<void> {
    let response: Response
    try {
      response = await fetch('/api/guest-presence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomCode, guestId: identity.guestId, nickname: identity.nickname, credential }),
      })
    } catch {
      throw new Error('Não foi possível atualizar sua presença. Verifique sua conexão.')
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok || !isRecord(payload) || payload.online !== true) {
      const message = isRecord(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Não foi possível entrar na sala. Tente novamente.'
      throw new Error(message)
    }
  }
}

export function createGuestPresenceStore(): GuestPresenceStore {
  return new PagesGuestPresenceStore()
}
