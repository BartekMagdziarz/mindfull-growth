import { describe, expect, it } from 'vitest'
import type { ExerciseCompletion } from '@/domain/exerciseCompletion'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import {
  migrateLogsToMoments,
  migrateMomentCompletion,
  migrateMomentEntry,
  migrateMomentPlanItem,
} from '@/services/migrations/momentsMigration'

const at = '2026-09-20T10:00:00.000Z'

function entry(slug: string, responses: MicroExerciseEntry['responses']): MicroExerciseEntry {
  return { id: `e-${slug}`, exerciseSlug: slug, createdAt: at, updatedAt: at, responses }
}

describe('moments migration (Dexie v27)', () => {
  it('moves a shame log entry under moments with kind = shame, keys untouched', () => {
    const migrated = migrateMomentEntry(
      entry('shame-log', { hadMoment: 'yes', situation: 'meeting', compass: 'withdraw', kindVoice: 'ok' }),
    )
    expect(migrated?.exerciseSlug).toBe('moments')
    expect(migrated?.responses).toEqual({
      hadMoment: 'yes',
      situation: 'meeting',
      compass: 'withdraw',
      kindVoice: 'ok',
      kind: 'shame',
    })
  })

  it('moves an anger log entry: renames trigger/firstSign/hadEpisode and folds mild/strong into yes', () => {
    const strong = migrateMomentEntry(
      entry('anger-log', { hadEpisode: 'strong', intensity: 8, trigger: 'cut off', firstSign: 'jaw', thought: 't', behavior: 'b' }),
    )
    expect(strong?.responses).toEqual({
      hadMoment: 'yes',
      intensity: 8,
      situation: 'cut off',
      body: 'jaw',
      thought: 't',
      behavior: 'b',
      kind: 'anger',
    })
    const calm = migrateMomentEntry(entry('anger-log', { hadEpisode: 'none', quietDay: 'walk' }))
    expect(calm?.responses).toEqual({ hadMoment: 'none', quietDay: 'walk', kind: 'anger' })
  })

  it('leaves other entries alone (idempotent on already-migrated rows)', () => {
    expect(migrateMomentEntry(entry('moments', { kind: 'shame' }))).toBeNull()
    expect(migrateMomentEntry(entry('shame-map', { standard: 'x' }))).toBeNull()
  })

  it('renames completions and plan items to the catalog variants', () => {
    const completion: ExerciseCompletion = {
      id: 'c',
      exerciseSlug: 'shame-log',
      dayRef: '2026-09-20' as DayRef,
      completedAt: at,
      source: 'plan',
    }
    expect(migrateMomentCompletion(completion)?.exerciseSlug).toBe('moment-shame')
    expect(migrateMomentCompletion({ ...completion, exerciseSlug: 'anger-log' })?.exerciseSlug).toBe('moment-anger')
    expect(migrateMomentCompletion({ ...completion, exerciseSlug: 'moment-shame' })).toBeNull()

    const item: ExercisePlanItem = {
      id: 'p',
      exerciseSlug: 'anger-log',
      dayRef: '2026-09-27' as DayRef,
      status: 'pending',
      source: 'program',
      sourceRef: 'enr',
      programRole: 'practice',
      createdAt: at,
      updatedAt: at,
    }
    expect(migrateMomentPlanItem(item)?.exerciseSlug).toBe('moment-anger')
    expect(migrateMomentPlanItem({ ...item, exerciseSlug: 'paced-breathing' })).toBeNull()
  })

  it('migrateLogsToMoments writes only changed rows and reports counts', async () => {
    const written: string[] = []
    const counts = await migrateLogsToMoments({
      entries: [entry('shame-log', { hadMoment: 'none' }), entry('moments', { kind: 'shame' })],
      completions: [
        { id: 'c1', exerciseSlug: 'anger-log', dayRef: '2026-09-20' as DayRef, completedAt: at, source: 'standalone' },
        { id: 'c2', exerciseSlug: 'values', dayRef: '2026-09-20' as DayRef, completedAt: at, source: 'standalone' },
      ],
      planItems: [],
      putEntry: async (row) => void written.push(`entry:${row.id}:${row.exerciseSlug}`),
      putCompletion: async (row) => void written.push(`completion:${row.id}:${row.exerciseSlug}`),
      putPlanItem: async (row) => void written.push(`plan:${row.id}`),
    })
    expect(counts).toEqual({ entries: 1, completions: 1, planItems: 0 })
    expect(written).toEqual(['entry:e-shame-log:moments', 'completion:c1:moment-anger'])
  })
})
