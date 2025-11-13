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

