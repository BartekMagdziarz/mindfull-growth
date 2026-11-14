/**
 * Colour of one load & state pair as drawn by the month matrix (decision
 * 2026-11-14, UX Lab `/concepts/load-state-clouds`, round 8).
 *
 * The bar's length is the load and the dot's position is the state; the
 * colour repeats the pair in the emotion-quadrant convention:
 *   - ordinary or good state → blue, light → heavy week (`good-1…5`),
 *   - poor state in a busy week → rose (`strain-1…4`),
 *   - poor state in a light week → violet (`low-1…2`).
 * Intensity = load + how extreme the state is, so the strongest step of a
 * ladder belongs to the corner pair only (5 · 5 and 5 · 1).
 *
 * State 3 is a transition: the bar starts in its own blue and runs towards
 * the colour of the same load one state lower. How far it gets depends on the
 * load — clearly at loads 1 and 5, barely in the middle, so an ordinary week
 * (3 · 3) stays a pale blue.
 *
 * Everything is a CSS value on design-system tokens; the browser mixes the
 * colours (`color-mix` in oklab), so themes need no extra work.
 */

import type { MaybeRating, Rating } from '@/domain/loadState'

export interface LoadStateTone {
  /** `background` of the bar: one colour, or a left-to-right gradient for state 3. */
  fill: string
  /** Flat colour of the pair — the centre of the state dot. */
  mark: string
  /** Paper tinted with `mark` — the field of the state dot. */
  field: string
}

/** Role suffix of `--mg-color-load-*` for a pair outside the transition. */
export type LoadToneRole =
  | 'good-1'
  | 'good-2'
  | 'good-3'
  | 'good-4'
  | 'good-5'
  | 'strain-1'
  | 'strain-2'
  | 'strain-3'
  | 'strain-4'
  | 'low-1'
  | 'low-2'

const GOOD: LoadToneRole[] = ['good-1', 'good-1', 'good-2', 'good-3', 'good-4', 'good-5']
const STRAIN: LoadToneRole[] = ['strain-1', 'strain-2', 'strain-3', 'strain-4']

/** Loads 1–2 share a step, then one step per load: 0 · 1 · 2 · 3. */
const loadBucket = (load: Rating) => (load <= 2 ? 0 : load - 2)

/** The ladder step of a pair; for state 3 this is where the transition starts. */
export function loadToneRole(load: Rating, state: Rating): LoadToneRole {
  if (state >= 3) return GOOD[loadBucket(load) + (state - 3)]
  if (load <= 2) return state === 2 ? 'low-1' : 'low-2'
  return STRAIN[load - 3 + (2 - state)]
}

/**
 * How far the end of a state-3 bar gets towards the colour one state lower,
 * for loads 1…5. The dot takes half of it (the mean colour of the bar).
 */
export const TRANSITION_REACH: readonly number[] = [0.7, 0.3, 0.16, 0.36, 0.7]

/** Share of the dot's colour in its paper field. */
const FIELD_TINT = 24

const token = (role: LoadToneRole) => `var(--mg-color-load-${role})`
const percent = (share: number) => `${Math.round(share * 1000) / 10}%`
const mix = (from: string, to: string, share: number) =>
  `color-mix(in oklab, ${to} ${percent(share)}, ${from})`
const fieldOf = (mark: string) =>
  `color-mix(in oklab, ${mark} ${FIELD_TINT}%, var(--mg-color-paper))`

/** Fill, dot centre and dot field for a pair; `null` when the week is not fully rated. */
export function loadStateTone(load: MaybeRating, state: MaybeRating): LoadStateTone | null {
  if (load == null || state == null) return null
  const from = token(loadToneRole(load, state))
  if (state !== 3) return { fill: from, mark: from, field: fieldOf(from) }

  const to = token(loadToneRole(load, 2))
  const reach = TRANSITION_REACH[load - 1]
  const stops = [0.25, 0.5, 0.75, 1].map(t => mix(from, to, t * reach))
  const mark = mix(from, to, reach / 2)
  return {
    fill: `linear-gradient(90deg, ${[from, ...stops].join(', ')})`,
    mark,
    field: fieldOf(mark),
  }
}
