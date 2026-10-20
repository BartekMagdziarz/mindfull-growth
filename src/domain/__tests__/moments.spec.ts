import { describe, expect, it } from 'vitest'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { WeekRef } from '@/domain/period'
import { momentsInWeek, recentMoments, summarizeMoments } from '@/domain/moments'
import { getPeriodRefsForDate } from '@/utils/periods'

function entry(
  id: string,
  createdAt: string,
  responses: MicroExerciseEntry['responses'],
  slug = 'moments'
): MicroExerciseEntry {
  return { id, exerciseSlug: slug, createdAt, updatedAt: createdAt, responses }
}

// Local timestamps so the week/day math follows the app's local-day rule.
const entries = [
  entry('s1', '2026-09-21T09:00:00', {
    kind: 'shame',
    hadMoment: 'yes',
    about: 'demand',
    compass: 'withdraw',
    response: ['breath', 'named'],
  }),
  entry('s2', '2026-09-23T23:30:00', {
    kind: 'shame',
    hadMoment: 'yes',
    about: 'act',
    compass: 'attackSelf',
    response: ['repair'],
  }),
  entry('q', '2026-09-22T19:00:00', { kind: 'shame', hadMoment: 'none', quietDay: 'walk' }),
  entry('a', '2026-09-22T19:00:00', { kind: 'anger', hadMoment: 'yes', intensity: 7 }),
  entry('old', '2026-08-30T19:00:00', {
    kind: 'shame',
    hadMoment: 'yes',
    about: 'demand',
    compass: 'avoid',
    response: ['nothing'],
  }),
  entry('map', '2026-09-22T19:00:00', { standard: 'x' }, 'shame-map'),
]

describe('moments', () => {
  it('momentsInWeek: same kind, local day within the week, newest first', () => {
    const week = getPeriodRefsForDate(new Date('2026-09-23T12:00:00')).week as WeekRef
    expect(momentsInWeek(entries, 'shame', week).map(e => e.id)).toEqual(['s2', 'q', 's1'])
    expect(momentsInWeek(entries, 'anger', week).map(e => e.id)).toEqual(['a'])
  })

  it('recentMoments: the last N days including today', () => {
    const now = new Date('2026-09-25T10:00:00')
    expect(recentMoments(entries, 'shame', 7, now).map(e => e.id)).toEqual(['s2', 'q', 's1'])
    expect(recentMoments(entries, 'shame', 2, now)).toEqual([])
    expect(recentMoments(entries, 'shame', 30, now).map(e => e.id)).toEqual([
      's2',
      'q',
      's1',
      'old',
    ])
  })

  it('summarizeMoments: counts per option, quiet notes apart, recent moments only', () => {
    const summary = summarizeMoments(entries, 'shame')
    expect(summary.moments).toBe(3)
    expect(summary.quiet).toBe(1)
    expect(summary.counts.about).toEqual({ demand: 2, act: 1 })
    expect(summary.counts.compass).toEqual({ withdraw: 1, attackSelf: 1, avoid: 1 })
    expect(summary.counts.response).toEqual({ breath: 1, named: 1, repair: 1, nothing: 1 })
    expect(summary.recent.map(e => e.id)).toEqual(['s2', 's1', 'old'])
  })
})
