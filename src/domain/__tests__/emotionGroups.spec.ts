import { describe, it, expect } from 'vitest'
import {
  EMOTION_GROUPS,
  GROUPS_BY_QUADRANT,
  GROUP_OF_FAMILY,
  GROUP_OF_WORD,
  LEGACY_WORD_INTENSITY,
  QUADRANT_STYLES,
  getGroup,
  resolveGroupSlug,
  legacyToGroupSelections,
  groupSelectionsToFamilyIds,
} from '@/domain/emotionGroups'
import { ALL_FAMILIES, FAMILY_OF, getFamilyById } from '@/domain/emotionFamily'
import emotionsMeta from '@/data/emotions-meta.json'
import plEmotions from '@/locales/pl/emotions.json'
import enEmotions from '@/locales/en/emotions.json'
import plGroups from '@/locales/pl/emotionGroups.json'
import enGroups from '@/locales/en/emotionGroups.json'
import plFamilies from '@/locales/pl/emotionFamilies.json'
import enFamilies from '@/locales/en/emotionFamilies.json'

const catalogIds = (emotionsMeta as { id: string }[]).map((e) => e.id)
const groupSlugs = new Set(EMOTION_GROUPS.map((g) => g.slug))
// Produktywny: usunięty z katalogu; GROUP_OF_WORD mapuje go nadal (stare wpisy)
const LEGACY_REMOVED_ID = 'e3m11-productive-015'
// dawne slugi rodzin bez własnej grupy (spadkobiercy)
const LEGACY_FAMILY_SLUGS = ['energia', 'przygnebienie', 'bezpieczenstwo', 'zazenowanie-i-upokorzenie']

describe('emotionGroups — struktura taksonomii v2', () => {
  it('ma 45 grup w układzie 12/11/12/10 na ćwiartkę, z unikalnymi slugami', () => {
    expect(EMOTION_GROUPS).toHaveLength(45)
    expect(groupSlugs.size).toBe(45)
    expect(GROUPS_BY_QUADRANT['high-energy-high-pleasantness']).toHaveLength(12)
    expect(GROUPS_BY_QUADRANT['high-energy-low-pleasantness']).toHaveLength(11)
    expect(GROUPS_BY_QUADRANT['low-energy-low-pleasantness']).toHaveLength(12)
    expect(GROUPS_BY_QUADRANT['low-energy-high-pleasantness']).toHaveLength(10)
  })

  it('8 nowych grup ma flagę isNew i nowe slugi', () => {
    const newSlugs = EMOTION_GROUPS.filter((g) => g.isNew).map((g) => g.slug)
    expect(newSlugs.sort()).toEqual(
      ['podziw', 'pogarda', 'rozczarowanie', 'szok', 'upokorzenie', 'wina-i-zal', 'wzruszenie', 'zranienie'].sort(),
    )
  })

  it('katalog ma 184 słowa, a każda grupa ikonę, ≥2 słowa i 2 auxIds ze swoich słów', () => {
    expect(catalogIds).toHaveLength(184)
    for (const g of EMOTION_GROUPS) {
      expect(g.icon.length, g.slug).toBeGreaterThan(0)
      expect(g.wordIds.length, g.slug).toBeGreaterThanOrEqual(2)
      expect(g.auxIds, g.slug).toHaveLength(2)
      for (const a of g.auxIds) expect(g.wordIds, `${g.slug}: ${a}`).toContain(a)
    }
  })

  it('każde słowo katalogu ma dokładnie jedną grupę; słowa zgodne między mapami', () => {
    const seen = new Set<string>()
    const catalog = new Set(catalogIds)
    for (const g of EMOTION_GROUPS) {
      for (const id of g.wordIds) {
        expect(catalog.has(id), id).toBe(true)
        expect(seen.has(id), id).toBe(false)
        seen.add(id)
        expect(GROUP_OF_WORD[id]).toBe(g.slug)
      }
    }
    expect(seen.size).toBe(catalogIds.length)
    // + wpis legacy dla usuniętego Produktywnego
    expect(Object.keys(GROUP_OF_WORD)).toHaveLength(catalogIds.length + 1)
    expect(GROUP_OF_WORD[LEGACY_REMOVED_ID]).toBe('zaangazowanie')
    expect(catalog.has(LEGACY_REMOVED_ID)).toBe(false)
  })

  it('każde słowo ma ćwiartkę zgodną z ćwiartką swojej grupy', () => {
    const meta = Object.fromEntries(
      (emotionsMeta as { id: string; energy: number; pleasantness: number }[]).map((e) => [e.id, e]),
    )
    for (const g of EMOTION_GROUPS) {
      for (const id of g.wordIds) {
        const e = meta[id]
        const q =
          (e.energy > 6 ? 'high' : 'low') + '-energy-' + (e.pleasantness > 6 ? 'high' : 'low') + '-pleasantness'
        expect(q, `${g.slug}: ${id}`).toBe(g.quadrant)
      }
    }
  })

  it('QUADRANT_STYLES pokrywa 4 ćwiartki kolorami hex', () => {
    const styles = Object.values(QUADRANT_STYLES)
    expect(styles).toHaveLength(4)
    for (const s of styles) {
      for (const c of [s.top, s.bottom, s.accent, s.text]) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('emotionGroups — spadkobiercy dawnych slugów', () => {
  it('dawne rodziny bez własnej grupy mają poprawnych spadkobierców', () => {
    expect(resolveGroupSlug('energia')).toBe('ekscytacja')
    expect(resolveGroupSlug('przygnebienie')).toBe('smutek-i-zal')
    expect(resolveGroupSlug('bezpieczenstwo')).toBe('spokoj-i-wyciszenie')
    expect(resolveGroupSlug('zazenowanie-i-upokorzenie')).toBe('wstyd-i-wina')
    expect(resolveGroupSlug('podziw')).toBe('podziw')
    expect(resolveGroupSlug('zranienie')).toBe('zranienie')
  })

  it('GROUP_OF_FAMILY pokrywa 45 grup + 4 dawne slugi i celuje w istniejące grupy', () => {
    expect(Object.keys(GROUP_OF_FAMILY)).toHaveLength(49)
    for (const [from, to] of Object.entries(GROUP_OF_FAMILY)) {
      expect(groupSlugs.has(to), from).toBe(true)
    }
  })
})

describe('emotionGroups — tabela legacy natężeń', () => {
  it('zawiera wyłącznie słowa katalogu z poziomami 1–5 i grupą', () => {
    for (const [id, lvl] of Object.entries(LEGACY_WORD_INTENSITY)) {
      expect(catalogIds).toContain(id)
      expect(lvl).toBeGreaterThanOrEqual(1)
      expect(lvl).toBeLessThanOrEqual(5)
      expect(GROUP_OF_WORD[id]).toBeDefined()
    }
    expect(Object.keys(LEGACY_WORD_INTENSITY)).toHaveLength(125)
  })
})

describe('legacyToGroupSelections — adapter odczytu historii', () => {
  it('mapuje wpisy emotions (slug promienia lub grupy) z zachowaniem natężenia', () => {
    expect(legacyToGroupSelections({ emotions: [{ emotionId: 'gniew', intensity: 4 }] })).toEqual([
      { emotionId: 'gniew', intensity: 4 },
    ])
    expect(legacyToGroupSelections({ emotions: [{ emotionId: 'bezpieczenstwo', intensity: 2 }] })).toEqual([
      { emotionId: 'spokoj-i-wyciszenie', intensity: 2 },
    ])
  })

  it('stare słowa odzyskują grupę i natężenie z dawnej drabinki', () => {
    expect(legacyToGroupSelections({ emotionIds: ['e2m1-livid-134'] })).toEqual([
      { emotionId: 'gniew', intensity: 5 },
    ])
    expect(legacyToGroupSelections({ emotionIds: ['e5m3-frustrated-113'] })).toEqual([
      { emotionId: 'irytacja-i-frustracja' },
    ])
    expect(legacyToGroupSelections({ emotionIds: ['ext-offended-161'] })).toEqual([
      { emotionId: 'zranienie' },
    ])
    // usunięty Produktywny nadal czytelny w historii
    expect(legacyToGroupSelections({ emotionIds: [LEGACY_REMOVED_ID] })).toEqual([
      { emotionId: 'zaangazowanie' },
    ])
  })

  it('rodziny family-only lądują u spadkobierców bez natężenia', () => {
    expect(legacyToGroupSelections({ emotionFamilyIds: ['zazenowanie-i-upokorzenie'] })).toEqual([
      { emotionId: 'wstyd-i-wina' },
    ])
  })

  it('deduplikuje per grupa — wygrywa najwyższe natężenie; nieznane ID pomija', () => {
    const out = legacyToGroupSelections({
      emotions: [{ emotionId: 'gniew', intensity: 2 }],
      emotionIds: ['e2m1-livid-134', 'nie-istnieje'],
      emotionFamilyIds: ['gniew', 'brak-takiej-rodziny'],
    })
    expect(out).toEqual([{ emotionId: 'gniew', intensity: 5 }])
  })

  it('mostek zapisu zwraca unikalne slugi grup', () => {
    expect(
      groupSelectionsToFamilyIds([
        { emotionId: 'radosc', intensity: 3 },
        { emotionId: 'radosc' },
        { emotionId: 'pustka' },
      ]),
    ).toEqual(['radosc', 'pustka'])
  })
})

describe('warstwa rodzin = grupy (emotionFamily po regeneracji)', () => {
  it('ALL_FAMILIES to dokładnie 45 grup z rep/tint/sub', () => {
    expect(ALL_FAMILIES).toHaveLength(45)
    const plByName = new Set(Object.values(plEmotions as Record<string, { name: string }>).map((v) => v.name))
    for (const f of ALL_FAMILIES) {
      expect(groupSlugs.has(f.id), f.id).toBe(true)
      expect(f.tint).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(plByName.has(f.rep), `${f.id}: rep ${f.rep}`).toBe(true)
      expect(getGroup(f.id)?.quadrant).toBe(f.quadrant)
    }
  })

  it('FAMILY_OF jest tożsame z GROUP_OF_WORD dla słów katalogu', () => {
    expect(Object.keys(FAMILY_OF).sort()).toEqual([...catalogIds].sort())
    for (const [id, fam] of Object.entries(FAMILY_OF)) {
      expect(fam, id).toBe(GROUP_OF_WORD[id])
    }
  })

  it('getFamilyById rozwiązuje dawne slugi rodzin przez spadkobierców', () => {
    for (const legacy of LEGACY_FAMILY_SLUGS) {
      const fam = getFamilyById(legacy)
      expect(fam, legacy).toBeDefined()
      expect(fam!.id).toBe(GROUP_OF_FAMILY[legacy])
    }
    expect(getFamilyById('radosc')?.id).toBe('radosc')
    expect(getFamilyById('nie-ma')).toBeUndefined()
  })
})

describe('emotionGroups — locale', () => {
  it('PL i EN mają wpisy dla wszystkich 45 grup (groups + families) oraz skalę 1–5', () => {
    for (const locale of [plGroups, enGroups] as const) {
      const entries = locale.groups as Record<string, { name: string; appraisal: string }>
      expect(Object.keys(entries).sort()).toEqual([...groupSlugs].sort())
      for (const [slug, v] of Object.entries(entries)) {
        expect(v.name.length, slug).toBeGreaterThan(0)
        expect(v.appraisal.length, slug).toBeGreaterThan(0)
      }
      expect(Object.keys(locale.scale).sort()).toEqual(['1', '2', '3', '4', '5'])
    }
    for (const locale of [plFamilies, enFamilies] as const) {
      const entries = locale as Record<string, { name: string; sub: string }>
      expect(Object.keys(entries).sort()).toEqual([...groupSlugs].sort())
    }
  })

  it('każde słowo katalogu ma nazwę i opis w PL i EN', () => {
    for (const id of catalogIds) {
      for (const locale of [plEmotions, enEmotions] as const) {
        const entry = (locale as Record<string, { name: string; description?: string }>)[id]
        expect(entry, id).toBeDefined()
        expect(entry.name.length, id).toBeGreaterThan(0)
        expect((entry.description ?? '').length, id).toBeGreaterThan(0)
      }
    }
  })

  it('nazwy PL grup zgadzają się z zamrożoną taksonomią (spot-check)', () => {
    const pl = plGroups.groups as Record<string, { name: string }>
    expect(pl['wstyd-i-wina'].name).toBe('Wstyd · Zażenowanie')
    expect(pl['zaskoczenie-i-zachwyt'].name).toBe('Zaskoczenie')
    expect(pl['pogarda-i-zazdrosc'].name).toBe('Zazdrość · Zawiść')
    expect(pl['gniew'].name).toBe('Złość')
  })
})
