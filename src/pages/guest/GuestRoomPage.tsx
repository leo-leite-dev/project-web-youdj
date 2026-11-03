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
import { searchGuestVideos, submitGuestRequest, type GuestRequestInput, type YoutubeVideo } from '../../features/guest/services/guestRequestApi'
import {
  createSupabasePublicRoomStore,
  type PublicRoomStore,
} from '../../features/rooms/services/publicRoomStore'

const LOAD_FALLBACK = 'Não foi possível carregar a sala. Verifique sua conexão e tente novamente.'

function GuestMusicRequests({ room }: { room: PublicRoom }) {
  const [query, setQuery] = useState('')
  const [videos, setVideos] = useState<YoutubeVideo[]>([])
  const [selected, setSelected] = useState<YoutubeVideo | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [searchUnavailable, setSearchUnavailable] = useState(false)

  async function search() {
    const normalized = query.trim().replace(/\s+/g, ' ')
    if (normalized.length < 2 || busy) return
    setBusy(true); setMessage('')
    try {
      const result = await searchGuestVideos(room.code, normalized)
      setSearchUnavailable(!result.available)
      setVideos(result.videos)
      setMessage(result.available ? (result.videos.length ? '' : 'Nenhum vídeo encontrado.') : 'Busca no YouTube ainda não configurada. Você pode enviar um pedido manual.')
    } catch (error) {
      setVideos([])
      setMessage(error instanceof Error ? error.message : 'Pesquisa temporariamente indisponível. O pedido manual continua disponível.')
    } finally { setBusy(false) }
  }

  async function send(input: GuestRequestInput) {
    if (busy) return
    setBusy(true); setMessage('')
    try {
      await submitGuestRequest(room.code, input)
      setSelected(null); setTitle(''); setArtist(''); setUrl(''); setVideos([])
      setMessage('Pedido recebido. Isso não garante aprovação ou reprodução pelo DJ.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o pedido. Tente novamente.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-6 space-y-5 border-t border-white/10 pt-6">
      <div>
        <h2 className="text-lg font-semibold text-white">Peça uma música</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-400">A confirmação indica somente o recebimento; o DJ decide se aprova ou reproduz.</p>
      </div>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void search() }}>
        <label className="sr-only" htmlFor="music-search">Pesquisar no YouTube</label>
        <input id="music-search" value={query} onChange={(event) => setQuery(event.target.value)} maxLength={100} placeholder="Título, artista ou música" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-night-950 px-3 text-sm text-white outline-none focus:border-accent-400" />
        <button disabled={busy || query.trim().length < 2} className="min-h-11 rounded-xl bg-accent-500 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Aguarde…' : 'Buscar vídeos'}</button>
      </form>
      {searchUnavailable && <p className="text-xs text-amber-200">A chave do YouTube ainda não foi configurada no servidor. O pedido manual funciona.</p>}
      {videos.length > 0 && <ul className="grid gap-3 sm:grid-cols-2">{videos.map((video) => <li key={video.videoId}>
        <button type="button" aria-pressed={selected?.videoId === video.videoId} onClick={() => setSelected(video)} className={`flex w-full gap-3 rounded-xl border p-2 text-left transition ${selected?.videoId === video.videoId ? 'border-accent-400 bg-accent-400/10' : 'border-white/10 bg-night-950/60 hover:border-white/20'}`}>
          <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-28 shrink-0 rounded-lg object-cover" />
          <span className="min-w-0"><span className="line-clamp-2 block text-sm font-medium text-white">{video.title}</span><span className="mt-1 block truncate text-xs text-zinc-400">{video.channel}</span></span>
        </button>
      </li>)}</ul>}
      {selected && <button type="button" disabled={busy} onClick={() => void send({ kind: 'youtube', video: selected })} className="min-h-11 w-full rounded-xl border border-accent-400/40 bg-accent-400/10 px-4 text-sm font-semibold text-accent-300 disabled:opacity-50">Enviar “{selected.title}”</button>}
      <details className="rounded-xl border border-white/10 bg-night-950/40 p-4">
        <summary className="cursor-pointer text-sm font-medium text-zinc-200">Não encontrou? Faça um pedido manual</summary>
        <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void send({ kind: 'manual', title, artist, url }) }}>
          <label className="block text-xs text-zinc-300">Título<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <label className="block text-xs text-zinc-300">Artista<input required maxLength={120} value={artist} onChange={(event) => setArtist(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <label className="block text-xs text-zinc-300">Link do YouTube (opcional)<input type="url" maxLength={500} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtu.be/..." className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <button disabled={busy} className="min-h-11 w-full rounded-xl bg-white px-4 text-sm font-semibold text-night-950 disabled:opacity-50">Enviar pedido manual</button>
        </form>
      </details>
      {message && <p role="status" aria-live="polite" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200">{message}</p>}
    </div>
  )
}

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
              Sala ativa. Envie uma sugestão musical para o DJ.
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

        {room.status === 'active' && <GuestMusicRequests room={room} />}

        <HomeLink />
        <p className="mt-3 text-center text-[11px] text-zinc-600">
          Peça ao DJ o link atualizado da sala.
        </p>
      </div>
    </section>
  )
}
