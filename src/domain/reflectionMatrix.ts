import type { WeeklyRatingKey } from '@/domain/reflection'

/**
 * The weekly-reflection rating matrix: 4 life areas × 3 sections.
 *
 * A rating cell has no standalone display name — it is identified by its
 * coordinates (area × section). Question texts and 1–5 scale anchors live in
 * i18n under `planning.reflection.weekly.areas.<area>.<section>` and carry all
 * the semantic nuance; where a standalone label is needed (tooltips, summaries)
 * use `composeCellLabel` ("Stan · Zadania").
 *
 * Section order is the causal chain: demands (load) → actions (response) →
 * state (outcome). Area order is the canonical display order everywhere.
 */

export type LifeAreaKey = 'body' | 'emotions' | 'tasks' | 'closeOnes'
export type MatrixSection = 'demands' | 'actions' | 'state'

export const MATRIX_SECTIONS = ['demands', 'actions', 'state'] as const satisfies readonly MatrixSection[]

export interface ReflectionMatrixArea {
  key: LifeAreaKey
  /** Material Symbols name for the area (single constant — easy to swap). */
  icon: string
  /** WeeklyReflection rating field per section. */
  fields: Record<MatrixSection, WeeklyRatingKey>
}

export const REFLECTION_MATRIX_AREAS: readonly ReflectionMatrixArea[] = [
  {
    key: 'body',
    icon: 'fitness_center',
    fields: {
      demands: 'physicalIntensityRating',
      actions: 'physicalCareRating',
      state: 'energyRating',
    },
  },
  {
    key: 'emotions',
    icon: 'favorite',
    fields: {
      demands: 'emotionalIntensityRating',
      actions: 'emotionalProcessingRating',
      state: 'moodRating',
    },
  },
  {
    key: 'tasks',
    icon: 'checklist',
    fields: {
      demands: 'taskLoadRating',
      actions: 'productivityRating',
      state: 'calmRating',
    },
  },
  {
    key: 'closeOnes',
    icon: 'diversity_1',
    fields: {
      demands: 'closeOnesNeedsRating',
      actions: 'closeOnesSupportRating',
      state: 'connectionRating',
    },
  },
] as const

// ---------------------------------------------------------------------------
// i18n key wiring (components resolve the keys with t()/tg() themselves)
// ---------------------------------------------------------------------------

export function areaTitleKey(area: LifeAreaKey): string {
  return `planning.reflection.weekly.areas.${area}.title`
}

export function sectionTitleKey(section: MatrixSection): string {
  return `planning.reflection.weekly.groups.${section}.title`
}

export function cellQuestionKey(area: LifeAreaKey, section: MatrixSection): string {
  return `planning.reflection.weekly.areas.${area}.${section}.question`
}

export function cellAnchorKey(
  area: LifeAreaKey,
  section: MatrixSection,
  end: 'low' | 'high'
): string {
  return `planning.reflection.weekly.areas.${area}.${section}.${end}`
}

/** Standalone cell label for tooltips/summaries, e.g. "Stan · Zadania". */
export function composeCellLabel(
  t: (key: string) => string,
  area: LifeAreaKey,
  section: MatrixSection
): string {
  return `${t(sectionTitleKey(section))} · ${t(areaTitleKey(area))}`
}

// ---------------------------------------------------------------------------
// Per-cell 5-level icon tuples for IconScaleSelector (level 1 → 5)
// ---------------------------------------------------------------------------

type IconTuple = [string, string, string, string, string]

export const MATRIX_CELL_ICONS: Record<LifeAreaKey, Record<MatrixSection, IconTuple>> = {
  body: {
    demands: ['hotel', 'airline_seat_recline_normal', 'directions_walk', 'directions_run', 'sprint'],
    actions: ['heart_broken', 'heart_minus', 'heart_check', 'heart_plus', 'favorite'],
    state: ['battery_0_bar', 'battery_2_bar', 'battery_4_bar', 'battery_full', 'battery_charging_full'],
  },
  emotions: {
    demands: ['wb_sunny', 'partly_cloudy_day', 'rainy', 'thunderstorm', 'cyclone'],
    actions: ['visibility_off', 'sentiment_frustrated', 'sentiment_neutral', 'sentiment_calm', 'shield_with_heart'],
    state: ['sentiment_very_dissatisfied', 'sentiment_dissatisfied', 'sentiment_neutral', 'sentiment_satisfied', 'sentiment_very_satisfied'],
  },
  tasks: {
    demands: ['inbox', 'task', 'checklist', 'assignment_late', 'local_fire_department'],
    actions: ['block', 'trending_down', 'trending_flat', 'trending_up', 'rocket_launch'],
    state: ['earthquake', 'air', 'airwave', 'waves', 'self_improvement'],
  },
  closeOnes: {
    demands: ['bedtime', 'person', 'group', 'priority_high', 'sos'],
    actions: ['do_not_disturb_on', 'person_off', 'person', 'volunteer_activism', 'favorite'],
    state: ['person_off', 'person', 'group', 'diversity_3', 'favorite'],
  },
}
