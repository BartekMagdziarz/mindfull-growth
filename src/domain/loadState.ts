/**
 * Load & state — the two weekly-reflection axes per life area.
 *
 * Decision 2026-09-12/13 (see docs/planning-reflection-redesign.md, D10):
 *   - load  — how much the area demanded / how much went into it (arousal axis),
 *             backed by the matrix `demands` field;
 *   - state — how the area feels at the end of the week (pleasantness axis),
 *             backed by the matrix `state` field.
 *
 * A pair lands in one of four quadrants coloured with the emotion-quadrant
 * tokens. The midpoint (state = 3) is sky-500: between "ease" (light blue) and
 * "recovery" (sky-600) in blue intensity, without a verdict. The old `actions`
 * column stays in the data as history and is never drawn here.
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

/** Quadrant colours: the emotion-quadrant tokens plus the two sky steps. */
const QUADRANT_CSS: Record<LoadStateQuadrant, string> = {
  recovery: 'rgb(var(--sky-600))',
  strain: 'var(--color-quadrant-high-energy-low-pleasantness)',
  ease: 'var(--color-quadrant-low-energy-high-pleasantness)',
  low: 'var(--color-quadrant-low-energy-low-pleasantness)',
  neutral: 'rgb(var(--sky-500))',
}

/** Ink for the load axis (pencil) and for text on the dark quadrants. */
export const LOAD_INK_CSS = 'rgb(var(--sky-800))'

export function quadrantCss(quadrant: LoadStateQuadrant): string {
  return QUADRANT_CSS[quadrant]
}

/** Text colour readable on the quadrant background. */
export function quadrantInkCss(quadrant: LoadStateQuadrant): string {
  switch (quadrant) {
    case 'strain':
      return 'var(--color-quadrant-high-energy-low-pleasantness-text)'
    case 'ease':
      return 'var(--color-quadrant-low-energy-high-pleasantness-text)'
    case 'low':
      return 'var(--color-quadrant-low-energy-low-pleasantness-text)'
    default:
      return 'white'
  }
}

export function toRating(value: number | null | undefined): MaybeRating {
  if (value == null || !Number.isFinite(value)) return null
  const rounded = Math.round(value)
  if (rounded < 1 || rounded > 5) return null
  return rounded as Rating
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
export function classifyPair(load: MaybeRating, state: MaybeRating, midpoint: MidpointMode = 'blend'): PairClassification {
  if (load == null || state == null) return { quadrant: 'neutral' }
  if (state === 3) return { quadrant: 'neutral' }
  const good = isHigh(state)
  if (load === 3) {
    if (midpoint === 'strict') return { quadrant: 'neutral' }
    return good ? { quadrant: 'ease', blend: ['ease', 'recovery'] } : { quadrant: 'low', blend: ['low', 'strain'] }
  }
  if (isHigh(load)) return { quadrant: good ? 'recovery' : 'strain' }
  if (isLow(load)) return { quadrant: good ? 'ease' : 'low' }
  return { quadrant: 'neutral' }
}

/** Ready CSS colour for a pair (blends the two neighbours for load = 3). */
export function pairColor(load: MaybeRating, state: MaybeRating): string {
  const { quadrant, blend } = classifyPair(load, state)
  if (blend) return `color-mix(in oklab, ${quadrantCss(blend[0])} 50%, ${quadrantCss(blend[1])})`
  return quadrantCss(quadrant)
}

/** Text colour for content drawn on `pairColor`. */
export function pairInk(load: MaybeRating, state: MaybeRating): string {
  const { quadrant, blend } = classifyPair(load, state)
  if (blend && blend[1] === 'recovery') return LOAD_INK_CSS
  return quadrantInkCss(quadrant)
}

/** Neutral-tone verdict sentence — never "success / failure". */
export function verdictSentence(areaTitle: string, load: MaybeRating, state: MaybeRating): string {
  const { quadrant } = classifyPair(load, state, 'strict')
  const loadWord = load == null ? null : isHigh(load) ? 'ciężki' : isLow(load) ? 'lekki' : 'zwykły'
  switch (quadrant) {
    case 'recovery':
      return `${areaTitle}: ciężki tydzień, a kończysz go w dobrym stanie.`
    case 'strain':
      return `${areaTitle}: ciężki tydzień i czuć to na koniec.`
    case 'ease':
      return `${areaTitle}: lekki tydzień, dobry stan.`
    case 'low':
      return `${areaTitle}: lekki tydzień, a stan słaby — przyczyna leży raczej poza tym tygodniem.`
    default:
      if (load == null || state == null) return `${areaTitle}: brak pełnej oceny.`
      if (state === 3) return `${areaTitle}: ${loadWord} tydzień, stan bez wyraźnego wychylenia.`
      return `${areaTitle}: zwykłe obciążenie, ${isHigh(state) ? 'dobry' : 'słaby'} stan.`
  }
}

export type { LifeAreaKey }
