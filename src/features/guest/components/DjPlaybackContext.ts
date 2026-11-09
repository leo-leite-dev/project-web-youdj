import { createContext } from 'react'
import type { QueueTrack } from '../services/djMusicQueueStore'

export interface PlaybackQueue {
  roomId: string
  tracks: QueueTrack[]
  onTrackStarted: (requestId: string) => void
}

export interface DjPlaybackContextValue {
  queue: PlaybackQueue | null
  currentTrackId: string | null
  playedTrackIds: ReadonlySet<string>
  hasPlaybackStarted: boolean
  fullViewRoomId: string | null
  registerQueue(roomId: string, tracks: QueueTrack[], onTrackStarted: (requestId: string) => void): void
  setFullView(roomId: string, active: boolean): void
  updatePlayback(currentId: string | null, playedIds: ReadonlySet<string>, hasStarted: boolean): void
}

export const DjPlaybackContext = createContext<DjPlaybackContextValue | null>(null)
