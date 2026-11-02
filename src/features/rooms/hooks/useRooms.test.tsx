import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FakeRoomStore, makeRoom } from '../../../test/roomTestDoubles'
import { useRooms } from './useRooms'

const djId = '11111111-1111-4111-8111-111111111111'

describe('useRooms', () => {
  it('loads the rooms of the DJ', async () => {
    const store = new FakeRoomStore({ rooms: [makeRoom()] })
    const { result } = renderHook(() => useRooms(djId, store))

    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.rooms).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('reports a mapped load error and recovers after reload', async () => {
    const store = new FakeRoomStore({ listError: { code: '42501' } })
    const { result } = renderHook(() => useRooms(djId, store))

    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBe(
      'Sua sessão não tem permissão para gerenciar salas. Entre novamente.',
    )

    store.listError = undefined
    store.rooms = [makeRoom()]

    act(() => result.current.reload())

    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.rooms).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('creates a room with a normalized name and prepends it to the list', async () => {
    const store = new FakeRoomStore({ rooms: [makeRoom({ id: 'room-0', name: 'Original' })] })
    const { result } = renderHook(() => useRooms(djId, store))

    await waitFor(() => expect(result.current.status).toBe('ready'))

    await act(async () => {
      await result.current.createRoom('  Festa   Nova  ')
    })

    expect(store.createCalls).toEqual([{ djId, name: 'Festa Nova' }])
    expect(result.current.rooms.map((room) => room.name)).toEqual(['Festa Nova', 'Original'])
  })
})
