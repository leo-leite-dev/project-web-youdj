import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Check, CircleCheck, CircleX, Clock3, Copy, UsersRound } from 'lucide-react'
import { DjProfileMenu } from '../../layouts/DjProfileMenu'
import { DjRequestsSection } from '../../features/guest/components/DjRequestsSection'
import { DjRoomPresenceSection } from '../../features/guest/components/DjRoomPresenceSection'
import { DjMusicQueueSection } from '../../features/guest/components/DjMusicQueueSection'
import type { DjMusicQueueStore } from '../../features/guest/services/djMusicQueueStore'
import type { YouTubePlayerFactory } from '../../features/guest/services/youtubeIframePlayer'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import { getRoomErrorMessage } from '../../features/rooms/lib/roomErrors'
import { ROOM_STATUS_STYLES } from '../../features/rooms/lib/roomStatus'
import { DjRoomModeratorsSection } from '../../features/rooms/components/DjRoomModeratorsSection'
import { createDjRoomManagementStore, type DjRoomManagementStore, type ManagedRoom } from '../../features/rooms/services/djRoomManagementStore'
import type { RoomStore } from '../../features/rooms/services/roomStore'
import './DjRoomManagementPage.css'

interface DjRoomManagementPageProps {
  /** Compatibilidade com harnesses locais antigos; não é fonte de autorização. */
  roomStore?: RoomStore
  roomManagementStore?: DjRoomManagementStore
  requestStore?: DjRequestStore
  presenceStore?: DjPresenceStore
  queueStore?: DjMusicQueueStore
  queuePlayerFactory?: YouTubePlayerFactory
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'notFound' }
  | { kind: 'ready'; room: ManagedRoom }

export function DjRoomManagementPage({ roomManagementStore, requestStore, presenceStore, queueStore, queuePlayerFactory }: DjRoomManagementPageProps) {
  const { roomId } = useParams()
  const [storeState] = useState(() => {
    if (roomManagementStore) return { store: roomManagementStore, error: null }
    try {
      return { store: createDjRoomManagementStore(), error: null }
    } catch (error) {
      return { store: null, error }
    }
  })
  const [page, setPage] = useState<PageState>({ kind: 'loading' })
  const [activeTab, setActiveTab] = useState<'requests' | 'queue' | 'team'>('requests')
  const [codeCopied, setCodeCopied] = useState(false)
  const [requestTab, setRequestTab] = useState<'pending' | 'approved' | 'rejected' | 'guests'>('pending')
  const [requestCounts, setRequestCounts] = useState({ pending: 0, approved: 0, rejected: 0 })
  const updateRequestCounts = useCallback((counts: typeof requestCounts) => setRequestCounts((current) =>
    current.pending === counts.pending && current.approved === counts.approved && current.rejected === counts.rejected ? current : counts,
  ), [])

  const reload = useCallback(async () => {
    if (!roomId) {
      setPage({ kind: 'notFound' })
      return
    }
    if (!storeState.store) {
      setPage({ kind: 'error', message: getRoomErrorMessage(storeState.error, 'A integração Supabase não está disponível.') })
      return
    }

    setPage({ kind: 'loading' })
    try {
      const room = await storeState.store.getRoom(roomId)
      setPage(room ? { kind: 'ready', room } : { kind: 'notFound' })
    } catch (cause) {
      setPage({ kind: 'error', message: getRoomErrorMessage(cause, 'Não foi possível carregar esta sala. Verifique a conexão e tente novamente.') })
    }
  }, [roomId, storeState])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  if (page.kind === 'loading') {
    return <section role="status" className="mx-auto w-full max-w-5xl rounded-2xl border border-white/8 bg-night-900/50 p-8 text-center text-sm text-zinc-400">Carregando sala…</section>
  }

  if (page.kind === 'error') {
    return <section className="mx-auto w-full max-w-5xl rounded-2xl border border-red-400/20 bg-red-400/5 p-6" role="alert">
      <p className="text-sm text-red-200">{page.message}</p>
      <button type="button" onClick={() => void reload()} className="mt-4 min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200">Tentar novamente</button>
    </section>
  }

  if (page.kind === 'notFound') {
    return <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/8 bg-night-900/50 p-6">
      <h1 className="text-xl font-semibold text-white">Sala indisponível</h1>
      <p className="mt-2 text-sm text-zinc-400">A sala não existe ou sua conta não tem acesso a ela.</p>
      <Link to="/dj/painel/salas" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200">Voltar às salas</Link>
    </section>
  }

  const { room } = page
  const statusStyle = ROOM_STATUS_STYLES[room.status]
  const isOwner = room.accessRole === 'owner'
  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(room.code)
      setCodeCopied(true)
      window.setTimeout(() => setCodeCopied(false), 1800)
    } catch {
      setCodeCopied(false)
    }
  }

  return <div className="room-management-page">
    <div className="room-management-topbar">
      <div className="room-management-header-container">
        <header className="room-management-hero">
          <DjProfileMenu />
          <div className="room-management-hero-copy">
            <p className="room-eyebrow">Gerenciamento da sala</p>
            <h1>{room.name}</h1>
            <p className="room-dj-name">DJ: {room.djName}</p>
            <div className="room-code-row"><p className="room-code">Código da sala <span>{room.code}</span></p><button type="button" className="room-code-copy" onClick={() => void copyRoomCode()} aria-label={codeCopied ? 'Código copiado' : 'Copiar código da sala'} title={codeCopied ? 'Copiado' : 'Copiar código'}><span>{codeCopied ? 'Copiado' : 'Copiar'}</span>{codeCopied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button><span className="room-code-feedback" role="status" aria-live="polite">{codeCopied ? 'Código copiado' : ''}</span></div>
            {!isOwner && <p className="room-description">Acesso limitado a presença e pedidos desta sala. Configurações e permissões pertencem ao DJ proprietário.</p>}
          </div>
          <div className="room-management-badges">
            <span className={`room-status ${statusStyle.className}`}>{statusStyle.label}</span>
            <span className="room-owner-badge">♛ &nbsp;{isOwner ? 'Proprietário' : 'Moderador'}</span>
            <Link to="/dj/painel/salas" className="room-back-link">Voltar às salas</Link>
          </div>
        </header>
      </div>

      <nav role="tablist" aria-label="Seções da sala" className="room-primary-tabs">
        <button type="button" aria-selected={activeTab === 'requests'} role="tab" onClick={() => setActiveTab('requests')} className={activeTab === 'requests' ? 'active' : ''}>♫ &nbsp; Pedidos</button>
        <button type="button" aria-label="Fila e Player" aria-selected={activeTab === 'queue'} role="tab" onClick={() => setActiveTab('queue')} className={activeTab === 'queue' ? 'active' : ''}>▷ &nbsp; Fila e Player</button>
        <button type="button" aria-selected={activeTab === 'team'} role="tab" onClick={() => setActiveTab('team')} className={activeTab === 'team' ? 'active' : ''}>♧ &nbsp; Equipe</button>
      </nav>
    </div>
    <div className="room-management-panel">
      {activeTab === 'requests' && <>
        <nav className="room-request-tabs" aria-label="Categorias de pedidos">
          <button type="button" aria-pressed={requestTab === 'pending'} onClick={() => setRequestTab('pending')}><Clock3 className="request-tab-icon request-tab-icon--pending" aria-hidden="true" /><span>Pendentes ({requestCounts.pending})</span></button>
          <button type="button" aria-pressed={requestTab === 'approved'} onClick={() => setRequestTab('approved')}><CircleCheck className="request-tab-icon request-tab-icon--approved" aria-hidden="true" /><span>Aprovados ({requestCounts.approved})</span></button>
          <button type="button" aria-pressed={requestTab === 'rejected'} onClick={() => setRequestTab('rejected')}><CircleX className="request-tab-icon request-tab-icon--rejected" aria-hidden="true" /><span>Rejeitados ({requestCounts.rejected})</span></button>
          <button type="button" aria-pressed={requestTab === 'guests'} onClick={() => setRequestTab('guests')}><UsersRound className="request-tab-icon request-tab-icon--guests" aria-hidden="true" /><span>Convidados</span></button>
        </nav>
        {requestTab === 'guests' && <DjRoomPresenceSection roomId={room.id} store={presenceStore} canManageVip={isOwner} />}
      </>}
      <div hidden={activeTab !== 'requests' || requestTab === 'guests'}><DjRequestsSection roomId={room.id} store={requestStore} queueStore={queueStore} filter={requestTab === 'guests' ? 'pending' : requestTab} active={activeTab === 'requests' && requestTab !== 'guests'} onCountsChange={updateRequestCounts} /></div>
      <DjMusicQueueSection key={room.id} roomId={room.id} roomCode={room.code} store={queueStore} playerFactory={queuePlayerFactory} active={activeTab === 'queue'} />
      {activeTab === 'team' && <section className="room-team-content">
        {isOwner && storeState.store ? <DjRoomModeratorsSection roomId={room.id} store={storeState.store} /> : <p className="text-sm text-zinc-400">Somente o proprietário pode gerenciar a equipe desta sala.</p>}
      </section>}
    </div>
  </div>
}
