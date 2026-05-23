/**
 * Centralized semantic-color maps for exercise UI elements that were
 * previously expressed via raw Tailwind classes (e.g. `bg-blue-100
 * text-blue-700` repeated across 7+ files for IFS managers).
 *
 * The values here reference our palette tokens defined in
 * `src/styles/tokens.css` — so changing a role's appearance requires
 * editing exactly one place (the CSS var) and these constants stay
 * the same.
 */

import type { IFSPartRole } from '@/domain/exercises'

export interface RoleColorClasses {
  /** Background + text classes for a pill / chip. */
  bg: string
  text: string
  /** Background-only class (e.g. dot indicator). */
  dot: string
  /** Solid accent (border, icon stroke). */
  solid: string
}

/* ----------------------------- IFS roles ---------------------------------- */

export const IFS_ROLE_CLASSES: Record<IFSPartRole, RoleColorClasses> = {
  manager: {
    bg: 'bg-ifs-manager-soft',
    text: 'text-ifs-manager-on',
    dot: 'bg-ifs-manager',
    solid: 'text-ifs-manager',
  },
  firefighter: {
    bg: 'bg-ifs-firefighter-soft',
    text: 'text-ifs-firefighter-on',
    dot: 'bg-ifs-firefighter',
    solid: 'text-ifs-firefighter',
  },
  exile: {
    bg: 'bg-ifs-exile-soft',
    text: 'text-ifs-exile-on',
    dot: 'bg-ifs-exile',
    solid: 'text-ifs-exile',
  },
  unknown: {
    bg: 'bg-neu-base',
    text: 'text-neu-muted',
    dot: 'bg-neu-border',
    solid: 'text-neu-muted',
  },
}

/** SVG fill/stroke classes for IFS part shapes (Constellation, PartsMapping). */
export const IFS_ROLE_SVG_CLASSES: Record<IFSPartRole, string> = {
  manager: 'fill-ifs-manager-soft stroke-ifs-manager',
  firefighter: 'fill-ifs-firefighter-soft stroke-ifs-firefighter',
  exile: 'fill-ifs-exile-soft stroke-ifs-exile',
  unknown: 'fill-neu-base stroke-neu-border',
}

/** CSS color value (consumed by `:stroke="..."` SVG bindings). */
export const IFS_ROLE_STROKE_VAR: Record<IFSPartRole, string> = {
  manager: 'rgb(var(--ifs-manager))',
  firefighter: 'rgb(var(--ifs-firefighter))',
  exile: 'rgb(var(--ifs-exile))',
  unknown: 'rgb(var(--neo-border))',
}

/* --------------------- Constellation relationship lines ------------------- */

export type RelationshipType =
  | 'polarized'
  | 'allied'
  | 'protector-exile'
  | 'triggers'
  | 'soothes'
  | 'protects'

/** CSS color for SVG stroke. Reads CSS vars so themes can re-tint relations. */
export const RELATIONSHIP_STROKE_VAR: Record<string, string> = {
  polarized: 'rgb(var(--rel-polarized))',
  allied: 'rgb(var(--rel-allied))',
  'protector-exile': 'rgb(var(--rel-protects))',
  protects: 'rgb(var(--rel-protects))',
  triggers: 'rgb(var(--ifs-firefighter))',
  soothes: 'rgb(var(--status-good))',
  default: 'rgb(var(--neo-border))',
}

export const RELATIONSHIP_PILL_CLASSES: Record<string, string> = {
  polarized: 'bg-status-bad-soft text-status-bad-on',
  allied: 'bg-ifs-manager-soft text-ifs-manager-on',
  'protector-exile': 'bg-ifs-exile-soft text-ifs-exile-on',
}

/* ----------------------- Insight tags (CBT / IFS) ------------------------- */

export type InsightTag =
  | 'core-fear'
  | 'need'
  | 'positive-intention'
  | 'memory'
  | 'belief'

export const INSIGHT_TAG_CLASSES: Record<InsightTag, string> = {
  'core-fear': 'bg-insight-fear-soft text-insight-fear-on',
  need: 'bg-insight-need-soft text-insight-need-on',
  'positive-intention': 'bg-insight-intention-soft text-insight-intention-on',
  memory: 'bg-insight-memory-soft text-insight-memory-on',
  belief: 'bg-insight-belief-soft text-insight-belief-on',
}

/* ----------------- Behavioral Activation activity categories -------------- */

export type ActivityCategoryKey =
  | 'pleasure'
  | 'mastery'
  | 'social'
  | 'physical'
  | 'values-aligned'

export const ACTIVITY_CATEGORY_CLASSES: Record<
  ActivityCategoryKey,
  { color: string; dot: string }
> = {
  pleasure: {
    color: 'bg-activity-pleasure-soft text-activity-pleasure-on',
    dot: 'bg-activity-pleasure',
  },
  mastery: {
    color: 'bg-activity-mastery-soft text-activity-mastery-on',
    dot: 'bg-activity-mastery',
  },
  social: {
    color: 'bg-activity-social-soft text-activity-social-on',
    dot: 'bg-activity-social',
  },
  physical: {
    color: 'bg-activity-physical-soft text-activity-physical-on',
    dot: 'bg-activity-physical',
  },
  'values-aligned': {
    color: 'bg-activity-values-soft text-activity-values-on',
    dot: 'bg-activity-values',
  },
}

/* --------------------- Exercise tab categories ---------------------------- */

export type ExerciseCategory =
  | 'self-discovery'
  | 'cbt'
  | 'logotherapy'
  | 'ifs'

export const EXERCISE_CATEGORY_CLASSES: Record<
  ExerciseCategory,
  { bg: string; text: string }
> = {
  'self-discovery': {
    bg: 'bg-exercise-discovery-soft',
    text: 'text-exercise-discovery-on',
  },
  cbt: {
    bg: 'bg-exercise-cbt-soft',
    text: 'text-exercise-cbt-on',
  },
  logotherapy: {
    bg: 'bg-exercise-logo-soft',
    text: 'text-exercise-logo-on',
  },
  ifs: {
    bg: 'bg-exercise-ifs-soft',
    text: 'text-exercise-ifs-on',
  },
}
