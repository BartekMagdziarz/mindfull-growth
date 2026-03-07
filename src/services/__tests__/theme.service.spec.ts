import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  applyCachedTheme,
  applyTheme,
  cacheThemePreference,
  clearCachedThemePreference,
  DEFAULT_THEME_ID,
  getCachedThemePreference,
  normalizeThemeId,
} from '../theme.service'

describe('theme.service', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
  })

  it('normalizes invalid theme values to current', () => {
    expect(normalizeThemeId(undefined)).toBe(DEFAULT_THEME_ID)
    expect(normalizeThemeId(null)).toBe(DEFAULT_THEME_ID)
    expect(normalizeThemeId('unknown-theme')).toBe(DEFAULT_THEME_ID)
  })

  it('applies and caches a valid theme', () => {
    const applied = applyTheme('sky-mist')

    expect(applied).toBe('sky-mist')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sky-mist')
    expect(getCachedThemePreference()).toBe('sky-mist')
  })

  it('falls back to current for invalid applied theme values', () => {
    const applied = applyTheme('invalid-theme')

    expect(applied).toBe(DEFAULT_THEME_ID)
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME_ID)
    expect(getCachedThemePreference()).toBe(DEFAULT_THEME_ID)
  })

  it('does not overwrite cached theme when persistCache is false', () => {
    cacheThemePreference('sunrise-cloud')
    const applied = applyTheme('sky-mist', { persistCache: false })

    expect(applied).toBe('sky-mist')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sky-mist')
    expect(getCachedThemePreference()).toBe('sunrise-cloud')
  })

  it('applies cached theme and defaults to current when cache is missing', () => {
    expect(applyCachedTheme()).toBe(DEFAULT_THEME_ID)
    expect(document.documentElement.getAttribute('data-theme')).toBe(DEFAULT_THEME_ID)

    clearCachedThemePreference()
    cacheThemePreference('sunrise-cloud')
    expect(applyCachedTheme()).toBe('sunrise-cloud')
    expect(document.documentElement.getAttribute('data-theme')).toBe('sunrise-cloud')
  })
})
