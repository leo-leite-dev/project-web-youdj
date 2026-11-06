import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'

export interface QueueTrack {
  requestId: string
  title: string
  artist: string
  videoId: string | null
  submittedUrl: string | null
  guestName: string
}

export interface DjMusicQueueStore {
  listByRoom(roomId: string): Promise<QueueTrack[]>
  reorder(roomId: string, requestIds: string[]): Promise<void>
  remove(roomId: string, requestId: string): Promise<void>
}

export function createDjMusicQueueStore(client: SupabaseClient<Database> = getSupabaseClient()): DjMusicQueueStore {
  return {
    async listByRoom(roomId) {
      const { data, error } = await client.rpc('dj_list_room_music_queue', { p_room_id: roomId })
      if (error) throw error
      if (!data) throw new Error('A fila retornou dados inválidos.')
      return data.map((item) => ({ requestId: item.request_id, title: item.title, artist: item.artist,
        videoId: item.video_id, submittedUrl: item.submitted_url, guestName: item.guest_name }))
    },
    async reorder(roomId, requestIds) {
      const { data, error } = await client.rpc('dj_reorder_room_music_queue', { p_room_id: roomId, p_request_ids: requestIds })
      if (error) throw error
      if (!data) throw new Error('A fila mudou; atualize e tente novamente.')
    },
    async remove(roomId, requestId) {
      const { data, error } = await client.rpc('dj_remove_room_music_queue_item', { p_room_id: roomId, p_request_id: requestId })
      if (error) throw error
      if (!data) throw new Error('A música não está mais nesta fila.')
    },
  }
}
