/**
 * Colors for the 8 Self-Energy ("8 C's") qualities used by IFS exercises.
 *
 * The `--self-<quality>` CSS variables (tokens.css) hold RGB triples, so a
 * quality at any opacity is `rgb(var(--self-x) / a)` — no runtime lookup, and
 * a theme switch repaints on its own. Values must be applied through `style`
 * (CSS), not SVG presentation attributes, which do not resolve var().
 */

import type { SelfEnergyQuality } from '@/domain/exercises'

/** The quality's color at the requested opacity (0..1), for SVG fills and strokes. */
export function getQualityColor(quality: SelfEnergyQuality, opacity: number): string {
  return `rgb(var(--self-${quality}) / ${opacity})`
}

/** Convenience: the opaque CSS variable reference, for backgrounds/borders. */
export function getQualityVar(quality: SelfEnergyQuality): string {
  return `rgb(var(--self-${quality}))`
}

/** Tailwind class for the quality's text color (used by the wizard summary). */
export const SELF_ENERGY_QUALITY_TEXT_CLASS: Record<SelfEnergyQuality, string> = {
  calm: 'text-[rgb(var(--self-calm))]',
  curiosity: 'text-[rgb(var(--self-curiosity))]',
  compassion: 'text-[rgb(var(--self-compassion))]',
  clarity: 'text-[rgb(var(--self-clarity))]',
  courage: 'text-[rgb(var(--self-courage))]',
  creativity: 'text-[rgb(var(--self-creativity))]',
  confidence: 'text-[rgb(var(--self-confidence))]',
  connection: 'text-[rgb(var(--self-connection))]',
}
