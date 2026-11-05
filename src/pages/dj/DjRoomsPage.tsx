import { RoomsSection } from '../../features/rooms/components/RoomsSection'
import { useRooms } from '../../features/rooms/hooks/useRooms'
import type { RoomStore } from '../../features/rooms/services/roomStore'
import { useAuth } from '../../features/auth/AuthContext'

interface DjRoomsPageProps {
  roomStore?: RoomStore
}

export function DjRoomsPage({ roomStore }: DjRoomsPageProps) {
  const { profile } = useAuth()
  const {
    createRoom,
    error,
    reload,
    rooms,
    status,
    updateRoomStatus,
    updateRoomMusicPreferences,
  } = useRooms(profile?.id ?? null, roomStore)

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-400">
          Painel do DJ
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          Salas
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Crie e gerencie suas salas, altere o status e compartilhe o link público ou QR Code com
          seus convidados.
        </p>
      </div>

      <RoomsSection
        createRoom={createRoom}
        djName={profile?.displayName ?? 'DJ'}
        error={error}
        onRetry={reload}
        rooms={rooms}
        status={status}
        updateRoomStatus={updateRoomStatus}
        updateRoomMusicPreferences={updateRoomMusicPreferences}
      />
    </div>
  )
}
