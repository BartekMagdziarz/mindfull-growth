import { describe, expect, it } from 'vitest'
import { FAMILIES_BY_QUADRANT, FAMILY_OF } from '@/domain/emotionFamily'
import {
  SPOKE_OF_FAMILY,
  WHEEL_INTENSITY_LEVELS,
  WHEEL_SPOKES,
  WHEEL_SPOKES_BY_QUADRANT,
  getSpoke,
  legacyToSelections,
  selectionsToLegacyFamilyIds,
} from '@/domain/emotionWheel'

const ALL_FAMILIES = Object.values(FAMILIES_BY_QUADRANT).flat()

describe('wheel catalog shape', () => {
  it('has 33 spokes split 9/8/8/8 across quadrants', () => {
    expect(WHEEL_SPOKES).toHaveLength(33)
    expect(WHEEL_SPOKES_BY_QUADRANT['high-energy-high-pleasantness']).toHaveLength(9)
    expect(WHEEL_SPOKES_BY_QUADRANT['high-energy-low-pleasantness']).toHaveLength(8)
    expect(WHEEL_SPOKES_BY_QUADRANT['low-energy-low-pleasantness']).toHaveLength(8)
    expect(WHEEL_SPOKES_BY_QUADRANT['low-energy-high-pleasantness']).toHaveLength(8)
  })

  it('has unique spoke ids and exactly 5 hint slots per spoke', () => {
    const ids = WHEEL_SPOKES.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const spoke of WHEEL_SPOKES) {
      expect(spoke.hints).toHaveLength(WHEEL_INTENSITY_LEVELS)
    }
  })

  it('maps EVERY family slug (41) to a spoke in the same quadrant', () => {
    expect(ALL_FAMILIES.length).toBe(41)
    for (const family of ALL_FAMILIES) {
      const spokeId = SPOKE_OF_FAMILY[family.id]
      expect(spokeId, `family ${family.id} has no spoke`).toBeDefined()
      const spoke = getSpoke(spokeId!)
      expect(spoke, `spoke ${spokeId} missing from catalog`).toBeDefined()
      expect(spoke!.quadrant, `family ${family.id} crosses quadrants`).toBe(family.quadrant)
    }
  })

  it('absorbed slugs are real family slugs, not spoke ids', () => {
    const familyIds = new Set(ALL_FAMILIES.map((f) => f.id))
    const spokeIds = new Set(WHEEL_SPOKES.map((s) => s.id))
    for (const spoke of WHEEL_SPOKES) {
      for (const absorbed of spoke.absorbs) {
        expect(familyIds.has(absorbed), `absorbed ${absorbed} is not a family`).toBe(true)
        expect(spokeIds.has(absorbed), `absorbed ${absorbed} collides with a spoke id`).toBe(false)
      }
    }
  })

  it('hints reference existing catalog emotions, each used at most once', () => {
    const seen = new Set<string>()
    for (const spoke of WHEEL_SPOKES) {
      for (const hint of spoke.hints) {
        if (!hint) continue
        expect(FAMILY_OF[hint], `hint ${hint} not in FAMILY_OF`).toBeDefined()
        expect(seen.has(hint), `hint ${hint} used twice`).toBe(false)
        seen.add(hint)
      }
    }
  })
})

describe('legacyToSelections', () => {
  it('prefers the explicit emotions field and drops unknown spoke ids', () => {
    const result = legacyToSelections({
      emotions: [
        { emotionId: 'gniew', intensity: 4 },
        { emotionId: 'nie-istnieje' },
      ],
      emotionIds: ['e9m5-sad-093'],
    })
    expect(result).toEqual([{ emotionId: 'gniew', intensity: 4 }])
  })

  it('maps a hint word to its spoke with the hint level', () => {
    // Zirytowany = poziom 3 promienia „Złość" (slug gniew)
    const result = legacyToSelections({ emotionIds: ['e3m5-irritated-087'] })
    expect(result).toEqual([{ emotionId: 'gniew', intensity: 3 }])
  })

  it('maps a non-hint word through its family, without intensity', () => {
    const hinted = new Set(WHEEL_SPOKES.flatMap((s) => s.hints).filter(Boolean))
    const nonHintWord = Object.keys(FAMILY_OF).find((id) => !hinted.has(id))
    expect(nonHintWord).toBeDefined()
    const family = FAMILY_OF[nonHintWord!]
    const result = legacyToSelections({ emotionIds: [nonHintWord!] })
    expect(result).toEqual([{ emotionId: SPOKE_OF_FAMILY[family] }])
  })

  it('maps absorbed family slugs to their spoke', () => {
    const result = legacyToSelections({ emotionFamilyIds: ['energia', 'irytacja-i-frustracja'] })
    expect(result).toEqual(
      expect.arrayContaining([{ emotionId: 'ekscytacja' }, { emotionId: 'gniew' }]),
    )
    expect(result).toHaveLength(2)
  })

  it('deduplicates per spoke, keeping the highest intensity', () => {
    const result = legacyToSelections({
      // Podrażniony (2) i Wściekły (5) → jeden wpis gniew z natężeniem 5
      emotionIds: ['e6m5-peeved-090', 'e2m1-livid-134'],
      emotionFamilyIds: ['gniew'],
    })
    expect(result).toEqual([{ emotionId: 'gniew', intensity: 5 }])
  })

  it('silently drops unknown ids', () => {
    expect(legacyToSelections({ emotionIds: ['xxx'], emotionFamilyIds: ['yyy'] })).toEqual([])
  })
})

describe('selectionsToLegacyFamilyIds', () => {
  it('returns deduplicated spoke slugs', () => {
    expect(
      selectionsToLegacyFamilyIds([
        { emotionId: 'gniew', intensity: 2 },
        { emotionId: 'gniew', intensity: 5 },
        { emotionId: 'radosc' },
      ]),
    ).toEqual(['gniew', 'radosc'])
  })
})
