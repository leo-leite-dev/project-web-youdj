import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { getRoomErrorMessage } from '../../rooms/lib/roomErrors'
import { createDjMusicQueueStore, type DjMusicQueueStore, type QueueTrack } from '../services/djMusicQueueStore'
import type { YouTubePlayerFactory } from '../services/youtubeIframePlayer'
import type { YoutubeVideo } from '../services/guestRequestApi'
import { DjQueuePlayer } from './DjQueuePlayer'
import { useDjPlaybackContext } from './DjPlaybackContext'
import { DjYoutubeSearchCard } from './DjYoutubeSearchCard'

function getDirectAddErrorMessage(cause: unknown): string {
  const code = typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string' ? cause.code : null
  if (code === 'PGRST202' || code === '42883') return 'A inclusão direta ainda não está habilitada neste backend. A migration local da fila DJ precisa ser aplicada primeiro.'
  if (code === '22023') return 'Este vídeo não consta mais entre os resultados recentes. Faça uma nova busca e tente novamente.'
  return getRoomErrorMessage(cause, 'Não foi possível adicionar a música à fila.')
}

export function DjMusicQueueSection({ roomId, roomCode, store: override, playerFactory, active = true }: { roomId: string; roomCode?: string; store?: DjMusicQueueStore; playerFactory?: YouTubePlayerFactory; active?: boolean }) {
  const playback = useDjPlaybackContext()
  const storeRef = useRef<DjMusicQueueStore | null>(override ?? null)
  const [tracks, setTracks] = useState<QueueTrack[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null)
  const [playedTrackIds, setPlayedTrackIds] = useState<ReadonlySet<string>>(() => new Set())
  const [playedRequestIds, setPlayedRequestIds] = useState<ReadonlySet<string>>(() => new Set())
  const loadingRef = useRef(false)
  const registerQueue = playback?.registerQueue
  const setFullView = playback?.setFullView
  const recordPlayed = useCallback((requestId: string) => {
    const queueStore = storeRef.current
    if (tracks.find((track) => track.requestId === requestId)?.source === 'dj') return
    if (!queueStore?.markRequestPlayed) return
    void queueStore.markRequestPlayed(roomId, requestId).then(() => {
      setPlayedRequestIds((current) => new Set(current).add(requestId))
    }).catch((cause: unknown) => setError(getRoomErrorMessage(cause, 'Não foi possível salvar o histórico de reprodução.')))
  }, [roomId, tracks])
  const reload = useCallback(async (silent = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    if (!silent) { setLoading(true); setError(null) }
    try {
      const queueStore = storeRef.current ?? createDjMusicQueueStore()
      storeRef.current = queueStore
      const nextTracks = await queueStore.listByRoom(roomId)
      setTracks((current) => JSON.stringify(current) === JSON.stringify(nextTracks) ? current : nextTracks)
      setLoaded(true)
      if (queueStore.listPlayedRequestIds) {
        try {
          setPlayedRequestIds(new Set(await queueStore.listPlayedRequestIds(roomId)))
        } catch {
          // Queue loading is independent from persistent history; the player keeps session history.
        }
      }
    }
    catch (cause) { if (!silent) setError(getRoomErrorMessage(cause, 'Não foi possível carregar a fila. Tente novamente.')) }
    finally { loadingRef.current = false; setLoading(false) }
  }, [roomId])
  useEffect(() => {
    if (!active || loaded) return
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [active, loaded, reload])

  useEffect(() => {
    if (!active || !loaded) return
    let timer: number
    const poll = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') void reload(true)
        poll()
      }, 5000)
    }
    poll()
    return () => window.clearTimeout(timer)
  }, [active, loaded, reload])

  useEffect(() => {
    if (loaded) registerQueue?.(roomId, tracks, recordPlayed)
  }, [loaded, recordPlayed, registerQueue, roomId, tracks])
  useLayoutEffect(() => {
    if (!setFullView) return
    setFullView(roomId, active)
    return () => setFullView(roomId, false)
  }, [active, roomId, setFullView])

  const handlePlaybackQueueChange = useCallback((requestId: string | null, playedIds: ReadonlySet<string>) => {
    setCurrentTrackId(requestId)
    setPlayedTrackIds(new Set(playedIds))
  }, [])

  const hasGlobalPlayback = playback !== null
  const playbackForRoom = playback?.queue?.roomId === roomId ? playback : null
  const visibleCurrentTrackId = playbackForRoom?.currentTrackId ?? currentTrackId
  const visiblePlayedTrackIds = new Set([...playedRequestIds, ...(playbackForRoom?.playedTrackIds ?? playedTrackIds)])
  const upcomingTracks = tracks.filter((track) => track.requestId !== visibleCurrentTrackId && !visiblePlayedTrackIds.has(track.requestId))
  const currentQueueIndex = tracks.findIndex((track) => track.requestId === visibleCurrentTrackId)
  const nextTrackCandidates = currentQueueIndex >= 0 ? tracks.slice(currentQueueIndex + 1) : tracks
  const nextTrackId = nextTrackCandidates.find((track) => track.videoId !== null && /^[A-Za-z0-9_-]{11}$/.test(track.videoId) && !visiblePlayedTrackIds.has(track.requestId))?.requestId ?? null

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    const queueStore = storeRef.current
    if (!queueStore || target < 0 || target >= upcomingTracks.length) return
    const nextUpcoming = [...upcomingTracks]
    const movingTrack = nextUpcoming[index]
    const displacedTrack = nextUpcoming[target]
    if (!movingTrack || !displacedTrack) return
    nextUpcoming[index] = displacedTrack
    nextUpcoming[target] = movingTrack
    const historicalTracks = tracks.filter((track) => track.requestId !== visibleCurrentTrackId && visiblePlayedTrackIds.has(track.requestId))
    const currentTrack = tracks.find((track) => track.requestId === visibleCurrentTrackId)
    const next = [...historicalTracks, ...(currentTrack ? [currentTrack] : []), ...nextUpcoming]
    setBusy(true); setError(null)
    try { await queueStore.reorder(roomId, next.map((track) => track.requestId)); setTracks(next) }
    catch (cause) { setError(getRoomErrorMessage(cause, 'Não foi possível reordenar a fila.')); await reload() }
    finally { setBusy(false) }
  }
  async function remove(requestId: string) {
    const queueStore = storeRef.current
    if (!queueStore) return
    setBusy(true); setError(null)
    try { await queueStore.remove(roomId, requestId); setTracks((items) => items.filter((item) => item.requestId !== requestId)) }
    catch (cause) { setError(getRoomErrorMessage(cause, 'Não foi possível remover a música.')); await reload() }
    finally { setBusy(false) }
  }

  async function addYoutubeVideo(video: YoutubeVideo) {
    if (busy) throw new Error('Aguarde a operação atual da fila terminar.')
    const queueStore = storeRef.current ?? createDjMusicQueueStore()
    storeRef.current = queueStore
    setBusy(true)
    try {
      const trackId = await queueStore.addYoutubeTrack(roomId, video.videoId)
      setTracks((current) => current.some((track) => track.requestId === trackId) ? current : [...current, {
        requestId: trackId,
        source: 'dj',
        title: video.title,
        artist: video.channel,
        videoId: video.videoId,
        submittedUrl: null,
        guestName: 'DJ',
      }])
      void reload(true)
    } catch (cause) {
      throw new Error(getDirectAddErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  const queuedVideoIds = new Set<string>()
  for (const track of tracks) {
    if (track.source === 'dj' && track.videoId !== null) queuedVideoIds.add(track.videoId)
  }

  return <section aria-labelledby={active ? 'queue-heading' : undefined} className={active ? 'room-queue-shell' : 'contents'}>
    {active && <>
      <div className="room-queue-heading"><div><h2 id="queue-heading">Fila e Player</h2><p>Gerencie a fila de reprodução e controle o player da sala.</p></div><button type="button" onClick={() => void reload()} disabled={loading} className="room-queue-refresh">Atualizar</button></div>
      {error && <div role="alert" className="mt-4 text-sm text-red-300">{error} <button type="button" onClick={() => void reload()} className="underline">Tentar novamente</button></div>}
      {loading && !loaded && <p role="status" className="mt-4 text-sm text-zinc-400">Carregando fila…</p>}
      {loading && loaded && <p role="status" className="mt-2 text-xs text-zinc-500">Atualizando a fila…</p>}
    </>}
    <div className={`room-queue-columns ${active ? '' : 'room-queue-columns--inactive'}`}>
    <div id="dj-playback-slot" className={`room-playback-slot ${active ? '' : 'room-playback-slot--mini'}`}>
      {!hasGlobalPlayback && <DjQueuePlayer key="persistent-youtube-player" roomId={roomId} tracks={tracks} playerFactory={playerFactory} active={active} mode={active ? 'full' : 'mini'} onPlaybackQueueChange={handlePlaybackQueueChange} onTrackStarted={recordPlayed} />}
    </div>
    {active && <aside className="room-queue-sidebar" aria-label="Fila e busca de músicas">
    <div className="room-upcoming-list">
    <header className="room-upcoming-heading"><div><h3>Fila de reprodução <span>({loaded ? upcomingTracks.length : '—'})</span></h3><p>Ordem das próximas músicas da sala.</p></div></header>
     {loaded && upcomingTracks.length === 0 && <p className="room-queue-empty">{visibleCurrentTrackId ? 'Não há próximas músicas na fila.' : 'A fila está vazia. Pedidos aprovados ou músicas adicionadas pelo DJ aparecerão aqui.'}</p>}
    {upcomingTracks.length > 0 && <ol>{upcomingTracks.map((track, index) => {
      const isNextTrack = track.requestId === nextTrackId
      return <li key={track.requestId} className={isNextTrack ? 'room-queue-track--next' : undefined} aria-current={isNextTrack ? 'true' : undefined}>
       <span className="w-7 font-mono text-sm text-fuchsia-200">{String(index + 1).padStart(2, '0')}</span>{track.videoId && <img src={`https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`} alt="" className="h-14 w-24 rounded-md object-cover" loading="lazy"/>}
       <div className="room-queue-track-copy"><p>{track.title}</p><p>{track.artist}</p></div>{isNextTrack && <span className="room-queue-next-badge">▷ Próxima</span>}
       {track.source === 'dj' && <span className="room-queue-source-badge">DJ</span>}
      <div className="room-queue-actions"><button type="button" aria-label={`Mover ${track.title} para cima`} title="Mover para cima" disabled={busy || index === 0} onClick={() => void move(index, -1)}>↑</button><button type="button" aria-label={`Mover ${track.title} para baixo`} title="Mover para baixo" disabled={busy || index === upcomingTracks.length - 1} onClick={() => void move(index, 1)}>↓</button><button type="button" aria-label="Remover" title={`Remover ${track.title}`} disabled={busy} onClick={() => void remove(track.requestId)}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-5"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6" /></svg></button></div>
    </li>})}</ol>}
    </div>
    {roomCode && <DjYoutubeSearchCard roomCode={roomCode} queuedVideoIds={queuedVideoIds} addingDisabled={busy} onAddToQueue={addYoutubeVideo} />}
    </aside>}
    </div>
  </section>
}
