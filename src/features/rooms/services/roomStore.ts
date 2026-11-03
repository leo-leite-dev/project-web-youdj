import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'
import { toRoomStatus } from '../lib/roomStatus'
import type { CreateRoomInput, Room, RoomStatus } from '../roomTypes'

type RoomRow = Database['public']['Tables']['rooms']['Row']

const ROOM_COLUMNS = 'id, dj_id, name, status, code, created_at, updated_at'

export interface RoomStore {
  create: (input: CreateRoomInput) => Promise<Room>
  listByDj: (djId: string) => Promise<Room[]>
  updateStatus: (roomId: string, status: RoomStatus) => Promise<Room>
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
}

export function createSupabaseRoomStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): RoomStore {
  return new SupabaseRoomStore(client)
}
