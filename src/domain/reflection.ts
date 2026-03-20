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

  // Subjective dimension ratings (1–5, null = not yet rated)
  moodRating: number | null
  energyRating: number | null
  focusRating: number | null
  socialConnectionRating: number | null
  stressLevelRating: number | null

  // Structured prompt responses (keyed by prompt key — flexible for future changes)
  promptResponses: Record<string, string>

  // Free-form reflection
  freeformReflection: string

  // Looking ahead
  lookingAhead: string
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

  // Subjective dimension ratings (1–5, null = not yet rated)
  purposeRating: number | null
  motivationRating: number | null
  growthRating: number | null
  lifeSatisfactionRating: number | null
  alignmentRating: number | null

  // Structured prompt responses
  promptResponses: Record<string, string>

  // Free-form reflection
  freeformReflection: string

  // Looking ahead
  lookingAhead: string
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

export const WEEKLY_RATING_KEYS = [
  'moodRating',
  'energyRating',
  'focusRating',
  'socialConnectionRating',
  'stressLevelRating',
] as const

export type WeeklyRatingKey = (typeof WEEKLY_RATING_KEYS)[number]

export const MONTHLY_RATING_KEYS = [
  'purposeRating',
  'motivationRating',
  'growthRating',
  'lifeSatisfactionRating',
  'alignmentRating',
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
    moodRating: clampRating(data.moodRating, existing?.moodRating ?? null),
    energyRating: clampRating(data.energyRating, existing?.energyRating ?? null),
    focusRating: clampRating(data.focusRating, existing?.focusRating ?? null),
    socialConnectionRating: clampRating(
      data.socialConnectionRating,
      existing?.socialConnectionRating ?? null
    ),
    stressLevelRating: clampRating(data.stressLevelRating, existing?.stressLevelRating ?? null),
    promptResponses: normalizePromptResponses(
      data.promptResponses,
      existing?.promptResponses ?? {}
    ),
    freeformReflection: normalizeText(data.freeformReflection, existing?.freeformReflection ?? ''),
    lookingAhead: normalizeText(data.lookingAhead, existing?.lookingAhead ?? ''),
  }
}

export function normalizeMonthlyReflectionPayload(
  data: CreateMonthlyReflectionPayload | UpdateMonthlyReflectionPayload,
  existing?: MonthlyReflection
): Omit<MonthlyReflection, 'id' | 'createdAt' | 'updatedAt'> {
  const monthRef = normalizeMonthRefField(data.monthRef, existing?.monthRef)

  return {
    monthRef,
    purposeRating: clampRating(data.purposeRating, existing?.purposeRating ?? null),
    motivationRating: clampRating(data.motivationRating, existing?.motivationRating ?? null),
    growthRating: clampRating(data.growthRating, existing?.growthRating ?? null),
    lifeSatisfactionRating: clampRating(
      data.lifeSatisfactionRating,
      existing?.lifeSatisfactionRating ?? null
    ),
    alignmentRating: clampRating(data.alignmentRating, existing?.alignmentRating ?? null),
    promptResponses: normalizePromptResponses(
      data.promptResponses,
      existing?.promptResponses ?? {}
    ),
    freeformReflection: normalizeText(data.freeformReflection, existing?.freeformReflection ?? ''),
    lookingAhead: normalizeText(data.lookingAhead, existing?.lookingAhead ?? ''),
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
