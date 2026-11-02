export type RoomStatus = 'active' | 'paused'

export interface Room {
  createdAt: string
  djId: string
  id: string
  name: string
  status: RoomStatus
  updatedAt: string
}

export interface CreateRoomInput {
  djId: string
  name: string
}
