import { type CSSProperties } from 'react'
import { RoomsSection } from '../../features/rooms/components/RoomsSection'
import { useRooms } from '../../features/rooms/hooks/useRooms'
import type { RoomStore } from '../../features/rooms/services/roomStore'
import { useAuth } from '../../features/auth/AuthContext'
import { DjProfileMenu } from '../../layouts/DjProfileMenu'
import referenceArtwork from '../../assets/dj-rooms-banner.png'
import './DjRoomsPage.css'

interface DjRoomsPageProps {
  roomStore?: RoomStore
}

export function DjRoomsPage({ roomStore }: DjRoomsPageProps) {
  const { profile } = useAuth()
  const {
    createRoom,
    deleteRoom,
    error,
    reload,
    rooms,
    status,
    updateRoomStatus,
    updateRoomMusicPreferences,
  } = useRooms(profile?.id ?? null, roomStore)

  return (
    <div className="rooms-page" style={{ '--rooms-artwork': `url("${referenceArtwork}")` } as CSSProperties}>
      <header className="rooms-hero">
        <DjProfileMenu />
        <div className="rooms-hero-copy">
          <p>PAINEL DO DJ</p>
          <h1>Salas <span aria-hidden="true">//</span></h1>
        </div>
        <div className="rooms-hero-equalizer" aria-hidden="true">
          {[18, 29, 42, 21, 55, 35, 66, 44, 78, 55, 94, 69, 46, 83, 59, 102, 74, 50].map((height, index) => (
            <i key={index} style={{ height }} />
          ))}
        </div>
      </header>
      <div className="rooms-content">
        <RoomsSection
          createRoom={createRoom}
          deleteRoom={deleteRoom}
          error={error}
          onRetry={reload}
          rooms={rooms}
          status={status}
          djName={profile?.displayName ?? 'DJ'}
          updateRoomStatus={updateRoomStatus}
          updateRoomMusicPreferences={updateRoomMusicPreferences}
        />
      </div>
    </div>
  )
}
