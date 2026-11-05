import { useCallback, useEffect, useRef, useState } from 'react'
import { createDjPresenceStore, type DjPresenceStore, type RoomPresenceSnapshot } from '../services/djPresenceStore'

interface DjRoomPresenceSectionProps {
  roomId: string
  store?: DjPresenceStore
}

export function DjRoomPresenceSection({ roomId, store: storeOverride }: DjRoomPresenceSectionProps) {
  const [store] = useState(() => storeOverride ?? createDjPresenceStore())
  const [snapshot, setSnapshot] = useState<RoomPresenceSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const requestActive = useRef(false)

  const reload = useCallback(async () => {
    if (requestActive.current) return
    requestActive.current = true
    setLoading(true)
    setError(null)
    try {
      setSnapshot(await store.listOnline(roomId))
    } catch {
      setError('Não foi possível carregar a presença da sala.')
    } finally {
      requestActive.current = false
      setLoading(false)
    }
  }, [roomId, store])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    const interval = window.setInterval(() => { void reload() }, 30_000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [reload])

  return <section aria-labelledby="online-guests-title" className="rounded-2xl border border-cyan-300/15 bg-night-900/50 p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/70">Presença</p>
        <h2 id="online-guests-title" className="mt-1 font-semibold text-white">
          Convidados online <span className="text-cyan-200">{loading && !snapshot ? '—' : snapshot?.count ?? 0}</span>
        </h2>
      </div>
      <button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50">Atualizar</button>
    </div>
    {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
    {loading && !snapshot ? <p role="status" className="mt-4 text-xs text-zinc-500">Carregando presença…</p>
      : snapshot?.guests.length ? <ul className="mt-4 divide-y divide-white/6">
        {snapshot.guests.map((guest, index) => <li key={`${guest.nickname}-${guest.lastSeenAt}-${index}`} className="flex items-center justify-between gap-3 py-2">
          <span className="truncate text-sm text-zinc-200">{guest.nickname}</span>
          <span className="shrink-0 text-[10px] text-emerald-300">Online</span>
        </li>)}
        {snapshot.count > snapshot.guests.length && <li className="pt-2 text-xs text-zinc-500">+{snapshot.count - snapshot.guests.length} outros convidados online</li>}
      </ul>
      : !error ? <p className="mt-4 text-xs text-zinc-500">Ninguém conectado no momento.</p> : null}
    <p className="mt-3 text-[10px] leading-4 text-zinc-600">A presença expira após 90 segundos sem atualização; apelidos não são verificados.</p>
  </section>
}
