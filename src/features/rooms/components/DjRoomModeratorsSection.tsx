import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { getRoomErrorMessage } from '../lib/roomErrors'
import { RefreshButton } from '../../../components/RefreshButton'
import type { DjRoomManagementStore, RoomModerator } from '../services/djRoomManagementStore'
import './DjRoomModeratorsSection.css'

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

  return <section aria-labelledby="room-moderators-title" className="room-moderators-panel">
    <div className="room-moderators-header">
      <div className="room-moderators-heading">
        <p className="room-moderators-kicker">Acesso da equipe</p>
        <h2 id="room-moderators-title">Moderadores desta sala</h2>
        <p className="room-moderators-description">Moderadores podem ver presença e pedidos, e aprovar ou rejeitar músicas. Não alteram configurações nem convidam pessoas.</p>
      </div>
      <RefreshButton label="Atualizar moderadores" onClick={() => void reload()} loading={loading} className="room-moderators-refresh" />
    </div>

    <form onSubmit={(event) => void invite(event)} className="room-moderators-invite-form">
      <label className="sr-only" htmlFor="room-moderator-email">E-mail de conta autenticada</label>
      <input id="room-moderator-email" type="email" required maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="email@exemplo.com" disabled={saving} className="room-moderators-email" />
      <button type="submit" disabled={saving || loading} className="room-moderators-invite">{saving ? 'Convidando…' : 'Convidar moderador'}</button>
    </form>

    {error && <p role="alert" className="room-moderators-feedback room-moderators-feedback--error">{error}</p>}
    {message && <p role="status" className="room-moderators-feedback room-moderators-feedback--success">{message}</p>}
    {loading ? <p role="status" className="room-moderators-roster-state">Carregando moderadores…</p>
      : error ? null
      : moderators.length === 0 ? <p className="room-moderators-roster-state">Nenhum moderador nesta sala.</p>
      : <ul className="room-moderators-roster">{moderators.map((moderator) => <li key={moderator.userId} className="room-moderators-row">
        <div className="room-moderators-person"><p>{moderator.displayName}</p><p>{moderator.email ?? 'E-mail indisponível'}</p></div>
        <button type="button" onClick={() => void revoke(moderator)} disabled={revokingId !== null} className="room-moderators-revoke">{revokingId === moderator.userId ? 'Revogando…' : 'Revogar acesso'}</button>
      </li>)}</ul>}
  </section>
}
