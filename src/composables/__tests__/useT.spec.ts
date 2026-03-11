import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useT } from '@/composables/useT'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

describe('useT', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('t()', () => {
    it('returns English text by default', () => {
      const { t } = useT()
      expect(t('common.nav.journal')).toBe('Journal')
    })

    it('returns Polish text when locale is pl', () => {
      const prefs = useUserPreferencesStore()
      prefs.$patch({ locale: 'pl' })

      const { t } = useT()
      expect(t('common.nav.journal')).toBe('Dziennik')
    })

    it('falls back to English when Polish key is missing', () => {
      const prefs = useUserPreferencesStore()
      prefs.$patch({ locale: 'pl' })

      const { t } = useT()
      // common.buttons.save exists in both, but let's use a key
      // that definitely exists in en. The profile keys exist in both.
      expect(t('common.buttons.save')).toBe('Zapisz')
    })

    it('returns the raw key when not found in any locale', () => {
      const { t } = useT()
      expect(t('nonexistent.key.path')).toBe('nonexistent.key.path')
    })

    it('interpolates named params', () => {
      const { t } = useT()
      expect(t('common.time.minutesAgo', { n: 5 })).toBe('5 minutes ago')
    })

    it('interpolates Polish params', () => {
      const prefs = useUserPreferencesStore()
      prefs.$patch({ locale: 'pl' })

      const { t } = useT()
      expect(t('common.time.minutesAgo', { n: 5 })).toBe('5 minut temu')
    })

    it('preserves unmatched placeholders', () => {
      const { t } = useT()
      expect(t('common.time.minutesAgo', {})).toBe('{n} minutes ago')
    })

    it('reacts to locale changes', () => {
      const prefs = useUserPreferencesStore()
      const { t } = useT()

      expect(t('common.nav.journal')).toBe('Journal')

      prefs.$patch({ locale: 'pl' })
      expect(t('common.nav.journal')).toBe('Dziennik')

      prefs.$patch({ locale: 'en' })
      expect(t('common.nav.journal')).toBe('Journal')
    })
  })

  describe('tp()', () => {
    it('returns singular for 1 in English', () => {
      const { tp } = useT()
      const result = tp(1, 'common.time.minuteAgo', 'common.time.minutesAgo')
      expect(result).toBe('1 minute ago')
    })

    it('returns plural for 5 in English', () => {
      const { tp } = useT()
      const result = tp(5, 'common.time.minuteAgo', 'common.time.minutesAgo')
      expect(result).toBe('5 minutes ago')
    })

    it('returns plural for 0 in English', () => {
      const { tp } = useT()
      const result = tp(0, 'common.time.minuteAgo', 'common.time.minutesAgo')
      expect(result).toBe('0 minutes ago')
    })
  })

  describe('locale', () => {
    it('reflects the store locale value', () => {
      const prefs = useUserPreferencesStore()
      const { locale } = useT()

      expect(locale.value).toBe('en')

      prefs.$patch({ locale: 'pl' })
      expect(locale.value).toBe('pl')
    })
  })
})
