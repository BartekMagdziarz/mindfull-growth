/**
 * Load & state — the two weekly-reflection axes per life area.
 *
 * Decision 2026-09-12/13 (see docs/planning-reflection-redesign.md, D10):
 *   - load  — how much the area demanded / how much went into it (arousal axis),
 *             backed by the matrix `demands` field;
 *   - state — how the area feels at the end of the week (pleasantness axis),
 *             backed by the matrix `state` field.
 *
 * A pair lands in one of four quadrants (the emotion-quadrant convention) —
 * `classifyPair` names it for descriptions. How a pair is drawn and coloured
 * lives in `loadStateTone.ts` (lying bar = load, dot = state). The old
 * `actions` column stays in the data as history and is never drawn.
 */

import type { LifeAreaKey } from '@/domain/reflectionMatrix'

export type Rating = 1 | 2 | 3 | 4 | 5
export type MaybeRating = Rating | null

export interface LoadStatePair {
  load: MaybeRating
  state: MaybeRating
}

export type LoadStateQuadrant = 'recovery' | 'strain' | 'ease' | 'low' | 'neutral'

/** How to treat a 3 on the load axis when the state axis is decided. */
export type MidpointMode = 'blend' | 'strict'

export const QUADRANT_LABELS: Record<LoadStateQuadrant, string> = {
  recovery: 'aktywny i dobry',
  strain: 'trudny',
  ease: 'luźny',
  low: 'słaby',
  neutral: 'zwykły',
}

export function toRating(value: number | null | undefined): MaybeRating {
  if (value == null || !Number.isFinite(value)) return null
  const whole = Math.round(value)
  if (whole < 1 || whole > 5) return null
  return whole as Rating
}

const isLow = (v: Rating) => v <= 2
const isHigh = (v: Rating) => v >= 4

export interface PairClassification {
  quadrant: LoadStateQuadrant
  /** Two neighbours to mix — only when load = 3, state decided, mode `blend`. */
  blend?: [LoadStateQuadrant, LoadStateQuadrant]
}

/**
 * Quadrant of a pair. State = 3 → no verdict (neutral). Load = 3 with a decided
 * state: `blend` returns the state-side quadrant with a blend hint, `strict`
 * returns neutral.
 */
export function classifyPair(
  load: MaybeRating,
  state: MaybeRating,
  midpoint: MidpointMode = 'blend'
): PairClassification {
  if (load == null || state == null) return { quadrant: 'neutral' }
  if (state === 3) return { quadrant: 'neutral' }
  const good = isHigh(state)
  if (load === 3) {
    if (midpoint === 'strict') return { quadrant: 'neutral' }
    return good
      ? { quadrant: 'ease', blend: ['ease', 'recovery'] }
      : { quadrant: 'low', blend: ['low', 'strain'] }
  }
  if (isHigh(load)) return { quadrant: good ? 'recovery' : 'strain' }
  if (isLow(load)) return { quadrant: good ? 'ease' : 'low' }
  return { quadrant: 'neutral' }
}

export type { LifeAreaKey }
