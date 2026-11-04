import { Link } from 'react-router-dom'
import {
  CheckIcon,
  ClockIcon,
  ListMusicIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  WalletIcon,
} from '../../components/Icons'
import { PlannedBadge } from '../../components/PlannedBadge'
import { useAuth } from '../../features/auth/AuthContext'
import { DjRequestsSection } from '../../features/guest/components/DjRequestsSection'
import { useRooms } from '../../features/rooms/hooks/useRooms'
import type { RoomStore } from '../../features/rooms/services/roomStore'

const milestones = [
  { label: 'Fundação visual, rotas e testes', done: true },
  { label: 'Autenticação com Supabase Auth', done: true },
  { label: 'Criação e listagem de salas', done: true },
  { label: 'QR Code e links de convidados', done: false },
  { label: 'Pedidos em tempo real com Supabase Realtime', done: false },
  { label: 'Pagamentos, histórico e relatórios', done: false },
  { label: 'Player integrado com YouTube IFrame API', done: false },
]

interface DjDashboardPageProps {
  roomStore?: RoomStore
}

export function DjDashboardPage({ roomStore }: DjDashboardPageProps) {
  const { profile, user } = useAuth()
  const djId = profile?.id ?? null
  const { error: roomsError, reload, rooms, status: roomsStatus } = useRooms(djId, roomStore)

  const activeRoomCount = rooms.filter((room) => room.status === 'active').length

  const stats = [
    {
      label: 'Salas ativas',
      value: roomsStatus === 'ready' ? String(activeRoomCount) : '—',
      hint:
        roomsStatus === 'ready'
          ? rooms.length === 0
            ? 'Nenhuma sala'
            : `${rooms.length} no total`
          : roomsStatus === 'error'
            ? 'Erro ao carregar'
            : 'Carregando salas',
    },
    { label: 'Pedidos hoje', value: '—', hint: 'Aguardando integração' },
    { label: 'Receita do evento', value: '—', hint: 'Pagamentos planejados' },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
          Painel do DJ
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Visão geral
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          Olá, {profile?.displayName ?? 'DJ'}. Sua conta está autenticada como{' '}
          {user?.email ?? 'DJ'}. Acompanhe suas salas e gerencie os pedidos recebidos.
        </p>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
            Sessão autenticada
          </p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            O acesso foi validado pelo Supabase Auth e o perfil foi carregado de{' '}
            <code className="rounded bg-black/20 px-1 py-0.5 text-[10px] text-zinc-300">
              public.dj_profiles
            </code>
            . As salas são gravadas em{' '}
            <code className="rounded bg-black/20 px-1 py-0.5 text-[10px] text-zinc-300">
              public.rooms
            </code>{' '}
            com isolamento por RLS. Os pedidos são autorizados no banco pelo proprietário da sala; aprovação não controla reprodução.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-white/8 bg-white/2 p-5">
            <p className="text-xs text-zinc-500">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-zinc-600">
              {stat.hint}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-2xl border border-white/8 bg-night-900/50 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Resumo das salas</h2>
              <p className="mt-1 text-xs text-zinc-500">
                {roomsStatus === 'ready'
                  ? `${rooms.length} ${rooms.length === 1 ? 'sala cadastrada' : 'salas cadastradas'}`
                  : roomsStatus === 'error'
                    ? 'Não foi possível carregar suas salas.'
                    : 'Carregando suas salas...'}
              </p>
            </div>
            <Link
              to="/dj/painel/salas"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-400"
            >
              Gerenciar salas
            </Link>
          </div>

          {roomsStatus === 'ready' && rooms.length > 0 ? (
            <ul className="mt-5 divide-y divide-white/6">
              {rooms.slice(0, 3).map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-3 py-3">
                  <span className="truncate text-sm text-zinc-200">{room.name}</span>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    {room.status === 'active' ? 'Ativa' : 'Pausada'}
                  </span>
                </li>
              ))}
              {rooms.length > 3 ? (
                <li className="pt-3 text-xs text-zinc-500">E mais {rooms.length - 3} salas.</li>
              ) : null}
            </ul>
          ) : null}

          {roomsStatus === 'error' ? (
            <div className="mt-4" role="alert">
              <p className="text-xs text-red-300">
                {roomsError ?? 'Não foi possível carregar suas salas.'}
              </p>
              <button
                type="button"
                onClick={reload}
                className="mt-3 min-h-10 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-200"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-white/8 bg-night-900/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">Próximos marcos</h2>
            <PlannedBadge label="Roadmap" />
          </div>

          <ul className="mt-5 space-y-3">
            {milestones.map((milestone) => (
              <li key={milestone.label} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${
                    milestone.done
                      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                      : 'border-white/10 bg-white/3 text-zinc-600'
                  }`}
                >
                  {milestone.done ? (
                    <CheckIcon className="size-3" strokeWidth={2.4} />
                  ) : (
                    <ClockIcon className="size-3" />
                  )}
                </span>
                <div>
                  <p
                    className={`text-xs leading-5 ${
                      milestone.done ? 'text-zinc-200' : 'text-zinc-500'
                    }`}
                  >
                    {milestone.label}
                  </p>
                  <p
                    className={`text-[9px] font-semibold uppercase tracking-[0.12em] ${
                      milestone.done ? 'text-emerald-400/80' : 'text-zinc-700'
                    }`}
                  >
                    {milestone.done ? 'Implementado' : 'Planejado'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <DjRequestsSection />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ListMusicIcon, label: 'Pedidos', description: 'Aprovação e fila em tempo real' },
          { icon: WalletIcon, label: 'Pagamentos', description: 'Pedidos gratuitos ou pagos' },
          { icon: QrCodeIcon, label: 'QR Code', description: 'Acesso rápido dos convidados' },
        ].map(({ icon: Icon, label, description }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/2 p-4"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/5 text-zinc-400">
              <Icon className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold text-zinc-300">{label}</p>
              <p className="mt-0.5 text-[11px] leading-5 text-zinc-600">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
