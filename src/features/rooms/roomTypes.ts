export type RoomStatus = 'active' | 'paused'

export interface RoomMusicPreferences {
  surpriseMode: boolean
  showPlaylist: boolean
  showNowPlaying: boolean
  showGuestRequests: boolean
}

export const DEFAULT_ROOM_MUSIC_PREFERENCES: RoomMusicPreferences = {
  surpriseMode: true,
  showPlaylist: false,
  showNowPlaying: true,
  showGuestRequests: false,
}

export interface Room {
  code: string
  createdAt: string
  djId: string
  id: string
  name: string
  status: RoomStatus
  updatedAt: string
  musicPreferences: RoomMusicPreferences
}

/** Campos públicos expostos pela consulta por código (sem dados do DJ). */
export interface PublicRoom {
  code: string
  name: string
  status: RoomStatus
  musicPreferences: RoomMusicPreferences
}

export interface CreateRoomInput {
  djId: string
  name: string
}
