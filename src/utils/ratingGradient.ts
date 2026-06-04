/**
 * Color picker for rating bars in the Today overview.
 *
 * Two modes:
 *  - **With target** (KR / habit): values below the target use the rose scale
 *    (worse = stronger rose); values at or above target use the sky scale
 *    (better = stronger sky). For `lte` targets the direction flips — lower
 *    values are better, so they stay in the sky range.
 *  - **Without target** (tracker): a single sky-scale interpolation across the
 *    full scale range; higher = stronger blue.
 *
 * Returned strings are `rgb(r g b)` ready to drop into SVG fills / CSS — they
 * read CSS custom properties at runtime, so each theme can swap the palette.
 */

// Rating-bar ramps, soft → strong (see tokens.css `--rating-*`). These are
// dedicated, gently-saturated scales that top out at a soft mid-blue / dusty
// rose rather than dark navy/crimson, so the extreme bars stay calm. Kept off
// the shared --sky-* / --rose-* scale, which doubles as text-on-light chip
// colours. Index 0 = at/just past target, last index = extreme.
const SKY_RAMP = [
  'rgb(var(--rating-pos-1))',
  'rgb(var(--rating-pos-2))',
  'rgb(var(--rating-pos-3))',
  'rgb(var(--rating-pos-4))',
  'rgb(var(--rating-pos-5))',
]
const ROSE_RAMP = [
  'rgb(var(--rating-neg-1))',
  'rgb(var(--rating-neg-2))',
  'rgb(var(--rating-neg-3))',
  'rgb(var(--rating-neg-4))',
  'rgb(var(--rating-neg-5))',
]
// Trackers (no target) span the full range: keep a lighter low end (the two
// lightest shared sky stops) and climb into the gentle positive ramp.
const TRACKER_RAMP = [
  'rgb(var(--sky-100))',
  'rgb(var(--sky-200))',
  ...SKY_RAMP,
]

function lerpRamp(ramp: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  return ramp[Math.round(clamped * (ramp.length - 1))]
}

export interface RatingGradientOptions {
  value: number
  scaleMin: number
  scaleMax: number
  /** Target rating value (undefined for trackers without a target). */
  targetValue?: number
  /** Direction of the target ("gte" = higher is better, default). */
  targetOperator?: 'gte' | 'lte'
}

/**
 * Returns a CSS color string for a single bar fill given the rating value
 * and (optionally) a target the user is trying to meet.
 */
export function ratingBarColor(opts: RatingGradientOptions): string {
  const { value, scaleMin, scaleMax, targetValue, targetOperator } = opts
  const span = scaleMax - scaleMin
  if (span <= 0) return 'rgb(var(--sky-400))'

  if (targetValue === undefined) {
    // No target — just lerp across the tracker ramp from min → max
    const t = (value - scaleMin) / span
    return lerpRamp(TRACKER_RAMP, t)
  }

  const operator = targetOperator ?? 'gte'
  const meets =
    operator === 'gte' ? value >= targetValue : value <= targetValue

  if (meets) {
    // Higher (or lower for lte) above the target = stronger sky
    const distance =
      operator === 'gte'
        ? scaleMax === targetValue
          ? 0
          : (value - targetValue) / (scaleMax - targetValue)
        : scaleMin === targetValue
          ? 0
          : (targetValue - value) / (targetValue - scaleMin)
    // Climb the positive ramp: at-target → soft mid-blue (never dark navy).
    const idx = Math.round(distance * 4) // 0..4
    return SKY_RAMP[idx]
  }

  // Below (or above for lte) the target = rose. Farther = stronger.
  const distance =
    operator === 'gte'
      ? targetValue === scaleMin
        ? 0
        : (targetValue - value) / (targetValue - scaleMin)
      : targetValue === scaleMax
        ? 0
        : (value - targetValue) / (scaleMax - targetValue)
  // Climb the negative ramp: just-below → dusty rose (never dark crimson).
  const idx = Math.round(distance * 4) // 0..4
  return ROSE_RAMP[idx]
}

/**
 * Color used for empty-state "no entry" baselines on bar charts. Sits between
 * surface and the lightest sky shade so unrecorded days read as neutral.
 */
export const RATING_BAR_EMPTY_COLOR =
  'rgb(var(--neo-border) / 0.45)'
