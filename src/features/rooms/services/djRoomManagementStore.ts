import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import { toRoomStatus } from '../lib/roomStatus'
import type { RoomMusicPreferences } from '../roomTypes'

export interface ManagedRoom {
  id: string
  name: string
  code: string
  status: 'active' | 'paused'
  djName: string
  accessRole: 'owner' | 'moderator'
  musicPreferences: RoomMusicPreferences
}

export interface RoomModerator {
  userId: string
  email: string | null
  displayName: string
  createdAt: string
}

export interface DjRoomManagementStore {
  getRoom: (roomId: string) => Promise<ManagedRoom | null>
  listModerators: (roomId: string) => Promise<RoomModerator[]>
  inviteModerator: (roomId: string, email: string) => Promise<boolean>
  revokeModerator: (roomId: string, userId: string) => Promise<boolean>
}

class SupabaseDjRoomManagementStore implements DjRoomManagementStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async getRoom(roomId: string): Promise<ManagedRoom | null> {
    const { data, error } = await this.client.rpc('dj_get_room_management_context', { p_room_id: roomId })
    if (error) throw error
    const row = data?.[0]
    if (!row) return null

    return {
      id: row.room_id,
      name: row.room_name,
      code: row.code,
      status: toRoomStatus(row.status),
      djName: row.dj_name,
      accessRole: row.access_role,
      musicPreferences: {
        surpriseMode: row.surprise_mode,
        showPlaylist: row.show_playlist,
        showNowPlaying: row.show_now_playing,
        showGuestRequests: row.show_guest_requests,
      },
    }
  }

  async listModerators(roomId: string): Promise<RoomModerator[]> {
    const { data, error } = await this.client.rpc('dj_list_room_moderators', { p_room_id: roomId })
    if (error) throw error
    if (!data) throw new Error('A lista de moderadores retornou dados inválidos.')
    return data.map((row) => ({
      userId: row.user_id,
      email: row.email,
      displayName: row.display_name,
      createdAt: row.created_at,
    }))
  }

  async inviteModerator(roomId: string, email: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('dj_invite_room_moderator', {
      p_room_id: roomId,
      p_email: email,
    })
    if (error) throw error
    if (typeof data !== 'boolean') throw new Error('A resposta do convite de moderador é inválida.')
    return data
  }

  async revokeModerator(roomId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.client.rpc('dj_revoke_room_moderator', {
      p_room_id: roomId,
      p_moderator_id: userId,
    })
    if (error) throw error
    if (typeof data !== 'boolean') throw new Error('A resposta da revogação de moderador é inválida.')
    return data
  }
}

export function createDjRoomManagementStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): DjRoomManagementStore {
  return new SupabaseDjRoomManagementStore(client)
}
