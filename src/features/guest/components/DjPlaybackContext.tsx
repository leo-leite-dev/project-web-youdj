import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { QueueTrack } from '../services/djMusicQueueStore'
import { DjQueuePlayer } from './DjQueuePlayer'

interface PlaybackQueue {
  roomId: string
  tracks: QueueTrack[]
  onTrackStarted: (requestId: string) => void
}

interface DjPlaybackContextValue {
  queue: PlaybackQueue | null
  currentTrackId: string | null
  playedTrackIds: ReadonlySet<string>
  hasPlaybackStarted: boolean
  fullViewRoomId: string | null
  registerQueue(roomId: string, tracks: QueueTrack[], onTrackStarted: (requestId: string) => void): void
  setFullView(roomId: string, active: boolean): void
  updatePlayback(currentId: string | null, playedIds: ReadonlySet<string>, hasStarted: boolean): void
}

const DjPlaybackContext = createContext<DjPlaybackContextValue | null>(null)

interface PlaybackContainer extends HTMLElement {
  moveBefore?: (node: Node, child: Node | null) => void
}

export function DjPlaybackProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<PlaybackQueue | null>(null)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [playedTrackIds, setPlayedTrackIds] = useState<ReadonlySet<string>>(() => new Set())
  const [hasPlaybackStarted, setHasPlaybackStarted] = useState(false)
  const [fullViewRoomId, setFullViewRoomId] = useState<string | null>(null)

  const registerQueue = useCallback((roomId: string, tracks: QueueTrack[], onTrackStarted: (requestId: string) => void) => {
    setQueue((current) => current?.roomId === roomId && current.tracks === tracks && current.onTrackStarted === onTrackStarted ? current : { roomId, tracks, onTrackStarted })
  }, [])
  const setFullView = useCallback((roomId: string, active: boolean) => {
    setFullViewRoomId((current) => active ? roomId : current === roomId ? null : current)
  }, [])
  const updatePlayback = useCallback((currentId: string | null, playedIds: ReadonlySet<string>, hasStarted: boolean) => {
    setCurrentTrackId(currentId)
    setPlayedTrackIds(new Set(playedIds))
    setHasPlaybackStarted(hasStarted)
  }, [])

  const value = useMemo(() => ({
    queue,
    currentTrackId,
    playedTrackIds,
    hasPlaybackStarted,
    fullViewRoomId,
    registerQueue,
    setFullView,
    updatePlayback,
  }), [queue, currentTrackId, playedTrackIds, hasPlaybackStarted, fullViewRoomId, registerQueue, setFullView, updatePlayback])

  return <DjPlaybackContext.Provider value={value}>
    {children}
  </DjPlaybackContext.Provider>
}

export function useDjPlaybackContext(): DjPlaybackContextValue | null {
  return useContext(DjPlaybackContext)
}

export function DjPlaybackHost() {
  const playback = useDjPlaybackContext()
  const fallbackRef = useRef<HTMLDivElement>(null)
  const [portalRoot] = useState(() => {
    const element = document.createElement('div')
    element.className = 'dj-playback-portal-root'
    return element
  })
  const playerRoomId = playback?.queue?.roomId ?? playback?.fullViewRoomId ?? null
  const shouldRenderPlayer = Boolean(playback && playerRoomId && (
    playback.fullViewRoomId === playerRoomId || playback.hasPlaybackStarted && playback.currentTrackId !== null
  ))
  const playerTracks = playback?.queue && playback.queue.roomId === playerRoomId ? playback.queue.tracks : []
  const handlePlayerPlaybackChange = useCallback((currentId: string | null, playedIds: ReadonlySet<string>, hasStarted: boolean) => {
    playback?.updatePlayback(currentId, playedIds, hasStarted)
  }, [playback?.updatePlayback])

  useLayoutEffect(() => {
    const slot = playerRoomId !== null && playback?.fullViewRoomId === playerRoomId
      ? document.getElementById('dj-playback-slot')
      : null
    const target: PlaybackContainer | null = slot ?? fallbackRef.current
    if (target && portalRoot.parentElement !== target) {
      // Unlike appendChild, an atomic move preserves the live iframe's browsing context.
      if (portalRoot.isConnected && target.moveBefore) target.moveBefore(portalRoot, null)
      else target.appendChild(portalRoot)
    }
  }, [playback?.fullViewRoomId, playerRoomId, portalRoot])

  return <>
    <div ref={fallbackRef} className="dj-playback-fallback" />
    {playback && shouldRenderPlayer && playerRoomId && createPortal(<DjQueuePlayer
    roomId={playerRoomId}
    tracks={playerTracks}
    active={playback.fullViewRoomId === playerRoomId}
    mode={playback.fullViewRoomId === playerRoomId ? 'full' : 'mini'}
    onPlaybackQueueChange={handlePlayerPlaybackChange}
    onTrackStarted={playback.queue?.onTrackStarted}
    />, portalRoot)}
  </>
}
