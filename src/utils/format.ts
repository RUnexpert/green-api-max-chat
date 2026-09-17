const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayWithYearFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' })

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp)
}

/** «Сегодня», «Вчера», «17 сентября» */
export function formatDay(timestamp: number): string {
  const now = new Date()
  const day = startOfDay(timestamp)
  if (day === startOfDay(now.getTime())) return 'Сегодня'
  now.setDate(now.getDate() - 1)
  if (day === startOfDay(now.getTime())) return 'Вчера'
  const sameYear = new Date(timestamp).getFullYear() === new Date().getFullYear()
  return (sameYear ? dayFormatter : dayWithYearFormatter).format(timestamp)
}

/** Время для списка чатов: сегодня — «14:05», раньше — «16.09» */
export function formatListTime(timestamp: number): string {
  return isSameDay(timestamp, Date.now())
    ? timeFormatter.format(timestamp)
    : shortDateFormatter.format(timestamp)
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Неизвестная ошибка'
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
