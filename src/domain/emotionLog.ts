export interface EmotionLog {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  emotionIds: string[] // Array of Emotion IDs (required, at least one)
  note?: string // Optional short note
  peopleTagIds?: string[] // Array of PeopleTag IDs (optional)
  contextTagIds?: string[] // Array of ContextTag IDs (optional)
}

