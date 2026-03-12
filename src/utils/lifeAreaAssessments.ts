import type {
  LifeAreaAssessment,
  LifeAreaAssessmentItem,
  LifeAreaAssessmentScope,
} from '@/domain/lifeAreaAssessment'

export interface LifeAreaAssessmentHistoryEntry {
  assessment: LifeAreaAssessment
  item: LifeAreaAssessmentItem
}

export function sortLifeAreaAssessmentsByCreatedAt(
  assessments: LifeAreaAssessment[],
  direction: 'asc' | 'desc' = 'desc',
): LifeAreaAssessment[] {
  const sorted = [...assessments].sort((left, right) => left.createdAt.localeCompare(right.createdAt))
  return direction === 'asc' ? sorted : sorted.reverse()
}

export function filterLifeAreaAssessmentsByScope(
  assessments: LifeAreaAssessment[],
  scope: LifeAreaAssessmentScope,
): LifeAreaAssessment[] {
  return assessments.filter((assessment) => assessment.scope === scope)
}

export function filterLifeAreaAssessmentsByDateRange(
  assessments: LifeAreaAssessment[],
  startDate: string,
  endDate: string,
): LifeAreaAssessment[] {
  return assessments.filter(
    (assessment) => assessment.createdAt >= startDate && assessment.createdAt <= endDate + '\uffff',
  )
}

export function getLifeAreaAssessmentItem(
  assessment: LifeAreaAssessment | null | undefined,
  lifeAreaId: string,
): LifeAreaAssessmentItem | undefined {
  return assessment?.items.find((item) => item.lifeAreaId === lifeAreaId)
}

export function getLatestLifeAreaAssessment(
  assessments: LifeAreaAssessment[],
  scope?: LifeAreaAssessmentScope,
): LifeAreaAssessment | undefined {
  const pool = scope ? filterLifeAreaAssessmentsByScope(assessments, scope) : assessments
  return sortLifeAreaAssessmentsByCreatedAt(pool)[0]
}

export function getLifeAreaAssessmentHistoryEntries(
  assessments: LifeAreaAssessment[],
  lifeAreaId: string,
): LifeAreaAssessmentHistoryEntry[] {
  return sortLifeAreaAssessmentsByCreatedAt(assessments)
    .map((assessment) => {
      const item = getLifeAreaAssessmentItem(assessment, lifeAreaId)
      return item ? { assessment, item } : null
    })
    .filter(Boolean) as LifeAreaAssessmentHistoryEntry[]
}

export function getLatestLifeAreaAssessmentForLifeArea(
  assessments: LifeAreaAssessment[],
  lifeAreaId: string,
): LifeAreaAssessment | undefined {
  return getLifeAreaAssessmentHistoryEntries(assessments, lifeAreaId)[0]?.assessment
}

export function getPreviousLifeAreaAssessmentForLifeArea(
  assessments: LifeAreaAssessment[],
  lifeAreaId: string,
  beforeCreatedAt: string,
): LifeAreaAssessment | undefined {
  return getLifeAreaAssessmentHistoryEntries(assessments, lifeAreaId)
    .find((entry) => entry.assessment.createdAt < beforeCreatedAt)
    ?.assessment
}

export function getLifeAreaAssessmentDelta(
  currentAssessment: LifeAreaAssessment | null | undefined,
  previousAssessment: LifeAreaAssessment | null | undefined,
  lifeAreaId: string,
): number | null {
  const currentItem = getLifeAreaAssessmentItem(currentAssessment, lifeAreaId)
  const previousItem = getLifeAreaAssessmentItem(previousAssessment, lifeAreaId)

  if (!currentItem || !previousItem) {
    return null
  }

  return currentItem.score - previousItem.score
}
