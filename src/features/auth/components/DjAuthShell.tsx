import type { ReactNode } from 'react'
import { LockIcon, ShieldCheckIcon, UsersIcon } from '../../../components/Icons'

const highlights = [
  {
    icon: ShieldCheckIcon,
    title: 'Cada DJ no seu espaço',
    description: 'Perfis isolados por DJ no banco; os demais dados virão nas próximas etapas.',
  },
  {
    icon: UsersIcon,
    title: 'Convidados sem atrito',
    description: 'A experiência planejada permitirá acesso por QR Code ou link, sem cadastro.',
  },
]

interface DjAuthShellProps {
  children: ReactNode
  panelDescription: string
  panelTitle: string
}

export function DjAuthShell({
  children,
  panelDescription,
  panelTitle,
}: DjAuthShellProps) {
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
            Entre na sua conta para preparar as próximas festas. Salas, pedidos e histórico serão
            adicionados nas etapas seguintes, sempre isolados por DJ.
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

          <p className="mt-8 flex items-start gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3 text-xs leading-5 text-emerald-200/80">
            <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            Autenticação conectada ao Supabase Auth. A sessão é validada pelo serviço e o perfil
            do DJ é protegido por RLS no banco.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 shadow-2xl shadow-black/40 sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-white">{panelTitle}</h2>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{panelDescription}</p>
          </div>
          {children}
        </div>
      </div>
    </section>
  )
}
