import { describe, it, expect } from 'vitest'
import { normalizeLocaleId, DEFAULT_LOCALE_ID, LOCALE_IDS } from '@/services/locale.service'

describe('locale.service', () => {
  describe('LOCALE_IDS', () => {
    it('contains en and pl', () => {
      expect(LOCALE_IDS).toContain('en')
      expect(LOCALE_IDS).toContain('pl')
    })
  })

  describe('DEFAULT_LOCALE_ID', () => {
    it('is en', () => {
      expect(DEFAULT_LOCALE_ID).toBe('en')
    })
  })

  describe('normalizeLocaleId', () => {
    it('returns en for null', () => {
      expect(normalizeLocaleId(null)).toBe('en')
    })

    it('returns en for undefined', () => {
      expect(normalizeLocaleId(undefined)).toBe('en')
    })

    it('returns en for empty string', () => {
      expect(normalizeLocaleId('')).toBe('en')
    })

    it('returns en for invalid string', () => {
      expect(normalizeLocaleId('fr')).toBe('en')
      expect(normalizeLocaleId('de')).toBe('en')
      expect(normalizeLocaleId('garbage')).toBe('en')
    })

    it('returns en for "en"', () => {
      expect(normalizeLocaleId('en')).toBe('en')
    })

    it('returns pl for "pl"', () => {
      expect(normalizeLocaleId('pl')).toBe('pl')
    })
  })
})
