/** Calendar-based labels, independent of DST and elapsed hours. */
export function formatRelativeDay(day: string, today: string, locale: string): string {
  const viewed = new Date(`${day}T12:00:00Z`)
  const current = new Date(`${today}T12:00:00Z`)
  const days = Math.round((viewed.getTime() - current.getTime()) / 86400000)
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  if (Math.abs(days) <= 1) return formatter.format(days, 'day')
  const monday = (date: Date) => date.getTime() - ((date.getUTCDay() + 6) % 7) * 86400000
  const weeks = Math.round((monday(viewed) - monday(current)) / 604800000)
  if (!weeks) return formatter.format(days, 'day')
  if (Math.abs(weeks) <= 4) return formatter.format(weeks, 'week')
  const months = (viewed.getUTCFullYear() - current.getUTCFullYear()) * 12 + viewed.getUTCMonth() - current.getUTCMonth()
  return Math.abs(months) < 12 ? formatter.format(months, 'month') : formatter.format(Math.trunc(months / 12), 'year')
}

/** Route day prefill for a new entry; never accepts normalized invalid dates. */
export function entryDateFromDay(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T12:00:00`)
  if (!Number.isFinite(date.getTime())) return null
  const local = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
  return local === value ? date : null
}
