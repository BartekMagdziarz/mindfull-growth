/**
 * Formats a journal entry date string into a user-friendly format.
 * 
 * @param dateString - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @returns Formatted date string:
 *   - "Today, HH:MM" for entries created today
 *   - "Yesterday, HH:MM" for entries created yesterday
 *   - "MMM DD, YYYY, HH:MM AM/PM" for older entries
 */
export function formatEntryDate(dateString: string): string {
  const entryDate = new Date(dateString)
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
    return `Today, ${timeString}`
  }
  
  // Check if entry is from yesterday
  if (entryDay.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeString}`
  }
  
  // Format older dates as "MMM DD, YYYY, HH:MM AM/PM"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[entryDate.getMonth()]
  const day = entryDate.getDate()
  const year = entryDate.getFullYear()
  
  return `${month} ${day}, ${year}, ${timeString}`
}

/**
 * Formats a message timestamp into a user-friendly relative time format.
 * 
 * @param timestamp - ISO timestamp string (e.g., "2024-12-15T10:30:00.000Z")
 * @returns Formatted time string:
 *   - "Just now" for messages less than 1 minute old
 *   - "X minutes ago" for messages less than 60 minutes old
 *   - "X hours ago" for messages less than 24 hours old
 *   - Full date/time for older messages
 */
export function formatMessageTimestamp(timestamp: string): string {
  const messageDate = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - messageDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  // Less than 1 minute
  if (diffMins < 1) {
    return 'Just now'
  }
  
  // Less than 60 minutes
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
  }
  
  // Less than 24 hours
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }
  
  // Older than 24 hours - show full date/time
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[messageDate.getMonth()]
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
 * For recent sessions:
 *   - "Just now" for sessions less than 1 minute old
 *   - "X minutes ago" for sessions less than 60 minutes old
 *   - "X hours ago" for sessions less than 24 hours old
 *   - "X days ago" for sessions less than 7 days old
 * For older sessions:
 *   - Localized date string (e.g., "1/15/2024")
 */
export function formatChatSessionDate(timestamp: string): string {
  const sessionDate = new Date(timestamp)
  const now = new Date()

  const diffMs = now.getTime() - sessionDate.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  return sessionDate.toLocaleDateString()
}

