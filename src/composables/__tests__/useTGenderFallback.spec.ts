import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// A locale that keeps an item flat (English rarely needs m/f) next to one that
// genders it: tg() must prefer the current locale's flat string over another
// locale's gendered variant (regression: fscrs items showed Polish in English).
vi.mock('@/locales', () => ({
  messages: {
    pl: {
      items: {
        flatBoth: 'Płasko',
        genderedPlOnly: { m: 'Zrobiłem', f: 'Zrobiłam' },
        genderedBoth: { m: 'Byłem', f: 'Byłam' },
        plOnly: { m: 'Tylko po polsku', f: 'Tylko po polsku (f)' },
      },
    },
    en: {
      items: {
        flatBoth: 'Flat',
        genderedPlOnly: 'I did it',
        genderedBoth: { m: 'I was (m)', f: 'I was (f)' },
      },
    },
  },
}))

import { useT } from '@/composables/useT'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

describe('tg() resolution order across locales', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('prefers the current locale flat string over the default locale gendered variant', () => {
    const prefs = useUserPreferencesStore()
    prefs.$patch({ locale: 'en', grammaticalGender: 'feminine' })
    const { tg } = useT()
    expect(tg('items.genderedPlOnly')).toBe('I did it')
  })

  it('still resolves gendered variants in the current locale first', () => {
    const prefs = useUserPreferencesStore()
    prefs.$patch({ locale: 'en', grammaticalGender: 'feminine' })
    const { tg } = useT()
    expect(tg('items.genderedBoth')).toBe('I was (f)')
    prefs.$patch({ locale: 'pl' })
    expect(tg('items.genderedBoth')).toBe('Byłam')
  })

  it('falls back to the default locale gendered variant when the current locale has nothing', () => {
    const prefs = useUserPreferencesStore()
    prefs.$patch({ locale: 'en', grammaticalGender: 'feminine' })
    const { tg } = useT()
    expect(tg('items.plOnly')).toBe('Tylko po polsku (f)')
  })

  it('returns the flat string when no gendered variant exists anywhere', () => {
    const prefs = useUserPreferencesStore()
    prefs.$patch({ locale: 'en', grammaticalGender: 'masculine' })
    const { tg } = useT()
    expect(tg('items.flatBoth')).toBe('Flat')
  })
})
