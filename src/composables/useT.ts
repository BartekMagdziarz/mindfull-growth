import { computed } from 'vue'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { messages } from '@/locales'
import { DEFAULT_LOCALE_ID, type LocaleId, DEFAULT_GENDER, type GrammaticalGender } from '@/services/locale.service'
import { pluralizePl, pluralizeEn } from '@/utils/pluralize'

/**
 * Resolve a dotted key path like "common.nav.journal" from a nested object.
 * Returns undefined if not found.
 */
function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.')
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === 'string' ? current : undefined
}

/**
 * Interpolate named params: "Hello {name}" + { name: "World" } → "Hello World"
 */
function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })
}

export function useT() {
  const prefsStore = useUserPreferencesStore()

  const locale = computed<LocaleId>(() => prefsStore.locale ?? DEFAULT_LOCALE_ID)
  const gender = computed<GrammaticalGender>(() => prefsStore.grammaticalGender ?? DEFAULT_GENDER)

  /**
   * Translate a key. Falls back to English if the current locale key is missing.
   * Returns the raw key if not found in any locale (for debugging).
   * Supports named interpolation: t('common.time.minutesAgo', { n: 5 })
   */
  function t(key: string, params?: Record<string, string | number>): string {
    const currentLocale = locale.value
    const currentMessages = messages[currentLocale] as Record<string, unknown> | undefined
    const fallbackMessages = messages[DEFAULT_LOCALE_ID] as Record<string, unknown>

    let value = currentMessages ? resolve(currentMessages, key) : undefined

    if (value === undefined) {
      value = resolve(fallbackMessages, key)
    }

    if (value === undefined) {
      return key
    }

    if (params) {
      return interpolate(value, params)
    }

    return value
  }

  /**
   * Pluralization helper. Picks the right plural form based on locale.
   *
   * English (2 keys): tp(count, 'path.one', 'path.other')
   * Polish (3 keys):  tp(count, 'path.one', 'path.few', 'path.many')
   *
   * The selected form is then interpolated with { n: count }.
   */
  function tp(n: number, ...keys: string[]): string {
    let raw: string
    if (locale.value === 'pl' && keys.length >= 3) {
      const one = t(keys[0])
      const few = t(keys[1])
      const many = t(keys[2])
      raw = pluralizePl(n, one, few, many)
    } else {
      const one = t(keys[0])
      const other = t(keys.length >= 2 ? keys[1] : keys[0])
      raw = pluralizeEn(n, one, other)
    }
    return interpolate(raw, { n })
  }

  /**
   * Gender-aware translation. Looks up `key.m` or `key.f` based on the user's
   * grammatical gender preference, falling back to the base `key` if the
   * gendered variant doesn't exist.
   */
  function tg(key: string, params?: Record<string, string | number>): string {
    const suffix = gender.value === 'feminine' ? 'f' : 'm'
    const genderedKey = `${key}.${suffix}`

    // Try gendered variant first in current locale, then fallback
    const currentLocale = locale.value
    const currentMessages = messages[currentLocale] as Record<string, unknown> | undefined
    let genderedValue = currentMessages ? resolve(currentMessages, genderedKey) : undefined
    if (genderedValue === undefined) {
      const fallbackMessages = messages[DEFAULT_LOCALE_ID] as Record<string, unknown>
      genderedValue = resolve(fallbackMessages, genderedKey)
    }
    if (genderedValue !== undefined) {
      return params ? interpolate(genderedValue, params) : genderedValue
    }

    // Fall back to base key
    return t(key, params)
  }

  return { t, tp, tg, locale, gender }
}
