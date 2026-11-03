import { useCallback, useEffect, useState } from 'react'
import type { Room, RoomMusicPreferences, RoomStatus } from '../roomTypes'
import { getRoomErrorMessage } from '../lib/roomErrors'
import { normalizeRoomName } from '../lib/roomValidation'
import { createSupabaseRoomStore, type RoomStore } from '../services/roomStore'

export type RoomsStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface UseRoomsResult {
  createRoom: (name: string) => Promise<Room>
  error: string | null
  reload: () => void
  rooms: Room[]
  status: RoomsStatus
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<Room>
  updateRoomMusicPreferences: (roomId: string, preferences: RoomMusicPreferences) => Promise<Room>
}

const LOAD_ERROR_FALLBACK = 'Não foi possível carregar suas salas. Tente novamente.'

interface StoreState {
  error: unknown
  store: RoomStore | null
}

type RoomsResult =
  | { attempt: number; djId: string; kind: 'ok'; rooms: Room[] }
  | { attempt: number; djId: string; kind: 'error'; error: unknown }

/**
 * Estado de criação e listagem das salas do DJ autenticado.
 *
 * O status é derivado do resultado da busca (e não escrito no efeito), de modo
 * que o efeito só atualiza estado dentro de callbacks assíncronos — mesmo
 * padrão do AuthProvider. `storeOverride` permite testes.
 */
export function useRooms(djId: string | null, storeOverride?: RoomStore): UseRoomsResult {
  const [storeState] = useState<StoreState>(() => {
    if (storeOverride) {
      return { error: null, store: storeOverride }
    }

    try {
      return { error: null, store: createSupabaseRoomStore() }
    } catch (error) {
      return { error, store: null }
    }
  })
  const [result, setResult] = useState<RoomsResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!djId || !storeState.store) {
      return
    }

    let active = true

    storeState.store
      .listByDj(djId)
      .then((rooms) => {
        if (active) {
          setResult({ attempt, djId, kind: 'ok', rooms })
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({ attempt, djId, kind: 'error', error })
        }
      })

    return () => {
      active = false
    }
  }, [attempt, djId, storeState])

  const currentResult =
    result && result.djId === djId && result.attempt === attempt ? result : null

  const status: RoomsStatus = !djId
    ? 'idle'
    : !storeState.store
      ? 'error'
      : !currentResult
        ? 'loading'
        : currentResult.kind === 'error'
          ? 'error'
          : 'ready'

  const errorMessage: string | null = !djId
    ? null
    : !storeState.store
      ? getRoomErrorMessage(storeState.error, LOAD_ERROR_FALLBACK)
      : currentResult?.kind === 'error'
        ? getRoomErrorMessage(currentResult.error, LOAD_ERROR_FALLBACK)
        : null

  const rooms: Room[] = currentResult?.kind === 'ok' ? currentResult.rooms : []

  const createRoom = useCallback(
    async (name: string): Promise<Room> => {
      if (!storeState.store) {
        throw storeState.error
      }

      if (!djId) {
        throw new Error('Sessão indisponível para criar salas.')
      }

      const room = await storeState.store.create({ djId, name: normalizeRoomName(name) })

      setResult((current) =>
        current && current.djId === djId && current.attempt === attempt && current.kind === 'ok'
          ? { ...current, rooms: [room, ...current.rooms] }
          : current,
      )

      return room
    },
    [attempt, djId, storeState],
  )

  const reload = useCallback(() => {
    setAttempt((current) => current + 1)
  }, [])

  const updateRoomStatus = useCallback(
    async (roomId: string, nextStatus: RoomStatus): Promise<Room> => {
      if (!storeState.store) {
        throw storeState.error
      }

      if (!djId) {
        throw new Error('Sessão indisponível para atualizar salas.')
      }

      const room = await storeState.store.updateStatus(roomId, nextStatus)

      setResult((current) => {
        if (
          !current ||
          current.djId !== djId ||
          current.attempt !== attempt ||
          current.kind !== 'ok'
        ) {
          return current
        }

        return {
          ...current,
          rooms: current.rooms.map((currentRoom) =>
            currentRoom.id === room.id ? room : currentRoom,
          ),
        }
      })

      return room
    },
    [attempt, djId, storeState],
  )

  const updateRoomMusicPreferences = useCallback(async (roomId: string, preferences: RoomMusicPreferences) => {
    if (!storeState.store || !djId) throw new Error('Sessão indisponível para atualizar preferências.')
    const room = await storeState.store.updateMusicPreferences(roomId, preferences)
    setResult((current) => current?.kind === 'ok' && current.djId === djId && current.attempt === attempt
      ? { ...current, rooms: current.rooms.map((item) => item.id === room.id ? room : item) }
      : current)
    return room
  }, [attempt, djId, storeState])

  return { createRoom, error: errorMessage, reload, rooms, status, updateRoomStatus, updateRoomMusicPreferences }
}
