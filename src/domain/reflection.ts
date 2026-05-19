import type { MonthRef, WeekRef } from '@/domain/period'
import { assertPeriodRef, getPeriodType } from '@/utils/periods'

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export interface ReflectionRecordBase {
  id: string
  createdAt: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Weekly Reflection
// ---------------------------------------------------------------------------

export interface WeeklyReflection extends ReflectionRecordBase {
  weekRef: WeekRef

  // Context — how demanding was this week? (1–5, null = not yet rated)
  physicalIntensityRating: number | null
  taskLoadRating: number | null
  emotionalIntensityRating: number | null
  socialIntensityRating: number | null

  // State — how do I feel at end of week? (1–5)
  moodRating: number | null
  energyRating: number | null
  calmRating: number | null
  connectionRating: number | null

  // Evaluation — how did I do? (1–5)
  productivityRating: number | null
  engagementRating: number | null
  emotionalRegulationRating: number | null
  selfCareRating: number | null

  // Structured prompt responses (keyed by prompt key — flexible for future changes)
  promptResponses: Record<string, string>

  // Free-form reflection
  freeformReflection: string

  // AI-generated narrative summary. Empty string means none. Mock content for now.
  aiSummary: string
}

export type CreateWeeklyReflectionPayload = Omit<
  WeeklyReflection,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateWeeklyReflectionPayload = Partial<
  Omit<WeeklyReflection, 'id' | 'createdAt' | 'updatedAt'>
>

// ---------------------------------------------------------------------------
// Monthly Reflection
// ---------------------------------------------------------------------------

export interface MonthlyReflection extends ReflectionRecordBase {
  monthRef: MonthRef

  // Dimension ratings (1–5, null = not yet rated)
  balanceRating: number | null
  purposeRating: number | null
  growthRating: number | null
  coherenceRating: number | null
  agencyRating: number | null

  // Structured prompt responses
  promptResponses: Record<string, string>

  // Free-form reflection
  freeformReflection: string
}

export type CreateMonthlyReflectionPayload = Omit<
  MonthlyReflection,
  'id' | 'createdAt' | 'updatedAt'
>
export type UpdateMonthlyReflectionPayload = Partial<
  Omit<MonthlyReflection, 'id' | 'createdAt' | 'updatedAt'>
>

// ---------------------------------------------------------------------------
// Rating dimension keys (for iteration in UI)
// ---------------------------------------------------------------------------

export const WEEKLY_CONTEXT_KEYS = [
  'physicalIntensityRating',
  'taskLoadRating',
  'emotionalIntensityRating',
  'socialIntensityRating',
] as const

export const WEEKLY_STATE_KEYS = [
  'moodRating',
  'energyRating',
  'calmRating',
  'connectionRating',
] as const

export const WEEKLY_EVALUATION_KEYS = [
  'productivityRating',
  'engagementRating',
  'emotionalRegulationRating',
  'selfCareRating',
] as const

export const WEEKLY_RATING_KEYS = [
  ...WEEKLY_CONTEXT_KEYS,
  ...WEEKLY_STATE_KEYS,
  ...WEEKLY_EVALUATION_KEYS,
] as const

export type WeeklyRatingKey = (typeof WEEKLY_RATING_KEYS)[number]

export const MONTHLY_RATING_KEYS = [
  'balanceRating',
  'purposeRating',
  'growthRating',
  'coherenceRating',
  'agencyRating',
] as const

export type MonthlyRatingKey = (typeof MONTHLY_RATING_KEYS)[number]

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

function clampRating(value: unknown, fallback: number | null): number | null {
  const source = value ?? fallback
  if (source === null || source === undefined) return null
  const num = typeof source === 'number' ? source : Number(source)
  if (isNaN(num)) return null
  return Math.max(1, Math.min(5, Math.round(num)))
}

function normalizeText(value: unknown, fallback: string): string {
  const source = value ?? fallback
  if (typeof source !== 'string') return ''
  return source.trim()
}

function normalizePromptResponses(
  value: unknown,
  fallback: Record<string, string>
): Record<string, string> {
  const source = (value ?? fallback) as Record<string, string> | undefined
  if (!source || typeof source !== 'object') return {}
  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(source)) {
    if (typeof val === 'string') {
      result[key] = val.trim()
    }
  }
  return result
}

export function normalizeWeeklyReflectionPayload(
  data: CreateWeeklyReflectionPayload | UpdateWeeklyReflectionPayload,
  existing?: WeeklyReflection
): Omit<WeeklyReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const weekRef = normalizeWeekRefField(data.weekRef, existing?.weekRef)

  return {
    weekRef,
    // Context
    physicalIntensityRating: clampRating(data.physicalIntensityRating, existing?.physicalIntensityRating ?? null),
    taskLoadRating: clampRating(data.taskLoadRating, existing?.taskLoadRating ?? null),
    emotionalIntensityRating: clampRating(data.emotionalIntensityRating, existing?.emotionalIntensityRating ?? null),
    socialIntensityRating: clampRating(data.socialIntensityRating, existing?.socialIntensityRating ?? null),
    // State
    moodRating: clampRating(data.moodRating, existing?.moodRating ?? null),
    energyRating: clampRating(data.energyRating, existing?.energyRating ?? null),
    calmRating: clampRating(data.calmRating, existing?.calmRating ?? null),
    connectionRating: clampRating(data.connectionRating, existing?.connectionRating ?? null),
    // Evaluation
    productivityRating: clampRating(data.productivityRating, existing?.productivityRating ?? null),
    engagementRating: clampRating(data.engagementRating, existing?.engagementRating ?? null),
    emotionalRegulationRating: clampRating(data.emotionalRegulationRating, existing?.emotionalRegulationRating ?? null),
    selfCareRating: clampRating(data.selfCareRating, existing?.selfCareRating ?? null),
    // Text
    promptResponses: normalizePromptResponses(
      data.promptResponses,
      existing?.promptResponses ?? {}
    ),
    freeformReflection: normalizeText(data.freeformReflection, existing?.freeformReflection ?? ''),
    aiSummary: normalizeText(data.aiSummary, existing?.aiSummary ?? ''),
  }
}

export function normalizeMonthlyReflectionPayload(
  data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload,
  existing?: MonthlyReflection
): Omit<MonthlyReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const monthRef = normalizeMonthRefField(data.monthRef, existing?.monthRef)

  return {
    monthRef,
    balanceRating: clampRating(data.balanceRating, existing?.balanceRating ?? null),
    purposeRating: clampRating(data.purposeRating, existing?.purposeRating ?? null),
    growthRating: clampRating(data.growthRating, existing?.growthRating ?? null),
    coherenceRating: clampRating(data.coherenceRating, existing?.coherenceRating ?? null),
    agencyRating: clampRating(data.agencyRating, existing?.agencyRating ?? null),
    promptResponses: normalizePromptResponses(
      data.promptResponses,
      existing?.promptResponses ?? {}
    ),
    freeformReflection: normalizeText(data.freeformReflection, existing?.freeformReflection ?? ''),
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalizeWeekRefField(value: unknown, fallback?: WeekRef): WeekRef {
  const source = value ?? fallback
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('weekRef is required')
  }
  const trimmed = source.trim()
  assertPeriodRef(trimmed)
  if (getPeriodType(trimmed) !== 'week') {
    throw new Error('weekRef must be a WeekRef')
  }
  return trimmed as WeekRef
}

function normalizeMonthRefField(value: unknown, fallback?: MonthRef): MonthRef {
  const source = value ?? fallback
  if (typeof source !== 'string' || !source.trim()) {
    throw new Error('monthRef is required')
  }
  const trimmed = source.trim()
  assertPeriodRef(trimmed)
  if (getPeriodType(trimmed) !== 'month') {
    throw new Error('monthRef must be a MonthRef')
  }
  return trimmed as MonthRef
}
