import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import type { DjRoomManagementStore, ManagedRoom } from '../../features/rooms/services/djRoomManagementStore'
import { DjRoomManagementPage } from './DjRoomManagementPage'

const ownerRoom: ManagedRoom = {
  id: 'room-owner-a',
  name: 'Festa da Ana',
  code: 'FESTA00001',
  status: 'active',
  djName: 'Ana DJ',
  accessRole: 'owner',
  musicPreferences: { surpriseMode: true, showPlaylist: false, showNowPlaying: true, showGuestRequests: false },
}

function renderManagement(room: ManagedRoom, requestStore: DjRequestStore, presenceStore: DjPresenceStore) {
  const roomManagementStore: DjRoomManagementStore = {
    getRoom: vi.fn().mockResolvedValue(room),
    listModerators: vi.fn().mockResolvedValue([]),
    inviteModerator: vi.fn().mockResolvedValue(true),
    revokeModerator: vi.fn().mockResolvedValue(true),
  }
  render(<MemoryRouter initialEntries={[`/dj/painel/salas/${room.id}`]}>
    <Routes><Route path="/dj/painel/salas/:roomId" element={<DjRoomManagementPage roomManagementStore={roomManagementStore} requestStore={requestStore} presenceStore={presenceStore} />} /></Routes>
  </MemoryRouter>)
  return roomManagementStore
}

function fakeStores(): { requestStore: DjRequestStore; presenceStore: DjPresenceStore } {
  return {
    requestStore: {
      listByRoom: vi.fn().mockResolvedValue([
        { id: 'pending', roomName: 'Festa da Ana', guestName: 'Apelido 1', title: 'Pedido pendente', artist: 'Artista', videoId: null, submittedUrl: null, status: 'pending', createdAt: '2026-11-05T10:00:00Z' },
        { id: 'approved', roomName: 'Festa da Ana', guestName: 'Apelido 2', title: 'Pedido aprovado', artist: 'Artista', videoId: null, submittedUrl: null, status: 'approved', createdAt: '2026-11-05T09:00:00Z' },
        { id: 'rejected', roomName: 'Festa da Ana', guestName: 'Apelido 3', title: 'Pedido rejeitado', artist: 'Artista', videoId: null, submittedUrl: null, status: 'rejected', createdAt: '2026-11-05T08:00:00Z' },
      ]),
      summary: vi.fn().mockResolvedValue({ pending: 1, approved: 1, rejected: 1 }),
      setStatus: vi.fn().mockResolvedValue(undefined),
    },
    presenceStore: {
      listOnline: vi.fn().mockResolvedValue({ count: 2, guests: [
        { nickname: 'Apelido 1', lastSeenAt: '2026-11-05T10:00:00Z' },
        { nickname: 'Apelido 2', lastSeenAt: '2026-11-05T10:00:00Z' },
      ] }),
    },
  }
}

describe('DjRoomManagementPage', () => {
  it('shows the profile owner and room controls for the owner', async () => {
    const stores = fakeStores()
    const managementStore = renderManagement(ownerRoom, stores.requestStore, stores.presenceStore)

    expect(await screen.findByRole('heading', { name: 'Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText('DJ: Ana DJ')).toBeInTheDocument()
    expect(screen.getByText('Proprietário')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: /convidados online 2/i })).toBeInTheDocument()
    expect(screen.getByText('Apelido 1')).toBeInTheDocument()
    expect(screen.getByText('Convidado: Apelido 3')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Moderadores desta sala' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar na sala' })).not.toBeInTheDocument()
    expect(managementStore.getRoom).toHaveBeenCalledWith(ownerRoom.id)
    expect(stores.presenceStore.listOnline).toHaveBeenCalledWith(ownerRoom.id)
    expect(stores.requestStore.listByRoom).toHaveBeenCalledWith(ownerRoom.id)
  })

  it('limits moderator controls to assigned-room requests and presence', async () => {
    const stores = fakeStores()
    renderManagement({ ...ownerRoom, accessRole: 'moderator' }, stores.requestStore, stores.presenceStore)

    expect(await screen.findByRole('heading', { name: 'Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText('Moderador')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Moderadores desta sala' })).not.toBeInTheDocument()
    expect(await screen.findByText('Pedido pendente')).toBeInTheDocument()
    expect(screen.getByText('Convidados online')).toBeInTheDocument()
  })

  it('shows permission/load failure separately from a missing room', async () => {
    const stores = fakeStores()
    const roomManagementStore: DjRoomManagementStore = {
      getRoom: vi.fn().mockRejectedValue({ code: '42501' }),
      listModerators: vi.fn().mockResolvedValue([]),
      inviteModerator: vi.fn().mockResolvedValue(true),
      revokeModerator: vi.fn().mockResolvedValue(true),
    }
    render(<MemoryRouter initialEntries={[`/dj/painel/salas/${ownerRoom.id}`]}>
      <Routes><Route path="/dj/painel/salas/:roomId" element={<DjRoomManagementPage roomManagementStore={roomManagementStore} requestStore={stores.requestStore} presenceStore={stores.presenceStore} />} /></Routes>
    </MemoryRouter>)

    expect(await screen.findByRole('alert')).toHaveTextContent('não tem permissão')
    expect(screen.queryByText('Sala não encontrada')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument()
  })
})
