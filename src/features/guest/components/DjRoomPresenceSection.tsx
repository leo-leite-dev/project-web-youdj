import { useCallback, useEffect, useRef, useState } from 'react'
import { BadgeCheck, ChevronDown, Clock3, Crown, Ellipsis, Link2, type LucideIcon } from 'lucide-react'
import { SearchControl, SelectControl } from '../../../components/FilterControls'
import { RefreshButton } from '../../../components/RefreshButton'
import { getRoomErrorMessage } from '../../rooms/lib/roomErrors'
import { createDjPresenceStore, type DjPresenceStore, type OnlineGuest, type RoomGuestVip, type RoomPresenceSnapshot } from '../services/djPresenceStore'
import { formatRequestedAt } from '../lib/formatRequestedAt'

type GuestLevel = 'all' | 'vip' | 'registered' | 'guest'
type PresenceStatus = 'online' | 'offline' | 'unknown'

const GUEST_LEVEL_OPTIONS = [
  { value: 'all', label: 'Todos os níveis' },
  { value: 'vip', label: 'VIPs' },
  { value: 'registered', label: 'Cadastrados' },
  { value: 'guest', label: 'Convidados' },
] as const

interface PresenceCardGuest {
  key: string
  guestId: string | null
  nickname: string
  status: PresenceStatus
  lastSeenAt: string | null
  isVip: boolean
}

function getGuestInitials(nickname: string): string {
  return nickname.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase() || '?'
}

interface GuestPresenceCardProps {
  guest: PresenceCardGuest
  canManageVip: boolean
  canToggleVip: boolean
  vipBusyId: string | null
  onVipChange: (guestId: string, enabled: boolean) => void
}

interface GuestLevelPanelProps {
  level: Exclude<GuestLevel, 'all'>
  title: string
  description: string
  count: number | string
  icon: LucideIcon
  guests: PresenceCardGuest[]
  emptyMessage: string
  note?: string
  canManageVip: boolean
  canToggleVip: boolean
  vipBusyId: string | null
  onVipChange: (guestId: string, enabled: boolean) => void
}

function GuestPresenceCard({ guest, canManageVip, canToggleVip, vipBusyId, onVipChange }: GuestPresenceCardProps) {
  const guestId = guest.guestId
  const lastActivity = guest.lastSeenAt ? formatRequestedAt(guest.lastSeenAt) : null
  const statusLabel = guest.status === 'online' ? 'Online' : guest.status === 'offline' ? 'Offline' : 'Presença indisponível'

  return <li className={`room-guest-card room-guest-card--${guest.status}${guest.isVip ? ' room-guest-card--vip' : ''}`}>
    <div className="room-guest-card__top">
      <div className="room-guest-card__identity">
        <span className="room-guest-card__avatar" aria-hidden="true">{getGuestInitials(guest.nickname)}</span>
        <div className="room-guest-card__copy">
          <p className="room-guest-card__name" title={guest.nickname}>{guest.nickname}{guest.isVip && <Crown aria-hidden="true" />}</p>
          <p className={`room-guest-card__presence room-guest-card__presence--${guest.status}`}><span aria-hidden="true" />{statusLabel}</p>
        </div>
      </div>
      {canManageVip && canToggleVip && guestId && <details className="room-guest-card__menu">
        <summary aria-label={`Mais ações para ${guest.nickname}`}><Ellipsis aria-hidden="true" /></summary>
        <div className="room-guest-card__menu-popover">
          <button type="button" disabled={vipBusyId !== null} onClick={() => onVipChange(guestId, !guest.isVip)}>{vipBusyId === guestId ? 'Salvando…' : guest.isVip ? 'Revogar VIP' : 'Conceder VIP'}</button>
        </div>
      </details>}
    </div>
    <p className="room-guest-card__activity"><Clock3 aria-hidden="true" /><span>{lastActivity ? <>Última atividade: <time dateTime={guest.lastSeenAt ?? undefined}>{lastActivity}</time></> : 'Última atividade indisponível'}</span></p>
  </li>
}

function GuestLevelPanel({ level, title, description, count, icon: Icon, guests, emptyMessage, note, canManageVip, canToggleVip, vipBusyId, onVipChange }: GuestLevelPanelProps) {
  return <details className={`room-guest-level room-guest-level--${level}`} open>
    <summary className="room-guest-level__summary">
      <Icon className="room-guest-level__icon" aria-hidden="true" />
      <span className="room-guest-level__heading">
        <span className="room-guest-level__title">{title} <span>({count})</span></span>
        <span className="room-guest-level__description">{description}</span>
      </span>
      <ChevronDown className="room-guest-level__chevron" aria-hidden="true" />
    </summary>
    <div className="room-guest-level__content">
      {guests.length > 0
        ? <ul className="room-guest-level__grid">{guests.map((guest) => <GuestPresenceCard key={guest.key} guest={guest} canManageVip={canManageVip} canToggleVip={canToggleVip} vipBusyId={vipBusyId} onVipChange={onVipChange} />)}</ul>
        : <p className="room-guest-level__empty">{emptyMessage}</p>}
      {note && <p className="room-guest-level__note">{note}</p>}
    </div>
  </details>
}

function getVipErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'code' in error
    && (error.code === 'PGRST202' || error.code === '42883')) {
    return 'As RPCs de Convidado VIP não estão disponíveis neste backend. Confirme se a migration supabase/migrations/20261115000000_room_guest_vip.sql foi aplicada e atualize o schema do Supabase.'
  }
  return getRoomErrorMessage(error, fallback)
}

interface DjRoomPresenceSectionProps {
  roomId: string
  store?: DjPresenceStore
  canManageVip?: boolean
}

export function DjRoomPresenceSection({ roomId, store: storeOverride, canManageVip = false }: DjRoomPresenceSectionProps) {
  const [store] = useState(() => storeOverride ?? createDjPresenceStore())
  const [snapshot, setSnapshot] = useState<RoomPresenceSnapshot | null>(null)
  const [vips, setVips] = useState<RoomGuestVip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [vipError, setVipError] = useState<string | null>(null)
  const [vipBusyId, setVipBusyId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [guestLevel, setGuestLevel] = useState<GuestLevel>('all')
  const requestActive = useRef(false)

  const reload = useCallback(async () => {
    if (requestActive.current) return
    requestActive.current = true
    setLoading(true)
    setError(null)
    try {
      setSnapshot(await store.listOnline(roomId))
    } catch (cause) {
      setError(getRoomErrorMessage(cause, 'Não foi possível carregar a presença da sala. Verifique sua conexão e tente novamente.'))
    } finally {
      requestActive.current = false
      setLoading(false)
    }

    if (!canManageVip || !store.listVips) {
      setVips([])
      setVipError(null)
      return
    }

    try {
      setVips(await store.listVips(roomId))
      setVipError(null)
    } catch (cause) {
      setVips([])
      setVipError(getVipErrorMessage(cause, 'Não foi possível carregar a lista VIP.'))
    }
  }, [canManageVip, roomId, store])

  async function toggleVip(guestId: string, enabled: boolean) {
    if (!store.setVip) {
      setVipError('A gestão de Convidados VIP não está disponível nesta versão do backend. Confira se a migration VIP foi aplicada.')
      return
    }
    setVipBusyId(guestId)
    setVipError(null)
    setMessage(null)
    try {
      await store.setVip(roomId, guestId, enabled)
      setMessage(enabled ? 'Permissão “Pedidos sem aprovação” concedida.' : 'Permissão “Pedidos sem aprovação” revogada.')
      await reload()
    } catch (cause) {
      setVipError(getVipErrorMessage(cause, 'Não foi possível alterar a permissão deste convidado.'))
    } finally {
      setVipBusyId(null)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    const interval = window.setInterval(() => { void reload() }, 30_000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
    }
  }, [reload])

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const onlineGuests = snapshot?.guests ?? []
  const onlineById = new Map<string, OnlineGuest>()
  onlineGuests.forEach((guest) => { if (guest.guestId) onlineById.set(guest.guestId, guest) })
  const presenceIsComplete = snapshot !== null && !error && snapshot.count <= onlineGuests.length
  const vipGuestMap = new Map<string, PresenceCardGuest>()

  vips.forEach((vip) => {
    const onlineGuest = onlineById.get(vip.guestId)
    vipGuestMap.set(`guest:${vip.guestId}`, {
      key: `guest:${vip.guestId}`,
      guestId: vip.guestId,
      nickname: onlineGuest?.nickname ?? vip.nickname,
      status: onlineGuest ? 'online' : presenceIsComplete ? 'offline' : 'unknown',
      lastSeenAt: onlineGuest?.lastSeenAt ?? null,
      isVip: true,
    })
  })

  onlineGuests.forEach((guest, index) => {
    if (!guest.isVip) return
    const key = guest.guestId ? `guest:${guest.guestId}` : `online-vip:${index}`
    vipGuestMap.set(key, {
      key,
      guestId: guest.guestId,
      nickname: guest.nickname,
      status: 'online',
      lastSeenAt: guest.lastSeenAt,
      isVip: true,
    })
  })

  const vipGuests = Array.from(vipGuestMap.values())
  const vipGuestIds = new Set(vipGuests.flatMap((guest) => guest.guestId ? [guest.guestId] : []))
  const guestMap = new Map<string, PresenceCardGuest>()
  onlineGuests.forEach((guest, index) => {
    if (guest.isVip || (guest.guestId && vipGuestIds.has(guest.guestId))) return
    const key = guest.guestId ? `guest:${guest.guestId}` : `online-guest:${index}`
    guestMap.set(key, { key, guestId: guest.guestId, nickname: guest.nickname, status: 'online', lastSeenAt: guest.lastSeenAt, isVip: false })
  })
  const guests = Array.from(guestMap.values())
  const registeredGuests: PresenceCardGuest[] = []
  const matchesSearch = (guest: PresenceCardGuest) => guest.nickname.toLocaleLowerCase().includes(normalizedSearch)
  const visibleVips = vipGuests.filter(matchesSearch)
  const visibleRegistered = registeredGuests.filter(matchesSearch)
  const visibleGuests = guests.filter(matchesSearch)
  const unclassifiedOnlineCount = snapshot ? Math.max(0, snapshot.count - onlineGuests.length) : 0
  const canListVips = canManageVip && Boolean(store.listVips)
  const initialLoad = loading && !snapshot
  const showVips = guestLevel === 'all' || guestLevel === 'vip'
  const showRegistered = guestLevel === 'all' || guestLevel === 'registered'
  const showGuests = guestLevel === 'all' || guestLevel === 'guest'

  return <section aria-labelledby="online-guests-title" className="room-presence-section">
    <div className="room-presence-header">
      <div className="room-presence-heading-row">
        <div className="room-presence-heading">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300/70">Presença</p>
          <h2 id="online-guests-title" className="mt-1 font-semibold text-white">Convidados da sala <span className="text-cyan-200">({loading && !snapshot ? '—' : snapshot?.count ?? 0} online)</span></h2>
          <p className="mt-1 text-xs text-zinc-400">Gerencie os participantes da sala por nível de acesso.</p>
        </div>
        <RefreshButton label="Atualizar convidados" onClick={() => void reload()} loading={loading} />
      </div>
      <div className="room-approved-controls filter-controls room-guest-controls">
        <SearchControl label="Buscar participante" value={search} onChange={setSearch} placeholder="Buscar participante..." />
        <SelectControl label="Filtrar por nível" value={guestLevel} onChange={(value) => setGuestLevel(value as GuestLevel)} options={GUEST_LEVEL_OPTIONS} visuallyHiddenLabel />
      </div>
    </div>
    {error && <div className="mt-3 space-y-2" role="alert"><p className="text-xs text-red-300">{error}</p><button type="button" onClick={() => void reload()} disabled={loading} className="min-h-10 rounded-lg border border-red-300/20 px-3 text-xs font-semibold text-red-200 disabled:opacity-50">Tentar novamente</button></div>}
    {vipError && <p role="alert" className="mt-3 text-xs text-amber-200">{vipError}</p>}
    {message && <p role="status" className="mt-3 text-xs text-emerald-200">{message}</p>}
    {initialLoad && <p role="status" className="mt-2 text-xs text-zinc-500">Carregando presença…</p>}
    <div className="room-guest-levels">
      {showVips && <GuestLevelPanel level="vip" title="VIPs" description="Convidados com acesso VIP e benefícios especiais." count={initialLoad ? '—' : visibleVips.length} icon={Crown} guests={visibleVips} emptyMessage={initialLoad ? 'Carregando participantes…' : normalizedSearch ? 'Nenhum VIP corresponde à busca.' : error ? 'A presença não pôde ser confirmada.' : vipError ? 'Não foi possível confirmar a lista de permissões VIP.' : !canManageVip ? 'A lista VIP é exibida somente ao proprietário da sala.' : !canListVips ? 'A lista de permissões VIP não está disponível neste serviço.' : 'Nenhuma permissão VIP concedida nesta sala.'} canManageVip={canManageVip} canToggleVip={Boolean(store.setVip)} vipBusyId={vipBusyId} onVipChange={(id, enabled) => void toggleVip(id, enabled)} />}
      {showRegistered && <GuestLevelPanel level="registered" title="Cadastrados" description="Participantes com conta autenticada e identidade verificada." count={initialLoad ? '—' : 0} icon={BadgeCheck} guests={visibleRegistered} emptyMessage={initialLoad ? 'Carregando participantes…' : 'O sistema atual não fornece identidade autenticada/verificada para classificar participantes desta sala.'} canManageVip={canManageVip} canToggleVip={Boolean(store.setVip)} vipBusyId={vipBusyId} onVipChange={(id, enabled) => void toggleVip(id, enabled)} />}
      {showGuests && <GuestLevelPanel level="guest" title="Convidados" description="Participantes que acessaram por link, sem conta." count={initialLoad ? '—' : visibleGuests.length} icon={Link2} guests={visibleGuests} emptyMessage={initialLoad ? 'Carregando participantes…' : normalizedSearch ? 'Nenhum convidado corresponde à busca.' : error ? 'A presença não pôde ser confirmada.' : 'Nenhum convidado por link está online no momento.'} note={!normalizedSearch && unclassifiedOnlineCount > 0 ? `${unclassifiedOnlineCount} presença(s) online adicional(is) sem dados individuais suficientes para classificação.` : undefined} canManageVip={canManageVip} canToggleVip={Boolean(store.setVip)} vipBusyId={vipBusyId} onVipChange={(id, enabled) => void toggleVip(id, enabled)} />}
    </div>
    <p className="mt-3 text-[10px] leading-4 text-zinc-600">A presença expira após 90 segundos sem atualização; apelidos não são verificados. VIP é validado por uma credencial privada específica deste navegador e desta sala.</p>
  </section>
}
