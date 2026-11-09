import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleCheck, CircleX, Clock3, Ellipsis, ExternalLink, ListOrdered, Music2, Play, UserRound } from 'lucide-react'
import { SearchControl, SelectControl, type FilterOption } from '../../../components/FilterControls'
import { RefreshButton } from '../../../components/RefreshButton'
import { getRoomErrorMessage } from '../../rooms/lib/roomErrors'
import { createDjMusicQueueStore, type DjMusicQueueStore, type QueueTrack } from '../services/djMusicQueueStore'
import { createDjRequestStore, type DjRequest, type DjRequestStore } from '../services/djRequestStore'
import { formatRequestedAt } from '../lib/formatRequestedAt'

interface DjRequestsSectionProps {
  roomId: string
  store?: DjRequestStore
  queueStore?: DjMusicQueueStore
  filter?: 'pending' | 'approved' | 'rejected'
  active?: boolean
  onCountsChange?: (counts: { pending: number; approved: number; rejected: number }) => void
}

type QueueState = 'idle' | 'loading' | 'ready' | 'error'
type ApprovedSortOrder = 'newest' | 'oldest' | 'title'
type PendingSortOrder = 'oldest' | 'newest' | 'title'
type RejectedSortOrder = 'newest' | 'oldest' | 'title'

const NEWEST_FIRST_OPTIONS: readonly FilterOption[] = [
  { value: 'newest', label: 'Mais recentes' },
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'title', label: 'Título (A–Z)' },
]
const OLDEST_FIRST_OPTIONS: readonly FilterOption[] = [
  { value: 'oldest', label: 'Mais antigos' },
  { value: 'newest', label: 'Mais recentes' },
  { value: 'title', label: 'Título (A–Z)' },
]

const WAVEFORM_BAR_HEIGHTS = [18, 31, 43, 25, 62, 38, 76, 48, 29, 68, 42, 83, 55, 35, 72, 46, 64, 30, 58, 39, 74, 47, 28, 61] as const

function removeTopicSuffix(value: string): string {
  return value.replace(/\s+-\s+Topic$/i, '')
}

function getRequestExternalUrl(request: DjRequest): string | null {
  if (request.videoId) return `https://www.youtube.com/watch?v=${encodeURIComponent(request.videoId)}`
  if (!request.submittedUrl) return null
  try {
    const url = new URL(request.submittedUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

interface ApprovedRequestGridProps {
  items: DjRequest[]
  queuePositions: ReadonlyMap<string, number>
  queueState: QueueState
  playedRequestIds: ReadonlySet<string>
}

interface PendingRequestGridProps {
  items: DjRequest[]
  busyId: string | null
  onStatusChange: (requestId: string, status: 'approved' | 'rejected') => void
}

interface RejectedRequestGridProps {
  items: DjRequest[]
}

function RejectedRequestGrid({ items }: RejectedRequestGridProps) {
  if (items.length === 0) return <p className="mt-4 text-sm text-zinc-500">Nenhum pedido rejeitado encontrado.</p>

  return <ul className="mt-4 room-request-list--rejected">{items.map((request) => {
    const requestedAt = formatRequestedAt(request.createdAt)

    return <li key={request.id} className="room-approved-card room-rejected-card">
      <div className="room-approved-card__badges room-rejected-card__badges">
        <span className="room-rejected-card__status"><CircleX aria-hidden="true" />Rejeitado</span>
      </div>
      <div className="room-approved-card__track">
        <div className="room-approved-card__cover">
          {request.videoId
            ? <img src={`https://i.ytimg.com/vi/${request.videoId}/mqdefault.jpg`} alt="" loading="lazy" />
            : <Music2 aria-hidden="true" />}
        </div>
        <div className="room-approved-card__copy">
          <h3 title={request.title}>{request.title}</h3>
          <p title={removeTopicSuffix(request.artist)}>{removeTopicSuffix(request.artist)}</p>
          <div className="room-approved-waveform" aria-hidden="true">
            {WAVEFORM_BAR_HEIGHTS.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div>
        </div>
      </div>
      <div className="room-approved-card__footer room-rejected-card__footer">
        <div className="room-approved-card__metadata">
          {requestedAt && <p><Clock3 aria-hidden="true" /><span>{requestedAt}</span></p>}
          <p><UserRound aria-hidden="true" /><span>Convidado: {request.guestName}</span></p>
        </div>
      </div>
    </li>
  })}</ul>
}

function PendingRequestGrid({ items, busyId, onStatusChange }: PendingRequestGridProps) {
  if (items.length === 0) return <p className="mt-4 text-sm text-zinc-500">Nenhum pedido pendente encontrado.</p>

  return <ul className="mt-4 room-request-list--pending">{items.map((request) => {
    const requestedAt = formatRequestedAt(request.createdAt)
    const videoUrl = getRequestExternalUrl(request)

    return <li key={request.id} className="room-approved-card room-pending-card">
      <div className="room-approved-card__badges room-pending-card__badges">
        <span className="room-pending-card__status"><Clock3 aria-hidden="true" />Pendente</span>
        {videoUrl && <details className="room-approved-card__menu room-pending-card__menu">
          <summary aria-label={`Mais ações para ${removeTopicSuffix(request.title)}`}><Ellipsis aria-hidden="true" /></summary>
          <div className="room-approved-card__menu-popover">
            <a href={videoUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Abrir vídeo</a>
          </div>
        </details>}
      </div>
      <div className="room-approved-card__track room-pending-card__track">
        <div className="room-approved-card__cover">
          {request.videoId
            ? <img src={`https://i.ytimg.com/vi/${request.videoId}/mqdefault.jpg`} alt="" loading="lazy" />
            : <Music2 aria-hidden="true" />}
          {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" aria-label={`Abrir vídeo de ${removeTopicSuffix(request.title)}`} className="room-approved-card__play"><Play aria-hidden="true" /></a>}
        </div>
        <div className="room-approved-card__copy">
          <h3 title={removeTopicSuffix(request.title)}>{removeTopicSuffix(request.title)}</h3>
          <p title={removeTopicSuffix(request.artist)}>{removeTopicSuffix(request.artist)}</p>
          <div className="room-approved-waveform" aria-hidden="true">
            {WAVEFORM_BAR_HEIGHTS.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div>
        </div>
      </div>
      <div className="room-pending-card__actions">
        <button type="button" disabled={busyId === request.id} onClick={() => onStatusChange(request.id, 'approved')}><CircleCheck aria-hidden="true" />Aprovar</button>
        <button type="button" disabled={busyId === request.id} onClick={() => onStatusChange(request.id, 'rejected')}><CircleX aria-hidden="true" />Rejeitar</button>
      </div>
      <div className="room-approved-card__footer room-pending-card__footer">
        <div className="room-approved-card__metadata">
          {requestedAt && <p><Clock3 aria-hidden="true" /><span>{requestedAt}</span></p>}
          <p><UserRound aria-hidden="true" /><span>Convidado: {request.guestName}</span></p>
        </div>
      </div>
    </li>
  })}</ul>
}

function ApprovedRequestGrid({ items, queuePositions, queueState, playedRequestIds }: ApprovedRequestGridProps) {
  if (items.length === 0) return <p className="mt-4 text-sm text-zinc-500">Nenhum pedido aprovado encontrado.</p>

  return <ul className="mt-4 room-request-list--approved">{items.map((request) => {
    const requestedAt = formatRequestedAt(request.createdAt)
    const queuePosition = queuePositions.get(request.id)
    const isPlayed = playedRequestIds.has(request.id)
    const videoUrl = getRequestExternalUrl(request)
    const queueLabel = queuePosition !== undefined
      ? `Na fila #${queuePosition}`
      : queueState === 'idle' || queueState === 'loading'
        ? 'Carregando fila…'
        : queueState === 'error'
          ? 'Fila indisponível'
          : 'Fora da fila'

    return <li key={request.id} className="room-approved-card">
      <div className="room-approved-card__badges">
        <div className="room-approved-card__status-group">
          <span className="room-approved-card__approved"><CircleCheck aria-hidden="true" />Aprovado</span>
          {isPlayed && <span className="room-approved-card__played">Tocada</span>}
        </div>
        <span className={`room-approved-card__position ${queuePosition === undefined ? 'room-approved-card__position--muted' : ''}`}>
          <ListOrdered aria-hidden="true" />{queueLabel}
        </span>
      </div>
      <div className="room-approved-card__track">
        <div className="room-approved-card__cover">
          {request.videoId
            ? <img src={`https://i.ytimg.com/vi/${request.videoId}/mqdefault.jpg`} alt="" loading="lazy" />
            : <Music2 aria-hidden="true" />}
          {videoUrl && <a href={videoUrl} target="_blank" rel="noreferrer" aria-label={`Abrir vídeo de ${request.title}`} className="room-approved-card__play"><Play aria-hidden="true" /></a>}
        </div>
        <div className="room-approved-card__copy">
          <h3 title={request.title}>{request.title}</h3>
          <p title={request.artist}>{request.artist.replace(/ - Topic$/, '')}</p>
          <div className="room-approved-waveform" aria-hidden="true">
            {WAVEFORM_BAR_HEIGHTS.map((height, index) => <span key={index} style={{ height: `${height}%` }} />)}
          </div>
        </div>
      </div>
      <div className="room-approved-card__footer">
        <div className="room-approved-card__metadata">
          {requestedAt && <p><Clock3 aria-hidden="true" /><span>{requestedAt}</span></p>}
          <p><UserRound aria-hidden="true" /><span>Convidado: {request.guestName}</span></p>
        </div>
        <details className="room-approved-card__menu">
          <summary aria-label={`Mais ações para ${request.title}`}><Ellipsis aria-hidden="true" /></summary>
          <div className="room-approved-card__menu-popover">
            {videoUrl
              ? <a href={videoUrl} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" />Abrir vídeo</a>
              : <span>Nenhuma ação disponível</span>}
          </div>
        </details>
      </div>
    </li>
  })}</ul>
}

export function DjRequestsSection({ roomId, store: storeOverride, queueStore: queueStoreOverride, filter = 'pending', active = true, onCountsChange }: DjRequestsSectionProps) {
  const [store] = useState(() => storeOverride ?? createDjRequestStore())
  const queueStoreRef = useRef<DjMusicQueueStore | null>(queueStoreOverride ?? null)
  const [requests, setRequests] = useState<DjRequest[]>([])
  const [queueTracks, setQueueTracks] = useState<QueueTrack[]>([])
  const [queueState, setQueueState] = useState<QueueState>('idle')
  const [search, setSearch] = useState('')
  const [sortOrder, setSortOrder] = useState<ApprovedSortOrder>('newest')
  const [pendingSearch, setPendingSearch] = useState('')
  const [pendingSortOrder, setPendingSortOrder] = useState<PendingSortOrder>('oldest')
  const [rejectedSearch, setRejectedSearch] = useState('')
  const [rejectedSortOrder, setRejectedSortOrder] = useState<RejectedSortOrder>('newest')
  const [playedRequestIds, setPlayedRequestIds] = useState<ReadonlySet<string>>(() => new Set())
  const [hasLoaded, setHasLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const inFlightRef = useRef(false)
  const queueInFlightRef = useRef(false)

  const reloadQueue = useCallback(async (silent = false) => {
    if (queueInFlightRef.current) return
    queueInFlightRef.current = true
    if (!silent) setQueueState('loading')
    try {
      const queueStore = queueStoreRef.current ?? createDjMusicQueueStore()
      queueStoreRef.current = queueStore
      const tracks = await queueStore.listByRoom(roomId)
      setQueueTracks(tracks)
      setQueueState('ready')
    } catch {
      setQueueState('error')
    } finally {
      queueInFlightRef.current = false
    }
  }, [roomId])

  const reload = useCallback(async (silent = false) => {
    if (inFlightRef.current) return
    inFlightRef.current = true
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const nextRequests = await store.listByRoom(roomId)
      const played = store.listPlayedRequestIds ? await store.listPlayedRequestIds(roomId) : []
      setRequests((current) => JSON.stringify(current) === JSON.stringify(nextRequests) ? current : nextRequests)
      setPlayedRequestIds(new Set(played))
      setHasLoaded(true)
    }
    catch (cause) { if (!silent) setError(getRoomErrorMessage(cause, 'Não foi possível carregar os pedidos. Verifique sua conexão e tente novamente.')) }
    finally { inFlightRef.current = false; setLoading(false) }
  }, [roomId, store])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  useEffect(() => {
    if (!active) return
    let timer: number
    const poll = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') void reload(true)
        poll()
      }, 5000)
    }
    poll()
    return () => window.clearTimeout(timer)
  }, [active, reload])

  useEffect(() => {
    if (!active || filter !== 'approved') return
    const initialLoad = window.setTimeout(() => { void reloadQueue() }, 0)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void reloadQueue(true)
    }, 5000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(timer)
    }
  }, [active, filter, reloadQueue])

  async function updateStatus(requestId: string, status: 'approved' | 'rejected') {
    setBusyId(requestId)
    setError(null)
    setMessage(null)
    try {
      await store.setStatus(requestId, status)
      setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status } : request))
      setMessage(status === 'approved' ? 'Pedido aprovado.' : 'Pedido rejeitado.')
    } catch (cause) {
      await reload()
      setError(getRoomErrorMessage(cause, cause instanceof Error ? cause.message : 'Não foi possível atualizar o pedido.'))
    } finally { setBusyId(null) }
  }

  const pending = requests.filter((request) => request.status === 'pending')
  const approved = requests.filter((request) => request.status === 'approved')
  const rejected = requests.filter((request) => request.status === 'rejected')
  const queuePositions = new Map(queueTracks.map((track, index) => [track.requestId, index + 1]))
  const normalizedSearch = search.trim().toLocaleLowerCase()
  const visibleApproved = approved
    .filter((request) => `${request.title} ${request.artist} ${request.guestName}`.toLocaleLowerCase().includes(normalizedSearch))
    .sort((first, second) => {
      if (sortOrder === 'oldest') return Date.parse(first.createdAt) - Date.parse(second.createdAt)
      if (sortOrder === 'title') return first.title.localeCompare(second.title, 'pt-BR', { sensitivity: 'base' })
      return Date.parse(second.createdAt) - Date.parse(first.createdAt)
    })
  const normalizedPendingSearch = pendingSearch.trim().toLocaleLowerCase()
  const visiblePending = pending
    .filter((request) => `${removeTopicSuffix(request.title)} ${removeTopicSuffix(request.artist)} ${request.guestName}`.toLocaleLowerCase().includes(normalizedPendingSearch))
    .sort((first, second) => {
      if (pendingSortOrder === 'newest') return Date.parse(second.createdAt) - Date.parse(first.createdAt)
      if (pendingSortOrder === 'title') return removeTopicSuffix(first.title).localeCompare(removeTopicSuffix(second.title), 'pt-BR', { sensitivity: 'base' })
      return Date.parse(first.createdAt) - Date.parse(second.createdAt)
    })
  const normalizedRejectedSearch = rejectedSearch.trim().toLocaleLowerCase()
  const visibleRejected = rejected
    .filter((request) => `${request.title} ${removeTopicSuffix(request.artist)} ${request.guestName}`.toLocaleLowerCase().includes(normalizedRejectedSearch))
    .sort((first, second) => {
      if (rejectedSortOrder === 'oldest') return Date.parse(first.createdAt) - Date.parse(second.createdAt)
      if (rejectedSortOrder === 'title') return first.title.localeCompare(second.title, 'pt-BR', { sensitivity: 'base' })
      return Date.parse(second.createdAt) - Date.parse(first.createdAt)
    })

  useEffect(() => {
    onCountsChange?.({ pending: pending.length, approved: approved.length, rejected: rejected.length })
  }, [approved.length, onCountsChange, pending.length, rejected.length])

  return <section aria-labelledby="requests-title" className={`room-requests-section${filter === 'approved' ? ' room-requests-section--approved' : ''}${filter === 'pending' ? ' room-requests-section--pending' : ''}${filter === 'rejected' ? ' room-requests-section--rejected' : ''}`}>
    <div className={`room-requests-header flex flex-wrap items-center justify-between gap-3${filter === 'approved' ? ' room-requests-header--approved' : ''}${filter === 'pending' ? ' room-requests-header--pending' : ''}${filter === 'rejected' ? ' room-requests-header--rejected' : ''}`}>
      <div className="room-requests-title-row">
        <div><h2 id="requests-title" className="font-semibold text-white">{filter === 'pending' ? 'Pedidos pendentes' : filter === 'approved' ? 'Pedidos aprovados' : 'Pedidos rejeitados'} <span className="text-fuchsia-300">({filter === 'pending' ? pending.length : filter === 'approved' ? approved.length : rejected.length})</span></h2><p className="mt-1 text-xs text-zinc-400">{filter === 'pending' ? 'Pedidos pendentes aguardam sua decisão antes de entrarem na fila de reprodução.' : filter === 'approved' ? 'Pedidos aprovados e posição atual na fila.' : 'Pedidos recusados nesta sala.'}</p></div>
        <RefreshButton label="Atualizar pedidos" onClick={() => { void reload(); if (filter === 'approved') void reloadQueue() }} loading={loading} />
      </div>
      {filter === 'pending' && <div className="room-approved-controls filter-controls room-pending-controls">
        <SearchControl label="Buscar pedidos pendentes" value={pendingSearch} onChange={setPendingSearch} placeholder="Buscar pedido..." />
        <SelectControl label="Ordenar:" value={pendingSortOrder} onChange={(value) => setPendingSortOrder(value as PendingSortOrder)} options={OLDEST_FIRST_OPTIONS} />
      </div>}
      {filter === 'rejected' && <div className="room-approved-controls filter-controls room-rejected-controls">
        <SearchControl label="Buscar pedidos rejeitados" value={rejectedSearch} onChange={setRejectedSearch} placeholder="Buscar música, artista ou convidado" />
        <SelectControl label="Ordenar:" value={rejectedSortOrder} onChange={(value) => setRejectedSortOrder(value as RejectedSortOrder)} options={NEWEST_FIRST_OPTIONS} />
      </div>}
      {filter === 'approved' && <div className="room-approved-controls filter-controls room-approved-header-controls">
        <SearchControl label="Buscar pedidos aprovados" value={search} onChange={setSearch} placeholder="Buscar música, artista ou convidado" />
        <SelectControl label="Ordenar:" value={sortOrder} onChange={(value) => setSortOrder(value as ApprovedSortOrder)} options={NEWEST_FIRST_OPTIONS} />
      </div>}
    </div>
    {error && <div className="mt-3 space-y-2" role="alert"><p className="text-sm text-red-300">{error}</p><button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-red-300/20 px-3 text-xs font-semibold text-red-200 disabled:opacity-50">Tentar novamente</button></div>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p>}
    {loading && !hasLoaded ? <p role="status" className="mt-4 text-sm text-zinc-400">Carregando pedidos…</p> : !hasLoaded ? null : <>
      {filter === 'pending' ? <PendingRequestGrid items={visiblePending} busyId={busyId} onStatusChange={(id, status) => void updateStatus(id, status)} /> : filter === 'approved' ? <ApprovedRequestGrid items={visibleApproved} queuePositions={queuePositions} queueState={queueState} playedRequestIds={playedRequestIds} /> : <RejectedRequestGrid items={visibleRejected} />}
    </>}
  </section>
}
