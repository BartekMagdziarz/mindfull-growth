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
    it('is pl', () => {
      expect(DEFAULT_LOCALE_ID).toBe('pl')
    })
  })

  describe('normalizeLocaleId', () => {
    it('returns pl for null', () => {
      expect(normalizeLocaleId(null)).toBe('pl')
    })

    it('returns pl for undefined', () => {
      expect(normalizeLocaleId(undefined)).toBe('pl')
    })

    it('returns pl for empty string', () => {
      expect(normalizeLocaleId('')).toBe('pl')
    })

    it('returns pl for invalid string', () => {
      expect(normalizeLocaleId('fr')).toBe('pl')
      expect(normalizeLocaleId('de')).toBe('pl')
      expect(normalizeLocaleId('garbage')).toBe('pl')
    })

    it('returns en for "en"', () => {
      expect(normalizeLocaleId('en')).toBe('en')
    })

    it('returns pl for "pl"', () => {
      expect(normalizeLocaleId('pl')).toBe('pl')
    })
  })
})
