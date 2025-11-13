export interface JournalEntry {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  title?: string
  body: string
  // Emotion tags, people, and other metadata will be added in later stories.
}

