import type { MicroExerciseEntry } from '@/domain/microExercises'
import { hadMoment, isMoment, type MomentKind } from '@/domain/moments'
import type { ShameReaction } from '@/services/shamePartsService'
import { SHAME_REACTIONS } from '@/services/shamePartsService'

/**
 * Bridges from a path's Momenty into the wizards (plan v3 §7.3): a step with
 * `startFrom: 'moment'` opens a picker and launches the exercise with
 * `?momentId=`; the wizard reads the moment and PREFILLS what it already
 * knows (situation, the critic's sentence, the part), all of it editable.
 * `startFrom: 'fairDemand'` seeds the core-beliefs wizard from the latest
 * "O czym jest ten wstyd?" entry instead.
 */

export interface MomentSeed {
  entryId: string
  createdAt: string
  /** What happened, as written in the moment (may be empty for quick taps). */
  situation: string
  /** What the critic said. */
  criticThought: string
  /** The kind voice, when written. */
  kindVoice: string
  /** The compass part that took the wheel (a reaction, or `none`). */
  reaction?: ShameReaction
  about?: string
  strength?: number
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function momentSeedFrom(entry: MicroExerciseEntry): MomentSeed {
  const compass = entry.responses.compass
  const picked = typeof compass === 'string' ? compass : Array.isArray(compass) ? compass[0] : undefined
  const reaction =
    typeof picked === 'string' && (SHAME_REACTIONS as readonly string[]).includes(picked) ? (picked as ShameReaction) : undefined
  const about = text(entry.responses.about)
  const strength = entry.responses.strength
  return {
    entryId: entry.id,
    createdAt: entry.createdAt,
    situation: text(entry.responses.situation),
    criticThought: text(entry.responses.criticSaid),
    kindVoice: text(entry.responses.kindVoice),
    ...(reaction ? { reaction } : {}),
    ...(about ? { about } : {}),
    ...(typeof strength === 'number' ? { strength } : {}),
  }
}

/** The path's moments a picker offers: newest first, moments only (no calm-day notes). */
export function pickableMoments(entries: readonly MicroExerciseEntry[], kind: MomentKind, limit = 12): MicroExerciseEntry[] {
  return [...entries]
    .filter((entry) => isMoment(entry, kind) && hadMoment(entry))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)
}

/** The latest "reasonable demand" written in "O czym jest ten wstyd?" (`shame-or-guilt.fairDemand`). */
export function latestFairDemand(entries: readonly MicroExerciseEntry[]): string {
  const entry = [...entries]
    .filter((candidate) => candidate.exerciseSlug === 'shame-or-guilt' && text(candidate.responses.fairDemand))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return entry ? text(entry.responses.fairDemand) : ''
}

/** The latest critic sentence written in a shame moment. */
export function latestCriticThought(entries: readonly MicroExerciseEntry[]): string {
  const entry = pickableMoments(entries, 'shame', Infinity).find((candidate) => text(candidate.responses.criticSaid))
  return entry ? text(entry.responses.criticSaid) : ''
}
