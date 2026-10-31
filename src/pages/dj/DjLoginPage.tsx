import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  LockIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
} from '../../components/Icons'

const highlights = [
  {
    icon: ShieldCheckIcon,
    title: 'Cada DJ no seu espaço',
    description: 'Contas independentes, com dados isolados por DJ desde a arquitetura.',
  },
  {
    icon: UsersIcon,
    title: 'Convidados sem atrito',
    description: 'Acesso por QR Code ou link, sem cadastro obrigatório para quem pede música.',
  },
]

export function DjLoginPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent-500/15 blur-[120px]"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
            <LockIcon className="size-3.5 text-accent-300" />
            Área do DJ
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl">
            Seu painel começa aqui.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
            Gerencie salas, pedidos e a experiência da sua festa em um só lugar. O acesso real
            será liberado quando a autenticação estiver implementada.
          </p>

          <div className="mt-8 space-y-4">
            {highlights.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-night-900 text-accent-300">
                  <Icon className="size-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-white">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3 text-xs leading-5 text-amber-200/80">
            <SparklesIcon className="mt-0.5 size-4 shrink-0 text-amber-300" />
            Autenticação com Supabase Auth planejada. Esta tela é apenas visual e não cria
            sessões nem valida credenciais.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 shadow-2xl shadow-black/40 sm:p-8">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Acesso do DJ</h2>
              <p className="mt-1 text-xs text-zinc-500">Entre com sua conta para gerenciar salas.</p>
            </div>
            <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              Somente visual
            </span>
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
            }}
          >
            <div>
              <label htmlFor="dj-email" className="text-xs font-medium text-zinc-300">
                E-mail
              </label>
              <input
                id="dj-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="voce@exemplo.com"
                className="mt-2 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent-400/50 focus:ring-2 focus:ring-accent-500/20"
              />
            </div>

            <div>
              <label htmlFor="dj-password" className="text-xs font-medium text-zinc-300">
                Senha
              </label>
              <input
                id="dj-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-2 w-full rounded-xl border border-white/10 bg-night-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent-400/50 focus:ring-2 focus:ring-accent-500/20"
              />
            </div>

            <button
              type="submit"
              disabled
              className="w-full cursor-not-allowed rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-zinc-500"
            >
              Entrar — em breve
            </button>

            <p className="text-center text-[11px] leading-5 text-zinc-600">
              A autenticação ainda não está implementada. Nenhuma credencial é enviada ou
              armazenada.
            </p>
          </form>

          <div className="my-6 h-px bg-white/8" />

          <Link
            to="/dj/painel"
            className="group flex items-center justify-between gap-3 rounded-xl border border-accent-400/20 bg-accent-500/10 px-4 py-3 text-sm font-semibold text-accent-200 transition hover:bg-accent-500/15"
          >
            Explorar o painel em modo de prévia
            <ArrowRightIcon className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}
