import { useState, type FormEvent } from 'react'
import { AlertTriangleIcon, QrCodeIcon } from '../../../components/Icons'
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

interface RoomsSectionProps {
  createRoom: (name: string) => Promise<Room>
  error: string | null
  onRetry: () => void
  rooms: Room[]
  status: RoomsStatus
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<Room>
  updateRoomMusicPreferences: (roomId: string, preferences: RoomMusicPreferences) => Promise<Room>
}

export function RoomsSection({
  createRoom,
  error,
  onRetry,
  rooms,
  status,
  updateRoomStatus,
  updateRoomMusicPreferences,
}: RoomsSectionProps) {
  const [name, setName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

  const roomCountLabel = rooms.length === 1 ? '1 sala' : `${rooms.length} salas`

  return (
    <section className="rounded-2xl border border-white/8 bg-night-900/50 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-white">Suas salas</h2>
          <p className="mt-1 text-xs text-zinc-500">Eventos e links de convidados.</p>
        </div>
        {status === 'ready' ? (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
            {rooms.length === 0 ? 'Nenhuma' : roomCountLabel}
          </span>
        ) : null}
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
        <>
          {rooms.length === 0 ? (
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
            <ul className="mt-6 space-y-3">
              {rooms.map((room) => {
                const style = ROOM_STATUS_STYLES[room.status]
                const link = buildRoomLink(room.code, window.location.origin)
                const qrVisible = visibleQrCode === room.code

                return (
                  <li key={room.id} className="rounded-xl border border-white/8 bg-white/2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words text-sm font-semibold text-white">
                        {room.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${style.className}`}
                      >
                        {style.label}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-5 text-zinc-500">
                      Criada em {formatDate(room.createdAt)}
                    </p>

                    <input
                      readOnly
                      value={link}
                      aria-label={`Link público da sala ${room.name}`}
                      onFocus={(event) => event.currentTarget.select()}
                      className="mt-3 w-full rounded-lg border border-white/8 bg-night-950/60 px-3 py-2 font-mono text-[11px] text-zinc-400 outline-none"
                    />

                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" aria-expanded={settingsRoomId === room.id}
                        onClick={() => setSettingsRoomId(settingsRoomId === room.id ? null : room.id)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10">
                        Configurações musicais
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCopy(room)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10"
                      >
                        Copiar link
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
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-zinc-200 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                      >
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
                  </li>
                )
              })}
            </ul>
          )}

          <form
            className="mt-6 border-t border-white/8 pt-5"
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
              placeholder="Aniversário da Ana"
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
              className="mt-4 w-full rounded-xl bg-linear-to-r from-accent-500 to-accent-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? 'Criando...' : 'Criar sala'}
            </button>
          </form>
        </>
      ) : null}
    </section>
  )
}
