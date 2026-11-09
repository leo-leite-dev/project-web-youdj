import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../../integrations/supabase/client'
import type { Database } from '../../../integrations/supabase/database.types'

export interface QueueTrack {
  requestId: string
  source: 'request' | 'dj'
  title: string
  artist: string
  videoId: string | null
  submittedUrl: string | null
  guestName: string
}

export interface DjMusicQueueStore {
  listByRoom(roomId: string): Promise<QueueTrack[]>
  addYoutubeTrack(roomId: string, videoId: string): Promise<string>
  listPlayedRequestIds?(roomId: string): Promise<string[]>
  markRequestPlayed?(roomId: string, requestId: string): Promise<void>
  reorder(roomId: string, requestIds: string[]): Promise<void>
  remove(roomId: string, requestId: string): Promise<void>
}

export function createDjMusicQueueStore(client: SupabaseClient<Database> = getSupabaseClient()): DjMusicQueueStore {
  return {
    async listByRoom(roomId) {
      const { data, error } = await client.rpc('dj_list_room_music_queue', { p_room_id: roomId })
      if (error) throw error
      if (!data) throw new Error('A fila retornou dados inválidos.')
      return data.map((item) => {
        // The deployed queue RPC predates the local DJ-track migration and omits `source`.
        // Its rows are all guest requests; keep accepting that established response shape.
        const source = item.source ?? 'request'
        if (source !== 'request' && source !== 'dj') throw new Error('A fila retornou uma origem de música inválida.')
        return { requestId: item.request_id, source, title: item.title, artist: item.artist,
          videoId: item.video_id, submittedUrl: item.submitted_url, guestName: item.guest_name }
      })
    },
    async addYoutubeTrack(roomId, videoId) {
      const { data, error } = await client.rpc('dj_add_youtube_track_to_queue', {
        p_room_id: roomId,
        p_video_id: videoId,
      })
      if (error) throw error
      if (typeof data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data)) {
        throw new Error('A fila não confirmou a inclusão desta música.')
      }
      return data
    },
    async listPlayedRequestIds(roomId) {
      const { data, error } = await client.rpc('dj_list_room_played_requests', { p_room_id: roomId })
      if (error) throw error
      return data ?? []
    },
    async markRequestPlayed(roomId, requestId) {
      const { data, error } = await client.rpc('dj_mark_room_request_played', { p_room_id: roomId, p_request_id: requestId })
      if (error) throw error
      if (!data) throw new Error('Este pedido não está aprovado nesta sala ou sua conta não tem acesso.')
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
