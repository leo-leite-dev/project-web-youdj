import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  LinkOffIcon,
  MusicIcon,
} from '../../components/Icons'
import { isValidRoomCode, normalizeRoomCode } from '../../features/guest/lib/roomCode'
import { getRoomErrorMessage } from '../../features/rooms/lib/roomErrors'
import { ROOM_STATUS_STYLES } from '../../features/rooms/lib/roomStatus'
import type { PublicRoom } from '../../features/rooms/roomTypes'
import {
  createSupabasePublicRoomStore,
  type PublicRoomStore,
} from '../../features/rooms/services/publicRoomStore'

const LOAD_FALLBACK = 'Não foi possível carregar a sala. Verifique sua conexão e tente novamente.'

type GuestResult =
  | { attempt: number; code: string; kind: 'found'; room: PublicRoom }
  | { attempt: number; code: string; kind: 'notFound' }
  | { attempt: number; code: string; kind: 'error'; error: unknown }

interface StoreState {
  error: unknown
  store: PublicRoomStore | null
}

interface GuestRoomPageProps {
  store?: PublicRoomStore
}

function HomeLink() {
  return (
    <Link
      to="/"
      className="group mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
    >
      Voltar ao início
      <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

export function GuestRoomPage({ store: storeOverride }: GuestRoomPageProps) {
  const { roomCode } = useParams()
  const code = normalizeRoomCode(roomCode)
  const valid = isValidRoomCode(code)

  const [storeState] = useState<StoreState>(() => {
    if (storeOverride) {
      return { error: null, store: storeOverride }
    }

    try {
      return { error: null, store: createSupabasePublicRoomStore() }
    } catch (error) {
      return { error, store: null }
    }
  })
  const [result, setResult] = useState<GuestResult | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!valid || !storeState.store) {
      return
    }

    let active = true

    storeState.store
      .findByCode(code)
      .then((room) => {
        if (active) {
          setResult(
            room
              ? { attempt, code, kind: 'found', room }
              : { attempt, code, kind: 'notFound' },
          )
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setResult({ attempt, code, kind: 'error', error })
        }
      })

    return () => {
      active = false
    }
  }, [attempt, code, storeState, valid])

  if (!valid) {
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
            O código da sala deve ter 10 letras ou números. Confira o link ou o QR Code recebido
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

          <HomeLink />
          <p className="mt-3 text-[11px] text-zinc-600">
            Peça ao DJ o link atualizado da sala.
          </p>
        </div>
      </section>
    )
  }

  if (!storeState.store) {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
            <AlertTriangleIcon className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Sala indisponível
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {getRoomErrorMessage(storeState.error, LOAD_FALLBACK)}
          </p>
          <HomeLink />
        </div>
      </section>
    )
  }

  const current =
    result && result.code === code && result.attempt === attempt ? result : null

  if (!current) {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <div
          role="status"
          className="flex flex-col items-center rounded-3xl border border-white/10 bg-night-900/70 px-6 py-12 text-center"
        >
          <span
            aria-hidden="true"
            className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-400"
          />
          <p className="mt-4 text-sm leading-6 text-zinc-400">Carregando sala...</p>
        </div>
      </section>
    )
  }

  if (current.kind === 'error') {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
            <AlertTriangleIcon className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-white">
            Não foi possível carregar
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {getRoomErrorMessage(current.error, LOAD_FALLBACK)}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-night-950 transition hover:bg-accent-300"
          >
            Tentar novamente
          </button>
          <div className="mt-3">
            <HomeLink />
          </div>
        </div>
      </section>
    )
  }

  if (current.kind === 'notFound') {
    return (
      <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-16 sm:px-8">
        <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 text-center sm:p-8">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400">
            <LinkOffIcon className="size-6" />
          </span>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Acesso por link
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Sala não encontrada
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Este código não corresponde a nenhuma sala. Confira o link ou o QR Code recebido
            com o DJ.
          </p>
          <p className="mt-4 font-mono text-sm tracking-[0.18em] text-zinc-500">{code}</p>
          <HomeLink />
        </div>
      </section>
    )
  }

  const { room } = current
  const style = ROOM_STATUS_STYLES[room.status]

  return (
    <section className="mx-auto flex min-h-[calc(100svh-10rem)] w-full max-w-xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16">
      <div className="rounded-3xl border border-white/10 bg-night-900/70 p-6 shadow-2xl shadow-black/30 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
            <MusicIcon className="size-3.5 text-accent-300" />
            Área do convidado
          </span>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] ${style.className}`}
          >
            {style.label}
          </span>
        </div>

        <h1 className="mt-6 break-all font-mono text-2xl font-bold tracking-[0.18em] text-white sm:text-3xl">
          Sala {room.code}
        </h1>
        <p className="mt-4 text-xl font-semibold text-white sm:text-2xl">{room.name}</p>

        {room.status === 'active' ? (
          <div className="mt-5 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
            <p className="text-xs leading-5 text-emerald-200/90">
              Sala ativa. A busca e o envio de pedidos musicais estarão disponíveis em breve.
            </p>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-400/15 bg-amber-400/5 px-4 py-3">
            <p className="text-xs leading-5 text-amber-200/80">
              Sala indisponível: este evento está pausado no momento. Tente novamente mais
              tarde.
            </p>
          </div>
        )}

        <HomeLink />
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Peça ao DJ o link atualizado da sala.
        </p>
      </div>
    </section>
  )
}
