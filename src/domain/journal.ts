import type { ChatSession } from './chatSession'

export interface JournalEntry {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  title?: string
  body: string
  emotionIds?: string[] // Array of Emotion IDs (optional, defaults to empty array)
  emotionFamilyIds?: string[] // Array of EmotionFamily IDs (rodzina-only, optional)
  peopleTagIds?: string[] // Array of PeopleTag IDs (optional, defaults to empty array)
  contextTagIds?: string[] // Array of ContextTag IDs (optional, defaults to empty array)
  chatSessions?: ChatSession[] // Array of ChatSession objects (optional, defaults to empty array)
}

/**
 * Returns the user-provided title, or derives one from the first words of the body.
 */
export function getDisplayTitle(entry: { title?: string; body?: string }): string {
  if (entry.title?.trim()) return entry.title.trim()
  const text = (entry.body ?? '').trim()
  if (!text) return ''
  const words = text.split(/\s+/)
  if (words.length <= 8 && text.length <= 60) return text
  const snippet = words.slice(0, 8).join(' ')
  return (snippet.length > 60 ? snippet.slice(0, 57) : snippet) + '…'
}

