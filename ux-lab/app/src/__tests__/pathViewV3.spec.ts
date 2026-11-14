import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { collectionAt, practiceDefs, practicesAt, taskDefs, tasksFor, usePathProgressV3, type SceneSample } from '~lab/lab/pathViewV3'

describe('path view v3 (round 7)', () => {
  it('"fresh" is enrolled with nothing done: phase 1 current at 0/4', () => {
    const progress = usePathProgressV3(ref<SceneSample>('fresh'))
    expect(progress.enrolled.value).toBe(true)
    expect(progress.currentWeek.value).toBe(0)
    expect(progress.weekCompletion(0)).toEqual({ done: 0, total: 4 })
    expect(progress.weekState(0)).toBe('current')
    expect(progress.weekState(1)).toBe('later')
  })

  it('"start" is not enrolled, "mid" keeps one current step in week 4', () => {
    expect(usePathProgressV3(ref<SceneSample>('start')).enrolled.value).toBe(false)
    const mid = usePathProgressV3(ref<SceneSample>('mid'))
    expect(mid.weekState(0)).toBe('done')
    expect(mid.weekCompletion(3)).toEqual({ done: 1, total: 3 })
    expect(mid.current.value?.week).toBe(3)
  })

  it('practices follow the catalog windows (counted in completed steps)', () => {
    expect(practiceDefs.map(p => p.slug)).toEqual(['paced-breathing', 'moment-shame', 'self-compassion-break', 'shame-writing', 'positive-data-log'])
    expect(practicesAt(0).map(p => p.slug)).toEqual(['paced-breathing'])
    expect(practicesAt(10).map(p => p.slug)).toEqual(['moment-shame', 'self-compassion-break'])
    expect(practicesAt(15).map(p => p.slug)).toEqual(['self-compassion-break', 'shame-writing'])
  })

  it('the collection only grows: handed-over practices stay on demand', () => {
    expect(collectionAt(0).map(i => [i.def.slug, i.active])).toEqual([['paced-breathing', true]])
    expect(collectionAt(10).map(i => [i.def.slug, i.active])).toEqual([
      ['paced-breathing', false],
      ['moment-shame', true],
      ['self-compassion-break', true],
    ])
    expect(collectionAt(24)).toHaveLength(5)
    expect(collectionAt(24).filter(i => i.active)).toHaveLength(0)
  })

  it('weekly tasks have copy and sit in phases w1–w7', () => {
    expect(taskDefs.length).toBe(17)
    for (const task of taskDefs) {
      expect(task.title.length, task.key).toBeGreaterThan(10)
      expect(task.why.length, task.key).toBeGreaterThan(10)
    }
    expect(tasksFor('w1').map(t => t.key)).toEqual(['nameShame', 'catchBody'])
    expect(tasksFor('w8')).toEqual([])
  })
})
