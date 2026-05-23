/**
 * Runtime color lookup for the 8 Self-Energy ("8 C's") qualities used by
 * IFS exercises.
 *
 * Reads the `--self-<quality>` CSS variables (defined in tokens.css) via
 * getComputedStyle and returns an rgba() string at the requested opacity.
 * The wheel SVG composes its segment fills/strokes at multiple opacities,
 * so we can't go through Tailwind utility classes here — the value has to
 * be a CSS color string.
 *
 * Previously the RGB triples lived as duplicate hex tables in
 * `SelfEnergyWheel.vue` and `SelfEnergyWizard.vue`.
 */

import type { SelfEnergyQuality } from '@/domain/exercises'

type RgbTriple = [number, number, number]

const cache = new Map<SelfEnergyQuality, RgbTriple>()

function parseRgbTriple(raw: string): RgbTriple | null {
  // The CSS var stores values like "59 130 246" (Tailwind syntax) or
  // "59, 130, 246" (more traditional). Accept both.
  const parts = raw
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((n) => Number.parseInt(n, 10))
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null
  return [parts[0], parts[1], parts[2]]
}

/** Resolves `--self-<quality>` against the document root. */
function readQualityTriple(quality: SelfEnergyQuality): RgbTriple {
  const cached = cache.get(quality)
  if (cached) return cached

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // SSR / test env — fall back to a neutral grey so the wheel still renders.
    const fallback: RgbTriple = [128, 128, 128]
    cache.set(quality, fallback)
    return fallback
  }

  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--self-${quality}`)
    .trim()
  const triple = parseRgbTriple(raw) ?? [128, 128, 128]
  cache.set(quality, triple)
  return triple
}

/** Reset the in-memory cache — call this when the theme changes. */
export function resetSelfEnergyColorCache(): void {
  cache.clear()
}

/**
 * Returns the rgba() color string for a quality at the requested opacity
 * (0..1). Used by the wheel SVG for segment fills and strokes.
 */
export function getQualityRgba(
  quality: SelfEnergyQuality,
  opacity: number,
): string {
  const [r, g, b] = readQualityTriple(quality)
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

/** Convenience: the opaque CSS variable reference, for backgrounds/borders. */
export function getQualityVar(quality: SelfEnergyQuality): string {
  return `rgb(var(--self-${quality}))`
}

/** Tailwind class for the quality's text color (used by the wizard summary). */
export const SELF_ENERGY_QUALITY_TEXT_CLASS: Record<SelfEnergyQuality, string> =
  {
    calm: 'text-[rgb(var(--self-calm))]',
    curiosity: 'text-[rgb(var(--self-curiosity))]',
    compassion: 'text-[rgb(var(--self-compassion))]',
    clarity: 'text-[rgb(var(--self-clarity))]',
    courage: 'text-[rgb(var(--self-courage))]',
    creativity: 'text-[rgb(var(--self-creativity))]',
    confidence: 'text-[rgb(var(--self-confidence))]',
    connection: 'text-[rgb(var(--self-connection))]',
  }
