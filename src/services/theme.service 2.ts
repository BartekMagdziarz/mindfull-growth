export const THEME_IDS = ['current', 'sky-mist', 'sunrise-cloud'] as const

export type ThemeId = (typeof THEME_IDS)[number]

export const DEFAULT_THEME_ID: ThemeId = 'current'

const THEME_CACHE_KEY = 'ui.theme.cached'

function isThemeId(value: string): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId)
}

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  if (!value) return DEFAULT_THEME_ID
  return isThemeId(value) ? value : DEFAULT_THEME_ID
}

export function setThemeDataAttribute(theme: ThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}

export function cacheThemePreference(theme: ThemeId): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(THEME_CACHE_KEY, theme)
  } catch (_error) {
    // Ignore localStorage write errors (private mode / quota / blocked storage)
  }
}

export function clearCachedThemePreference(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(THEME_CACHE_KEY)
  } catch (_error) {
    // Ignore localStorage errors
  }
}

export function getCachedThemePreference(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const cached = window.localStorage.getItem(THEME_CACHE_KEY)
    return normalizeThemeId(cached)
  } catch (_error) {
    return DEFAULT_THEME_ID
  }
}

export function applyTheme(
  themeInput: ThemeId | string | null | undefined,
  options?: { persistCache?: boolean },
): ThemeId {
  const theme = normalizeThemeId(themeInput)
  setThemeDataAttribute(theme)

  if (options?.persistCache !== false) {
    cacheThemePreference(theme)
  }

  return theme
}

export function applyCachedTheme(): ThemeId {
  const theme = getCachedThemePreference()
  setThemeDataAttribute(theme)
  return theme
}
