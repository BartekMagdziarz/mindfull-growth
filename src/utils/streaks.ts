/**
 * Compute the current streak of consecutive days that have at least one entry.
 *
 * @param timestamps - ISO-8601 timestamps (or any Date-parseable strings)
 * @param referenceDate - The date to start counting backwards from (defaults to now)
 * @returns Number of consecutive days with entries, ending at referenceDate or the day before
 */
export function computeStreak(timestamps: string[], referenceDate?: Date): number {
  if (timestamps.length === 0) return 0

  const days = new Set<string>()
  for (const ts of timestamps) {
    const d = new Date(ts)
    days.add(toLocalDateKey(d))
  }

  const ref = referenceDate ?? new Date()
  const todayKey = toLocalDateKey(ref)

  // Start from today if it has an entry, otherwise try yesterday
  let cursor = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())

  if (!days.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1)
    if (!days.has(toLocalDateKey(cursor))) {
      return 0
    }
  }

  let streak = 0
  while (days.has(toLocalDateKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

/**
 * Compute the current streak of consecutive ISO weeks (Mon-Sun) that have at
 * least one entry. The week containing referenceDate counts if it has any
 * entry; otherwise counting starts from the previous week.
 */
export function computeWeeklyStreak(timestamps: string[], referenceDate?: Date): number {
  if (timestamps.length === 0) return 0

  const weeks = new Set<string>()
  for (const ts of timestamps) {
    weeks.add(toWeekKey(new Date(ts)))
  }

  const ref = referenceDate ?? new Date()
  let cursor = startOfWeek(ref)
  const refWeekKey = toWeekKey(cursor)

  if (!weeks.has(refWeekKey)) {
    cursor.setDate(cursor.getDate() - 7)
    if (!weeks.has(toWeekKey(cursor))) {
      return 0
    }
  }

  let streak = 0
  while (weeks.has(toWeekKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 7)
  }

  return streak
}

export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=Sun, 1=Mon … 6=Sat
  const offset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + offset)
  return d
}

function toWeekKey(date: Date): string {
  return toLocalDateKey(startOfWeek(date))
}
