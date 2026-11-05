import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../features/auth/AuthContext'
import type { AuthContextValue } from '../../features/auth/authTypes'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import { makeAuthUser, makeDjProfile } from '../../test/authTestDoubles'
import { FakeRoomStore, makeRoom } from '../../test/roomTestDoubles'
import { DjRoomManagementPage } from './DjRoomManagementPage'

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

describe('DjRoomManagementPage', () => {
  it('shows room status, owner-scoped online guests and all request states', async () => {
    const room = makeRoom({ id: 'room-owner-a', name: 'Festa da Ana' })
    const roomStore = new FakeRoomStore({ rooms: [room] })
    const requestStore: DjRequestStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending', roomName: room.name, guestName: 'Apelido 1', title: 'Pedido pendente', artist: 'Artista', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-05T10:00:00Z' },
        { id: 'approved', roomName: room.name, guestName: 'Apelido 2', title: 'Pedido aprovado', artist: 'Artista', videoId: null, submittedUrl: null, status: 'approved', createdAt: '2026-11-05T09:00:00Z' },
        { id: 'rejected', roomName: room.name, guestName: 'Apelido 3', title: 'Pedido rejeitado', artist: 'Artista', videoId: null, submittedUrl: null, status: 'rejected', createdAt: '2026-11-05T08:00:00Z' },
      ]),
      summary: vi.fn().mockResolvedValue({ pending: 1, approved: 1, rejected: 1 }),
      setStatus: vi.fn().mockResolvedValue(undefined),
    }
    const presenceStore: DjPresenceStore = {
      listOnline: vi.fn().mockResolvedValue({
        count: 2,
        guests: [
          { nickname: 'Apelido 1', lastSeenAt: '2026-11-05T10:00:00Z' },
          { nickname: 'Apelido 2', lastSeenAt: '2026-11-05T10:00:00Z' },
        ],
      }),
    }

    render(
      <AuthContext.Provider value={makeAuthValue()}>
        <MemoryRouter initialEntries={[`/dj/painel/salas/${room.id}`]}>
          <Routes><Route path="/dj/painel/salas/:roomId" element={<DjRoomManagementPage roomStore={roomStore} requestStore={requestStore} presenceStore={presenceStore} />} /></Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('heading', { name: 'Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText('Ativa')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /convidados online 2/i })).toBeInTheDocument()
    expect(screen.getByText('Apelido 1')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Apelido 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /pedidos pendentes/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /aprovados/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /rejeitados/i })).toBeInTheDocument()
    expect(presenceStore.listOnline).toHaveBeenCalledWith(room.id)
    expect(requestStore.listByRoom).toHaveBeenCalledWith(room.id)
  })
})
