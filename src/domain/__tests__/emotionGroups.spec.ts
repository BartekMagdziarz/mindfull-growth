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
import { ALL_FAMILIES, FAMILY_OF } from '@/domain/emotionFamily'
import { WHEEL_SPOKES } from '@/domain/emotionWheel'
import emotionsMeta from '@/data/emotions-meta.json'
import plEmotions from '@/locales/pl/emotions.json'
import plGroups from '@/locales/pl/emotionGroups.json'
import enGroups from '@/locales/en/emotionGroups.json'

const catalogIds = (emotionsMeta as { id: string }[]).map((e) => e.id)
const groupSlugs = new Set(EMOTION_GROUPS.map((g) => g.slug))
// Produktywny: usuwany w P3 — mapowany dla historii, nieobecny w wordIds grup
const PRODUCTIVE_ID = 'e3m11-productive-015'

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

  it('każda grupa ma ikonę, aux i przynajmniej jedno słowo (istniejące lub oczekujące)', () => {
    for (const g of EMOTION_GROUPS) {
      expect(g.icon.length, g.slug).toBeGreaterThan(0)
      expect(g.aux.length, g.slug).toBeGreaterThan(0)
      expect(g.wordIds.length + g.pendingWordNames.length, g.slug).toBeGreaterThan(0)
    }
  })

  it('na P3 czeka dokładnie 29 nowych słów', () => {
    const pending = EMOTION_GROUPS.flatMap((g) => g.pendingWordNames)
    expect(pending).toHaveLength(29)
    expect(new Set(pending).size).toBe(29)
  })

  it('QUADRANT_STYLES pokrywa 4 ćwiartki kolorami hex', () => {
    const styles = Object.values(QUADRANT_STYLES)
    expect(styles).toHaveLength(4)
    for (const s of styles) {
      for (const c of [s.top, s.bottom, s.accent, s.text]) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
})

describe('emotionGroups — pokrycie katalogu słów', () => {
  it('GROUP_OF_WORD mapuje każde ze 156 słów katalogu na istniejącą grupę', () => {
    expect(Object.keys(GROUP_OF_WORD)).toHaveLength(catalogIds.length)
    for (const id of catalogIds) {
      expect(GROUP_OF_WORD[id], id).toBeDefined()
      expect(groupSlugs.has(GROUP_OF_WORD[id]), id).toBe(true)
    }
  })

  it('wordIds grup są rozłączne, istnieją w katalogu i zgadzają się z GROUP_OF_WORD', () => {
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
    // jedyne słowo mapowane, ale nieprezentowane: Produktywny (do usunięcia w P3)
    expect(seen.size).toBe(catalogIds.length - 1)
    expect(seen.has(PRODUCTIVE_ID)).toBe(false)
    expect(GROUP_OF_WORD[PRODUCTIVE_ID]).toBe('zaangazowanie')
  })

  it('przenosiny słów v2 są odwzorowane (jakość idzie za nowym przypisaniem)', () => {
    const byName = Object.fromEntries(
      Object.entries(plEmotions as Record<string, { name: string }>).map(([id, v]) => [v.name, id]),
    )
    expect(GROUP_OF_WORD[byName['Zachwycony']]).toBe('podziw')
    expect(GROUP_OF_WORD[byName['Rozradowany']]).toBe('radosc')
    expect(GROUP_OF_WORD[byName['Oniemiały']]).toBe('podziw')
    expect(GROUP_OF_WORD[byName['Zainspirowany']]).toBe('podziw')
    expect(GROUP_OF_WORD[byName['Kompetentny']]).toBe('pewnosc-i-mistrzostwo')
    expect(GROUP_OF_WORD[byName['Czuły']]).toBe('czulosc')
    expect(GROUP_OF_WORD[byName['Poruszony']]).toBe('wzruszenie')
    expect(GROUP_OF_WORD[byName['Wstrząśnięty']]).toBe('szok')
    expect(GROUP_OF_WORD[byName['Zagubiony']]).toBe('zamet')
    expect(GROUP_OF_WORD[byName['Urażony']]).toBe('zranienie')
    expect(GROUP_OF_WORD[byName['Pogardliwy']]).toBe('pogarda')
    expect(GROUP_OF_WORD[byName['Upokorzony']]).toBe('upokorzenie')
    expect(GROUP_OF_WORD[byName['Speszony']]).toBe('wstyd-i-wina')
    expect(GROUP_OF_WORD[byName['Rozczarowany']]).toBe('rozczarowanie')
  })
})

describe('emotionGroups — spadkobiercy dawnych slugów', () => {
  it('każda z 41 dawnych rodzin ma spadkobiercę-grupę', () => {
    expect(ALL_FAMILIES).toHaveLength(41)
    for (const f of ALL_FAMILIES) {
      const heir = GROUP_OF_FAMILY[f.id]
      expect(heir, f.id).toBeDefined()
      expect(groupSlugs.has(heir), f.id).toBe(true)
    }
  })

  it('każdy z 33 promieni koła v1 ma spadkobiercę-grupę', () => {
    for (const spoke of WHEEL_SPOKES) {
      expect(groupSlugs.has(GROUP_OF_FAMILY[spoke.id]), spoke.id).toBe(true)
    }
  })

  it('jawni spadkobiercy fuzji/rozdzieleń są poprawni', () => {
    expect(resolveGroupSlug('energia')).toBe('ekscytacja')
    expect(resolveGroupSlug('przygnebienie')).toBe('smutek-i-zal')
    expect(resolveGroupSlug('bezpieczenstwo')).toBe('spokoj-i-wyciszenie')
    expect(resolveGroupSlug('zazenowanie-i-upokorzenie')).toBe('wstyd-i-wina')
    // nowe slugi grup rozwiązują się na siebie
    expect(resolveGroupSlug('podziw')).toBe('podziw')
    expect(resolveGroupSlug('zranienie')).toBe('zranienie')
  })
})

describe('emotionGroups — tabela legacy natężeń', () => {
  it('zawiera wyłącznie słowa katalogu z poziomami 1–5', () => {
    for (const [id, lvl] of Object.entries(LEGACY_WORD_INTENSITY)) {
      expect(catalogIds).toContain(id)
      expect(lvl).toBeGreaterThanOrEqual(1)
      expect(lvl).toBeLessThanOrEqual(5)
      // słowo z poziomem musi też mieć grupę
      expect(GROUP_OF_WORD[id]).toBeDefined()
    }
    expect(Object.keys(LEGACY_WORD_INTENSITY)).toHaveLength(125)
  })
})

describe('legacyToGroupSelections — adapter odczytu historii', () => {
  it('mapuje wpisy emotions (slug promienia lub grupy) na grupy z zachowaniem natężenia', () => {
    expect(
      legacyToGroupSelections({ emotions: [{ emotionId: 'gniew', intensity: 4 }] }),
    ).toEqual([{ emotionId: 'gniew', intensity: 4 }])
    expect(
      legacyToGroupSelections({ emotions: [{ emotionId: 'bezpieczenstwo', intensity: 2 }] }),
    ).toEqual([{ emotionId: 'spokoj-i-wyciszenie', intensity: 2 }])
  })

  it('stare słowa odzyskują grupę i natężenie z dawnej drabinki', () => {
    // Wściekły = dawna podpowiedź L5 na promieniu gniew
    expect(legacyToGroupSelections({ emotionIds: ['e2m1-livid-134'] })).toEqual([
      { emotionId: 'gniew', intensity: 5 },
    ])
    // Sfrustrowany nie był podpowiedzią — grupa bez natężenia
    expect(legacyToGroupSelections({ emotionIds: ['e5m3-frustrated-113'] })).toEqual([
      { emotionId: 'irytacja-i-frustracja' },
    ])
    // Urażony: przenosiny do Zranienia (bez poziomu)
    expect(legacyToGroupSelections({ emotionIds: ['ext-offended-161'] })).toEqual([
      { emotionId: 'zranienie' },
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

describe('emotionGroups — locale', () => {
  it('PL i EN mają wpisy (name + appraisal) dla wszystkich 45 grup oraz skalę 1–5', () => {
    for (const locale of [plGroups, enGroups] as const) {
      const entries = locale.groups as Record<string, { name: string; appraisal: string }>
      expect(Object.keys(entries).sort()).toEqual([...groupSlugs].sort())
      for (const [slug, v] of Object.entries(entries)) {
        expect(v.name.length, slug).toBeGreaterThan(0)
        expect(v.appraisal.length, slug).toBeGreaterThan(0)
      }
      expect(Object.keys(locale.scale).sort()).toEqual(['1', '2', '3', '4', '5'])
    }
  })

  it('nazwy PL grup zgadzają się z zamrożoną taksonomią (spot-check)', () => {
    const pl = (plGroups.groups as Record<string, { name: string }>)
    expect(pl['wstyd-i-wina'].name).toBe('Wstyd · Zażenowanie')
    expect(pl['zaskoczenie-i-zachwyt'].name).toBe('Zaskoczenie')
    expect(pl['pogarda-i-zazdrosc'].name).toBe('Zazdrość · Zawiść')
    expect(pl['gniew'].name).toBe('Złość')
  })

  it('aux każdej grupy to słowa tej grupy (istniejące lub oczekujące na P3)', () => {
    const nameById = Object.fromEntries(
      Object.entries(plEmotions as Record<string, { name: string }>).map(([id, v]) => [id, v.name]),
    )
    for (const g of EMOTION_GROUPS) {
      const allowed = new Set([...g.wordIds.map((id) => nameById[id]), ...g.pendingWordNames])
      for (const a of g.aux) expect(allowed.has(a), `${g.slug}: ${a}`).toBe(true)
    }
  })

  it('getGroup zwraca grupę po slugu', () => {
    expect(getGroup('wzruszenie')?.quadrant).toBe('low-energy-high-pleasantness')
    expect(getGroup('nie-ma')).toBeUndefined()
  })
})

describe('emotionGroups — spójność z warstwą rodzin (do czasu P3)', () => {
  it('słowa bez przenosin zachowują grupę zgodną ze spadkobiercą dawnej rodziny', () => {
    const moved = new Set([
      'e1m12-ecstatic-001', // Zachwycony → podziw
      'e1m11-elated-013', // Rozradowany → radosc
      'e1m8-awe-049', // Oniemiały → podziw
      'e2m11-inspired-014', // Zainspirowany → podziw
      'e6m12-accomplished-006', // Kompetentny → pewność
      'ext-affectionate-154', // Czuły → czulosc
      'e10m12-moved-010', // Poruszony → wzruszenie
      'ext-enraptured-159', // Rozanielony → wzruszenie
      'e1m4-shocked-097', // Wstrząśnięty → szok
      'e8m3-lost-116', // Zagubiony → zamet
      'ext-offended-161', // Urażony → zranienie
      'e6m1-contempt-138', // Pogardliwy → pogarda
      'ext-haughty-165', // Wyniosły → pogarda
      'ext-dismissive-166', // Lekceważący → pogarda
      'e8m1-humiliated-140', // Upokorzony → upokorzenie
      'e5m4-embarrassed-101', // Skrępowany → wstyd-i-wina
      'ext-flustered-164', // Speszony → wstyd-i-wina
      'e8m4-disappointed-104', // Rozczarowany → rozczarowanie
      'e10m1-guilty-142', // Winny → wina-i-zal (split Wstydu)
      'ext-regretful-171', // Żałujący → wina-i-zal
    ])
    for (const [wordId, family] of Object.entries(FAMILY_OF)) {
      if (moved.has(wordId)) continue
      expect(GROUP_OF_WORD[wordId], wordId).toBe(GROUP_OF_FAMILY[family])
    }
  })
})
