import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../features/auth/AuthContext'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjMusicQueueStore } from '../../features/guest/services/djMusicQueueStore'
import type { YouTubePlayerCallbacks, YouTubePlayerFactory } from '../../features/guest/services/youtubeIframePlayer'
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

function renderManagement(room: ManagedRoom, requestStore: DjRequestStore, presenceStore: DjPresenceStore, queueStore?: DjMusicQueueStore, playerFactory?: YouTubePlayerFactory) {
  const roomManagementStore: DjRoomManagementStore = {
    getRoom: vi.fn().mockResolvedValue(room),
    listModerators: vi.fn().mockResolvedValue([]),
    inviteModerator: vi.fn().mockResolvedValue(true),
    revokeModerator: vi.fn().mockResolvedValue(true),
  }
  render(<MemoryRouter initialEntries={[`/dj/painel/salas/${room.id}`]}>
    <AuthContext.Provider value={{
      error: null,
      profile: null,
      profileError: null,
      profileStatus: 'idle',
      refreshSession: vi.fn(),
      retryProfile: vi.fn(),
      signIn: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      status: 'authenticated',
      user: { email: 'dj@example.com', id: 'dj-owner-a', isAnonymous: false, metadataDisplayName: 'DJ' },
    }}>
      <Routes><Route path="/dj/painel/salas/:roomId" element={<DjRoomManagementPage roomManagementStore={roomManagementStore} requestStore={requestStore} presenceStore={presenceStore} queueStore={queueStore} queuePlayerFactory={playerFactory} />} /></Routes>
    </AuthContext.Provider>
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
      setStatus: vi.fn().mockResolvedValue(undefined),
    },
    presenceStore: {
      listOnline: vi.fn().mockResolvedValue({ count: 2, guests: [
        { nickname: 'Apelido 1', lastSeenAt: '2026-11-05T10:00:00Z', guestId: 'a1111111-1111-4111-8111-111111111111', isVip: false },
        { nickname: 'Apelido 2', lastSeenAt: '2026-11-05T10:00:00Z', guestId: 'a2222222-2222-4222-8222-222222222222', isVip: true },
      ] }),
      listVips: vi.fn().mockResolvedValue([]),
      setVip: vi.fn().mockResolvedValue(true),
    },
  }
}

describe('DjRoomManagementPage', () => {
  it('shows the profile owner and room controls for the owner', async () => {
    const stores = fakeStores()
    const managementStore = renderManagement(ownerRoom, stores.requestStore, stores.presenceStore)

    expect(await screen.findByRole('heading', { name: 'Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText('DJ: Ana DJ')).toBeInTheDocument()
    expect(screen.getByText(/Proprietário/)).toBeInTheDocument()
    const profileButton = screen.getByRole('button', { name: 'DJ: DJ' })
    expect(profileButton.closest('.room-management-hero')).toBeInTheDocument()
    expect(document.querySelector('button.room-mobile-card-logout')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar às salas' })).toHaveAttribute('href', '/dj/painel/salas')
    fireEvent.click(screen.getByRole('button', { name: /Convidados/ }))
    expect(await screen.findByRole('heading', { name: /Convidados da sala.*2 online/i })).toBeInTheDocument()
    expect(screen.getByText('Apelido 1')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Rejeitados \(\d+\)/ }))
    expect(screen.getByText('Convidado: Apelido 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: /Equipe/ }))
    expect(screen.getByRole('heading', { name: 'Moderadores desta sala' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Convidados da sala/ })).not.toBeInTheDocument()
    expect(screen.queryByText('Apelido 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Apelido 2')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conceder VIP' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar VIP' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Entrar na sala' })).not.toBeInTheDocument()
    expect(managementStore.getRoom).toHaveBeenCalledWith(ownerRoom.id)
    expect(stores.presenceStore.listOnline).toHaveBeenCalledWith(ownerRoom.id)
    expect(stores.requestStore.listByRoom).toHaveBeenCalledWith(ownerRoom.id)
  })

  it('limits moderator controls to assigned-room requests and presence', async () => {
    const stores = fakeStores()
    renderManagement({ ...ownerRoom, accessRole: 'moderator' }, stores.requestStore, stores.presenceStore)

    expect(await screen.findByRole('heading', { name: 'Festa da Ana' })).toBeInTheDocument()
    expect(screen.getByText(/Moderador/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Moderadores desta sala' })).not.toBeInTheDocument()
    expect(await screen.findByText('Pedido pendente')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Convidados/ }))
    expect(await screen.findByRole('heading', { name: /Convidados da sala.*2 online/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Conceder VIP' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revogar VIP' })).not.toBeInTheDocument()
  })

  it('opens the queue/player tab and loads only the current room queue', async () => {
    const stores = fakeStores()
    const queueStore: DjMusicQueueStore = {
      listByRoom: vi.fn().mockResolvedValue([]),
      addYoutubeTrack: vi.fn(),
      reorder: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    }
    renderManagement(ownerRoom, stores.requestStore, stores.presenceStore, queueStore)

    fireEvent.click(await screen.findByRole('tab', { name: 'Fila e Player' }))

    expect(await screen.findByRole('region', { name: 'Player oficial do YouTube' })).toBeInTheDocument()
    expect(queueStore.listByRoom).toHaveBeenCalledWith(ownerRoom.id)
  })

  it('keeps the same playing iframe and working controls while switching between room tabs', async () => {
    const stores = fakeStores()
    let callbacks: YouTubePlayerCallbacks | undefined
    const player = {
      playVideo: vi.fn(() => callbacks?.onStateChange('playing')),
      pauseVideo: vi.fn(() => callbacks?.onStateChange('paused')),
      loadVideoById: vi.fn(() => callbacks?.onStateChange('playing')),
      getCurrentTime: vi.fn(() => 25),
      getDuration: vi.fn(() => 210),
      getVolume: vi.fn(() => 80),
      setVolume: vi.fn(),
      seekTo: vi.fn(),
      destroy: vi.fn(),
    }
    const playerFactory: YouTubePlayerFactory = vi.fn(async (_element, _videoId, handlers) => {
      callbacks = handlers
      handlers.onStateChange('playing')
      return player
    })
    const queueStore: DjMusicQueueStore = {
      listByRoom: vi.fn().mockResolvedValue([
        { requestId: 'song-a', source: 'request', title: 'Música atual', artist: 'Artista A', videoId: 'abcdefghijk', submittedUrl: null, guestName: 'Convidado A' },
        { requestId: 'song-b', source: 'request', title: 'Próxima música', artist: 'Artista B', videoId: 'abcdefghijl', submittedUrl: null, guestName: 'Convidado B' },
        { requestId: 'song-c', source: 'request', title: 'Terceira música', artist: 'Artista C', videoId: 'abcdefghijm', submittedUrl: null, guestName: 'Convidado C' },
      ]),
      addYoutubeTrack: vi.fn(),
      reorder: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    }
    renderManagement(ownerRoom, stores.requestStore, stores.presenceStore, queueStore, playerFactory)

    fireEvent.click(await screen.findByRole('tab', { name: 'Fila e Player' }))
    const startButton = await screen.findByRole('button', { name: 'Iniciar reprodução' })
    await waitFor(() => expect(startButton).toBeEnabled())
    fireEvent.click(startButton)
    const playerRegion = await screen.findByRole('region', { name: 'Player oficial do YouTube' })
    const playerFrame = screen.getByTestId('youtube-player-frame')
    expect(playerFrame).toHaveClass('room-player-frame')
    await waitFor(() => expect(within(playerRegion).getByRole('heading', { name: 'Tocando agora' }).parentElement).toHaveTextContent('Música atualArtista A'))
    expect(screen.queryByText('Tocando: Música atual — Artista A')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Pedidos/ }))
    const miniPlayer = screen.getByRole('region', { name: 'Mini-player oficial do YouTube' })
    expect(miniPlayer).toBeInTheDocument()
    expect(within(miniPlayer).getAllByText('Música atual')).toHaveLength(2)
    expect(within(miniPlayer).getAllByText('Artista A')).toHaveLength(2)
    expect(within(miniPlayer).getByLabelText('Tempo decorrido')).toHaveTextContent('0:25')
    expect(within(miniPlayer).getByLabelText('Duração')).toHaveTextContent('3:30')
    fireEvent.click(within(miniPlayer).getByRole('button', { name: 'Expandir player' }))
    expect(miniPlayer).toHaveClass('room-floating-player--expanded')
    expect(screen.getByTestId('youtube-player-frame')).toBe(playerFrame)
    fireEvent.change(within(miniPlayer).getByRole('slider', { name: 'Posição da música' }), { target: { value: '40' } })
    expect(player.seekTo).toHaveBeenCalledWith(40, true)
    fireEvent.click(within(miniPlayer).getByRole('button', { name: 'Abrir controle de volume' }))
    fireEvent.change(within(miniPlayer).getByRole('slider', { name: 'Volume' }), { target: { value: '55' } })
    expect(player.setVolume).toHaveBeenCalledWith(55)
    fireEvent.click(within(miniPlayer).getByRole('button', { name: 'Recolher player' }))
    expect(screen.getByTestId('youtube-player-frame')).toBe(playerFrame)
    expect(await screen.findByText('Pedido pendente')).toBeInTheDocument()
    expect(within(miniPlayer).getAllByText('Música atual')).toHaveLength(2)
    expect(within(miniPlayer).getAllByText('Artista A')).toHaveLength(2)
    expect(playerFactory).toHaveBeenCalledOnce()
    expect(player.destroy).not.toHaveBeenCalled()

    act(() => callbacks?.onStateChange('ended'))
    await waitFor(() => expect(player.loadVideoById).toHaveBeenCalledWith('abcdefghijl'))
    expect(miniPlayer.querySelector('.room-mini-player__title-text')).toHaveTextContent('Próxima música')
    expect(within(miniPlayer).getAllByText('Artista B')).toHaveLength(2)

    fireEvent.click(screen.getByRole('tab', { name: 'Fila e Player' }))
    expect(screen.getByRole('region', { name: 'Player oficial do YouTube' })).toBe(playerRegion)
    expect(screen.getByTestId('youtube-player-frame')).toBe(playerFrame)
    expect(within(playerRegion).getByRole('button', { name: 'Próxima música' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }))
    await waitFor(() => expect(player.loadVideoById).toHaveBeenCalledWith('abcdefghijm'))
    expect(within(playerRegion).getByRole('heading', { name: 'Tocando agora' }).parentElement).toHaveTextContent('Terceira músicaArtista C')
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(player.pauseVideo).toHaveBeenCalledOnce()
    expect(playerFactory).toHaveBeenCalledOnce()
    expect(player.destroy).not.toHaveBeenCalled()
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
