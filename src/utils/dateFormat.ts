import enCommon from '@/locales/en/common.json'
import plCommon from '@/locales/pl/common.json'

type CommonMessages = typeof enCommon
const messagesByLocale: Record<string, CommonMessages> = { en: enCommon, pl: plCommon }

function getMessages(locale?: string): CommonMessages {
  return messagesByLocale[locale ?? 'en'] ?? messagesByLocale['en']
}

/**
 * Checks if a Date object is valid (not Invalid Date).
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime())
}

/**
 * Formats a journal entry date string into a user-friendly format.
 *
 * @param dateString - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @param locale - Optional locale ('en' | 'pl'), defaults to 'en'
 * @returns Formatted date string:
 *   - "Today, HH:MM" for entries created today
 *   - "Yesterday, HH:MM" for entries created yesterday
 *   - "MMM DD, YYYY, HH:MM AM/PM" for older entries
 *   - "Unknown date" if the date is invalid
 */
export function formatEntryDate(dateString: string, locale?: string): string {
  const m = getMessages(locale)
  const entryDate = new Date(dateString)

  // Handle invalid dates gracefully
  if (!isValidDate(entryDate)) {
    console.warn('formatEntryDate received invalid date string:', dateString)
    return m.time.unknownDate
  }

  const now = new Date()

  // Reset time to midnight for date comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const entryDay = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Format time as HH:MM in 12-hour format with AM/PM
  const hours = entryDate.getHours()
  const minutes = entryDate.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  const timeString = `${displayHours}:${displayMinutes} ${ampm}`

  // Check if entry is from today
  if (entryDay.getTime() === today.getTime()) {
    return `${m.time.today}, ${timeString}`
  }

  // Check if entry is from yesterday
  if (entryDay.getTime() === yesterday.getTime()) {
    return `${m.time.yesterday}, ${timeString}`
  }

  // Format older dates as "MMM DD, YYYY, HH:MM AM/PM"
  const monthKey = String(entryDate.getMonth()) as keyof typeof m.months
  const month = m.months[monthKey]
  const day = entryDate.getDate()
  const year = entryDate.getFullYear()

  return `${month} ${day}, ${year}, ${timeString}`
}

/**
 * Formats a message timestamp into a user-friendly relative time format.
 *
 * @param timestamp - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @param locale - Optional locale ('en' | 'pl'), defaults to 'en'
 * @returns Formatted time string:
 *   - "Just now" for messages less than 1 minute old
 *   - "X minutes ago" for messages less than 60 minutes old
 *   - "X hours ago" for messages less than 24 hours old
 *   - Full date/time for older messages
 *   - "Unknown time" if the timestamp is invalid
 */
export function formatMessageTimestamp(timestamp: string, locale?: string): string {
  const m = getMessages(locale)
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
  const monthKey = String(messageDate.getMonth()) as keyof typeof m.months
  const month = m.months[monthKey]
  const day = messageDate.getDate()
  const year = messageDate.getFullYear()
  const hours = messageDate.getHours()
  const minutes = messageDate.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  const displayMinutes = minutes.toString().padStart(2, '0')
  const timeString = `${displayHours}:${displayMinutes} ${ampm}`

  return `${month} ${day}, ${year}, ${timeString}`
}

/**
 * Formats a chat session creation timestamp into a user-friendly string.
 *
 * @param timestamp - ISO timestamp string
 * @param locale - Optional locale ('en' | 'pl'), defaults to 'en'
 * @returns Formatted time string
 */
export function formatChatSessionDate(timestamp: string, locale?: string): string {
  const m = getMessages(locale)
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

  return sessionDate.toLocaleDateString()
}
