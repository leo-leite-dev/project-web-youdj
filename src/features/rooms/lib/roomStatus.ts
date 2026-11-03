import type { RoomStatus } from '../roomTypes'

export interface RoomStatusStyle {
  label: string
  className: string
}

export const ROOM_STATUS_STYLES: Record<RoomStatus, RoomStatusStyle> = {
  active: {
    label: 'Ativa',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  },
  paused: {
    label: 'Pausada',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  },
}

/** Normaliza o valor vindo do banco para o conjunto suportado pela interface. */
export function toRoomStatus(value: string): RoomStatus {
  return value === 'paused' ? 'paused' : 'active'
}
