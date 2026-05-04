/**
 * Color palette for Life Areas.
 *
 * The app uses a soft, neumorphic aesthetic dominated by light blues and
 * pastel hues. These presets are tuned to feel at home in that palette:
 * mid-saturation, mid-lightness colors that read as gentle accents rather
 * than vivid brand colors. Used both as a 20% background tint behind the
 * area's icon and as the icon stroke color, so they need to look good in
 * both roles.
 *
 * Hue spacing covers the full circle so users can pick visually distinct
 * categories (sky blue → lavender → rose → coral → amber → sage → mint
 * → teal). Avoid adding two colors with very similar hue (e.g. another
 * blue) — they're hard to tell apart on the small icon background.
 */
export interface LifeAreaColorPreset {
  /** Stable key — used as a localization key under `lifeAreas.colorPresets.*` */
  key: string
  /** Hex value persisted in the LifeArea.color field */
  hex: string
}

export const LIFE_AREA_COLOR_PRESETS: readonly LifeAreaColorPreset[] = [
  { key: 'sky', hex: '#7AA8DC' },
  { key: 'periwinkle', hex: '#8B95D6' },
  { key: 'lavender', hex: '#A892D2' },
  { key: 'orchid', hex: '#C593CC' },
  { key: 'rose', hex: '#D89BAC' },
  { key: 'coral', hex: '#E1A088' },
  { key: 'amber', hex: '#D9B872' },
  { key: 'sage', hex: '#A8C485' },
  { key: 'mint', hex: '#7DC2A4' },
  { key: 'teal', hex: '#6FB1B8' },
] as const
