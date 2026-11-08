import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '../../../integrations/supabase/database.types'
import { createDjMusicQueueStore } from './djMusicQueueStore'

describe('createDjMusicQueueStore', () => {
  const rpc = vi.fn()
  const client = { rpc } as unknown as SupabaseClient<Database>

  beforeEach(() => rpc.mockReset())

  it('invokes the authenticated direct-add RPC using only the selected video ID', async () => {
    const queueItemId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    rpc.mockResolvedValue({ data: queueItemId, error: null })
    const store = createDjMusicQueueStore(client)

    await expect(store.addYoutubeTrack('room-a', 'abcdefghijk')).resolves.toBe(queueItemId)
    expect(rpc).toHaveBeenCalledWith('dj_add_youtube_track_to_queue', { p_room_id: 'room-a', p_video_id: 'abcdefghijk' })
  })

  it('rejects an invalid or unconfirmed RPC result instead of reporting success', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    const store = createDjMusicQueueStore(client)

    await expect(store.addYoutubeTrack('room-a', 'abcdefghijk')).rejects.toThrow('A fila não confirmou a inclusão desta música.')
  })

  it('keeps request and DJ source metadata distinct when loading the queue', async () => {
    rpc.mockResolvedValue({ data: [
      { request_id: 'request-a', title: 'Guest request', artist: 'Guest artist', video_id: 'abcdefghijk', submitted_url: null, guest_name: 'Guest', position: 1, added_at: '2026-11-01T00:00:00Z', source: 'request' },
      { request_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', title: 'DJ song', artist: 'Channel', video_id: 'abcdefghijl', submitted_url: null, guest_name: 'DJ', position: 2, added_at: '2026-11-01T00:01:00Z', source: 'dj' },
    ], error: null })
    const store = createDjMusicQueueStore(client)

    await expect(store.listByRoom('room-a')).resolves.toMatchObject([
      { requestId: 'request-a', source: 'request', guestName: 'Guest' },
      { requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', source: 'dj', guestName: 'DJ' },
    ])
  })

  it('accepts the deployed legacy queue RPC response, which has no source column', async () => {
    rpc.mockResolvedValue({ data: [
      { request_id: 'request-a', title: 'Previously queued track', artist: 'Artist', video_id: 'abcdefghijk', submitted_url: null, guest_name: 'Guest', position: 1, added_at: '2026-11-01T00:00:00Z' },
    ], error: null })
    const store = createDjMusicQueueStore(client)

    await expect(store.listByRoom('room-a')).resolves.toMatchObject([
      { requestId: 'request-a', source: 'request', title: 'Previously queued track' },
    ])
  })
})
