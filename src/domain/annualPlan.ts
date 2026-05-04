import type { YearRef } from '@/domain/period'
import { assertPeriodRef, getPeriodType } from '@/utils/periods'

export type AnnualPlanStatus = 'draft' | 'completed'

export interface AnnualPlanNarrative {
  theme?: string
  story?: string
  fantasticDay?: string
  bestHopes?: string
}

export interface AnnualPlan {
  id: string
  createdAt: string
  updatedAt: string
  yearRef: YearRef
  status: AnnualPlanStatus
  annualBriefNote?: string
  lifeAreaAssessmentId?: string
  narrative?: AnnualPlanNarrative
  executionPlaceholderNote?: string
}

export type CreateAnnualPlanPayload = Omit<AnnualPlan, 'id' | 'createdAt' | 'updatedAt'>
export type UpdateAnnualPlanPayload = Partial<Omit<AnnualPlan, 'id' | 'createdAt' | 'updatedAt'>>

const ANNUAL_PLAN_STATUSES = ['draft', 'completed'] as const

function normalizeOptionalText(value: unknown, fallback?: string): string | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (typeof source !== 'string') {
    throw new Error('AnnualPlan text fields must be strings')
  }

  const trimmed = source.trim()
  return trimmed ? trimmed : undefined
}

function normalizeYearRef(value: unknown, fallback?: YearRef): YearRef {
  const source = value ?? fallback
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('AnnualPlan.yearRef is required')
  }

  const trimmed = source.trim()
  assertPeriodRef(trimmed)
  if (getPeriodType(trimmed) !== 'year') {
    throw new Error('AnnualPlan.yearRef must be a YearRef')
  }

  return trimmed as YearRef
}

function normalizeStatus(value: unknown, fallback: AnnualPlanStatus): AnnualPlanStatus {
  const source = value ?? fallback
  if (typeof source !== 'string' || !ANNUAL_PLAN_STATUSES.includes(source as AnnualPlanStatus)) {
    throw new Error(`AnnualPlan.status must be one of: ${ANNUAL_PLAN_STATUSES.join(', ')}`)
  }

  return source as AnnualPlanStatus
}

function normalizeNarrative(
  value: unknown,
  fallback?: AnnualPlanNarrative,
): AnnualPlanNarrative | undefined {
  const source = value ?? fallback
  if (source === undefined) return undefined
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('AnnualPlan.narrative must be an object')
  }

  const record = source as Record<string, unknown>
  const narrative: AnnualPlanNarrative = {}
  const theme = normalizeOptionalText(record.theme, fallback?.theme)
  const story = normalizeOptionalText(record.story, fallback?.story)
  const fantasticDay = normalizeOptionalText(record.fantasticDay, fallback?.fantasticDay)
  const bestHopes = normalizeOptionalText(record.bestHopes, fallback?.bestHopes)

  if (theme) narrative.theme = theme
  if (story) narrative.story = story
  if (fantasticDay) narrative.fantasticDay = fantasticDay
  if (bestHopes) narrative.bestHopes = bestHopes

  return Object.keys(narrative).length > 0 ? narrative : undefined
}

export function normalizeAnnualPlanPayload(
  data: CreateAnnualPlanPayload | UpdateAnnualPlanPayload,
  existing?: AnnualPlan,
): Omit<AnnualPlan, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    yearRef: normalizeYearRef(data.yearRef, existing?.yearRef),
    status: normalizeStatus(data.status, existing?.status ?? 'draft'),
    annualBriefNote: normalizeOptionalText(data.annualBriefNote, existing?.annualBriefNote),
    lifeAreaAssessmentId: normalizeOptionalText(data.lifeAreaAssessmentId, existing?.lifeAreaAssessmentId),
    narrative: normalizeNarrative(data.narrative, existing?.narrative),
    executionPlaceholderNote: normalizeOptionalText(
      data.executionPlaceholderNote,
      existing?.executionPlaceholderNote,
    ),
  }
}
