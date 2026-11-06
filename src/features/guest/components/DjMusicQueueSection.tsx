import { useCallback, useEffect, useState } from 'react'
import { getRoomErrorMessage } from '../../rooms/lib/roomErrors'
import { createDjMusicQueueStore, type DjMusicQueueStore, type QueueTrack } from '../services/djMusicQueueStore'

export function DjMusicQueueSection({ roomId, store: override }: { roomId: string; store?: DjMusicQueueStore }) {
  const [store] = useState(() => override ?? createDjMusicQueueStore())
  const [tracks, setTracks] = useState<QueueTrack[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const reload = useCallback(async () => {
    setLoading(true); setError(null)
    try { setTracks(await store.listByRoom(roomId)); setLoaded(true) }
    catch (cause) { setError(getRoomErrorMessage(cause, 'Não foi possível carregar a fila. Tente novamente.')) }
    finally { setLoading(false) }
  }, [roomId, store])
  useEffect(() => { const timer = window.setTimeout(() => { void reload() }, 0); return () => window.clearTimeout(timer) }, [reload])

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= tracks.length) return
    const next = [...tracks]; [next[index], next[target]] = [next[target], next[index]]
    setBusy(true); setError(null)
    try { await store.reorder(roomId, next.map((track) => track.requestId)); setTracks(next) }
    catch (cause) { setError(getRoomErrorMessage(cause, 'Não foi possível reordenar a fila.')); await reload() }
    finally { setBusy(false) }
  }
  async function remove(requestId: string) {
    setBusy(true); setError(null)
    try { await store.remove(roomId, requestId); setTracks((items) => items.filter((item) => item.requestId !== requestId)) }
    catch (cause) { setError(getRoomErrorMessage(cause, 'Não foi possível remover a música.')); await reload() }
    finally { setBusy(false) }
  }

  return <section aria-labelledby="queue-heading" className="rounded-2xl border border-fuchsia-300/15 bg-night-900/60 p-5 shadow-[0_0_30px_rgba(217,70,239,0.06)] sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="queue-heading" className="font-semibold text-white">Fila da sala</h2><p className="mt-1 text-xs text-zinc-400">Aprovações entram no final. A reprodução não é iniciada nesta etapa.</p></div><button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-cyan-300/20 px-3 text-xs font-semibold text-cyan-100 disabled:opacity-50">Atualizar</button></div>
    {error && <div role="alert" className="mt-4 text-sm text-red-300">{error} <button type="button" onClick={() => void reload()} className="underline">Tentar novamente</button></div>}
    {loading && !loaded ? <p role="status" className="mt-4 text-sm text-zinc-400">Carregando fila…</p> : loaded && tracks.length === 0 ? <p className="mt-5 rounded-xl border border-white/5 p-5 text-sm text-zinc-500">A fila está vazia. Pedidos aprovados aparecerão aqui.</p> : <ol className="mt-5 space-y-3">{tracks.map((track, index) => <li key={track.requestId} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-night-950/70 p-3">
      <span className="w-7 font-mono text-sm text-fuchsia-200">{String(index + 1).padStart(2, '0')}</span>{track.videoId && <img src={`https://i.ytimg.com/vi/${track.videoId}/mqdefault.jpg`} alt="" className="h-14 w-24 rounded-md object-cover" loading="lazy"/>}
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{track.title}</p><p className="mt-1 text-xs text-zinc-400">{track.artist} · {track.guestName}</p></div>
      <div className="flex gap-1"><button type="button" aria-label={`Mover ${track.title} para cima`} disabled={busy || index === 0} onClick={() => void move(index, -1)} className="min-h-10 min-w-10 rounded-lg border border-white/10 text-cyan-100 disabled:opacity-30">↑</button><button type="button" aria-label={`Mover ${track.title} para baixo`} disabled={busy || index === tracks.length - 1} onClick={() => void move(index, 1)} className="min-h-10 min-w-10 rounded-lg border border-white/10 text-cyan-100 disabled:opacity-30">↓</button><button type="button" disabled={busy} onClick={() => void remove(track.requestId)} className="min-h-10 rounded-lg border border-red-300/15 px-3 text-xs text-red-200 disabled:opacity-50">Remover</button></div>
    </li>)}</ol>}
    <p className="mt-5 border-t border-white/8 pt-4 text-xs text-zinc-500">Player não disponível nesta etapa.</p>
  </section>
}
