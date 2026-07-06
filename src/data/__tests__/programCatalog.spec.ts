import { describe, it, expect } from 'vitest'
import { PROGRAM_CATALOG, getProgramDefinition } from '@/data/programCatalog'
import { getCatalogEntry } from '@/data/exerciseCatalog'
import enPrograms from '@/locales/en/programs.json'
import plPrograms from '@/locales/pl/programs.json'

describe('program catalog', () => {
  it('has unique program slugs', () => {
    const slugs = PROGRAM_CATALOG.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(slugs).toEqual(['ifs-parts', 'foundation', 'cbt-thoughts'])
  })

  it('every step references an existing catalog exercise', () => {
    for (const program of PROGRAM_CATALOG) {
      for (const step of program.steps) {
        expect(
          getCatalogEntry(step.exerciseSlug),
          `${program.slug}: unknown exercise ${step.exerciseSlug}`,
        ).toBeDefined()
      }
    }
  })

  it('gaps are non-negative and step 0 is immediate', () => {
    for (const program of PROGRAM_CATALOG) {
      expect(program.steps.length).toBeGreaterThan(1)
      expect(program.steps[0]!.minGapDays).toBe(0)
      for (const step of program.steps) {
        expect(step.minGapDays).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('foundation walks one exercise per coverage group, in group order', () => {
    // One completed item satisfies each group (FOUNDATION_GROUP_MIN_REQUIRED
    // = 1), so finishing the path unlocks the foundation build finale.
    expect(getProgramDefinition('foundation')?.steps.map((s) => s.exerciseSlug)).toEqual([
      'values', // values
      'purpose', // meaning
      'ipip-bfm-50', // personality
      'erq', // emotions
      'ecr-rs', // relationships
      'wheel-of-life', // lifeBalance
    ])
    expect(getProgramDefinition('foundation')?.finaleRouteName).toBe(
      'profile-psychological-build',
    )
  })

  it('the only optional step is the third thought-record', () => {
    for (const program of PROGRAM_CATALOG) {
      program.steps.forEach((step, index) => {
        const shouldBeOptional = program.slug === 'cbt-thoughts' && index === 3
        expect(
          Boolean(step.optional),
          `${program.slug} step ${index} optional flag`,
        ).toBe(shouldBeOptional)
      })
    }
  })

  it('every step carries a 1-based intro key in its program namespace', () => {
    for (const program of PROGRAM_CATALOG) {
      program.steps.forEach((step, index) => {
        expect(step.introKey).toBe(`programs.${program.slug}.steps.step${index + 1}.intro`)
      })
    }
  })

  it('has copy for every program and step intro in both locales', () => {
    for (const locale of [enPrograms, plPrograms]) {
      const copy = locale as unknown as Record<
        string,
        { title?: string; description?: string; steps?: Record<string, { intro?: string }> }
      >
      for (const program of PROGRAM_CATALOG) {
        const node = copy[program.slug]
        expect(node?.title, `${program.slug}.title missing`).toBeTruthy()
        expect(node?.description, `${program.slug}.description missing`).toBeTruthy()
        program.steps.forEach((_, index) => {
          expect(
            node?.steps?.[`step${index + 1}`]?.intro,
            `${program.slug}.steps.step${index + 1}.intro missing`,
          ).toBeTruthy()
        })
        if (program.finaleRouteName) {
          const finale = node as { finaleCta?: string; finaleDescription?: string }
          expect(finale?.finaleCta, `${program.slug}.finaleCta missing`).toBeTruthy()
          expect(finale?.finaleDescription, `${program.slug}.finaleDescription missing`).toBeTruthy()
        }
      }
    }
  })

  it('getProgramDefinition resolves known slugs only', () => {
    expect(getProgramDefinition('ifs-parts')?.icon).toBeTruthy()
    expect(getProgramDefinition('nope')).toBeUndefined()
  })
})
