import { Link, useParams } from 'react-router-dom'
import {
  ArrowRightIcon,
  ClockIcon,
  LinkOffIcon,
  ListMusicIcon,
  MusicIcon,
  QrCodeIcon,
} from '../../components/Icons'
import { normalizeRoomCode, isValidRoomCode } from '../../features/guest/lib/roomCode'

const comingSoonItems = [
  {
    icon: QrCodeIcon,
    title: 'Identificação da sala',
    description: 'A sala será carregada a partir do código informado no link.',
  },
  {
    icon: ListMusicIcon,
    title: 'Catálogo e pedidos',
    description: 'Você poderá buscar músicas e enviar pedidos sem criar uma conta.',
  },
  {
    icon: ClockIcon,
    title: 'Acompanhamento da fila',
    description: 'O status do pedido será atualizado em tempo real nesta tela.',
  },
]

export function GuestRoomPage() {
  const { roomCode } = useParams()
  const normalizedCode = normalizeRoomCode(roomCode)
  const validCode = isValidRoomCode(normalizedCode)

  if (!validCode) {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="rounded-3xl border border-red-400/20 bg-red-400/5 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
            <LinkOffIcon className="size-6" />
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/80">
            Acesso por link
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Link inválido
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            O código da sala deve ter 6 letras ou números. Confira o link ou o QR Code recebido
            e tente novamente.
          </p>

          <div className="mt-6 rounded-xl border border-white/8 bg-night-950/60 px-4 py-3 text-left">
            <p className="text-[10px] uppercase tracking-[0.14em] text-zinc-600">
              Código recebido
            </p>
            <p className="mt-1 truncate font-mono text-sm text-zinc-300">
              {roomCode ? roomCode : 'Nenhum código informado'}
            </p>
          </div>

          <Link
            to="/"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
          >
            Voltar ao início
          </Link>
          <p className="mt-3 text-[11px] text-zinc-600">
            Peça ao DJ o link atualizado da sala.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <MusicIcon className="size-3.5 text-accent-300" />
            Área do convidado
          </span>
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-amber-300">
            Em construção
          </span>
        </div>

        <h1 className="mt-6 break-all font-mono text-2xl font-bold tracking-[0.18em] text-white sm:text-3xl">
          Sala {normalizedCode}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          O formato deste link é válido, mas a sala ainda não está conectada a um banco de dados
          nesta versão. A busca e o envio de pedidos serão liberados em uma próxima etapa.
        </p>

        <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3">
          <p className="text-xs leading-5 text-amber-200/80">
            Nenhum dado de evento foi consultado. Este link é apenas uma demonstração da rota de
            acesso dos convidados.
          </p>
        </div>

        <div className="mt-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            O que virá aqui
          </p>
          <ul className="mt-3 space-y-3">
            {comingSoonItems.map(({ icon: Icon, title, description }) => (
              <li
                key={title}
                className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/2 p-3"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{title}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-zinc-500">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/"
          className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
        >
          Voltar ao início
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Pedidos por QR Code, sem cadastro obrigatório.
        </p>
      </div>
    </section>
  )
}
