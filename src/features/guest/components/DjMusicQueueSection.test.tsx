import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DjMusicQueueStore } from '../services/djMusicQueueStore'
import type { YouTubePlayerCallbacks, YouTubePlayerFactory } from '../services/youtubeIframePlayer'
import * as youtubePlayer from '../services/youtubeIframePlayer'
import * as requestApi from '../services/guestRequestApi'
import { DjPlaybackHost, DjPlaybackProvider } from './DjPlaybackContext'
import { DjQueuePlayer } from './DjQueuePlayer'
import { DjMusicQueueSection } from './DjMusicQueueSection'

const queue = [
  { requestId: 'request-a', source: 'request' as const, title: 'Primeira', artist: 'Artista A', videoId: 'abcdefghijk', submittedUrl: null, guestName: 'Convidado A' },
  { requestId: 'request-b', source: 'request' as const, title: 'Segunda', artist: 'Artista B', videoId: 'abcdefghijl', submittedUrl: null, guestName: 'Convidado B' },
  { requestId: 'request-c', source: 'request' as const, title: 'Terceira', artist: 'Artista C', videoId: 'abcdefghijm', submittedUrl: null, guestName: 'Convidado C' },
]

function createPlayerHarness() {
  let callbacks: YouTubePlayerCallbacks | undefined
  const player = {
    playVideo: vi.fn(() => callbacks?.onStateChange('playing')),
    pauseVideo: vi.fn(() => callbacks?.onStateChange('paused')),
    loadVideoById: vi.fn(),
    getCurrentTime: vi.fn(() => 0),
    getDuration: vi.fn(() => 180),
    getVolume: vi.fn(() => 100),
    setVolume: vi.fn(),
    seekTo: vi.fn(),
    destroy: vi.fn(),
  }
  const playerFactory: YouTubePlayerFactory = vi.fn(async (_element, _videoId, handlers) => {
    callbacks = handlers
    handlers.onStateChange('playing')
    return player
  })
  return { player, playerFactory, callbacks: () => callbacks }
}

async function clickEnabledButton(name: string) {
  const button = await screen.findByRole('button', { name })
  await waitFor(() => expect(button).toBeEnabled())
  fireEvent.click(button)
}

describe('DjMusicQueueSection', () => {
  beforeEach(() => window.sessionStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('loads, reorders and removes queue entries without changing their order during playback', async () => {
    const listByRoom = vi.fn().mockResolvedValue(queue.slice(0, 2))
    const store: DjMusicQueueStore = { listByRoom, addYoutubeTrack: vi.fn(), reorder: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) }
    const { playerFactory } = createPlayerHarness()
    render(<DjMusicQueueSection roomId="room-a" store={store} playerFactory={playerFactory} />)

    const move = await screen.findByRole('button', { name: 'Mover Segunda para cima' })
    expect(document.querySelector('.room-upcoming-list li')).toHaveClass('room-queue-track--next')
    fireEvent.click(move)
    expect(store.reorder).toHaveBeenCalledWith('room-a', ['request-b', 'request-a'])
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remover' })[0]).toBeEnabled())
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover' })[0])
    await waitFor(() => expect(store.remove).toHaveBeenCalledWith('room-a', 'request-b'))
    expect(listByRoom).toHaveBeenCalledWith('room-a')
    expect(screen.getByRole('region', { name: 'Player oficial do YouTube' })).toBeInTheDocument()
    expect(playerFactory).not.toHaveBeenCalled()
  })

  it('renders the persistent official player in the active room slot', async () => {
    const store: DjMusicQueueStore = { listByRoom: vi.fn().mockResolvedValue(queue), addYoutubeTrack: vi.fn(), reorder: vi.fn(), remove: vi.fn() }
    render(<DjPlaybackProvider><DjMusicQueueSection roomId="room-portal" roomCode="FESTA00001" store={store} /><DjPlaybackHost /></DjPlaybackProvider>)

    expect(await screen.findByRole('region', { name: 'Player oficial do YouTube' })).toBeInTheDocument()
    expect(document.querySelector('#dj-playback-slot [data-testid="youtube-player-frame"]')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Buscar no YouTube' })).toBeInTheDocument()
  })

  it('adds a selected video to the real room queue without starting playback', async () => {
    const directTrack = { requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', source: 'dj' as const, title: 'DJ selection', artist: 'YouTube channel', videoId: 'abcdefghijk', submittedUrl: null, guestName: 'DJ' }
    const listByRoom = vi.fn().mockResolvedValueOnce([]).mockResolvedValue([directTrack])
    const addYoutubeTrack = vi.fn().mockResolvedValue(directTrack.requestId)
    const store: DjMusicQueueStore = { listByRoom, addYoutubeTrack, reorder: vi.fn(), remove: vi.fn() }
    const playerFactory = vi.fn()
    vi.spyOn(requestApi, 'searchGuestVideos').mockResolvedValue({ available: true, videos: [{ videoId: 'abcdefghijk', title: 'DJ selection', channel: 'YouTube channel', thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/mqdefault.jpg' }] })
    render(<DjMusicQueueSection roomId="room-direct-add" roomCode="FESTA00001" store={store} playerFactory={playerFactory} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar músicas no YouTube' }), { target: { value: 'dj selection' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar à fila' }))

    await waitFor(() => expect(addYoutubeTrack).toHaveBeenCalledWith('room-direct-add', 'abcdefghijk'))
    expect(await screen.findByText('Adicionada ao final da fila.')).toBeInTheDocument()
    await waitFor(() => expect(document.querySelector('.room-upcoming-list')).toHaveTextContent('DJ selection'))
    expect(playerFactory).not.toHaveBeenCalled()
  })

  it('keeps the queue usable if the optional persistent playback-history RPC is unavailable', async () => {
    const store: DjMusicQueueStore = {
      listByRoom: vi.fn().mockResolvedValue(queue.slice(0, 2)),
      listPlayedRequestIds: vi.fn().mockRejectedValue({ code: 'PGRST202' }),
      addYoutubeTrack: vi.fn(),
      reorder: vi.fn(),
      remove: vi.fn(),
    }
    render(<DjMusicQueueSection roomId="room-history-unavailable" store={store} />)

    expect(await screen.findByText('Primeira')).toBeInTheDocument()
    expect(screen.getByText('Segunda')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Fila de reprodução \(2\)/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mover Segunda para cima' })).toBeEnabled()
  })

  it('does not present an initial load error as an empty queue', async () => {
    const store: DjMusicQueueStore = {
      listByRoom: vi.fn().mockRejectedValue(new Error('RPC unavailable')),
      addYoutubeTrack: vi.fn(),
      reorder: vi.fn(),
      remove: vi.fn(),
    }
    render(<DjMusicQueueSection roomId="room-load-error" store={store} />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a fila. Tente novamente.')
    expect(screen.getByRole('heading', { name: /Fila de reprodução \(—\)/ })).toBeInTheDocument()
    expect(screen.queryByText(/A fila está vazia/)).not.toBeInTheDocument()
  })

  it('uses atomic DOM moves for the persistent iframe when switching room tabs', async () => {
    const store: DjMusicQueueStore = { listByRoom: vi.fn().mockResolvedValue(queue), addYoutubeTrack: vi.fn(), reorder: vi.fn(), remove: vi.fn() }
    const harness = createPlayerHarness()
    vi.spyOn(youtubePlayer, 'createYouTubeIframePlayer').mockImplementation(harness.playerFactory)
    const renderRoom = (active: boolean) => <DjPlaybackProvider><DjMusicQueueSection roomId="room-atomic" store={store} active={active} /><DjPlaybackHost /></DjPlaybackProvider>
    const view = render(renderRoom(true))
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(harness.playerFactory).toHaveBeenCalledOnce())
    const frame = screen.getByTestId('youtube-player-frame')
    const slot = document.getElementById('dj-playback-slot')
    const fallback = document.querySelector('.dj-playback-fallback')
    if (!(slot instanceof HTMLElement) || !(fallback instanceof HTMLElement)) throw new Error('Playback containers missing')
    const moveBefore = vi.fn(function (this: HTMLElement, node: Node, child: Node | null) { this.insertBefore(node, child) })
    Object.assign(slot, { moveBefore })
    Object.assign(fallback, { moveBefore })

    view.rerender(renderRoom(false))
    expect(moveBefore).toHaveBeenCalledTimes(1)
    expect(fallback).toContainElement(frame)
    view.rerender(renderRoom(true))
    expect(moveBefore).toHaveBeenCalledTimes(2)
    expect(slot).toContainElement(frame)
    expect(harness.playerFactory).toHaveBeenCalledOnce()
    expect(harness.player.destroy).not.toHaveBeenCalled()
  })

  it('keeps the same YouTube iframe host when changing between full and mini mode', async () => {
    const harness = createPlayerHarness()
    const view = render(<DjQueuePlayer roomId="room-mode" tracks={queue} playerFactory={harness.playerFactory} />)
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(harness.playerFactory).toHaveBeenCalledOnce())
    const frame = document.querySelector('[data-testid="youtube-player-frame"]')
    const iframeHost = frame?.firstElementChild
    expect(frame).toBeInTheDocument()
    expect(iframeHost).toBeInTheDocument()

    view.rerender(<DjQueuePlayer roomId="room-mode" tracks={queue} playerFactory={harness.playerFactory} active={false} mode="mini" />)
    expect(document.querySelector('[data-testid="youtube-player-frame"]')).toBe(frame)
    expect(frame?.firstElementChild).toBe(iframeHost)
    view.rerender(<DjQueuePlayer roomId="room-mode" tracks={queue} playerFactory={harness.playerFactory} active mode="full" />)

    expect(document.querySelector('[data-testid="youtube-player-frame"]')).toBe(frame)
    expect(frame?.firstElementChild).toBe(iframeHost)
    expect(harness.playerFactory).toHaveBeenCalledOnce()
  })

  it('opens a volume popover, controls the player and closes when clicking outside', async () => {
    const harness = createPlayerHarness()
    render(<DjQueuePlayer roomId="room-volume" tracks={queue} playerFactory={harness.playerFactory} mode="mini" />)
    await clickEnabledButton('Iniciar reprodução')

    fireEvent.click(screen.getByRole('button', { name: 'Abrir controle de volume' }))
    expect(screen.getByRole('group', { name: 'Volume do player' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '45' } })
    expect(harness.player.setVolume).toHaveBeenCalledWith(45)
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    expect(harness.player.setVolume).toHaveBeenCalledWith(0)
    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }))
    expect(harness.player.setVolume).toHaveBeenLastCalledWith(45)

    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('group', { name: 'Volume do player' })).not.toBeInTheDocument()
  })

  it('animates only a title that overflows its mini-player window', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('room-mini-player__title-window') ? 90 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('room-mini-player__title-text') ? 260 : 90
    })
    const harness = createPlayerHarness()
    const longTitle = 'Uma música com título muito longo para testar o marquee'
    render(<DjQueuePlayer roomId="room-marquee" tracks={[{ ...queue[0], title: longTitle }]} playerFactory={harness.playerFactory} mode="mini" />)
    await clickEnabledButton('Iniciar reprodução')

    await waitFor(() => expect(document.querySelector('.room-mini-player__title-text')).toHaveClass('room-mini-player__title-text--scroll'))
  })

  it('keeps a short mini-player title static', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('room-mini-player__title-window') ? 90 : 0
    })
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('room-mini-player__title-text') ? 70 : 90
    })
    window.sessionStorage.setItem('youdj:current-queue-track:room-short-title', queue[0].requestId)
    render(<DjQueuePlayer roomId="room-short-title" tracks={queue} mode="mini" />)

    const title = await screen.findByText('Primeira', { selector: '.room-mini-player__title-text' })
    expect(title).not.toHaveClass('room-mini-player__title-text--scroll')
  })

  it('starts only after the DJ action, pauses, resumes and advances when a track ends', async () => {
    const store: DjMusicQueueStore = { listByRoom: vi.fn().mockResolvedValue(queue), addYoutubeTrack: vi.fn(), reorder: vi.fn(), remove: vi.fn() }
    const harness = createPlayerHarness()
    render(<DjMusicQueueSection roomId="room-play" store={store} playerFactory={harness.playerFactory} />)

    expect(harness.playerFactory).not.toHaveBeenCalled()
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(harness.playerFactory).toHaveBeenCalledWith(expect.any(HTMLElement), 'abcdefghijk', expect.any(Object)))
    expect(await screen.findByRole('button', { name: 'Pausar' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Segunda').closest('li')).toHaveClass('room-queue-track--next'))

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(harness.player.pauseVideo).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar fila' }))
    expect(harness.player.playVideo).toHaveBeenCalledOnce()

    act(() => harness.callbacks()?.onStateChange('ended'))
    await waitFor(() => expect(harness.player.loadVideoById).toHaveBeenCalledWith('abcdefghijl'))
    act(() => harness.callbacks()?.onStateChange('ended'))
    expect(harness.player.loadVideoById).toHaveBeenCalledOnce()
    act(() => harness.callbacks()?.onStateChange('playing'))
    expect(screen.queryByText('Tocando: Segunda — Artista B')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tocando agora' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Player do YouTube' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Próxima música' })).toBeEnabled()
    act(() => harness.callbacks()?.onStateChange('ended'))
    await waitFor(() => expect(harness.player.loadVideoById).toHaveBeenCalledWith('abcdefghijm'))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText('Terceira')).toBeInTheDocument()
  })

  it('starts the next queue item on explicit skip and does not replay completed items after remount', async () => {
    const store: DjMusicQueueStore = { listByRoom: vi.fn().mockResolvedValue(queue), addYoutubeTrack: vi.fn(), reorder: vi.fn(), remove: vi.fn() }
    const firstHarness = createPlayerHarness()
    const view = render(<DjMusicQueueSection roomId="room-resume" store={store} playerFactory={firstHarness.playerFactory} />)
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(firstHarness.playerFactory).toHaveBeenCalledOnce())
    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }))
    await waitFor(() => expect(firstHarness.player.loadVideoById).toHaveBeenCalledWith('abcdefghijl'))
    act(() => firstHarness.callbacks()?.onStateChange('playing'))

    view.unmount()
    const secondHarness = createPlayerHarness()
    render(<DjMusicQueueSection roomId="room-resume" store={store} playerFactory={secondHarness.playerFactory} />)
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(secondHarness.playerFactory).toHaveBeenCalledWith(expect.any(HTMLElement), 'abcdefghijm', expect.any(Object)))
  })

  it('reports unavailable videos and lets the DJ skip; retries when autoplay is blocked', async () => {
    const store: DjMusicQueueStore = { listByRoom: vi.fn().mockResolvedValue(queue), addYoutubeTrack: vi.fn(), reorder: vi.fn(), remove: vi.fn() }
    const harness = createPlayerHarness()
    render(<DjMusicQueueSection roomId="room-errors" store={store} playerFactory={harness.playerFactory} />)
    await clickEnabledButton('Iniciar reprodução')
    await waitFor(() => expect(harness.playerFactory).toHaveBeenCalledOnce())

    act(() => harness.callbacks()?.onError(150))
    expect(await screen.findByRole('alert')).toHaveTextContent('não permite a reprodução deste vídeo incorporado')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima música' }))
    await waitFor(() => expect(harness.player.loadVideoById).toHaveBeenCalledWith('abcdefghijl'))

    act(() => harness.callbacks()?.onAutoplayBlocked())
    expect(await screen.findByRole('alert')).toHaveTextContent('O navegador bloqueou o início automático')
    fireEvent.click(screen.getByRole('button', { name: 'Continuar fila' }))
    expect(harness.player.playVideo).toHaveBeenCalledOnce()
  })
})
