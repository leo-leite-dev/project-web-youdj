import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import { normalizeRoomCode } from '../../guest/lib/roomCode'
import type { PublicRoom } from '../roomTypes'
import { toRoomStatus } from '../lib/roomStatus'

export interface PublicRoomStore {
  findByCode: (code: string) => Promise<PublicRoom | null>
}

/**
 * A consulta administrativa usa uma RPC separada para não alterar o contrato
 * de `room_by_code` consumido pela versão publicada do frontend.
 */
class SupabasePublicRoomStore implements PublicRoomStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async findByCode(code: string): Promise<PublicRoom | null> {
    const { data, error } = await this.client.rpc('room_by_code_with_membership', {
      p_code: normalizeRoomCode(code),
    })

    if (error) {
      throw error
    }

    const row = data?.[0]

    if (!row) {
      return null
    }

    if (!['owner', 'moderator', 'guest', 'unauthorized'].includes(row.viewer_role)
      || typeof row.dj_name !== 'string' || !row.dj_name.trim()
      || ((row.viewer_role === 'owner' || row.viewer_role === 'moderator') && typeof row.room_id !== 'string')
      || ((row.viewer_role === 'guest' || row.viewer_role === 'unauthorized') && row.room_id !== null)) {
      throw new Error('A consulta pública da sala retornou dados inválidos.')
    }

    return {
      code: row.code, name: row.name, status: toRoomStatus(row.status),
      djName: row.dj_name,
      roomId: row.room_id,
      viewerRole: row.viewer_role,
      musicPreferences: {
        surpriseMode: row.surprise_mode, showPlaylist: row.show_playlist,
        showNowPlaying: row.show_now_playing, showGuestRequests: row.show_guest_requests,
      },
    }
  }
}

export function createSupabasePublicRoomStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): PublicRoomStore {
  return new SupabasePublicRoomStore(client)
}
