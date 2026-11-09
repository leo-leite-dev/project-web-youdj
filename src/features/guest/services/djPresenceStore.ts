import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'

export interface OnlineGuest {
  nickname: string
  lastSeenAt: string
  guestId: string | null
  isVip: boolean
}

export interface RoomPresenceSnapshot {
  count: number
  guests: OnlineGuest[]
}

export interface RoomGuestVip {
  guestId: string
  nickname: string
  grantedAt: string
}

export interface DjPresenceStore {
  listOnline: (roomId: string) => Promise<RoomPresenceSnapshot>
  listVips?: (roomId: string) => Promise<RoomGuestVip[]>
  setVip?: (roomId: string, guestId: string, enabled: boolean) => Promise<boolean>
}

class SupabaseDjPresenceStore implements DjPresenceStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async listOnline(roomId: string): Promise<RoomPresenceSnapshot> {
    const { data, error } = await this.client.rpc('dj_room_online_guests', { p_room_id: roomId })
    if (error) throw error
    if (!data) throw new Error('A presença da sala retornou uma resposta inválida.')

    const first = data[0]
    if (!first || !Number.isSafeInteger(first.online_count) || first.online_count < 0) {
      throw new Error('A presença da sala retornou dados inválidos.')
    }

    const guests = data.flatMap((row): OnlineGuest[] => {
      if (typeof row.guest_name !== 'string' || typeof row.last_seen_at !== 'string') return []
      const guestId = typeof row.guest_id === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.guest_id)
        ? row.guest_id
        : null
      return [{ nickname: row.guest_name, lastSeenAt: row.last_seen_at, guestId, isVip: row.is_vip === true }]
    })
    return { count: first.online_count, guests }
  }

  async setVip(roomId: string, guestId: string, enabled: boolean): Promise<boolean> {
    const { data, error } = await this.client.rpc('dj_set_room_guest_vip', {
      p_room_id: roomId,
      p_guest_id: guestId,
      p_enabled: enabled,
    })
    if (error) throw error
    if (typeof data !== 'boolean') throw new Error('A permissão VIP retornou uma resposta inválida.')
    return data
  }

  async listVips(roomId: string): Promise<RoomGuestVip[]> {
    const { data, error } = await this.client.rpc('dj_list_room_guest_vips', { p_room_id: roomId })
    if (error) throw error
    if (!data) throw new Error('A lista de Convidados VIP retornou uma resposta inválida.')
    return data.map((row) => ({ guestId: row.guest_id, nickname: row.guest_name, grantedAt: row.granted_at }))
  }
}

export function createDjPresenceStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): DjPresenceStore {
  return new SupabaseDjPresenceStore(client)
}
