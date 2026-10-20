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
        expect(
          LEGACY_PROGRAM_STEPS[program.slug]?.[earlier],
          `${program.slug} v${earlier}`
        ).toBeDefined()
      }
    }
    // The v1 list is the shape that shipped 2026-09-23 (14 steps, image at 7);
    // v2 (2026-09-26) has 15 with the image at 3.
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![1]).toHaveLength(14)
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![1]![6]).toBe('compassionate-image')
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![2]).toHaveLength(15)
    expect(LEGACY_PROGRAM_STEPS['shame-compassion']![2]![2]).toBe('compassionate-image')
  })

  it('anger v1 after the pause plan and anxiety v1 after the thought record land on their v2 gaps', () => {
    const anger = getProgramDefinition('anger-signal')!
    const angerRow = migrateEnrollmentContent(
      enrollment({
        id: 'enr-anger',
        programSlug: 'anger-signal',
        currentStepIndex: 3,
        completedSteps: [0, 1, 2].map(stepIndex => ({ stepIndex, completedAt: at(1) })),
      }),
      anger
    )!
    // barometer · map · pause plan → the new "Mój znak" (index 2) is the first gap
    expect(angerRow.completedSteps.map(step => step.stepIndex)).toEqual([0, 1, 3])
    expect(angerRow.currentStepIndex).toBe(2)
    expect(angerRow.contentVersion).toBe(2)
    const anxiety = getProgramDefinition('anxiety-approach')!
    const anxietyRow = migrateEnrollmentContent(
      enrollment({
        id: 'enr-anxiety',
        programSlug: 'anxiety-approach',
        currentStepIndex: 6,
        completedSteps: [0, 1, 2, 3, 4, 5].map(stepIndex => ({ stepIndex, completedAt: at(1) })),
      }),
      anxiety
    )!
    // gad-7 · ius-12 · map · worry tree · distortions · thought record → "Mój znak" (index 3) is the first gap
    expect(anxietyRow.completedSteps.map(step => step.stepIndex)).toEqual([0, 1, 2, 4, 5, 6])
    expect(anxietyRow.currentStepIndex).toBe(3)
  })

  it('a v1 enrollment after SCS-SF and the map comes back for the new FSCRS step', () => {
    const migrated = migrateEnrollmentContent(
      enrollment({
        currentStepIndex: 2,
        completedSteps: [
          { stepIndex: 0, completedAt: at(0) },
          { stepIndex: 1, completedAt: at(1) },
        ],
      }),
      shame
    )!
    // v3: scs-sf → 0, shame-map → 2; the new step 1 (fscrs) is the first gap
    expect(migrated.completedSteps.map(s => s.stepIndex)).toEqual([0, 2])
    expect(migrated.currentStepIndex).toBe(1)
    expect(shame.steps[1]!.exerciseSlug).toBe('fscrs')
    expect(migrated.contentVersion).toBe(3)
  })

  it('re-maps v1 completed steps by slug and returns to the first gap', () => {
    const migrated = migrateEnrollmentContent(
      enrollment({
        currentStepIndex: 4,
        completedSteps: [0, 1, 2, 3].map(stepIndex => ({ stepIndex, completedAt: at(stepIndex) })),
      }),
      shame
    )!
    // v1: scs, map, shame-or-guilt, thought-record → v3 indices 0, 2, 8, 9
    expect(migrated.completedSteps.map(s => s.stepIndex)).toEqual([0, 2, 8, 9])
    expect(migrated.completedSteps.map(s => s.completedAt)).toEqual([at(0), at(1), at(2), at(3)])
    expect(migrated.currentStepIndex).toBe(1)
  })

  it('a v2 enrollment mid-path (the seeded shape) keeps its five completions and fills the new gaps first', () => {
    const migrated = migrateEnrollmentContent(
      enrollment({
        contentVersion: 2,
        currentStepIndex: 5,
        completedSteps: [0, 1, 2, 3, 4].map(stepIndex => ({
          stepIndex,
          completedAt: at(stepIndex),
        })),
      }),
      shame
    )!
    // v2: scs, map, image, response, shame-or-guilt → v3 indices 0, 2, 5, 7, 8
    expect(migrated.completedSteps.map(s => s.stepIndex)).toEqual([0, 2, 5, 7, 8])
    expect(migrated.currentStepIndex).toBe(1)
    expect(migrated.contentVersion).toBe(3)
  })

  it('maps a repeated slug in order (the closing SCS-SF) and keeps a walked path walked', () => {
    const v1 = LEGACY_PROGRAM_STEPS['shame-compassion']![1]!
    const migrated = migrateEnrollmentContent(
      enrollment({
        status: 'completed',
        currentStepIndex: v1.length,
        completedSteps: v1.map((_, stepIndex) => ({ stepIndex, completedAt: at(stepIndex) })),
      }),
      shame
    )!
    const indices = migrated.completedSteps.map(s => s.stepIndex)
    expect(indices).toContain(0)
    expect(indices).toContain(10) // second scs-sf → the mid-path measurement
    expect(indices).not.toContain(3) // my-sign never existed in v1
    expect(indices).not.toContain(7) // shame-response never existed in v1
    expect(migrated.currentStepIndex).toBe(shame.steps.length)
  })

  it('is a no-op for rows already on the definition version or without a legacy list', () => {
    expect(needsContentMigration(enrollment({ contentVersion: 3 }), shame)).toBe(false)
    expect(migrateEnrollmentContent(enrollment({ contentVersion: 3 }), shame)).toBeNull()
    expect(
      migrateEnrollmentContent(
        enrollment({ programSlug: 'ifs-parts' }),
        getProgramDefinition('ifs-parts')!
      )
    ).toBeNull()
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
        enrollment({
          currentStepIndex: 2,
          completedSteps: [
            { stepIndex: 0, completedAt: at(0) },
            { stepIndex: 1, completedAt: at(1) },
          ],
        }),
        enrollment({ id: 'enr-new', contentVersion: 3 }),
      ],
      planItems: [
        item({ id: 'stale-step' }),
        item({ id: 'practice', exerciseSlug: 'moment-shame', programRole: 'practice' }),
        item({ id: 'done-step', status: 'done' }),
        item({ id: 'other', sourceRef: 'enr-new' }),
      ],
      putEnrollment: async row => void writes.push(`put:${row.id}:${row.currentStepIndex}`),
      deletePlanItem: async id => void writes.push(`del:${id}`),
    })
    expect(migrated.map(row => row.id)).toEqual(['enr-shame'])
    expect(writes).toEqual(['put:enr-shame:1', 'del:stale-step'])
  })
})
