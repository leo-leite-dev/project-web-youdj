import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { AudioLines, ChevronDown, ChevronUp, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react'
import type { QueueTrack } from '../services/djMusicQueueStore'
import { createYouTubeIframePlayer, type YouTubePlayerFactory, type YouTubePlayerHandle, type YouTubePlayerState } from '../services/youtubeIframePlayer'

type PlaybackStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended' | 'error'

function validVideoId(videoId: string | null): videoId is string {
  return videoId !== null && /^[A-Za-z0-9_-]{11}$/.test(videoId)
}

function playedStorageKey(roomId: string): string {
  // Ignore legacy unversioned session records that could permanently block the current queue.
  return `youdj:played-queue:v2:${roomId}`
}

function currentStorageKey(roomId: string): string {
  return `youdj:current-queue-track:${roomId}`
}

function readCurrentId(roomId: string): string | null {
  try {
    const value = window.sessionStorage.getItem(currentStorageKey(roomId))
    return value && value.length <= 200 ? value : null
  } catch {
    return null
  }
}

function readPlayedIds(roomId: string): Set<string> {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(playedStorageKey(roomId)) ?? '[]')
    if (!Array.isArray(value)) return new Set()
    return new Set(value.filter((id): id is string => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

function describePlayerError(code: number): string {
  if (code === 2) return 'O YouTube recusou o identificador deste vídeo.'
  if (code === 5) return 'O formato deste vídeo não pôde ser reproduzido neste player.'
  if (code === 100) return 'Este vídeo foi removido, definido como privado ou não está disponível.'
  if (code === 101 || code === 150) return 'O proprietário não permite a reprodução deste vídeo incorporado.'
  if (code === 153) return 'O YouTube não recebeu a identificação necessária para validar esta reprodução.'
  return 'O YouTube não conseguiu reproduzir este vídeo. Tente novamente ou avance para a próxima música.'
}

function formatPlayerTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

function nextUnplayedTrack(tracks: QueueTrack[], currentId: string | null, playedIds: Set<string>): QueueTrack | undefined {
  const currentIndex = currentId ? tracks.findIndex((track) => track.requestId === currentId) : -1
  return tracks.slice(currentIndex + 1).find((track) => validVideoId(track.videoId) && !playedIds.has(track.requestId))
}

function firstPlayableTrack(tracks: QueueTrack[]): QueueTrack | undefined {
  return tracks.find((track) => validVideoId(track.videoId))
}

function nextQueueTrack(tracks: QueueTrack[], currentId: string | null, playedIds: Set<string>): QueueTrack | undefined {
  const next = nextUnplayedTrack(tracks, currentId, playedIds)
  if (next) return next
  const currentStillInQueue = currentId !== null && tracks.some((track) => track.requestId === currentId)
  if (!currentStillInQueue) {
    return tracks.find((track) => validVideoId(track.videoId) && !playedIds.has(track.requestId)) ?? firstPlayableTrack(tracks)
  }
  return undefined
}

interface DjQueuePlayerProps {
  roomId: string
  tracks: QueueTrack[]
  playerFactory?: YouTubePlayerFactory
  active?: boolean
  mode?: 'full' | 'mini'
  onPlaybackQueueChange?: (currentId: string | null, playedIds: ReadonlySet<string>, hasStarted: boolean) => void
  onTrackStarted?: (requestId: string) => void
}

export function DjQueuePlayer({ roomId, tracks, playerFactory = createYouTubeIframePlayer, active = true, mode = 'full', onPlaybackQueueChange, onTrackStarted }: DjQueuePlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const volumeControlRef = useRef<HTMLDivElement>(null)
  const titleWindowRef = useRef<HTMLParagraphElement>(null)
  const titleTextRef = useRef<HTMLSpanElement>(null)
  const playerRef = useRef<YouTubePlayerHandle | null>(null)
  const currentIdRef = useRef<string | null>(readCurrentId(roomId))
  const tracksRef = useRef(tracks)
  const playedIdsRef = useRef(readPlayedIds(roomId))
  const advanceToNextRef = useRef<() => void>(() => undefined)
  const advancingRef = useRef(false)
  const aliveRef = useRef(true)
  const [currentId, setCurrentId] = useState<string | null>(() => readCurrentId(roomId))
  const [currentTrack, setCurrentTrack] = useState<QueueTrack | null>(null)
  const [status, setStatus] = useState<PlaybackStatus>('idle')
  const [playerCreated, setPlayerCreated] = useState(false)
  const [hasStartedPlayback, setHasStartedPlayback] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [playedIds, setPlayedIds] = useState(() => readPlayedIds(roomId))
  const [miniExpanded, setMiniExpanded] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false)
  const [titleMarqueeDistance, setTitleMarqueeDistance] = useState(0)
  const lastNonZeroVolumeRef = useRef(100)

  useLayoutEffect(() => { tracksRef.current = tracks }, [tracks])
  useEffect(() => { playedIdsRef.current = playedIds }, [playedIds])
  useEffect(() => { onPlaybackQueueChange?.(currentId, playedIds, hasStartedPlayback) }, [currentId, hasStartedPlayback, onPlaybackQueueChange, playedIds])

  useEffect(() => {
    if (!playerCreated) return
    const syncPlayerDetails = () => {
      const player = playerRef.current
      if (!player) return
      try {
        const nextTime = player.getCurrentTime()
        const nextDuration = player.getDuration()
        const nextVolume = player.getVolume()
        if (Number.isFinite(nextTime)) setCurrentTime(nextTime)
        if (Number.isFinite(nextDuration)) setDuration(nextDuration)
        if (Number.isFinite(nextVolume)) {
          setVolume(nextVolume)
          if (nextVolume > 0) lastNonZeroVolumeRef.current = nextVolume
        }
      } catch {
        // The official iframe may briefly be unavailable while a video is loading.
      }
    }
    syncPlayerDetails()
    const timer = window.setInterval(syncPlayerDetails, 1000)
    return () => window.clearInterval(timer)
  }, [currentId, playerCreated])

  useEffect(() => {
    if (!volumePopoverOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (event.target instanceof Node && !volumeControlRef.current?.contains(event.target)) setVolumePopoverOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVolumePopoverOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [volumePopoverOpen])

  const markPlayed = useCallback((requestId: string) => {
    playedIdsRef.current.add(requestId)
    setPlayedIds(new Set(playedIdsRef.current))
    try {
      window.sessionStorage.setItem(playedStorageKey(roomId), JSON.stringify([...playedIdsRef.current]))
    } catch {
      // Playback remains functional if browser storage is unavailable; deduplication then lasts for this mount.
    }
  }, [roomId])

  const updateCurrent = useCallback((track: QueueTrack) => {
    currentIdRef.current = track.requestId
    setCurrentId(track.requestId)
    setCurrentTrack(track)
    setHasStartedPlayback(true)
    try {
      window.sessionStorage.setItem(currentStorageKey(roomId), track.requestId)
    } catch {
      // Current track still remains in React state for this mounted room.
    }
    onPlaybackQueueChange?.(track.requestId, new Set(playedIdsRef.current), true)
    setError(null)
  }, [onPlaybackQueueChange, roomId])

  const loadTrack = useCallback(async (track: QueueTrack) => {
    if (!validVideoId(track.videoId) || advancingRef.current) return
    advancingRef.current = true
    updateCurrent(track)
    setStatus('loading')

    if (playerRef.current) {
      try {
        playerRef.current.loadVideoById(track.videoId)
        return
      } catch {
        advancingRef.current = false
        setStatus('error')
        setError('Não foi possível carregar esta música no player do YouTube.')
        return
      }
    }

    const host = hostRef.current
    if (!host) {
      advancingRef.current = false
      setStatus('error')
      setError('O player do YouTube não está disponível nesta tela.')
      return
    }

    try {
      const player = await playerFactory(host, track.videoId, {
        onStateChange: (state: YouTubePlayerState) => {
          if (!aliveRef.current) return
          if (state === 'playing') {
            advancingRef.current = false
            setStatus('playing')
            setError(null)
            const playingId = currentIdRef.current
            if (playingId) {
              markPlayed(playingId)
              onTrackStarted?.(playingId)
            }
          } else if (state === 'paused') {
            advancingRef.current = false
            setStatus('paused')
          } else {
            setStatus('ended')
            if (!advancingRef.current) advanceToNextRef.current()
          }
        },
        onError: (code: number) => {
          if (!aliveRef.current) return
          advancingRef.current = false
          const failedId = currentIdRef.current
          if (failedId) markPlayed(failedId)
          setStatus('error')
          setError(describePlayerError(code))
        },
        onAutoplayBlocked: () => {
          if (!aliveRef.current) return
          advancingRef.current = false
          setStatus('paused')
          setError('O navegador bloqueou o início automático. Toque em “Reproduzir” para iniciar pelo player oficial.')
        },
      })
      if (!aliveRef.current) {
        player.destroy()
        return
      }
      playerRef.current = player
      setPlayerCreated(true)
    } catch {
      advancingRef.current = false
      setStatus('error')
      setError('Não foi possível carregar a API oficial do YouTube. Verifique a conexão e tente novamente.')
    }
  }, [markPlayed, onTrackStarted, playerFactory, updateCurrent])

  const advanceToNext = useCallback(async () => {
    if (advancingRef.current) return
    const next = nextQueueTrack(tracksRef.current, currentIdRef.current, playedIdsRef.current)
    if (!next) {
      advancingRef.current = false
      setStatus('ended')
      setError(null)
      return
    }
    await loadTrack(next)
  }, [loadTrack])
  useEffect(() => { advanceToNextRef.current = () => { void advanceToNext() } }, [advanceToNext])
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  async function startOrResume() {
    setError(null)
    if (!playerCreated && status === 'error' && currentTrack) {
      await loadTrack(currentTrack)
      return
    }
    if (playerRef.current && currentIdRef.current && status === 'paused') {
      setStatus('loading')
      advancingRef.current = true
      try {
        playerRef.current.playVideo()
      } catch {
        advancingRef.current = false
        setStatus('error')
        setError('Não foi possível iniciar o player do YouTube. Tente novamente ou avance para a próxima música.')
      }
      return
    }
    if (status === 'paused') {
      const pausedTrack = currentTrack ?? tracksRef.current.find((track) => track.requestId === currentIdRef.current)
      if (pausedTrack) await loadTrack(pausedTrack)
      return
    }
    if (status === 'error') {
      if (nextTrack) await advanceToNext()
      else {
        const failedTrack = currentTrack ?? tracksRef.current.find((track) => track.requestId === currentIdRef.current)
        if (failedTrack) await loadTrack(failedTrack)
      }
      return
    }
    if (status === 'ended') {
      const firstTrack = firstPlayableTrack(tracksRef.current)
      if (!firstTrack) return
      playedIdsRef.current.clear()
      setPlayedIds(new Set())
      try { window.sessionStorage.removeItem(playedStorageKey(roomId)) } catch { /* Session playback can continue without storage. */ }
      currentIdRef.current = null
      setCurrentId(null)
      setCurrentTrack(null)
      await loadTrack(firstTrack)
      return
    }
    if (status !== 'idle') return

    const savedTrack = currentIdRef.current
      ? tracksRef.current.find((track) => track.requestId === currentIdRef.current && validVideoId(track.videoId) && !playedIdsRef.current.has(track.requestId))
      : undefined
    if (savedTrack) {
      await loadTrack(savedTrack)
      return
    }

    const next = nextQueueTrack(tracksRef.current, currentIdRef.current, playedIdsRef.current)
    if (!next) {
      setStatus('ended')
      setError('Não há outras músicas reproduzíveis na fila.')
      return
    }
    await loadTrack(next)
  }

  function pause() {
    if (!playerRef.current || status !== 'playing') return
    try {
      playerRef.current.pauseVideo()
      setStatus('paused')
    } catch {
      setStatus('error')
      setError('Não foi possível pausar o player do YouTube.')
    }
  }

  function changeVolume(nextVolume: number) {
    const player = playerRef.current
    if (!player) return
    try {
      player.setVolume(nextVolume)
      setVolume(nextVolume)
      if (nextVolume > 0) lastNonZeroVolumeRef.current = nextVolume
    } catch {
      setError('Não foi possível ajustar o volume do player do YouTube.')
    }
  }

  function toggleMute() {
    changeVolume(volume > 0 ? 0 : lastNonZeroVolumeRef.current || 100)
  }

  function seekTo(nextTime: number) {
    const player = playerRef.current
    if (!player || !Number.isFinite(nextTime)) return
    try {
      player.seekTo(nextTime, true)
      setCurrentTime(nextTime)
    } catch {
      setError('Não foi possível buscar este ponto no vídeo.')
    }
  }

  const recoverableTrack = currentTrack ?? tracks.find((track) => track.requestId === currentId)
  const nextTrack = nextQueueTrack(tracks, currentId, playedIds)
  const showPlayer = active || playerCreated || currentId !== null
  const canStart = status === 'idle' && (nextTrack !== undefined || recoverableTrack !== undefined || firstPlayableTrack(tracks) !== undefined)
  const canContinue = status === 'paused' || status === 'error'
  const canRetryPlayer = status === 'error' && !playerCreated && recoverableTrack !== undefined
  const primaryDisabled = status === 'loading' || !(canContinue && (nextTrack !== undefined || canRetryPlayer || recoverableTrack !== undefined) || canStart || status === 'ended' && firstPlayableTrack(tracks) !== undefined)
  const displayTrack = recoverableTrack
  const title = displayTrack?.title ?? 'Nenhuma música selecionada'

  useLayoutEffect(() => {
    const titleWindow = titleWindowRef.current
    const titleText = titleTextRef.current
    if (!titleWindow || !titleText) {
      setTitleMarqueeDistance(0)
      return
    }
    const measure = () => {
      const distance = Math.max(0, titleText.scrollWidth - titleWindow.clientWidth)
      setTitleMarqueeDistance((current) => current === distance ? current : distance)
    }
    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(titleWindow)
    observer?.observe(titleText)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [mode, miniExpanded, title])

  useEffect(() => {
    if (mode !== 'mini') setVolumePopoverOpen(false)
  }, [mode])
  const progress = duration > 0 ? Math.min(100, Math.max(0, currentTime / duration * 100)) : 0

  return <section aria-label={mode === 'mini' ? 'Mini-player oficial do YouTube' : 'Player oficial do YouTube'} className={`${showPlayer ? '' : 'hidden'} ${mode === 'mini' ? `room-floating-player${miniExpanded ? ' room-floating-player--expanded' : ''}` : 'room-player-full mt-5 w-full rounded-xl border border-cyan-300/15 bg-night-950/70 p-4 sm:p-5'}`}>
    {mode === 'mini' && <div className="room-mini-player">
      <div className="room-mini-player__track">
        <span className="room-mini-player__audio" aria-hidden="true"><AudioLines /></span>
        <div className="room-mini-player__metadata">
          <p ref={titleWindowRef} className="room-mini-player__title-window" title={title}>
            <span ref={titleTextRef} className={titleMarqueeDistance > 0 ? 'room-mini-player__title-text room-mini-player__title-text--scroll' : 'room-mini-player__title-text'} style={{ '--mini-title-distance': `${titleMarqueeDistance}px` } as CSSProperties}>{title}</span>
          </p>
          <span title={displayTrack?.artist}>{displayTrack?.artist ?? 'YouDJ'}</span>
        </div>
      </div>
      <div className="room-mini-player__timeline">
        <span aria-label="Tempo decorrido">{formatPlayerTime(currentTime)}</span>
        <input aria-label="Posição da música" type="range" min="0" max={duration || 0} step="1" value={Math.min(currentTime, duration || currentTime)} disabled={!playerCreated || duration <= 0} style={{ '--player-progress': `${progress}%` } as CSSProperties} onChange={(event) => seekTo(Number(event.currentTarget.value))} />
        <span aria-label="Duração">{formatPlayerTime(duration)}</span>
      </div>
      <div className="room-mini-player__transport">
        {status === 'playing'
          ? <button type="button" aria-label="Pausar música" onClick={pause}><Pause aria-hidden="true" /></button>
          : <button type="button" aria-label="Reproduzir música" onClick={() => void startOrResume()} disabled={primaryDisabled}><Play aria-hidden="true" /></button>}
        <button type="button" aria-label="Próxima música" onClick={() => void advanceToNext()} disabled={!nextTrack || status === 'loading'}><SkipForward aria-hidden="true" /></button>
      </div>
      <div className="room-mini-player__volume-control" ref={volumeControlRef}>
        <button type="button" className="room-mini-player__volume-toggle" aria-label="Abrir controle de volume" aria-expanded={volumePopoverOpen} aria-controls="mini-player-volume-popover" onClick={() => setVolumePopoverOpen((open) => !open)}>
          {volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
        </button>
        {volumePopoverOpen && <div id="mini-player-volume-popover" className="room-mini-player__volume-popover" role="group" aria-label="Volume do player">
          <button type="button" className="room-mini-player__mute" aria-label={volume === 0 ? 'Ativar som' : 'Silenciar'} disabled={!playerCreated} onClick={toggleMute}>{volume === 0 ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}</button>
          <input type="range" aria-label="Volume" min="0" max="100" value={volume} disabled={!playerCreated} style={{ '--player-progress': `${volume}%` } as CSSProperties} onChange={(event) => changeVolume(Number(event.currentTarget.value))} />
          <output>{volume}%</output>
        </div>}
      </div>
      <button type="button" className="room-mini-player__expand" aria-label={miniExpanded ? 'Recolher player' : 'Expandir player'} aria-expanded={miniExpanded} onClick={() => setMiniExpanded((expanded) => !expanded)}>{miniExpanded ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}</button>
      {error && <p className="room-mini-player__error" role="status">{error}</p>}
    </div>}
    <section aria-labelledby="now-playing-heading" className="room-player-now-playing mb-4 rounded-xl border border-cyan-300/15 bg-night-900/70 p-4">
      <h3 id="now-playing-heading" className="text-xs font-semibold uppercase tracking-wider text-cyan-200"><AudioLines aria-hidden="true" />Tocando agora</h3>
      <div className="mt-3 flex items-center gap-3">
        {displayTrack?.videoId && validVideoId(displayTrack.videoId)
          ? <img src={`https://i.ytimg.com/vi/${displayTrack.videoId}/mqdefault.jpg`} alt="" className="h-16 w-28 shrink-0 rounded-lg object-cover" />
          : <div aria-hidden="true" className="h-16 w-28 shrink-0 rounded-lg bg-white/5" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{displayTrack?.title ?? 'Nenhuma música selecionada'}</p>
          {displayTrack && <>
            <p className="mt-1 truncate text-xs text-zinc-300">{displayTrack.artist}</p>
            <p className="mt-1 truncate text-xs text-zinc-500">{displayTrack.source === 'dj' ? 'Adicionada pelo DJ' : `Pedido por ${displayTrack.guestName}`}</p>
          </>}
        </div>
        {displayTrack && <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status === 'playing' ? 'border-emerald-300/20 text-emerald-200' : 'border-amber-300/20 text-amber-100'}`}>
          {status === 'playing' ? 'Tocando' : 'Pausada'}
        </span>}
        <span className="room-playback-waveform" aria-hidden="true">{[5, 10, 15, 8, 20, 12, 24, 14, 7, 18, 11, 22, 9, 16, 6].map((height, index) => <i key={index} style={{ height: `${height}px` }} />)}</span>
      </div>
    </section>
    <div className="room-player-frame room-floating-player__youtube relative aspect-video min-h-[200px] overflow-hidden rounded-lg bg-black [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full" data-testid="youtube-player-frame">
      <div ref={hostRef} className="absolute inset-0 h-full w-full" />
      {!playerCreated && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-zinc-400">O player oficial será carregado após a ação do DJ.</div>}
    </div>
    <footer className="room-player-controls">
      <div className="room-player-controls__identity">
        <h3><svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" /></svg>Player do YouTube</h3>
        <p>A reprodução só começa quando o DJ iniciar.</p>
      </div>
      <div className="room-player-controls__actions">
        <button type="button" className="room-player-controls__start" onClick={() => void startOrResume()} disabled={primaryDisabled}>
          <Play aria-hidden="true" />{status === 'loading' ? 'Carregando…' : canContinue ? 'Continuar fila' : status === 'ended' ? 'Reiniciar fila' : 'Iniciar reprodução'}
        </button>
        <button type="button" className="room-player-controls__pause" onClick={pause} disabled={status !== 'playing'}>
          <Pause aria-hidden="true" />Pausar
        </button>
        <button type="button" className="room-player-controls__next" onClick={() => void advanceToNext()} disabled={!nextTrack || status === 'loading'}>
          <SkipForward aria-hidden="true" />Próxima música
        </button>
      </div>
    </footer>
    {error && <p role="alert" className="mt-3 text-sm text-amber-200">{error}</p>}
    {status === 'ended' && !nextTrack && <p role="status" className="mt-3 text-sm text-zinc-400">Não há mais vídeos reproduzíveis nesta fila.</p>}
  </section>
}
