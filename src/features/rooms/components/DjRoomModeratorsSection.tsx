import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getRoomErrorMessage } from '../lib/roomErrors'
import type { DjRoomManagementStore, RoomModerator } from '../services/djRoomManagementStore'

export function DjRoomModeratorsSection({ roomId, store }: { roomId: string; store: DjRoomManagementStore }) {
  const [moderators, setModerators] = useState<RoomModerator[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setModerators(await store.listModerators(roomId))
    } catch (cause) {
      setError(getRoomErrorMessage(cause, 'Não foi possível carregar os moderadores desta sala.'))
    } finally {
      setLoading(false)
    }
  }, [roomId, store])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const added = await store.inviteModerator(roomId, email.trim())
      setEmail('')
      setMessage(added ? 'Moderador vinculado somente a esta sala.' : 'Essa conta já é moderadora desta sala.')
      await reload()
    } catch (cause) {
      const code = typeof cause === 'object' && cause !== null && 'code' in cause ? cause.code : null
      setError(code === 'P0002'
        ? 'Não encontramos uma conta autenticada e confirmada para esse e-mail.'
        : getRoomErrorMessage(cause, 'Não foi possível convidar esse moderador.'))
    } finally {
      setSaving(false)
    }
  }

  async function revoke(moderator: RoomModerator) {
    setRevokingId(moderator.userId)
    setError(null)
    setMessage(null)
    try {
      const removed = await store.revokeModerator(roomId, moderator.userId)
      setModerators((current) => current.filter((item) => item.userId !== moderator.userId))
      setMessage(removed ? `Acesso de ${moderator.displayName} revogado.` : 'Esse moderador já não tinha acesso.')
    } catch (cause) {
      setError(getRoomErrorMessage(cause, 'Não foi possível revogar esse acesso.'))
    } finally {
      setRevokingId(null)
    }
  }

  return <section aria-labelledby="room-moderators-title" className="rounded-2xl border border-fuchsia-300/15 bg-night-900/50 p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-fuchsia-300/70">Acesso da equipe</p>
        <h2 id="room-moderators-title" className="mt-1 font-semibold text-white">Moderadores desta sala</h2>
        <p className="mt-1 text-xs text-zinc-500">Moderadores podem ver presença e pedidos, e aprovar ou rejeitar músicas. Não alteram configurações nem convidam pessoas.</p>
      </div>
      <button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-200 disabled:opacity-50">Atualizar</button>
    </div>

    <form onSubmit={(event) => void invite(event)} className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="room-moderator-email">E-mail de conta autenticada</label>
      <input id="room-moderator-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" disabled={saving} className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-night-950/70 px-3 text-sm text-white outline-none focus-visible:border-fuchsia-300" />
      <button type="submit" disabled={saving || loading} className="min-h-11 rounded-xl bg-fuchsia-400/15 px-4 text-xs font-semibold text-fuchsia-100 disabled:opacity-50">{saving ? 'Convidando…' : 'Convidar moderador'}</button>
    </form>

    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
    {message && <p role="status" className="mt-3 text-sm text-emerald-300">{message}</p>}
    {loading ? <p role="status" className="mt-4 text-xs text-zinc-500">Carregando moderadores…</p>
      : error ? null
      : moderators.length === 0 ? <p className="mt-4 text-sm text-zinc-500">Nenhum moderador nesta sala.</p>
      : <ul className="mt-4 divide-y divide-white/6">{moderators.map((moderator) => <li key={moderator.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="min-w-0"><p className="truncate text-sm font-medium text-white">{moderator.displayName}</p><p className="truncate text-xs text-zinc-500">{moderator.email ?? 'E-mail indisponível'}</p></div>
        <button type="button" onClick={() => void revoke(moderator)} disabled={revokingId !== null} className="min-h-10 rounded-lg border border-red-300/15 px-3 text-xs font-semibold text-red-200 disabled:opacity-50">{revokingId === moderator.userId ? 'Revogando…' : 'Revogar acesso'}</button>
      </li>)}</ul>}
  </section>
}
