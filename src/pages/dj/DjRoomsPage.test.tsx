import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/authTypes'
import { makeAuthUser, makeDjProfile } from '../../test/authTestDoubles'
import { FakeRoomStore, makeRoom } from '../../test/roomTestDoubles'
import { DjRoomsPage } from './DjRoomsPage'

function makeAuthValue(): AuthContextValue {
  return {
    error: null,
    profile: makeDjProfile(),
    profileError: null,
    profileStatus: 'ready',
    refreshSession: () => {},
    retryProfile: () => {},
    signIn: async () => {},
    signInWithGoogle: async () => {},
    signOut: () => Promise.resolve(),
    signUp: async () => ({ needsEmailConfirmation: false }),
    status: 'authenticated',
    user: makeAuthUser(),
  }
}

function renderRoomsPage(store: FakeRoomStore) {
  return render(
    <AuthContext.Provider value={makeAuthValue()}>
      <DjRoomsPage roomStore={store} />
    </AuthContext.Provider>,
  )
}

describe('DjRoomsPage', () => {
  it('reuses room sharing and updates active and paused status after confirmation', async () => {
    const room = makeRoom()
    const store = new FakeRoomStore({ rooms: [room] })
    renderRoomsPage(store)

    expect(await screen.findByRole('heading', { name: 'Salas' })).toBeInTheDocument()
    expect(screen.getByLabelText('Link público da sala Festa Teste')).toHaveValue(
      `${window.location.origin}/sala/${room.code}`,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Pausar sala' }))

    expect(await screen.findByText('Pausada')).toBeInTheDocument()
    expect(store.updateCalls).toEqual([{ roomId: room.id, status: 'paused' }])

    fireEvent.click(screen.getByRole('button', { name: 'Ativar sala' }))

    expect(await screen.findByText('Ativa')).toBeInTheDocument()
    expect(store.updateCalls).toEqual([
      { roomId: room.id, status: 'paused' },
      { roomId: room.id, status: 'active' },
    ])
  })

  it('keeps the persisted status when the update is rejected', async () => {
    const store = new FakeRoomStore({
      rooms: [makeRoom()],
      updateError: { code: '42501' },
    })
    renderRoomsPage(store)

    fireEvent.click(await screen.findByRole('button', { name: 'Pausar sala' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sua sessão não tem permissão para gerenciar salas. Entre novamente.',
    )
    expect(screen.getByText('Ativa')).toBeInTheDocument()
  })
})
