import enCommon from '@/locales/en/common.json'
import plCommon from '@/locales/pl/common.json'
import { normalizeLocaleId, type LocaleId } from '@/services/localeService'

type CommonMessages = typeof enCommon
const messagesByLocale: Record<LocaleId, CommonMessages> = { en: enCommon, pl: plCommon }

/** BCP 47 tag behind each app locale: the clock, the month names and the field order come from Intl. */
const intlTagByLocale: Record<LocaleId, string> = { en: 'en-US', pl: 'pl-PL' }

/** An unknown or missing locale falls back to the app default (Polish), like the rest of the UI. */
function resolveLocale(locale?: string): LocaleId {
  return normalizeLocaleId(locale)
}

function getMessages(locale: LocaleId): CommonMessages {
  return messagesByLocale[locale]
}

/**
 * Checks if a Date object is valid (not Invalid Date).
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

/** "9:30" / "19:30" in Polish, "9:30 AM" / "7:30 PM" in English. */
function formatClock(date: Date, locale: LocaleId): string {
  return new Intl.DateTimeFormat(intlTagByLocale[locale], {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

/** "15 paź 2026, 19:30" in Polish, "Oct 15, 2026, 7:30 PM" in English. */
function formatDateTime(date: Date, locale: LocaleId): string {
  return new Intl.DateTimeFormat(intlTagByLocale[locale], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/**
 * Formats a journal entry date string into a user-friendly format.
 *
 * @param dateString - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @param locale - App locale ('en' | 'pl'); anything else falls back to the app default
 * @returns Formatted date string:
 *   - "Today, <clock>" for entries created today
 *   - "Yesterday, <clock>" for entries created yesterday
 *   - the locale's short date with the clock for older entries
 *   - "Unknown date" if the date is invalid
 */
export function formatEntryDate(dateString: string, locale?: string): string {
  const id = resolveLocale(locale)
  const m = getMessages(id)
  const entryDate = new Date(dateString)

  // Handle invalid dates gracefully
  if (!isValidDate(entryDate)) {
    console.warn('formatEntryDate received invalid date string:', dateString)
    return m.time.unknownDate
  }

  const today = startOfDay(new Date())
  const entryDay = startOfDay(entryDate)
  const dayMs = 24 * 60 * 60 * 1000

  if (entryDay === today) {
    return `${m.time.today}, ${formatClock(entryDate, id)}`
  }
  if (today - entryDay === dayMs) {
    return `${m.time.yesterday}, ${formatClock(entryDate, id)}`
  }
  return formatDateTime(entryDate, id)
}

/**
 * Formats a message timestamp into a user-friendly relative time format.
 *
 * @param timestamp - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @param locale - App locale ('en' | 'pl'); anything else falls back to the app default
 * @returns Formatted time string:
 *   - "Just now" for messages less than 1 minute old
 *   - "X minutes ago" for messages less than 60 minutes old
 *   - "X hours ago" for messages less than 24 hours old
 *   - Full date/time for older messages
 *   - "Unknown time" if the timestamp is invalid
 */
export function formatMessageTimestamp(timestamp: string, locale?: string): string {
  const id = resolveLocale(locale)
  const m = getMessages(id)
  const messageDate = new Date(timestamp)

  // Handle invalid dates gracefully
  if (!isValidDate(messageDate)) {
    console.warn('formatMessageTimestamp received invalid timestamp:', timestamp)
    return m.time.unknownTime
  }

  const now = new Date()
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  // Less than 1 minute
  if (diffMins < 1) {
    return m.time.justNow
  }

  // Less than 60 minutes
  if (diffMins < 60) {
    const template = diffMins === 1 ? m.time.minuteAgo : m.time.minutesAgo
    return template.replace('{n}', String(diffMins))
  }

  // Less than 24 hours
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    const template = diffHours === 1 ? m.time.hourAgo : m.time.hoursAgo
    return template.replace('{n}', String(diffHours))
  }

  // Older than 24 hours - show full date/time
  return formatDateTime(messageDate, id)
}

/**
 * Formats a chat session creation timestamp into a user-friendly string.
 *
 * @param timestamp - ISO timestamp string
 * @param locale - App locale ('en' | 'pl'); anything else falls back to the app default
 * @returns Formatted time string
 */
export function formatChatSessionDate(timestamp: string, locale?: string): string {
  const id = resolveLocale(locale)
  const m = getMessages(id)
  const sessionDate = new Date(timestamp)

  // Handle invalid dates gracefully
  if (!isValidDate(sessionDate)) {
    console.warn('formatChatSessionDate received invalid timestamp:', timestamp)
    return m.time.unknownDate
  }

  const now = new Date()

  const diffMs = now.getTime() - sessionDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) {
    return m.time.justNow
  }

  if (diffMinutes < 60) {
    const template = diffMinutes === 1 ? m.time.minuteAgo : m.time.minutesAgo
    return template.replace('{n}', String(diffMinutes))
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    const template = diffHours === 1 ? m.time.hourAgo : m.time.hoursAgo
    return template.replace('{n}', String(diffHours))
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    const template = diffDays === 1 ? m.time.dayAgo : m.time.daysAgo
    return template.replace('{n}', String(diffDays))
  }

  return new Intl.DateTimeFormat(intlTagByLocale[id]).format(sessionDate)
}
