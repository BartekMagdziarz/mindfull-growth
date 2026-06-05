export interface EmotionLog {
  id: string // UUID
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  emotionIds: string[] // Array of Emotion IDs (wymagane, chyba że wybrano tylko rodziny)
  emotionFamilyIds?: string[] // Array of EmotionFamily IDs (rodzina-only); emotionIds LUB emotionFamilyIds musi być niepuste
  note?: string // Optional short note
  peopleTagIds?: string[] // Array of PeopleTag IDs (optional)
  contextTagIds?: string[] // Array of ContextTag IDs (optional)
}

