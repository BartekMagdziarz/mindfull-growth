import { beforeEach, describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { loadReflectionPathBlocks } from '@/services/programWeekService'
import { connectTestDatabase } from '@/test/testDatabase'
import { getPeriodRefsForDate } from '@/utils/periods'

const WEEK = getPeriodRefsForDate('2026-10-11').week
const PREVIOUS_WEEK = getPeriodRefsForDate('2026-10-04').week

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'old-shame',
    programSlug: 'shame-compassion',
    status: 'abandoned',
    startedAt: '2026-09-21T10:00:00.000Z',
    currentStepIndex: 6,
    completedSteps: [],
    createdAt: '2026-09-21T10:00:00.000Z',
    updatedAt: '2026-10-11T10:00:00.000Z',
    ...overrides,
  }
}

function restarted(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return enrollment({
    id: 'new-shame',
    status: 'active',
    startedAt: '2026-10-11T10:01:00.000Z',
    createdAt: '2026-10-11T10:01:00.000Z',
    currentStepIndex: 0,
    ...overrides,
  })
}

async function save(...enrollments: ProgramEnrollment[]) {
  const db = await connectTestDatabase()
  await db.programEnrollments.bulkPut(enrollments)
}

/** The week's reflection already holds a "Ścieżka" answer for this enrollment. */
async function answer(weekRef: WeekRef, enrollmentId: string) {
  await structuredReflectionDexieRepository.upsertWeekly({
    weekRef,
    promptResponses: { [`program.${enrollmentId}.severity`]: '3' },
  })
}

describe('loadReflectionPathBlocks after a path restart', () => {
  beforeEach(async () => {
    const db = await connectTestDatabase()
    await db.programEnrollments.clear()
    await db.weeklyReflections.clear()
  })

  it('shows only the new approach in the restart week and leaves the old one untouched', async () => {
    const old = enrollment()
    await save(old, restarted())

    const blocks = await loadReflectionPathBlocks(WEEK)

    expect(blocks.map(block => block.enrollment.id)).toEqual(['new-shame'])
    expect(blocks[0]?.phase?.week).toBe(1)
    expect(await programEnrollmentDexieRepository.getById(old.id)).toEqual(old)
  })

  it('reads the earlier approach in a week before the restart when that week was answered', async () => {
    await save(enrollment(), restarted())
    await answer(PREVIOUS_WEEK, 'old-shame')

    const blocks = await loadReflectionPathBlocks(PREVIOUS_WEEK)

    expect(blocks.map(block => block.enrollment.id)).toEqual(['old-shame'])
    expect(blocks[0]?.phase?.week).toBe(1)
  })

  it('does not add a path to reflections from before its start', async () => {
    await save(restarted())

    expect(await loadReflectionPathBlocks(PREVIOUS_WEEK)).toEqual([])
  })

  it.each(['paused', 'abandoned'] as const)(
    'does not revive the old approach when the new one is %s',
    async status => {
      await save(enrollment(), restarted({ status }))

      expect(await loadReflectionPathBlocks(WEEK)).toEqual([])
    }
  )

  it('keeps the latest approach after several restarts in one week', async () => {
    await save(
      restarted({
        id: 'latest',
        startedAt: '2026-10-11T11:00:00.000Z',
        createdAt: '2026-10-11T11:00:00.000Z',
      }),
      enrollment(),
      restarted({ status: 'abandoned' })
    )

    expect((await loadReflectionPathBlocks(WEEK)).map(block => block.enrollment.id)).toEqual([
      'latest',
    ])
  })

  it('keeps different paths and a path completed during the week', async () => {
    await save(
      enrollment(),
      restarted(),
      enrollment({
        id: 'anger',
        programSlug: 'anger-signal',
        status: 'completed',
        completedAt: '2026-10-08T10:00:00.000Z',
      })
    )

    const blocks = await loadReflectionPathBlocks(WEEK)
    expect(blocks.map(block => block.enrollment.id)).toEqual(['anger', 'new-shame'])
  })

  it('ignores a restart in the following week when reading this week', async () => {
    await save(
      enrollment(),
      restarted({
        startedAt: '2026-10-12T10:00:00.000Z',
        createdAt: '2026-10-12T10:00:00.000Z',
      })
    )
    await answer(WEEK, 'old-shame')

    expect((await loadReflectionPathBlocks(WEEK)).map(block => block.enrollment.id)).toEqual([
      'old-shame',
    ])
  })
})
