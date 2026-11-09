import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import { toRoomStatus } from '../lib/roomStatus'
import type { CreateRoomInput, Room, RoomMusicPreferences, RoomStatus } from '../roomTypes'

type RoomRow = Database['public']['Tables']['rooms']['Row']

const ROOM_COLUMNS = 'id, dj_id, name, status, code, created_at, updated_at, surprise_mode, show_playlist, show_now_playing, show_guest_requests'

export interface RoomStore {
  create: (input: CreateRoomInput) => Promise<Room>
  listByDj: (djId: string) => Promise<Room[]>
  updateStatus: (roomId: string, status: RoomStatus) => Promise<Room>
  updateMusicPreferences: (roomId: string, preferences: RoomMusicPreferences) => Promise<Room>
  delete: (roomId: string) => Promise<void>
}

function toRoom(row: RoomRow): Room {
  return {
    code: row.code,
    createdAt: row.created_at,
    djId: row.dj_id,
    id: row.id,
    name: row.name,
    status: toRoomStatus(row.status),
    updatedAt: row.updated_at,
    musicPreferences: {
      surpriseMode: row.surprise_mode,
      showPlaylist: row.show_playlist,
      showNowPlaying: row.show_now_playing,
      showGuestRequests: row.show_guest_requests,
    },
  }
}

class SupabaseRoomStore implements RoomStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async listByDj(djId: string): Promise<Room[]> {
    const { data, error } = await this.client
      .from('rooms')
      .select(ROOM_COLUMNS)
      .eq('dj_id', djId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data.map(toRoom)
  }

  async create(input: CreateRoomInput): Promise<Room> {
    const { data, error } = await this.client
      .from('rooms')
      .insert({ dj_id: input.djId, name: input.name })
      .select(ROOM_COLUMNS)
      .single()

    if (error) {
      throw error
    }

    return toRoom(data)
  }

  async updateStatus(roomId: string, status: RoomStatus): Promise<Room> {
    const { data, error } = await this.client
      .from('rooms')
      .update({ status })
      .eq('id', roomId)
      .select(ROOM_COLUMNS)
      .single()

    if (error) {
      throw error
    }

    return toRoom(data)
  }

  async updateMusicPreferences(roomId: string, preferences: RoomMusicPreferences): Promise<Room> {
    const { data, error } = await this.client.from('rooms').update({
      surprise_mode: preferences.surpriseMode,
      show_playlist: preferences.showPlaylist,
      show_now_playing: preferences.showNowPlaying,
      show_guest_requests: preferences.showGuestRequests,
    }).eq('id', roomId).select(ROOM_COLUMNS).single()
    if (error) throw error
    return toRoom(data)
  }

  async delete(roomId: string): Promise<void> {
    const { error } = await this.client.rpc('dj_delete_room', { p_room_id: roomId })
    if (error) throw error
  }
}

export function createSupabaseRoomStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): RoomStore {
  return new SupabaseRoomStore(client)
}
