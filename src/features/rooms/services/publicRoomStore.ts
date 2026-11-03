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
 * Consulta pública limitada: usa a RPC `room_by_code`, que retorna apenas
 * código, nome e status. A tabela `rooms` continua inacessível ao papel anon.
 */
class SupabasePublicRoomStore implements PublicRoomStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async findByCode(code: string): Promise<PublicRoom | null> {
    const { data, error } = await this.client.rpc('room_by_code', {
      p_code: normalizeRoomCode(code),
    })

    if (error) {
      throw error
    }

    const row = data?.[0]

    if (!row) {
      return null
    }

    return { code: row.code, name: row.name, status: toRoomStatus(row.status) }
  }
}

export function createSupabasePublicRoomStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): PublicRoomStore {
  return new SupabasePublicRoomStore(client)
}
