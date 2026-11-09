const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function isSameLocalDate(first: Date, second: Date): boolean {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate()
}

export function formatRequestedAt(value: string, now = new Date()): string | null {
  const requestedAt = new Date(value)
  if (Number.isNaN(requestedAt.getTime())) return null

  if (isSameLocalDate(requestedAt, now)) {
    return `Hoje, ${timeFormatter.format(requestedAt)}`
  }

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
  if (isSameLocalDate(requestedAt, yesterday)) {
    return `Ontem, ${timeFormatter.format(requestedAt)}`
  }

  return dateTimeFormatter.format(requestedAt)
}
