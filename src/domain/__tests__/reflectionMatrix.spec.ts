import { describe, it, expect } from 'vitest'
import {
  MATRIX_CELL_ICONS,
  MATRIX_SECTIONS,
  REFLECTION_MATRIX_AREAS,
  composeCellLabel,
} from '../reflectionMatrix'
import {
  WEEKLY_ACTIONS_KEYS,
  WEEKLY_DEMANDS_KEYS,
  WEEKLY_RATING_KEYS,
  WEEKLY_STATE_KEYS,
} from '../reflection'

describe('reflection matrix', () => {
  it('covers every weekly rating key exactly once (bijection)', () => {
    const cellFields = REFLECTION_MATRIX_AREAS.flatMap((area) =>
      MATRIX_SECTIONS.map((section) => area.fields[section])
    )
    expect(cellFields).toHaveLength(WEEKLY_RATING_KEYS.length)
    expect(new Set(cellFields).size).toBe(cellFields.length)
    expect([...cellFields].sort()).toEqual([...WEEKLY_RATING_KEYS].sort())
  })

  it('assigns each section field to the matching domain key group', () => {
    for (const area of REFLECTION_MATRIX_AREAS) {
      expect(WEEKLY_DEMANDS_KEYS).toContain(area.fields.demands)
      expect(WEEKLY_ACTIONS_KEYS).toContain(area.fields.actions)
      expect(WEEKLY_STATE_KEYS).toContain(area.fields.state)
    }
  })

  it('keeps the canonical area display order', () => {
    expect(REFLECTION_MATRIX_AREAS.map((a) => a.key)).toEqual([
      'body',
      'emotions',
      'tasks',
      'closeOnes',
    ])
  })

  it('declares an icon and a 5-level icon tuple for every cell', () => {
    for (const area of REFLECTION_MATRIX_AREAS) {
      expect(area.icon.length).toBeGreaterThan(0)
      for (const section of MATRIX_SECTIONS) {
        expect(MATRIX_CELL_ICONS[area.key][section]).toHaveLength(5)
      }
    }
  })

  it('composes standalone cell labels as "Section · Area"', () => {
    const t = (key: string) => key.split('.').pop() ?? key
    expect(composeCellLabel(t, 'tasks', 'state')).toBe('title · title')
    const verbose = (key: string) => key
    expect(composeCellLabel(verbose, 'body', 'demands')).toBe(
      'planning.reflection.weekly.groups.demands.title · planning.reflection.weekly.areas.body.title'
    )
  })
})
