import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  CheckIcon,
  ListMusicIcon,
  MusicIcon,
  QrCodeIcon,
  RadioIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  WalletIcon,
} from '../components/Icons'
import { PlannedBadge } from '../components/PlannedBadge'

const features = [
  {
    icon: QrCodeIcon,
    title: 'Pedidos por QR Code',
    description:
      'Cada sala tem um link e um QR Code próprios. O convidado entra, escolhe a música e não precisa criar conta.',
  },
  {
    icon: ListMusicIcon,
    title: 'Fila livre ou aprovação',
    description:
      'O DJ decide o ritmo da festa: libera a fila automática ou revisa cada pedido antes de colocá-lo na lista.',
  },
  {
    icon: WalletIcon,
    title: 'Grátis ou pago',
    description:
      'Prepare a sala para pedidos gratuitos ou para cobranças futuras, com histórico organizado por evento.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Crie a sala',
    description: 'Configure o evento, o modo de aprovação e as regras de pedidos.',
  },
  {
    number: '02',
    title: 'Compartilhe o QR Code',
    description: 'Convidados acessam pelo celular, sem cadastro obrigatório.',
  },
  {
    number: '03',
    title: 'Controle a fila',
    description: 'Aprove, organize e acompanhe os pedidos em tempo real.',
  },
]

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-accent-500/20 blur-[140px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/3 h-72 w-72 rounded-full bg-neon-400/10 blur-[120px]"
        />

        <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-10 lg:pb-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent-400 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-accent-400" />
              </span>
              Plataforma para DJs e festas
            </span>

            <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              A fila da festa,{' '}
              <span className="bg-linear-to-r from-accent-300 via-accent-400 to-neon-400 bg-clip-text text-transparent">
                na palma da mão.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-zinc-400 sm:text-lg sm:leading-8">
              O DJ IA organiza pedidos musicais por QR Code. O DJ cria a sala, os convidados
              escolhem as músicas e a festa segue no ritmo certo — sem cadastro e sem bagunça.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dj"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition hover:brightness-110"
              >
                Acessar área do DJ
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#como-funciona"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/3 px-5 py-3.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/8"
              >
                Ver como funciona
              </a>
            </div>

            <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-zinc-600">
              <SparklesIcon className="mt-0.5 size-4 shrink-0 text-accent-400" />
              Autenticação de DJs já está ativa com Supabase Auth. Salas, pedidos, pagamentos e
              integrações musicais serão implementados nas próximas etapas.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-sm">
            <div
              aria-hidden="true"
              className="absolute -inset-8 rounded-[3rem] bg-accent-500/10 blur-2xl"
            />
            <div className="relative rounded-[2.25rem] border border-white/12 bg-night-900 p-2.5 shadow-2xl shadow-black/60">
              <div className="rounded-[1.75rem] border border-white/8 bg-night-950 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Sala do evento
                  </span>
                  <span className="rounded-full border border-accent-400/20 bg-accent-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-300">
                    Prévia
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-accent-500/15 text-accent-300">
                    <QrCodeIcon className="size-5" />
                  </span>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                      Código da sala
                    </p>
                    <p className="font-mono text-lg font-bold tracking-[0.28em] text-white">
                      A1B2C3D4E5
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-neon-400/20 bg-neon-400/5 p-4">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-neon-400">
                    <RadioIcon className="size-3.5" />
                    Tocando agora
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-xl bg-linear-to-br from-accent-500/50 to-neon-400/20">
                      <MusicIcon className="size-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Faixa em reprodução</p>
                      <p className="text-xs text-zinc-500">Conteúdo ilustrativo</p>
                    </div>
                  </div>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full w-2/3 rounded-full bg-linear-to-r from-accent-400 to-neon-400" />
                  </div>
                </div>

                <div className="mt-5 space-y-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Próximos pedidos
                  </p>
                  <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <span className="text-xs text-zinc-300">Pedido da mesa 04</span>
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
                      Em aprovação
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-3 py-2.5">
                    <span className="text-xs text-zinc-300">Pedido da mesa 12</span>
                    <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent-300">
                      Na fila
                    </span>
                  </div>
                </div>

                <p className="mt-5 rounded-lg bg-white/3 px-3 py-2 text-center text-[10px] text-zinc-600">
                  Prévia visual. Nenhum dado real é exibido.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y border-white/8 bg-night-900/40">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
              Como funciona
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Do QR Code na mesa ao pedido na fila.
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              O fluxo foi desenhado para ser simples para o convidado e totalmente controlável
              para o DJ.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <div
                key={step.number}
                className="rounded-2xl border border-white/8 bg-night-950/60 p-6"
              >
                <span className="font-mono text-xs font-semibold text-accent-400">
                  {step.number}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{step.description}</p>
                <PlannedBadge className="mt-5" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
              O que está sendo construído
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Uma base para cada DJ, uma festa por vez.
            </h2>
          </div>
          <PlannedBadge label="Roadmap inicial" />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/8 bg-white/2 p-6 transition hover:border-accent-400/30 hover:bg-accent-500/5"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-white/10 bg-night-900 text-accent-300">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/2 p-5">
            <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-300" />
            <div>
              <h3 className="text-sm font-semibold text-white">Isolamento por DJ</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                A arquitetura multi-tenant já protege o perfil de cada DJ com RLS, para que cada
                conta acesse apenas os próprios dados.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/2 p-5">
            <UsersIcon className="mt-0.5 size-5 shrink-0 text-neon-400" />
            <div>
              <h3 className="text-sm font-semibold text-white">Convidados sem cadastro</h3>
              <p className="mt-1 text-xs leading-5 text-zinc-400">
                O acesso será por link ou QR Code. Identidades anônimas serão usadas para
                controlar solicitações com segurança.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-br from-accent-500/15 via-night-900 to-night-950 p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent-500/20 blur-[100px]"
          />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-300">
              <CheckIcon className="size-4" />
              Fundação pronta para evoluir
            </span>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Pronto para colocar a festa em ordem?
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              Explore a prévia da área do DJ e acompanhe a evolução incremental da plataforma.
              Nenhum pagamento ou cadastro é necessário nesta etapa.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/dj"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
              >
                Entrar na área do DJ
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mt-4 text-center text-[11px] leading-5 text-zinc-500 sm:text-left">
              Convidados acessam salas reais pelo link ou QR Code compartilhado pelo DJ.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
