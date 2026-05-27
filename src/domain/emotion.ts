export interface Emotion {
  id: string // UUID
  name: string // e.g., "Happy", "Anxious", "Serene"
  pleasantness: number // 1-12 scale (1 = very low, 12 = very high)
  energy: number // 1-12 scale (1 = very low, 12 = very high)
  description?: string // Optional description of the emotion
}

export type Quadrant =
  | 'high-energy-high-pleasantness'
  | 'high-energy-low-pleasantness'
  | 'low-energy-high-pleasantness'
  | 'low-energy-low-pleasantness'

/**
 * Determines the quadrant for an emotion based on its pleasantness and energy values.
 *
 * Threshold: 6 is used as the split point for both pleasantness and energy.
 * - Values > 6 are considered "high"
 * - Values <= 6 are considered "low"
 *
 * Quadrant logic:
 * - energy > 6 && pleasantness > 6 → high-energy-high-pleasantness
 * - energy > 6 && pleasantness <= 6 → high-energy-low-pleasantness
 * - energy <= 6 && pleasantness > 6 → low-energy-high-pleasantness
 * - energy <= 6 && pleasantness <= 6 → low-energy-low-pleasantness
 */
export function getQuadrant(emotion: Emotion): Quadrant {
  const isHighEnergy = emotion.energy > 6
  const isHighPleasantness = emotion.pleasantness > 6

  if (isHighEnergy && isHighPleasantness) {
    return 'high-energy-high-pleasantness'
  }
  if (isHighEnergy && !isHighPleasantness) {
    return 'high-energy-low-pleasantness'
  }
  if (!isHighEnergy && isHighPleasantness) {
    return 'low-energy-high-pleasantness'
  }
  // !isHighEnergy && !isHighPleasantness
  return 'low-energy-low-pleasantness'
}

/**
 * Display configuration for a quadrant — its localized label and Material Symbol icon.
 * Single source of truth shared by EmotionSelector and EmotionQuadrantSuffix.
 */
export interface QuadrantDisplayConfig {
  value: Quadrant
  label: string
  energyLabel: string
  pleasantnessLabel: string
  icon: string
}

type Translator = (key: string, params?: Record<string, string | number>) => string

export function getQuadrantDisplayConfig(
  quadrant: Quadrant,
  t: Translator
): QuadrantDisplayConfig {
  switch (quadrant) {
    case 'high-energy-low-pleasantness':
      return {
        value: 'high-energy-low-pleasantness',
        label: t('emotionViews.selector.quadrants.highEnergyUnpleasant'),
        energyLabel: t('emotionViews.selector.energyLabels.high'),
        pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.unpleasant'),
        icon: 'bolt',
      }
    case 'high-energy-high-pleasantness':
      return {
        value: 'high-energy-high-pleasantness',
        label: t('emotionViews.selector.quadrants.highEnergyPleasant'),
        energyLabel: t('emotionViews.selector.energyLabels.high'),
        pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.pleasant'),
        icon: 'wb_sunny',
      }
    case 'low-energy-low-pleasantness':
      return {
        value: 'low-energy-low-pleasantness',
        label: t('emotionViews.selector.quadrants.lowEnergyUnpleasant'),
        energyLabel: t('emotionViews.selector.energyLabels.low'),
        pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.unpleasant'),
        icon: 'cloud',
      }
    case 'low-energy-high-pleasantness':
      return {
        value: 'low-energy-high-pleasantness',
        label: t('emotionViews.selector.quadrants.lowEnergyPleasant'),
        energyLabel: t('emotionViews.selector.energyLabels.low'),
        pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.pleasant'),
        icon: 'auto_awesome',
      }
  }
}

/**
 * The four quadrants in display order (unpleasant on left, pleasant on right;
 * high energy on top, low energy on bottom).
 */
export const QUADRANTS_IN_ORDER: readonly Quadrant[] = [
  'high-energy-low-pleasantness',
  'high-energy-high-pleasantness',
  'low-energy-low-pleasantness',
  'low-energy-high-pleasantness',
] as const

/**
 * Inline style for the card that hosts the EmotionSelector. When a quadrant is
 * active, the card adopts a very-light wash of that quadrant's hue. The
 * gradient runs from `-tint` (top-left, ~65% white mix) to `-tint-soft`
 * (bottom-right, ~80% white mix), so the entire surface carries a hint of
 * the quadrant color instead of fading back to the neutral neo-surface.
 * Returns an empty object when no quadrant is selected, so the host card
 * falls back to its own neumorphic background.
 */
export function getQuadrantTintStyle(
  quadrant: Quadrant | null
): Record<string, string> {
  if (!quadrant) return {}
  return {
    background: `linear-gradient(145deg, var(--color-quadrant-${quadrant}-tint), var(--color-quadrant-${quadrant}-tint-soft))`,
    transition: 'background 280ms ease',
  }
}

/**
 * Inline style for a quadrant-colored surface — a count tile, mini-card, or
 * any rectangular area that should carry the quadrant's identity through the
 * same gradient + text-color recipe as the selector buttons. Used by the
 * 2×2 emotion heatmap grids in WeekEmotionsCard / MonthEmotionsCard /
 * ReflectionJournalSidebar.
 */
export function getQuadrantSurfaceStyle(quadrant: Quadrant): Record<string, string> {
  return {
    background: `linear-gradient(145deg, var(--color-quadrant-${quadrant}-top), var(--color-quadrant-${quadrant}-bottom))`,
    color: `var(--color-quadrant-${quadrant}-text)`,
  }
}

/**
 * Inline style for a "selected emotion" chip in the summary row. The chip
 * shares the same gradient as an unselected quadrant button (`-top` → `-bottom`)
 * with a subtle neumorphic shadow for depth — no outline. Earlier iterations
 * used a 1.5px colored border, but it created a busy "outlined badge" feel
 * that clashed with the muted aesthetic of the rest of the component.
 */
export function getQuadrantChipStyle(quadrant: Quadrant): Record<string, string> {
  return {
    background: `linear-gradient(145deg, var(--color-quadrant-${quadrant}-top), var(--color-quadrant-${quadrant}-bottom))`,
    color: `var(--color-quadrant-${quadrant}-text)`,
    border: 'none',
    boxShadow:
      '-2px -2px 4px rgb(var(--neo-shadow-light) / 0.6), 2px 2px 4px rgb(var(--neo-shadow-dark) / 0.2)',
  }
}

