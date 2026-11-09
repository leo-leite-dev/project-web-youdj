import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { AlertTriangleIcon, ManageRoomIcon, PauseIcon, PlayIcon, QrCodeIcon, SettingsIcon, TrashIcon } from '../../../components/Icons'
import roomsBannerArtwork from '../../../assets/dj-rooms-banner.png'
import { AuthField } from '../../auth/components/AuthField'
import type { RoomsStatus } from '../hooks/useRooms'
import { getRoomErrorMessage } from '../lib/roomErrors'
import { buildRoomLink } from '../lib/roomLink'
import { ROOM_STATUS_STYLES } from '../lib/roomStatus'
import { getRoomNameError } from '../lib/roomValidation'
import type { Room, RoomStatus } from '../roomTypes'
import type { RoomMusicPreferences } from '../roomTypes'
import { RoomQrPanel } from './RoomQrPanel'

const CREATE_ERROR_FALLBACK = 'Não foi possível criar a sala. Tente novamente.'
const COPY_ERROR_FALLBACK =
  'Não foi possível copiar automaticamente. Selecione o link e copie manualmente.'
const UPDATE_ERROR_FALLBACK = 'Não foi possível atualizar o status da sala. Tente novamente.'
const DELETE_ERROR_FALLBACK = 'Não foi possível excluir a sala. Tente novamente.'

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface RoomsSectionProps {
  createRoom: (name: string) => Promise<Room>
  djName?: string
  error: string | null
  onRetry: () => void
  rooms: Room[]
  status: RoomsStatus
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<Room>
  updateRoomMusicPreferences: (roomId: string, preferences: RoomMusicPreferences) => Promise<Room>
  deleteRoom: (roomId: string) => Promise<void>
}

export function RoomsSection({
  createRoom,
  djName = 'DJ',
  error,
  onRetry,
  rooms,
  status,
  updateRoomStatus,
  updateRoomMusicPreferences,
  deleteRoom,
}: RoomsSectionProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [created, setCreated] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<{ code: string; message: string } | null>(null)
  const [visibleQrCode, setVisibleQrCode] = useState<string | null>(null)
  const [updatingRoomId, setUpdatingRoomId] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<{ id: string; message: string } | null>(null)
  const [settingsRoomId, setSettingsRoomId] = useState<string | null>(null)
  const [savingSettingsId, setSavingSettingsId] = useState<string | null>(null)
  const [settingsFeedback, setSettingsFeedback] = useState<{ id: string; message: string; error: boolean } | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null)
  const [roomAwaitingDelete, setRoomAwaitingDelete] = useState<Room | null>(null)
  const deleteCancelButtonRef = useRef<HTMLButtonElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const createModalTriggerRef = useRef<HTMLButtonElement>(null)
  const createModalWasOpen = useRef(false)

  useEffect(() => {
    if (!createModalOpen) {
      if (createModalWasOpen.current) createModalTriggerRef.current?.focus()
      createModalWasOpen.current = false
      return
    }

    createModalWasOpen.current = true
    document.querySelector<HTMLInputElement>('.rooms-create-modal input')?.focus()
    function handleCreateDialogKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) setCreateModalOpen(false)
      if (event.key === 'Tab') {
        const focusable = document.querySelectorAll<HTMLElement>(
          '.rooms-create-modal input:not(:disabled), .rooms-create-modal button:not(:disabled)',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleCreateDialogKeydown)
    return () => document.removeEventListener('keydown', handleCreateDialogKeydown)
  }, [createModalOpen, submitting])

  useEffect(() => {
    if (!roomAwaitingDelete) {
      deleteTriggerRef.current?.focus()
      return
    }

    deleteCancelButtonRef.current?.focus()
    function handleDialogKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape' && deletingRoomId === null) setRoomAwaitingDelete(null)
      if (event.key === 'Tab') {
        const first = deleteCancelButtonRef.current
        const last = document.querySelector<HTMLButtonElement>('.room-delete-confirm')
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleDialogKeydown)
    return () => document.removeEventListener('keydown', handleDialogKeydown)
  }, [deletingRoomId, roomAwaitingDelete])

  async function savePreference(room: Room, key: keyof RoomMusicPreferences) {
    const preferences = { ...room.musicPreferences, [key]: !room.musicPreferences[key] }
    setSavingSettingsId(room.id)
    setSettingsFeedback(null)
    try {
      await updateRoomMusicPreferences(room.id, preferences)
      setSettingsFeedback({ id: room.id, message: 'Preferência salva.', error: false })
    } catch {
      setSettingsFeedback({ id: room.id, message: 'Não foi possível salvar. Tente novamente.', error: true })
    } finally {
      setSavingSettingsId(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>, closeModalOnSuccess = false) {
    event.preventDefault()

    const nextNameError = getRoomNameError(name)
    setNameError(nextNameError)
    setFormError(null)

    if (nextNameError) {
      return
    }

    setSubmitting(true)

    try {
      await createRoom(name)
      setName('')
      setCreated(true)
      if (closeModalOnSuccess) setCreateModalOpen(false)
    } catch (submitError) {
      setFormError(getRoomErrorMessage(submitError, CREATE_ERROR_FALLBACK))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCopy(room: Room) {
    const link = buildRoomLink(room.code, window.location.origin)
    setCopiedCode(null)
    setCopyError(null)

    try {
      await navigator.clipboard.writeText(link)
      setCopiedCode(room.code)
    } catch {
      setCopyError({ code: room.code, message: COPY_ERROR_FALLBACK })
    }
  }

  async function handleToggleStatus(room: Room) {
    const nextStatus: RoomStatus = room.status === 'active' ? 'paused' : 'active'
    setUpdatingRoomId(room.id)
    setUpdateError(null)

    try {
      await updateRoomStatus(room.id, nextStatus)
    } catch (statusError) {
      setUpdateError({
        id: room.id,
        message: getRoomErrorMessage(statusError, UPDATE_ERROR_FALLBACK),
      })
    } finally {
      setUpdatingRoomId(null)
    }
  }

  async function handleDeleteRoom() {
    if (!roomAwaitingDelete) return
    const room = roomAwaitingDelete
    setDeletingRoomId(room.id)
    setDeleteError(null)
    try {
      await deleteRoom(room.id)
      setRoomAwaitingDelete(null)
    } catch (deleteFailure) {
      setDeleteError({ id: room.id, message: getRoomErrorMessage(deleteFailure, DELETE_ERROR_FALLBACK) })
    } finally {
      setDeletingRoomId(null)
    }
  }

  const roomCountLabel = rooms.length === 1 ? '1 sala' : `${rooms.length} salas`

  return (
    <section className="rooms-panel rounded-2xl border border-white/8 bg-night-900/50 p-6">
      <div className="rooms-list-panel">
      <div className="rooms-panel-heading flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rooms-stack-icon" aria-hidden="true">▱</span>
          <div className="rooms-heading-copy">
            <div className="rooms-heading-title-row">
              <h2 className="font-semibold text-white">Suas salas</h2>
              <button
                ref={createModalTriggerRef}
                type="button"
                className="rooms-create-mobile-trigger"
                aria-label="Criar sala"
                title="Criar sala"
                onClick={() => {
                  setFormError(null)
                  setNameError(null)
                  setCreateModalOpen(true)
                }}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">Eventos e links de convidados.</p>
            <p className="rooms-description"><span>Crie e gerencie suas salas, altere o status</span> e compartilhe o link público ou QR Code com seus convidados.</p>
          </div>
        </div>
        <div className="rooms-heading-actions">
        {status === 'ready' ? (
          <span className="rooms-count rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {rooms.length === 0 ? 'Nenhuma' : roomCountLabel}
          </span>
        ) : null}
        </div>
      </div>

      {status === 'loading' ? (
        <div
          role="status"
          className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-white/10 px-5 py-10 text-center"
        >
          <span
            aria-hidden="true"
            className="size-8 animate-spin rounded-full border-2 border-white/10 border-t-accent-400"
          />
          <p className="mt-4 text-xs leading-5 text-zinc-500">Carregando suas salas...</p>
        </div>
      ) : null}

      {status === 'error' ? (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-400/20 bg-red-400/5 p-5 text-center"
        >
          <span className="mx-auto grid size-10 place-items-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
            <AlertTriangleIcon className="size-5" />
          </span>
          <p className="mt-3 text-xs leading-5 text-red-200">
            {error ?? 'Não foi possível carregar suas salas.'}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-night-950 transition hover:bg-accent-300"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {status === 'ready' ? (
        rooms.length === 0 ? (
            <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-white/10 px-5 py-10 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-accent-500/10 text-accent-300">
                <QrCodeIcon className="size-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-white">Nenhuma sala criada</h3>
              <p className="mt-2 max-w-xs text-xs leading-5 text-zinc-500">
                Crie a sala do seu evento para começar. Depois, compartilhe o link ou o QR Code
                com os convidados.
              </p>
            </div>
          ) : (
            <ul className="rooms-list mt-6 space-y-3">
              {rooms.map((room) => {
                const style = ROOM_STATUS_STYLES[room.status]
                const link = buildRoomLink(room.code, window.location.origin)
                const qrVisible = visibleQrCode === room.code

                return (
                  <li key={room.id} className="rooms-card rounded-xl border border-white/8 bg-white/2 p-4">
                    <div className="rooms-cover" aria-hidden="true">
                      <picture>
                        <source media="(max-width: 1023px)" srcSet={roomsBannerArtwork} />
                        <img src="/guest-room-artwork.png" alt="" />
                      </picture>
                    </div>
                    <div className="rooms-card-content">
                    <div className="rooms-card-heading flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold text-white">
                        {room.name}
                      </p>
                      <div className="rooms-card-status-actions">
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${style.className}`}
                      >
                        {style.label}
                      </span>
                      <button type="button" ref={deleteTriggerRef} className="rooms-delete-button" aria-label={`Excluir sala ${room.name}`} title="Excluir sala" disabled={deletingRoomId !== null} onClick={() => { setDeleteError(null); setRoomAwaitingDelete(room) }}>
                        <TrashIcon className="size-4" />
                      </button>
                      </div>
                    </div>
                    <p className="rooms-owner">♙ <span>DJ: {djName}</span></p>
                    <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">
                      Criada em {formatDate(room.createdAt)}
                    </p>

                    <div className="rooms-link-field"><span aria-hidden="true">↗</span><input
                      readOnly value={link} aria-label={`Link público da sala ${room.name}`}
                      onFocus={(event) => event.currentTarget.select()}
                    /><button type="button" onClick={() => void handleCopy(room)} aria-label={`Copiar link da sala ${room.name}`}>▢</button></div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        to={`/dj/painel/salas/${room.id}`}
                        aria-label={`Gerenciar sala ${room.name}`}
                        className="inline-flex min-h-10 items-center rounded-lg border border-cyan-300/20 bg-cyan-300/5 px-3 py-2 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-300/10"
                      >
                        <ManageRoomIcon className="mr-1.5 size-4" />
                        Gerenciar sala
                      </Link>
                      <button type="button" aria-expanded={settingsRoomId === room.id}
                        onClick={() => setSettingsRoomId(settingsRoomId === room.id ? null : room.id)}
                         className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10">
                        <SettingsIcon className="size-4" />
                        Configurações musicais
                      </button>
                      <button
                        type="button"
                        aria-expanded={qrVisible}
                        onClick={() => setVisibleQrCode(qrVisible ? null : room.code)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10"
                      >
                        <QrCodeIcon className="size-3.5" />
                        QR Code
                      </button>
                      <button
                        type="button"
                        disabled={updatingRoomId !== null}
                        onClick={() => void handleToggleStatus(room)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                      >
                        {room.status === 'active' ? <PauseIcon className="size-4" /> : <PlayIcon className="size-4" />}
                        {updatingRoomId === room.id
                          ? 'Atualizando...'
                          : room.status === 'active'
                            ? 'Pausar sala'
                            : 'Ativar sala'}
                      </button>
                    </div>

                    {settingsRoomId === room.id ? <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
                      <p className="text-xs leading-5 text-zinc-500">Preferências preparadas para a experiência musical. Playlist, reprodução e pedidos ainda não estão disponíveis.</p>
                      {([
                        ['surpriseMode', 'Modo Surpresa'],
                        ['showPlaylist', 'Exibir playlist'],
                        ['showNowPlaying', 'Mostrar música tocando agora'],
                        ['showGuestRequests', 'Exibir pedidos dos convidados'],
                      ] as const).map(([key, label]) => <label key={key} className="flex min-h-11 items-center justify-between gap-3 text-xs text-zinc-200">
                        <span>{label}</span><input type="checkbox" checked={room.musicPreferences[key]} disabled={savingSettingsId !== null}
                          onChange={() => void savePreference(room, key)} aria-label={label}
                          className="size-4 accent-accent-400" />
                      </label>)}
                      {settingsFeedback?.id === room.id ? <p role={settingsFeedback.error ? 'alert' : 'status'} className={settingsFeedback.error ? 'text-xs text-red-300' : 'text-xs text-emerald-300'}>{settingsFeedback.message}</p> : null}
                    </div> : null}

                    {updateError?.id === room.id ? (
                      <p role="alert" className="mt-2 text-[11px] leading-5 text-red-300">
                        {updateError.message}
                      </p>
                    ) : null}

                    {copiedCode === room.code ? (
                      <p role="status" className="mt-2 text-[11px] leading-5 text-emerald-300">
                        Link copiado.
                      </p>
                    ) : null}

                    {copyError?.code === room.code ? (
                      <p role="alert" className="mt-2 text-[11px] leading-5 text-red-300">
                        {copyError.message}
                      </p>
                    ) : null}

                    {qrVisible ? (
                      <RoomQrPanel code={room.code} link={link} roomName={room.name} />
                    ) : null}

                    </div>
                  </li>
                )
              })}
            </ul>
          )
        ) : null}
      </div>
      <div className="rooms-create-panel">
          <div className="rooms-create-heading">
            <span aria-hidden="true">＋</span>
            <div><h3>Criar nova sala</h3><p>Abra uma sala para receber pedidos musicais dos seus convidados.</p></div>
            <div className="rooms-create-equalizer" aria-hidden="true">{[20, 12, 35, 48, 28, 60, 41, 72, 54, 34].map((height, index) => <i key={index} style={{ height }} />)}</div>
      </div>
          <form
            className="rooms-create-form mt-6 border-t border-white/8 pt-5"
            noValidate
            onSubmit={(event) => void handleSubmit(event)}
          >
            <AuthField
              id="room-name"
              name="name"
              type="text"
              label="Nome da sala"
              required
              maxLength={60}
              autoComplete="off"
              placeholder="Nome da sala (ex.: Aniversário da Ana)"
              value={name}
              error={nameError}
              disabled={submitting}
              onChange={(event) => {
                setName(event.target.value)
                setNameError(null)
                setCreated(false)
              }}
            />

            {formError ? (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-400/20 bg-red-400/5 px-3.5 py-3 text-xs leading-5 text-red-200"
              >
                {formError}
              </p>
            ) : null}

            {created && !formError ? (
              <p role="status" className="mt-3 text-xs leading-5 text-emerald-300">
                Sala criada com sucesso.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="rooms-create-button mt-4 w-full rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <span aria-hidden="true">＋</span> {submitting ? 'Criando...' : 'Criar sala'}
            </button>
          </form>
          </div>
      {createModalOpen ? createPortal(
        <div className="rooms-create-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !submitting) setCreateModalOpen(false)
        }}>
          <section className="rooms-create-modal" role="dialog" aria-modal="true" aria-labelledby="rooms-create-modal-title" aria-busy={submitting}>
            <button type="button" className="rooms-create-modal-close" aria-label="Fechar criação de sala" disabled={submitting} onClick={() => setCreateModalOpen(false)}>×</button>
            <p className="rooms-create-modal-eyebrow">Novo evento</p>
            <h2 id="rooms-create-modal-title">Criar nova sala</h2>
            <p className="rooms-create-modal-description">Dê um nome para sua sala e compartilhe com seus convidados.</p>
            <form className="rooms-create-modal-form" noValidate onSubmit={(event) => void handleSubmit(event, true)}>
              <AuthField
                id="room-name-modal"
                name="name"
                type="text"
                label="Nome da sala"
                required
                maxLength={60}
                autoComplete="off"
                placeholder="Ex.: Aniversário da Ana"
                value={name}
                error={nameError}
                disabled={submitting}
                onChange={(event) => {
                  setName(event.target.value)
                  setNameError(null)
                  setCreated(false)
                }}
              />
              {formError ? <p role="alert" className="rooms-create-modal-error">{formError}</p> : null}
              <div className="rooms-create-modal-actions">
                <button type="button" className="rooms-create-modal-cancel" disabled={submitting} onClick={() => setCreateModalOpen(false)}>Cancelar</button>
                <button type="submit" className="rooms-create-button" aria-label="Confirmar criação da sala" disabled={submitting}>{submitting ? 'Criando...' : 'Criar sala'} <span aria-hidden="true">→</span></button>
              </div>
            </form>
          </section>
        </div>,
        document.body,
      ) : null}
      {roomAwaitingDelete ? createPortal(
        <div className="room-delete-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget && deletingRoomId === null) setRoomAwaitingDelete(null)
        }}>
          <section className="room-delete-modal" role="dialog" aria-modal="true" aria-labelledby="room-delete-title" aria-describedby="room-delete-description room-delete-warning" aria-busy={deletingRoomId === roomAwaitingDelete.id}>
            <div className="room-delete-modal-icon"><TrashIcon className="size-6" /></div>
            <p className="room-delete-modal-eyebrow">Ação permanente</p>
            <h2 id="room-delete-title">Excluir sala?</h2>
            <p id="room-delete-description">Confirma a exclusão da sala <strong>“{roomAwaitingDelete.name}”</strong>?</p>
            <p className="room-delete-modal-warning" id="room-delete-warning">Esta ação é permanente e removerá a sala e os dados vinculados exclusivamente a ela. Não será possível desfazer.</p>
            {deleteError?.id === roomAwaitingDelete.id ? <p className="room-delete-modal-error" role="alert">{deleteError.message}</p> : null}
            <div className="room-delete-modal-actions">
              <button ref={deleteCancelButtonRef} type="button" className="room-delete-cancel" disabled={deletingRoomId !== null} onClick={() => setRoomAwaitingDelete(null)}>Cancelar</button>
              <button type="button" className="room-delete-confirm" disabled={deletingRoomId !== null} onClick={() => void handleDeleteRoom()}>
                <TrashIcon className="size-4" /> {deletingRoomId === roomAwaitingDelete.id ? 'Excluindo…' : 'Excluir sala'}
              </button>
            </div>
          </section>
        </div>,
        document.body,
      ) : null}
    </section>
  )
}
