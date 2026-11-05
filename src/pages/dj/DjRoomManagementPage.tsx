import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { DjRequestsSection } from '../../features/guest/components/DjRequestsSection'
import { DjRoomPresenceSection } from '../../features/guest/components/DjRoomPresenceSection'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import { getRoomErrorMessage } from '../../features/rooms/lib/roomErrors'
import { ROOM_STATUS_STYLES } from '../../features/rooms/lib/roomStatus'
import { DjRoomModeratorsSection } from '../../features/rooms/components/DjRoomModeratorsSection'
import { createDjRoomManagementStore, type DjRoomManagementStore, type ManagedRoom } from '../../features/rooms/services/djRoomManagementStore'
import type { RoomStore } from '../../features/rooms/services/roomStore'

interface DjRoomManagementPageProps {
  /** Compatibilidade com harnesses locais antigos; não é fonte de autorização. */
  roomStore?: RoomStore
  roomManagementStore?: DjRoomManagementStore
  requestStore?: DjRequestStore
  presenceStore?: DjPresenceStore
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'notFound' }
  | { kind: 'ready'; room: ManagedRoom }

export function DjRoomManagementPage({ roomManagementStore, requestStore, presenceStore }: DjRoomManagementPageProps) {
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

  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <Link to="/dj/painel/salas" className="inline-flex min-h-10 items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">← Voltar às salas</Link>
    <header className="rounded-2xl border border-white/8 bg-night-900/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">Gerenciamento da sala</p>
          <h1 className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{room.name}</h1>
          <p className="mt-2 text-sm font-medium text-cyan-200">DJ: {room.djName}</p>
          <p className="mt-2 font-mono text-xs tracking-wider text-zinc-400">Código: {room.code}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyle.className}`}>{statusStyle.label}</span>
          <span className="rounded-full border border-cyan-300/20 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">{isOwner ? 'Proprietário' : 'Moderador'}</span>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-zinc-500">{isOwner
        ? 'Você é o proprietário desta sala. As configurações musicais e o status continuam disponíveis no painel de salas.'
        : 'Acesso limitado a presença e pedidos desta sala. Configurações e permissões pertencem ao DJ proprietário.'}</p>
    </header>

    {isOwner && storeState.store && <DjRoomModeratorsSection roomId={room.id} store={storeState.store} />}
    <DjRoomPresenceSection roomId={room.id} store={presenceStore} />
    <DjRequestsSection roomId={room.id} store={requestStore} />
  </div>
}
