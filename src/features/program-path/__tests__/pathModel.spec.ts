import { describe, expect, it } from 'vitest'
import { getProgramDefinition } from '@/data/programCatalog'
import {
  firstSentence,
  groupColumns,
  groupWraps,
  pathGroups,
  pathHasPracticesContent,
} from '../pathModel'

describe('firstSentence', () => {
  it('returns the first sentence of a multi-sentence intro', () => {
    expect(
      firstSentence(
        'Zacznij od pomiaru: jak traktujesz siebie w trudnych chwilach. Wrócisz do niego.'
      )
    ).toBe('Zacznij od pomiaru: jak traktujesz siebie w trudnych chwilach.')
  })

  it('keeps a one-sentence intro whole, trimmed', () => {
    expect(firstSentence('  Teraz ty jesteś współczuciem.  ')).toBe('Teraz ty jesteś współczuciem.')
  })

  it('does not split on an abbreviation-like dot inside a quoted phrase', () => {
    expect(firstSentence('Wybierz moment i rozłóż gorącą myśl „jestem…”. Szukaj dowodów.')).toBe(
      'Wybierz moment i rozłóż gorącą myśl „jestem…”.'
    )
  })

  it('handles the empty string', () => {
    expect(firstSentence('')).toBe('')
  })
})

describe('groupColumns / groupWraps (B-2)', () => {
  const group = (count: number) => ({ stepIndices: Array.from({ length: count }, (_, i) => i) })

  it('a phased week of up to four steps is one row, one column wider with a focused tile', () => {
    expect(groupWraps(group(3))).toBe(false)
    expect(groupColumns(group(3), false)).toBe(3)
    expect(groupColumns(group(3), true)).toBe(4)
    expect(groupColumns(group(4), true)).toBe(5)
  })

  it('a path without phases (five steps or more) wraps and leaves the columns to CSS', () => {
    for (const slug of ['ifs-parts', 'foundation', 'cbt-thoughts']) {
      const [all] = pathGroups(getProgramDefinition(slug)!)
      expect(all!.stepIndices.length).toBeGreaterThan(4)
      expect(groupWraps(all!)).toBe(true)
      expect(groupColumns(all!, true)).toBeNull()
    }
  })
})

describe('pathHasPracticesContent (B-2)', () => {
  it('is false for the paths without practices, tasks and Momenty', () => {
    for (const slug of ['ifs-parts', 'foundation', 'cbt-thoughts']) {
      expect(pathHasPracticesContent(getProgramDefinition(slug)!)).toBe(false)
    }
  })

  it('is true for the problem-focused paths', () => {
    for (const slug of ['shame-compassion', 'anger-signal', 'anxiety-approach']) {
      expect(pathHasPracticesContent(getProgramDefinition(slug)!)).toBe(true)
    }
    expect(pathHasPracticesContent({ practices: [], momentKind: undefined })).toBe(false)
    expect(pathHasPracticesContent({ weeklyTasks: [{}] as never })).toBe(true)
  })
})
