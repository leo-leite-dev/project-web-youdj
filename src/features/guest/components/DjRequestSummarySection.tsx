import { useCallback, useEffect, useState } from 'react'
import { createDjRequestStore, type DjRequestStore, type DjRequestSummary } from '../services/djRequestStore'

interface DjRequestSummarySectionProps {
  store?: DjRequestStore
}

const EMPTY_SUMMARY: DjRequestSummary = { pending: 0, approved: 0, rejected: 0 }

export function DjRequestSummarySection({ store: storeOverride }: DjRequestSummarySectionProps) {
  const [store] = useState(() => storeOverride ?? createDjRequestStore())
  const [summary, setSummary] = useState<DjRequestSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setSummary(await store.summary())
    } catch {
      setError('Não foi possível carregar o resumo de pedidos.')
    } finally {
      setLoading(false)
    }
  }, [store])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const counts = summary ?? EMPTY_SUMMARY
  return <section aria-labelledby="request-summary-title" className="mt-6 rounded-2xl border border-white/8 bg-night-900/50 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="request-summary-title" className="font-semibold text-white">Resumo de pedidos</h2>
        <p className="mt-1 text-xs text-zinc-500">Últimos 30 dias · detalhes ficam na página de cada sala.</p>
      </div>
      <button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50">Atualizar</button>
    </div>
    {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
    <div className="mt-4 grid grid-cols-3 gap-2">
      {[
        { label: 'Pendentes', count: counts.pending, className: 'text-accent-200' },
        { label: 'Aprovados', count: counts.approved, className: 'text-emerald-200' },
        { label: 'Rejeitados', count: counts.rejected, className: 'text-red-200' },
      ].map((item) => <div key={item.label} className="rounded-xl border border-white/6 bg-night-950/60 px-3 py-3">
        <p className="text-[10px] text-zinc-500">{item.label}</p>
        <p className={`mt-1 text-xl font-bold ${item.className}`}>{loading && !summary ? '—' : item.count}</p>
      </div>)}
    </div>
  </section>
}
