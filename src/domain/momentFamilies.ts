/**
 * Moment families — how a path reads "who took the wheel" in its Momenty.
 *
 * The shame path (v3) logs the compass of shame as IFS parts; the anger and
 * anxiety paths (v2, plan ideas/html-plans/2026-10-18-anger-anxiety-paths-v2.html
 * §2.2) log a *reaction* instead. The chart, the weekly reflection, the task
 * bridge and the week-pattern prompt read the same shape for all three:
 * one choice step naming the reaction, one multi-choice step naming what
 * was done instead, one 1–5 strength. Every family has two pairs (towards
 * others / towards oneself, the deeper shade = towards others) and one
 * "self" key — the pattern the path works toward — drawn as the sky.
 */

export type MomentFamilyKind = 'shame' | 'anger' | 'anxiety'

export interface MomentFamilyConfig {
  kind: MomentFamilyKind
  /** Response key of the choice naming the reaction (shame: `compass`). */
  reactionStep: string
  /** Response key of the multi-choice "what I did instead". */
  responseStep: string
  /** Response key of the 1–5 strength rating. */
  strengthStep: string
  /** Reaction keys in STACKING order, bottom → top: the self key first, then the inward pair, then the outward pair. */
  keys: readonly string[]
  /** The reaction that means "I stayed with myself / paused / approached". */
  selfKey: string
  /** Order for summaries and tables (the compass order for shame); defaults to `keys` without the self key, then the self key. */
  summaryKeys?: readonly string[]
  /** optionId → IFS part tag (the shame compass only); labels fall back to i18n. */
  labelsFromParts?: Readonly<Record<string, string>>
  /** The moves offered when a Moment is written down later in the weekly reflection (`nothing` last). */
  backfillResponses: readonly string[]
  /** Catalog slug of the Momenty variant that logs this kind. */
  variantSlug: string
}

export const MOMENT_FAMILIES: Readonly<Record<MomentFamilyKind, MomentFamilyConfig>> = {
  shame: {
    kind: 'shame',
    reactionStep: 'compass',
    responseStep: 'response',
    strengthStep: 'strength',
    keys: ['none', 'avoid', 'withdraw', 'attackSelf', 'attackOthers'],
    selfKey: 'none',
    summaryKeys: ['withdraw', 'attackSelf', 'attackOthers', 'avoid', 'none'],
    labelsFromParts: {
      withdraw: 'shame-compass:withdraw',
      attackSelf: 'shame-compass:attackSelf',
      attackOthers: 'shame-compass:attackOthers',
      avoid: 'shame-compass:avoid',
    },
    backfillResponses: ['breath', 'unblend', 'kindAct', 'contact', 'nothing'],
    variantSlug: 'moment-shame',
  },
  // Pauza · Milczenie (inward, light) · Na siebie (inward, deep) · Ostrzej (outward, light) · Wybuch (outward, deep)
  anger: {
    kind: 'anger',
    reactionStep: 'angerReaction',
    responseStep: 'angerResponse',
    strengthStep: 'angerStrength',
    keys: ['pause', 'silence', 'selfBlame', 'sharp', 'outburst'],
    selfKey: 'pause',
    backfillResponses: ['breath', 'pause', 'request', 'repair', 'nothing'],
    variantSlug: 'moment-anger',
  },
  // Podejście · Odkładanie (avoidance, light) · Wycofanie (avoidance, deep) · Sprawdzanie (reassurance, light) · Zamartwianie (reassurance, deep)
  anxiety: {
    kind: 'anxiety',
    reactionStep: 'anxietyReaction',
    responseStep: 'anxietyResponse',
    strengthStep: 'anxietyStrength',
    keys: ['approach', 'postpone', 'withdraw', 'check', 'worry'],
    selfKey: 'approach',
    backfillResponses: ['breath', 'stayed', 'anyway', 'noCheck', 'nothing'],
    variantSlug: 'moment-anxiety',
  },
}

/** Keys in summary order: the family's own order, else the stacking order with the self key last. */
export function summaryKeys(config: MomentFamilyConfig): readonly string[] {
  return config.summaryKeys ?? [...config.keys.filter((key) => key !== config.selfKey), config.selfKey]
}

export function isMomentFamilyKind(value: unknown): value is MomentFamilyKind {
  return value === 'shame' || value === 'anger' || value === 'anxiety'
}

/** The family for a kind value as stored in a Moment's responses (anything else reads as the shame compass). */
export function momentFamily(kind: unknown): MomentFamilyConfig {
  return isMomentFamilyKind(kind) ? MOMENT_FAMILIES[kind] : MOMENT_FAMILIES.shame
}

/** The reaction a Moment names, when it is one of the family's keys. */
export function reactionOf(responses: Readonly<Record<string, unknown>>, config: MomentFamilyConfig): string | undefined {
  const value = responses[config.reactionStep]
  const picked = typeof value === 'string' ? value : Array.isArray(value) ? value[0] : undefined
  return typeof picked === 'string' && config.keys.includes(picked) ? picked : undefined
}

/** The "what I did instead" answers of a Moment (strings only). */
export function responsesOf(responses: Readonly<Record<string, unknown>>, config: MomentFamilyConfig): string[] {
  const value = responses[config.responseStep]
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

/**
 * The Moment's 1–5 strength. Anger entries from before v2 carried a 0–10
 * `intensity`; they read as its half, rounded up, never below 1.
 */
export function strengthOf(responses: Readonly<Record<string, unknown>>, config: MomentFamilyConfig): number | undefined {
  const value = responses[config.strengthStep]
  if (typeof value === 'number' && value >= 1 && value <= 5) return value
  if (config.kind === 'anger') {
    const intensity = responses.intensity
    if (typeof intensity === 'number' && intensity >= 0 && intensity <= 10) return Math.min(5, Math.max(1, Math.ceil(intensity / 2)))
  }
  return undefined
}
