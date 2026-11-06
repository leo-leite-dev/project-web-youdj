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

export type RoomAccessRole = 'owner' | 'moderator' | 'guest' | 'unauthorized'

/** Consulta pública limitada; IDs internos só vêm preenchidos para membros. */
export interface PublicRoom {
  code: string
  djName: string
  name: string
  roomId: string | null
  status: RoomStatus
  viewerRole: RoomAccessRole
  musicPreferences: RoomMusicPreferences
}

export interface CreateRoomInput {
  djId: string
  name: string
}
