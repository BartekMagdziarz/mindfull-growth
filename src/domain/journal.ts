export interface JournalEntry {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  title?: string
  body: string
  emotionIds?: string[] // Array of Emotion IDs (optional, defaults to empty array)
  peopleTagIds?: string[] // Array of PeopleTag IDs (optional, defaults to empty array)
  contextTagIds?: string[] // Array of ContextTag IDs (optional, defaults to empty array)
}

