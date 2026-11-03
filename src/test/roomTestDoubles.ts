import type { CreateRoomInput, PublicRoom, Room } from '../features/rooms/roomTypes'
import type { PublicRoomStore } from '../features/rooms/services/publicRoomStore'
import type { RoomStore } from '../features/rooms/services/roomStore'

export function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    code: 'AB12CD34EF',
    createdAt: '2026-11-03T12:00:00.000Z',
    djId: '11111111-1111-4111-8111-111111111111',
    id: 'aaaaaaaa-1111-4111-8111-111111111111',
    name: 'Festa Teste',
    status: 'active',
    updatedAt: '2026-11-03T12:00:00.000Z',
    ...overrides,
  }
}

export function makePublicRoom(overrides: Partial<PublicRoom> = {}): PublicRoom {
  return {
    code: 'AB12CD34EF',
    name: 'Festa Teste',
    status: 'active',
    ...overrides,
  }
}

interface FakeRoomStoreOptions {
  createError?: unknown
  listError?: unknown
  rooms?: Room[]
}

export class FakeRoomStore implements RoomStore {
  readonly createCalls: CreateRoomInput[] = []
  createError?: unknown
  listError?: unknown
  rooms: Room[]

  constructor(options: FakeRoomStoreOptions = {}) {
    this.createError = options.createError
    this.listError = options.listError
    this.rooms = options.rooms ?? []
  }

  async create(input: CreateRoomInput): Promise<Room> {
    this.createCalls.push(input)

    if (this.createError) {
      throw this.createError
    }

    const room = makeRoom({
      djId: input.djId,
      id: `room-${this.createCalls.length}`,
      name: input.name,
    })
    this.rooms = [room, ...this.rooms]
    return room
  }

  async listByDj(djId: string): Promise<Room[]> {
    if (this.listError) {
      throw this.listError
    }

    return this.rooms.filter((room) => room.djId === djId)
  }
}

interface FakePublicRoomStoreOptions {
  findError?: unknown
  rooms?: PublicRoom[]
}

export class FakePublicRoomStore implements PublicRoomStore {
  readonly findCalls: string[] = []
  findError?: unknown
  rooms: PublicRoom[]

  constructor(options: FakePublicRoomStoreOptions = {}) {
    this.findError = options.findError
    this.rooms = options.rooms ?? []
  }

  async findByCode(code: string): Promise<PublicRoom | null> {
    this.findCalls.push(code)

    if (this.findError) {
      throw this.findError
    }

    return this.rooms.find((room) => room.code === code) ?? null
  }
}
