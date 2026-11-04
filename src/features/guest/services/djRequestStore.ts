import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'

export interface DjRequest {
  id: string
  roomName: string
  title: string
  artist: string
  videoId: string | null
  submittedUrl: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface DjRequestStore {
  list: () => Promise<DjRequest[]>
  setStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>
}

class SupabaseDjRequestStore implements DjRequestStore {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async list(): Promise<DjRequest[]> {
    const { data, error } = await this.client.rpc('dj_list_guest_requests')
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      roomName: row.room_name,
      title: row.title,
      artist: row.artist,
      videoId: row.video_id,
      submittedUrl: row.submitted_url,
      status: row.status,
      createdAt: row.created_at,
    }))
  }

  async setStatus(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    const { data, error } = await this.client.rpc('dj_set_guest_request_status', {
      p_request_id: requestId,
      p_status: status,
    })
    if (error) throw error
    if (!data) throw new Error('Este pedido já foi alterado ou não pertence a uma sala sua.')
  }
}

export function createDjRequestStore(
  client: SupabaseClient<Database> = getSupabaseClient(),
): DjRequestStore {
  return new SupabaseDjRequestStore(client)
}
