const ROOM_CODE_LENGTH = 10
const ROOM_CODE_PATTERN = /^[A-Z0-9]+$/

export function normalizeRoomCode(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

export function isValidRoomCode(value: string | null | undefined): boolean {
  const code = normalizeRoomCode(value)

  return code.length === ROOM_CODE_LENGTH && ROOM_CODE_PATTERN.test(code)
}
