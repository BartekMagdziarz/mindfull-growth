export type PeriodicEntryType = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export type Quadrant =
  | 'high-energy-high-pleasantness'
  | 'high-energy-low-pleasantness'
  | 'low-energy-high-pleasantness'
  | 'low-energy-low-pleasantness'

export interface EmotionFrequency {
  emotionId: string
  count: number
}

export interface TagEmotionAssociation {
  tagId: string
  tagType: 'people' | 'context'
  frequency: number
  topEmotionIds: string[] // Top 3 emotions associated with this tag
}

export interface PeriodAggregatedData {
  periodStartDate: string // ISO date (YYYY-MM-DD)
  periodEndDate: string // ISO date (YYYY-MM-DD)
  journalEntryIds: string[]
  emotionLogIds: string[]
  emotionFrequency: EmotionFrequency[] // For emotion cloud
  tagEmotionAssociations: TagEmotionAssociation[] // For tag list
}

export interface PeriodicEntry {
  id: string
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  type: PeriodicEntryType
  periodStartDate: string // ISO date (YYYY-MM-DD)
  periodEndDate: string // ISO date (YYYY-MM-DD)

  // User-editable sections
  wins: string[] // Array of win items
  challenges: string[] // Array of challenge items
  learnings: string[] // Array of learning items
  gratitude: string[] // Array of up to 3 gratitude items
  freeWriting: string // Open text area
  intention?: string // Optional intention for next period
  intentionReflection?: string // Reflection on previous period's intention

  // Auto-aggregated data (computed on creation, stored for history)
  aggregatedData: PeriodAggregatedData
  previousEntryId?: string // Reference to previous period's entry
}

// Helper type for creating new entries
export interface CreatePeriodicEntryPayload {
  type: PeriodicEntryType
  periodStartDate: string
  periodEndDate: string
  wins?: string[]
  challenges?: string[]
  learnings?: string[]
  gratitude?: string[]
  freeWriting?: string
  intention?: string
  intentionReflection?: string
  aggregatedData: PeriodAggregatedData
  previousEntryId?: string
}

// Helper type for updating entries
export interface UpdatePeriodicEntryPayload {
  wins?: string[]
  challenges?: string[]
  learnings?: string[]
  gratitude?: string[]
  freeWriting?: string
  intention?: string
  intentionReflection?: string
}

// Period display info for UI
export interface PeriodInfo {
  type: PeriodicEntryType
  label: string // e.g., "Week 3", "January", "Q1", "2026"
  dateRange: string // e.g., "Jan 13-19", "Jan 1-31", "Jan-Mar", "2026"
  startDate: Date
  endDate: Date
}
