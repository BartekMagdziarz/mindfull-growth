export type LifeAreaAssessmentScope = 'full' | 'partial'

export type LifeAreaAssessmentDetails = Record<string, unknown>

export interface LifeAreaAssessmentItem {
  lifeAreaId: string
  lifeAreaNameSnapshot: string
  score: number
  note?: string
  visionSnapshot?: string
  details?: LifeAreaAssessmentDetails
}

export interface LifeAreaAssessment {
  id: string
  createdAt: string
  updatedAt: string
  scope: LifeAreaAssessmentScope
  notes?: string
  lifeAreaIds: string[]
  items: LifeAreaAssessmentItem[]
}

export type CreateLifeAreaAssessmentPayload = Omit<
  LifeAreaAssessment,
  'id' | 'createdAt' | 'updatedAt'
>

export type UpdateLifeAreaAssessmentPayload = Partial<
  Omit<LifeAreaAssessment, 'id' | 'createdAt' | 'updatedAt'>
>
