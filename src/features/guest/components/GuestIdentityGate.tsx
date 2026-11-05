import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { PublicRoom } from '../../rooms/roomTypes'
import {
  createGuestIdentity,
  readGuestIdentity,
  saveGuestIdentity,
  type GuestIdentity,
} from '../services/guestIdentity'
import { createGuestPresenceStore, type GuestPresenceStore } from '../services/guestPresenceStore'

interface GuestIdentityGateProps {
  children: (
    identity: GuestIdentity,
    presenceOnline: boolean,
    presenceError: string | null,
    retryPresence: () => void,
    identityPersisted: boolean,
  ) => ReactNode
  room: PublicRoom
  store?: GuestPresenceStore
}

function normalizeStoredIdentity() {
  return readGuestIdentity()
}

export function GuestIdentityGate({ children, room, store: storeOverride }: GuestIdentityGateProps) {
  const [store] = useState(() => storeOverride ?? createGuestPresenceStore())
  const [identity, setIdentity] = useState<GuestIdentity | null>(normalizeStoredIdentity)
  const [identityPersisted, setIdentityPersisted] = useState(true)
  const [presenceOnline, setPresenceOnline] = useState(false)
  const [presenceError, setPresenceError] = useState<string | null>(null)
  const [retrySequence, setRetrySequence] = useState(0)

  useEffect(() => {
    if (!identity) return
    let mounted = true
    let requestActive = false

    const heartbeat = async () => {
      if (requestActive || document.visibilityState !== 'visible') return
      requestActive = true
      try {
        await store.heartbeat(room.code, identity)
        if (mounted) {
          setPresenceOnline(true)
          setPresenceError(null)
        }
      } catch (error) {
        if (mounted) {
          setPresenceOnline(false)
          setPresenceError(error instanceof Error ? error.message : 'Não foi possível atualizar sua presença.')
        }
      } finally {
        requestActive = false
      }
    }

    void heartbeat()
    const interval = window.setInterval(() => { void heartbeat() }, 30_000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void heartbeat()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      mounted = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [identity, retrySequence, room.code, store])

  function enter(nickname: string) {
    const nextIdentity = identity ?? createGuestIdentity(nickname)
    if (!nextIdentity) return false
    if (!identity) setIdentityPersisted(saveGuestIdentity(nextIdentity))
    setPresenceOnline(false)
    setPresenceError(null)
    setIdentity(nextIdentity)
    return true
  }

  if (!identity) return <GuestIdentityPrompt room={room} onEnter={enter} />

  return children(
    identity,
    presenceOnline,
    presenceError,
    () => setRetrySequence((sequence) => sequence + 1),
    identityPersisted,
  )
}

function GuestIdentityPrompt({ room, onEnter }: { room: PublicRoom; onEnter: (nickname: string) => boolean }) {
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!onEnter(nickname)) {
      setError('Informe um nome ou apelido com até 40 caracteres.')
      return
    }
    setError(null)
  }

  return <div className="space-y-5">
    <div className="rounded-2xl border border-cyan-300/20 bg-[#090b18]/95 p-4 shadow-[0_0_30px_rgba(217,70,239,0.1)] sm:p-6">
      <span className="inline-flex items-center rounded-full border border-emerald-400/40 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-emerald-300">Sala ativa</span>
       <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">Sala <span className="text-cyan-300">{room.name}</span></h1>
       <p className="mt-1 text-sm font-medium text-cyan-200">DJ: {room.djName}</p>
      <p className="mt-1 text-sm text-zinc-400">Código: <span className="font-mono tracking-wider text-cyan-300">{room.code}</span></p>
      <div aria-hidden="true" className="mt-4 flex h-7 items-end justify-center gap-1">{[9, 14, 20, 12, 24, 18, 26, 16, 22, 11, 25, 15, 20, 10].map((height, index) => <span key={index} className={`w-1.5 rounded-t-full ${index < 7 ? 'bg-cyan-400' : 'bg-fuchsia-500'}`} style={{ height }} />)}</div>
    </div>

    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-fuchsia-400/25 bg-[#090b18]/95 p-4 sm:p-6">
      <div>
        <h2 className="text-lg font-black text-white">Como podemos chamar você?</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-400">Use seu nome ou um apelido. Não pedimos conta, e-mail nem senha.</p>
      </div>
      <label htmlFor="guest-nickname" className="block text-xs font-medium text-zinc-300">
        Nome ou apelido
        <input
          id="guest-nickname"
          name="nickname"
          type="text"
          required
          maxLength={40}
          autoComplete="nickname"
          value={nickname}
          onChange={(event) => { setNickname(event.target.value); setError(null) }}
          className="mt-1 min-h-12 w-full rounded-xl border border-cyan-300/20 bg-night-950 px-3 text-sm text-white outline-none focus-visible:border-fuchsia-400"
        />
      </label>
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <p className="text-[11px] leading-5 text-zinc-500">
        O apelido será salvo neste navegador, mostrado ao DJ junto aos seus pedidos e usado para
        indicar presença. Ele não é verificado e não comprova sua identidade. Consulte os{' '}
        <Link to="/termos-de-uso" className="text-cyan-300 underline">Termos de Uso</Link> e a{' '}
        <Link to="/privacidade" className="text-cyan-300 underline">Política de Privacidade</Link>.
      </p>
      <button type="submit" className="min-h-12 w-full rounded-full bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-pink-500 px-4 text-sm font-black text-[#080914]">
        Entrar na sala
      </button>
    </form>
  </div>
}
