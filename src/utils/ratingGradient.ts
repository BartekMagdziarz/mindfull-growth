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

type PaletteStop =
  | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800

function paletteVar(family: 'sky' | 'rose', stop: PaletteStop): string {
  return `rgb(var(--${family}-${stop}))`
}

function lerpStop(stops: PaletteStop[], t: number): PaletteStop {
  const clamped = Math.max(0, Math.min(1, t))
  const idx = Math.round(clamped * (stops.length - 1))
  return stops[idx]
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
  if (span <= 0) return paletteVar('sky', 400)

  if (targetValue === undefined) {
    // No target — just lerp across the sky scale from min → max
    const t = (value - scaleMin) / span
    return paletteVar('sky', lerpStop([100, 200, 300, 400, 500, 600, 700], t))
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
    // Land between sky-300 (just at target) and sky-700 (extreme)
    const idx = Math.round(distance * 4) // 0..4
    return paletteVar('sky', ([300, 400, 500, 600, 700] as PaletteStop[])[idx])
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
  // Land between rose-200 (just below target) and rose-600 (worst).
  const idx = Math.round(distance * 4) // 0..4
  return paletteVar('rose', ([200, 300, 400, 500, 600] as PaletteStop[])[idx])
}

/**
 * Color used for empty-state "no entry" baselines on bar charts. Sits between
 * surface and the lightest sky shade so unrecorded days read as neutral.
 */
export const RATING_BAR_EMPTY_COLOR =
  'rgb(var(--neo-border) / 0.45)'
