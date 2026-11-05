import { Link, useParams } from 'react-router-dom'
import { DjRequestsSection } from '../../features/guest/components/DjRequestsSection'
import { DjRoomPresenceSection } from '../../features/guest/components/DjRoomPresenceSection'
import type { DjPresenceStore } from '../../features/guest/services/djPresenceStore'
import type { DjRequestStore } from '../../features/guest/services/djRequestStore'
import { useAuth } from '../../features/auth/AuthContext'
import { useRooms } from '../../features/rooms/hooks/useRooms'
import { ROOM_STATUS_STYLES } from '../../features/rooms/lib/roomStatus'
import type { RoomStore } from '../../features/rooms/services/roomStore'

interface DjRoomManagementPageProps {
  roomStore?: RoomStore
  requestStore?: DjRequestStore
  presenceStore?: DjPresenceStore
}

export function DjRoomManagementPage({ roomStore, requestStore, presenceStore }: DjRoomManagementPageProps) {
  const { profile } = useAuth()
  const { roomId } = useParams()
  const { error, reload, rooms, status } = useRooms(profile?.id ?? null, roomStore)
  const room = rooms.find((candidate) => candidate.id === roomId)

  if (status === 'loading' || status === 'idle') {
    return <section role="status" className="mx-auto w-full max-w-5xl rounded-2xl border border-white/8 bg-night-900/50 p-8 text-center text-sm text-zinc-400">Carregando sala…</section>
  }

  if (status === 'error') {
    return <section className="mx-auto w-full max-w-5xl rounded-2xl border border-red-400/20 bg-red-400/5 p-6" role="alert">
      <p className="text-sm text-red-200">{error ?? 'Não foi possível carregar esta sala.'}</p>
      <button type="button" onClick={reload} className="mt-4 min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200">Tentar novamente</button>
    </section>
  }

  if (!room) {
    return <section className="mx-auto w-full max-w-5xl rounded-2xl border border-white/8 bg-night-900/50 p-6">
      <h1 className="text-xl font-semibold text-white">Sala não encontrada</h1>
      <p className="mt-2 text-sm text-zinc-400">A sala não existe ou não pertence à sua conta.</p>
      <Link to="/dj/painel/salas" className="mt-4 inline-flex min-h-10 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200">Voltar às salas</Link>
    </section>
  }

  const statusStyle = ROOM_STATUS_STYLES[room.status]
  return <div className="mx-auto w-full max-w-5xl space-y-5">
    <Link to="/dj/painel/salas" className="inline-flex min-h-10 items-center text-xs font-semibold text-cyan-200 hover:text-cyan-100">← Voltar às salas</Link>
    <header className="rounded-2xl border border-white/8 bg-night-900/50 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-300">Gerenciamento da sala</p>
          <h1 className="mt-2 break-words text-2xl font-bold text-white sm:text-3xl">{room.name}</h1>
          <p className="mt-2 font-mono text-xs tracking-wider text-zinc-400">Código: {room.code}</p>
        </div>
        <span className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${statusStyle.className}`}>{statusStyle.label}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/sala/${room.code}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 text-xs font-bold text-night-950">Entrar na sala</Link>
        <Link to="/dj/painel/salas" className="inline-flex min-h-11 items-center rounded-xl border border-white/10 px-4 text-xs font-semibold text-zinc-200">Compartilhar e configurar</Link>
      </div>
    </header>

    <DjRoomPresenceSection roomId={room.id} store={presenceStore} />
    <DjRequestsSection roomId={room.id} store={requestStore} />
  </div>
}
