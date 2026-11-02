const ROOM_NAME_MIN_LENGTH = 2
const ROOM_NAME_MAX_LENGTH = 60

export function normalizeRoomName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function getRoomNameError(value: string): string | null {
  const name = normalizeRoomName(value)

  if (!name) {
    return 'Informe o nome da sala.'
  }

  if (name.length < ROOM_NAME_MIN_LENGTH) {
    return 'O nome da sala deve ter pelo menos 2 caracteres.'
  }

  if (name.length > ROOM_NAME_MAX_LENGTH) {
    return `O nome da sala deve ter no máximo ${ROOM_NAME_MAX_LENGTH} caracteres.`
  }

  return null
}
