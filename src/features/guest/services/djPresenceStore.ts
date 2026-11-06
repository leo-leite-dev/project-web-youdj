import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'

export interface OnlineGuest {
  nickname: string
  lastSeenAt: string
}

export interface RoomPresenceSnapshot {
  count: number
  guests: OnlineGuest[]
}

export interface DjPresenceStore {
  listOnline: (roomId: string) => Promise<RoomPresenceSnapshot>
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
      return [{ nickname: row.guest_name, lastSeenAt: row.last_seen_at }]
    })
    return { count: first.online_count, guests }
  }
}

export function createDjPresenceStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): DjPresenceStore {
  return new SupabaseDjPresenceStore(client)
}
