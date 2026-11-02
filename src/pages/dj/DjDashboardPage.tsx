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

const stats = [
  { label: 'Salas ativas', value: '—', hint: 'Aguardando integração' },
  { label: 'Pedidos hoje', value: '—', hint: 'Aguardando integração' },
  { label: 'Receita do evento', value: '—', hint: 'Pagamentos planejados' },
]

const milestones = [
  { label: 'Fundação visual, rotas e testes', done: true },
  { label: 'Autenticação com Supabase Auth', done: true },
  { label: 'Salas, QR Code e links de convidados', done: false },
  { label: 'Pedidos em tempo real com Supabase Realtime', done: false },
  { label: 'Pagamentos, histórico e relatórios', done: false },
  { label: 'Player integrado com YouTube IFrame API', done: false },
]

export function DjDashboardPage() {
  const { profile, user } = useAuth()

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
            Painel do DJ
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Visão geral
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Olá, {profile?.displayName ?? 'DJ'}. Sua conta está autenticada como{' '}
            {user?.email ?? 'DJ'}. As demais ações serão liberadas quando as integrações forem
            implementadas.
          </p>
        </div>
        <button
          type="button"
          disabled
          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-500"
        >
          <QrCodeIcon className="size-4" />
          Nova sala — em breve
        </button>
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
            </code>{' '}
            com isolamento por RLS. Nenhum pedido, sala ou pagamento é criado nesta etapa.
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">Suas salas</h2>
              <p className="mt-1 text-xs text-zinc-500">Eventos e links de convidados.</p>
            </div>
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
              Nenhuma
            </span>
          </div>

          <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-accent-500/10 text-accent-300">
              <QrCodeIcon className="size-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-white">Nenhuma sala criada</h3>
            <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
              A criação de salas com QR Code e link para convidados será liberada em uma próxima
              etapa.
            </p>
            <button
              type="button"
              disabled
              className="mt-5 cursor-not-allowed rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-500"
            >
              Criar primeira sala — em breve
            </button>
          </div>
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
