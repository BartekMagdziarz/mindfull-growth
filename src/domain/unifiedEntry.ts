import type { ChatSession } from './chatSession'

export type UnifiedEntryType = 'journal' | 'emotion-log'

export interface UnifiedEntry {
  id: string
  type: UnifiedEntryType
  createdAt: string
  updatedAt: string
  // Journal-specific fields
  title?: string
  body?: string
  chatSessions?: ChatSession[]
  // Emotion-log-specific fields
  note?: string
  // Shared fields
  emotionIds: string[]
  peopleTagIds: string[]
  contextTagIds: string[]
}
