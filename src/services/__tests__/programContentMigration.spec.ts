import { describe, expect, it } from 'vitest'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { DayRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { getProgramDefinition, PROGRAM_CATALOG } from '@/data/programCatalog'
import { LEGACY_PROGRAM_STEPS } from '@/data/programCatalogLegacy'
import {
  migrateEnrollmentContent,
  migrateEnrollmentsContent,
  needsContentMigration,
} from '@/services/programContentMigration'

const shame = getProgramDefinition('shame-compassion')!
const at = (n: number) => `2026-09-${String(10 + n).padStart(2, '0')}T10:00:00.000Z`

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-shame',
    programSlug: 'shame-compassion',
    status: 'active',
    startedAt: at(0),
    currentStepIndex: 0,
    completedSteps: [],
    createdAt: at(0),
    updatedAt: at(0),
    ...overrides,
  }
}

describe('program content migration', () => {
  it('every bumped definition has a legacy step list for each earlier version', () => {
    for (const program of PROGRAM_CATALOG) {
      const version = program.contentVersion ?? 1
      for (let earlier = 1; earlier < version; earlier += 1) {
        expect(LEGACY_PROGRAM_STEPS[program.slug]?.[earlier], `${program.slug} v${earlier}`).toBeDefined()
      }
    }
    // The v1 list is the shape that shipped 2026-09-23 (14 steps, image at 7).
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![1]).toHaveLength(14)
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![1]![6]).toBe('compassionate-image')
  })

  it('a v1 enrollment after SCS-SF and the map lands on the compassionate image (the live case)', () => {
    const migrated = migrateEnrollmentContent(
      enrollment({
        currentStepIndex: 2,
        completedSteps: [
          { stepIndex: 0, completedAt: at(0) },
          { stepIndex: 1, completedAt: at(1) },
        ],
      }),
      shame,
    )!
    expect(migrated.completedSteps.map((s) => s.stepIndex)).toEqual([0, 1])
    expect(migrated.currentStepIndex).toBe(2)
    expect(shame.steps[2]!.exerciseSlug).toBe('compassionate-image')
    expect(migrated.contentVersion).toBe(2)
  })

  it('re-maps completed steps by slug and returns to the first gap (image + response still due)', () => {
    const migrated = migrateEnrollmentContent(
      enrollment({
        currentStepIndex: 4,
        completedSteps: [0, 1, 2, 3].map((stepIndex) => ({ stepIndex, completedAt: at(stepIndex) })),
      }),
      shame,
    )!
    // v1: scs, map, shame-or-guilt, thought-record → v2 indices 0, 1, 4, 5
    expect(migrated.completedSteps.map((s) => s.stepIndex)).toEqual([0, 1, 4, 5])
    expect(migrated.completedSteps.map((s) => s.completedAt)).toEqual([at(0), at(1), at(2), at(3)])
    expect(migrated.currentStepIndex).toBe(2)
  })

  it('maps a repeated slug in order (the closing SCS-SF) and keeps a walked path walked', () => {
    const v1 = LEGACY_PROGRAM_STEPS['shame-compassion']![1]!
    const migrated = migrateEnrollmentContent(
      enrollment({
        status: 'completed',
        currentStepIndex: v1.length,
        completedSteps: v1.map((_, stepIndex) => ({ stepIndex, completedAt: at(stepIndex) })),
      }),
      shame,
    )!
    const indices = migrated.completedSteps.map((s) => s.stepIndex)
    expect(indices).toContain(0)
    expect(indices).toContain(13) // second scs-sf
    expect(indices).not.toContain(3) // shame-response never existed in v1
    expect(migrated.currentStepIndex).toBe(shame.steps.length)
  })

  it('is a no-op for rows already on the definition version or without a legacy list', () => {
    expect(needsContentMigration(enrollment({ contentVersion: 2 }), shame)).toBe(false)
    expect(migrateEnrollmentContent(enrollment({ contentVersion: 2 }), shame)).toBeNull()
    expect(migrateEnrollmentContent(enrollment({ programSlug: 'anger-signal' }), getProgramDefinition('anger-signal')!)).toBeNull()
  })

  it('migrateEnrollmentsContent persists changed rows and drops their pending step items only', async () => {
    const writes: string[] = []
    const item = (overrides: Partial<ExercisePlanItem>): ExercisePlanItem => ({
      id: 'p',
      exerciseSlug: 'shame-or-guilt',
      dayRef: '2026-09-20' as DayRef,
      status: 'pending',
      source: 'program',
      sourceRef: 'enr-shame',
      programRole: 'step',
      createdAt: at(0),
      updatedAt: at(0),
      ...overrides,
    })
    const migrated = await migrateEnrollmentsContent({
      enrollments: [
        enrollment({ currentStepIndex: 2, completedSteps: [{ stepIndex: 0, completedAt: at(0) }, { stepIndex: 1, completedAt: at(1) }] }),
        enrollment({ id: 'enr-new', contentVersion: 2 }),
      ],
      planItems: [
        item({ id: 'stale-step' }),
        item({ id: 'practice', exerciseSlug: 'moment-shame', programRole: 'practice' }),
        item({ id: 'done-step', status: 'done' }),
        item({ id: 'other', sourceRef: 'enr-new' }),
      ],
      putEnrollment: async (row) => void writes.push(`put:${row.id}:${row.currentStepIndex}`),
      deletePlanItem: async (id) => void writes.push(`del:${id}`),
    })
    expect(migrated.map((row) => row.id)).toEqual(['enr-shame'])
    expect(writes).toEqual(['put:enr-shame:2', 'del:stale-step'])
  })
})
