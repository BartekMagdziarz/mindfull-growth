/**
 * Centralized "rating → status color" mapping.
 *
 * Replaces ~8 near-identical implementations of `if (rating >= 8) return
 * 'bg-green-100 text-green-700'` scattered across components.
 *
 * - `statusForRating` collapses a numeric rating to a 3-bucket category.
 * - `statusClasses` returns Tailwind class strings for the category, drawn
 *   from our palette tokens (`--status-good/-warn/-bad`).
 *
 * Tweaking the thresholds OR the colors then only requires editing this
 * file (or `src/styles/tokens.css` for the color values).
 */

export type RatingStatus = 'good' | 'warn' | 'bad'

export interface StatusThresholds {
  /** Rating values >= this are 'good'. */
  good: number
  /** Rating values >= this (and < good) are 'warn'. Below are 'bad'. */
  warn: number
}

/** Defaults tuned for a 1–10 scale (used by Wheel of Life, Life Area scores). */
export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = {
  good: 8,
  warn: 4,
}

/** Returns the status bucket for a rating, given optional thresholds. */
export function statusForRating(
  rating: number,
  thresholds: StatusThresholds = DEFAULT_STATUS_THRESHOLDS,
): RatingStatus {
  if (rating >= thresholds.good) return 'good'
  if (rating >= thresholds.warn) return 'warn'
  return 'bad'
}

/**
 * Returns the status bucket from a 0–100 percentage. Used by Graded Exposure
 * (SUDS score 0..100) and similar.
 *
 * Note: for some metrics (e.g. exposure distress) LOWER is better; pass
 * `inverted: true` to flip the mapping.
 */
export function statusForPercent(
  percent: number,
  opts: { inverted?: boolean } = {},
): RatingStatus {
  const p = opts.inverted ? 100 - percent : percent
  if (p >= 70) return 'good'
  if (p >= 40) return 'warn'
  return 'bad'
}

/** Tailwind class triplet for a status: pill background + foreground. */
export function statusClasses(status: RatingStatus): {
  bg: string
  text: string
  pill: string
  fill: string
  fillBold: string
} {
  switch (status) {
    case 'good':
      return {
        bg: 'bg-status-good-soft',
        text: 'text-status-good-on',
        pill: 'bg-status-good-soft text-status-good-on',
        fill: 'fill-status-good',
        fillBold: 'fill-status-good-on',
      }
    case 'warn':
      return {
        bg: 'bg-status-warn-soft',
        text: 'text-status-warn-on',
        pill: 'bg-status-warn-soft text-status-warn-on',
        fill: 'fill-status-warn',
        fillBold: 'fill-status-warn-on',
      }
    case 'bad':
      return {
        bg: 'bg-status-bad-soft',
        text: 'text-status-bad-on',
        pill: 'bg-status-bad-soft text-status-bad-on',
        fill: 'fill-status-bad',
        fillBold: 'fill-status-bad-on',
      }
  }
}

/** Shorthand: combine `statusForRating` + `statusClasses().pill`. */
export function ratingPillClasses(
  rating: number,
  thresholds?: StatusThresholds,
): string {
  return statusClasses(statusForRating(rating, thresholds)).pill
}
