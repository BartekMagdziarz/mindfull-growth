import type { ChatSession } from './chatSession'
import type { EmotionGroupSelection } from './emotionGroups'

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
  emotions: EmotionGroupSelection[]
  peopleTagIds: string[]
  contextTagIds: string[]
}
