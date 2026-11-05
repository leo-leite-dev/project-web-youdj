import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  LinkOffIcon,
  MusicIcon,
} from '../../components/Icons'
import { isValidRoomCode, normalizeRoomCode } from '../../features/guest/lib/roomCode'
import { getRoomErrorMessage } from '../../features/rooms/lib/roomErrors'
import type { PublicRoom } from '../../features/rooms/roomTypes'
import { searchGuestVideos, submitGuestRequest, type GuestRequestInput, type YoutubeVideo } from '../../features/guest/services/guestRequestApi'
import {
  createSupabasePublicRoomStore,
  type PublicRoomStore,
} from '../../features/rooms/services/publicRoomStore'

const LOAD_FALLBACK = 'Não foi possível carregar a sala. Verifique sua conexão e tente novamente.'

function SynthwaveArtwork({ className = '' }: { className?: string }) {
  return (
    <img
      src="/guest-room-artwork.png"
      alt=""
      aria-hidden="true"
      className={`w-full rounded-2xl border border-fuchsia-400/20 object-cover ${className}`}
    />
  )
}

function GuestMusicRequests({ room }: { room: PublicRoom }) {
  const [query, setQuery] = useState('')
  const [videos, setVideos] = useState<YoutubeVideo[]>([])
  const [selected, setSelected] = useState<YoutubeVideo | null>(null)
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [url, setUrl] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [searching, setSearching] = useState(false)
  const [acceptedLegal, setAcceptedLegal] = useState(false)
  const [privateCode, setPrivateCode] = useState<string | null>(null)
  const searchSequence = useRef(0)
  const searchTimer = useRef<number | null>(null)

  const searchRef = useRef<(searchQuery: string) => Promise<void>>(async () => {})

  useEffect(() => {
    searchRef.current = async (searchQuery) => {
      const normalized = searchQuery.trim().replace(/\s+/g, ' ')
      if (normalized.length < 3 || busy || !acceptedLegal) return
      const sequence = ++searchSequence.current
      setBusy(true); setSearching(true); setMessage('')
      try {
        const result = await searchGuestVideos(room.code, normalized)
        if (sequence !== searchSequence.current) return
        setVideos(result.videos)
        setMessage(result.available ? (result.videos.length ? '' : 'Nenhum vídeo encontrado.') : 'Busca no YouTube ainda não configurada. Você pode enviar um pedido manual.')
      } catch (error) {
        if (sequence !== searchSequence.current) return
        setVideos([])
        setMessage(error instanceof Error ? error.message : 'Pesquisa temporariamente indisponível. O pedido manual continua disponível.')
      } finally { if (sequence === searchSequence.current) { setBusy(false); setSearching(false) } }
    }
  }, [acceptedLegal, busy, room.code])

  useEffect(() => {
    const normalized = query.trim().replace(/\s+/g, ' ')
    if (!acceptedLegal || normalized.length < 3) return
    searchTimer.current = window.setTimeout(() => { void searchRef.current(normalized) }, 600)
    return () => { if (searchTimer.current !== null) window.clearTimeout(searchTimer.current) }
  }, [query, acceptedLegal])

  async function send(input: GuestRequestInput) {
    if (busy || !acceptedLegal) return
    setBusy(true); setSearching(false); setMessage(''); setPrivateCode(null)
    try {
      const receipt = await submitGuestRequest(room.code, input, acceptedLegal)
      setPrivateCode(receipt.privateCode)
      setSelected(null); setTitle(''); setArtist(''); setUrl(''); setVideos([]); setQuery('')
      setMessage('Pedido recebido e aguardando decisão do DJ. Guarde o código abaixo para solicitar a exclusão. Aprovação não garante reprodução.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar o pedido. Tente novamente.')
    } finally { setBusy(false) }
  }

  const stage = privateCode ? 'receipt' : selected ? 'selection' : videos.length ? 'results' : 'entry'

  return (
    <div className="space-y-5">
      <SynthwaveArtwork className="h-44 sm:h-56" />
      {stage === 'entry' && <>
        <div className="rounded-2xl border border-cyan-300/20 bg-[#090b18]/95 p-4 shadow-[0_0_30px_rgba(217,70,239,0.1)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-fuchsia-300"><MusicIcon className="size-4" />Área do convidado</span>
            <span className="rounded-full border border-emerald-400/40 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300">{room.status === 'active' ? 'Ativa' : 'Pausada'}{room.status === 'active' && <span aria-hidden="true"> ●</span>}</span>
          </div>
          <h1 className="mt-4 font-mono text-2xl font-black text-cyan-300 sm:text-3xl">Sala {room.code}</h1>
          <p className="mt-1 text-xl font-bold text-white">{room.name}</p>
          <div aria-hidden="true" className="mt-4 flex h-7 items-end justify-center gap-1">{[9, 14, 20, 12, 24, 18, 26, 16, 22, 11, 25, 15, 20, 10].map((height, i) => <span key={i} className={`w-1.5 rounded-t-full ${i < 7 ? 'bg-cyan-400' : 'bg-fuchsia-500'}`} style={{ height }} />)}</div>
          {room.status === 'active' ? <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 text-sm leading-5 text-emerald-200">✓ &nbsp;Sala ativa. Envie uma sugestão musical para o DJ.</p> : <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">Sala indisponível: este evento está pausado no momento.</p>}
        </div>
      </>}

      {stage === 'results' && <div className="flex items-start justify-between gap-3 px-1 pt-2">
        <div><button type="button" onClick={() => { setVideos([]); setSelected(null); setMessage('') }} className="mb-3 inline-flex size-9 items-center justify-center rounded-full border border-cyan-300/50 text-cyan-200" aria-label="Voltar para a busca">←</button><h1 className="text-xl font-black text-white">Resultados da busca</h1><p className="mt-1 text-sm text-zinc-300">“{query.trim()}”</p></div>
        <div aria-hidden="true" className="mt-6 flex h-8 items-end gap-1">{[8, 18, 11, 26, 15, 22, 12].map((h, i) => <span key={i} className="w-1.5 bg-fuchsia-500" style={{ height: h }} />)}</div>
      </div>}

      {stage === 'selection' && selected && <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-cyan-200">← Voltar aos resultados</button>
        <h1 className="text-xl font-black text-white">Confirme seu pedido</h1>
        <article className="overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-[#090b18] shadow-[0_0_25px_rgba(217,70,239,0.12)]">
          <img src={selected.thumbnail} alt="" className="aspect-video max-h-52 w-full object-cover" />
          <div className="p-4"><p className="font-bold leading-5 text-white">{selected.title}</p><p className="mt-1 text-sm text-zinc-400">{selected.channel}</p><button type="button" disabled={busy || !acceptedLegal} onClick={() => void send({ kind: 'youtube', video: selected })} className="mt-4 min-h-12 w-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 px-4 text-sm font-black text-[#080914] disabled:opacity-50">{busy ? 'Enviando pedido…' : 'Enviar pedido ao DJ'}</button><p className="mt-3 text-center text-xs text-zinc-400">O pedido fica sujeito à decisão do DJ.</p></div>
        </article>
      </div>}

      {stage === 'receipt' && <section className="space-y-4 rounded-2xl border border-emerald-300/30 bg-[#090b18]/95 p-5 text-center">
        <span aria-hidden="true" className="mx-auto grid size-12 place-items-center rounded-full border border-emerald-300 text-2xl text-emerald-300">✓</span>
        <h1 className="text-xl font-black text-white">Pedido enviado ao DJ</h1>
        <p role="status" aria-live="polite" className="text-sm leading-6 text-emerald-200">{message}</p>
        <div className="break-all rounded-xl border border-cyan-300/20 bg-night-950 p-3 text-left"><p className="text-xs text-zinc-400">Comprovante privado — salve agora; ele não poderá ser recuperado depois.</p><code className="mt-2 block select-all font-mono text-xs text-cyan-200">{privateCode}</code><a className="mt-3 inline-flex min-h-11 items-center text-xs text-cyan-300 underline underline-offset-4" href={`mailto:leokerpassos.leite@gmail.com?subject=${encodeURIComponent('Solicitação de exclusão de pedido musical')}&body=${encodeURIComponent(`Código privado do pedido: ${privateCode}`)}`}>Solicitar exclusão por e-mail</a></div>
        <p className="text-xs text-zinc-400">A confirmação indica somente o recebimento; o DJ decide se aprova ou reproduz.</p>
      </section>}

      {stage === 'entry' && <section className="space-y-4 border-t border-cyan-300/20 pt-5">
        <div><h2 className="flex items-center gap-2 text-lg font-black text-white"><MusicIcon className="size-5 text-fuchsia-400" />Peça uma música</h2><p className="mt-1 text-xs leading-5 text-zinc-400">A confirmação indica somente o recebimento; o DJ decide se aprova ou reproduz.</p></div>
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-night-950/70 p-3 text-sm leading-6 text-zinc-300"><input type="checkbox" checked={acceptedLegal} onChange={(event) => { searchSequence.current += 1; setBusy(false); setSearching(false); setVideos([]); setSelected(null); setAcceptedLegal(event.target.checked) }} className="mt-1 size-4 shrink-0 accent-fuchsia-400" /><span>Li e aceito os <Link to="/termos-de-uso" className="font-semibold text-cyan-300 underline underline-offset-2">Termos de Uso</Link> e a <Link to="/privacidade" className="font-semibold text-cyan-300 underline underline-offset-2">Política de Privacidade</Link>.</span></label>
        <form className="flex gap-2 rounded-full border border-cyan-300/50 bg-night-950 p-1.5 focus-within:border-fuchsia-400" onSubmit={(event) => { event.preventDefault(); if (searchTimer.current !== null) window.clearTimeout(searchTimer.current); void searchRef.current(query) }}>
          <label className="sr-only" htmlFor="music-search">Pesquisar no YouTube</label><input id="music-search" value={query} onChange={(event) => { searchSequence.current += 1; setBusy(false); setSearching(false); setVideos([]); setMessage(''); setQuery(event.target.value); setSelected(null) }} maxLength={100} placeholder="Título, artista ou música" autoComplete="off" className="min-h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-white outline-none placeholder:text-zinc-400" />
          <button type="submit" aria-label="Buscar músicas" disabled={busy || !acceptedLegal || query.trim().length < 3} className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-lg font-black text-night-950 disabled:opacity-40">⌕</button>
        </form>
        {searching && <p role="status" aria-live="polite" className="text-xs text-zinc-400">Buscando vídeos…</p>}
        {message && !privateCode && <p role="status" aria-live="polite" className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-3 text-sm text-amber-100">{message}</p>}
      </section>}

      {stage === 'results' && <ul className="space-y-2">{videos.map((video) => <li key={video.videoId}><button type="button" aria-pressed={selected?.videoId === video.videoId} onClick={() => setSelected(video)} className="flex min-h-[94px] w-full items-center gap-3 rounded-2xl border border-cyan-300/20 bg-[#090b18]/95 p-2 text-left transition hover:border-fuchsia-400/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-400">
        <img src={video.thumbnail} alt="" loading="lazy" className="size-[76px] shrink-0 rounded-xl object-cover" /><span className="min-w-0 flex-1"><span className="line-clamp-2 block text-sm font-semibold leading-5 text-white">{video.title}</span><span className="mt-1 block truncate text-xs text-zinc-400">{video.channel}</span></span><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-fuchsia-400 text-sm text-fuchsia-300">▶</span>
      </button></li>)}</ul>}

      {(stage === 'entry' || stage === 'results') && <details className="rounded-2xl border border-cyan-300/25 bg-night-950/80 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-100">▶ &nbsp;Não encontrou? Faça um pedido manual</summary>
        <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); void send({ kind: 'manual', title, artist, url }) }}>
          <label className="block text-xs text-zinc-300">Título<input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <label className="block text-xs text-zinc-300">Artista<input required maxLength={120} value={artist} onChange={(event) => setArtist(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <label className="block text-xs text-zinc-300">Link do YouTube (opcional)<input type="url" maxLength={500} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://youtu.be/..." className="mt-1 min-h-11 w-full rounded-lg border border-white/10 bg-night-950 px-3 text-sm" /></label>
          <button disabled={busy || !acceptedLegal} className="min-h-11 w-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 px-4 text-sm font-bold text-night-950 disabled:opacity-50">Enviar pedido manual</button>
        </form>
      </details>}
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
      className="group mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 p-[2px] text-sm font-bold text-white shadow-[0_0_22px_rgba(217,70,239,0.18)] transition hover:shadow-[0_0_30px_rgba(34,211,238,0.28)]"
    >
      <span className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#080914] px-4">Voltar ao início<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
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
  return (
    <section className="relative mx-auto min-h-[calc(100svh-8rem)] w-full max-w-xl overflow-hidden px-4 py-5 sm:px-8 sm:py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-40 opacity-40" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent 0 34px, rgba(236,72,153,.45) 35px, transparent 36px), repeating-linear-gradient(0deg, transparent 0 22px, rgba(34,211,238,.28) 23px, transparent 24px), linear-gradient(to top, rgba(217,70,239,.2), transparent)' }} />
      <div className="relative mx-auto max-w-md rounded-[1.75rem] border border-cyan-300/20 bg-[#070914]/95 p-4 shadow-[0_0_40px_rgba(217,70,239,0.11)] sm:p-6">
        {room.status === 'active' ? <GuestMusicRequests room={room} /> : <div className="space-y-4 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-5 text-center"><SynthwaveArtwork className="h-36" /><span className="inline-flex rounded-full border border-amber-300/40 px-3 py-1 text-[9px] font-bold uppercase text-amber-200">Pausada</span><MusicIcon className="mx-auto size-8 text-amber-300" /><h1 className="text-xl font-bold text-white">Sala pausada</h1><p className="text-sm leading-6 text-amber-100">Sala indisponível: este evento está pausado no momento. Tente novamente mais tarde.</p><p className="font-mono text-sm text-cyan-200">{room.code} · {room.name}</p></div>}
        <HomeLink />
        <p className="mt-3 text-center text-[11px] text-zinc-500">Peça ao DJ o link atualizado da sala.</p>
      </div>
    </section>
  )
}
