import { useCallback, useEffect, useState } from 'react'
import { createDjRequestStore, type DjRequest, type DjRequestStore } from '../services/djRequestStore'

interface DjRequestsSectionProps {
  store?: DjRequestStore
}

interface RequestListProps {
  items: DjRequest[]
  busyId: string | null
  actions: boolean
  onStatusChange: (requestId: string, status: 'approved' | 'rejected') => void
}

function RequestList({ items, actions, busyId, onStatusChange }: RequestListProps) {
  if (items.length === 0) return <p className="mt-4 text-sm text-zinc-500">Nenhum pedido nesta seção.</p>
  return <ul className="mt-4 space-y-3">{items.map((request) => <li key={request.id} className="flex flex-col gap-3 rounded-xl border border-white/8 bg-night-950/60 p-3 sm:flex-row sm:items-center">
    {request.videoId && <img src={`https://i.ytimg.com/vi/${request.videoId}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-full rounded-lg object-cover sm:w-32" />}
    <div className="min-w-0 flex-1"><p className="font-medium text-white">{request.title}</p><p className="mt-1 text-xs text-zinc-400">{request.artist} · {request.roomName}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">{request.requestSource === 'musicbrainz' ? 'Catálogo MusicBrainz' : request.requestSource === 'youtube' ? 'Referência do YouTube' : 'Pedido manual'}</p>
      {request.videoId && <a href={`https://www.youtube.com/watch?v=${request.videoId}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent-300 underline">Abrir vídeo no YouTube</a>}
      {!request.videoId && request.submittedUrl && <a href={request.submittedUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent-300 underline">Link enviado pelo convidado</a>}
      {request.requestSource === 'musicbrainz' && request.recordingMbid && <a href={`https://musicbrainz.org/recording/${request.recordingMbid}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-accent-300 underline">Metadados MusicBrainz (sem áudio)</a>}
    </div>
    {actions ? <div className="flex shrink-0 gap-2"><button type="button" disabled={busyId === request.id} onClick={() => onStatusChange(request.id, 'approved')} className="min-h-11 flex-1 rounded-lg bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-200 disabled:opacity-50">Aprovar</button><button type="button" disabled={busyId === request.id} onClick={() => onStatusChange(request.id, 'rejected')} className="min-h-11 flex-1 rounded-lg bg-red-400/10 px-3 text-xs font-semibold text-red-200 disabled:opacity-50">Rejeitar</button></div> : <span className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Aprovado · fora da playlist</span>}
  </li>)}</ul>
}

export function DjRequestsSection({ store: storeOverride }: DjRequestsSectionProps) {
  const [store] = useState(() => storeOverride ?? createDjRequestStore())
  const [requests, setRequests] = useState<DjRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { setRequests(await store.list()) }
    catch { setError('Não foi possível carregar os pedidos. Verifique sua conexão e tente novamente.') }
    finally { setLoading(false) }
  }, [store])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  async function updateStatus(requestId: string, status: 'approved' | 'rejected') {
    setBusyId(requestId)
    setError(null)
    setMessage(null)
    try {
      await store.setStatus(requestId, status)
      setRequests((current) => current.map((request) => request.id === requestId ? { ...request, status } : request))
      setMessage(status === 'approved' ? 'Pedido aprovado.' : 'Pedido rejeitado.')
    } catch (cause) {
      await reload()
      setError(cause instanceof Error ? cause.message : 'Não foi possível atualizar o pedido.')
    } finally { setBusyId(null) }
  }

  const pending = requests.filter((request) => request.status === 'pending')
  const approved = requests.filter((request) => request.status === 'approved')

  return <section aria-labelledby="requests-title" className="mt-6 rounded-2xl border border-white/8 bg-night-900/50 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="requests-title" className="font-semibold text-white">Pedidos</h2><p className="mt-1 text-xs text-zinc-500">Aprovar um pedido não adiciona à playlist nem inicia reprodução.</p></div><button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50">Atualizar</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-200">{message}</p>}
    {loading ? <p role="status" className="mt-4 text-sm text-zinc-400">Carregando pedidos…</p> : <>
      <h3 className="mt-5 text-sm font-semibold text-white">Pedidos pendentes <span className="text-accent-300">({pending.length})</span></h3><RequestList items={pending} busyId={busyId} onStatusChange={(id, status) => void updateStatus(id, status)} actions />
      <h3 className="mt-6 border-t border-white/8 pt-5 text-sm font-semibold text-white">Aprovados <span className="text-emerald-200">({approved.length})</span></h3><RequestList items={approved} busyId={busyId} onStatusChange={(id, status) => void updateStatus(id, status)} actions={false} />
    </>}
  </section>
}
