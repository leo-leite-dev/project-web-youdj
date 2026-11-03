export type RoomStatus = 'active' | 'paused'

export interface Room {
  code: string
  createdAt: string
  djId: string
  id: string
  name: string
  status: RoomStatus
  updatedAt: string
}

/** Campos públicos expostos pela consulta por código (sem dados do DJ). */
export interface PublicRoom {
  code: string
  name: string
  status: RoomStatus
}

export interface CreateRoomInput {
  djId: string
  name: string
}
