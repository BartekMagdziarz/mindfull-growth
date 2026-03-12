import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { initiativeDexieRepository } from '@/repositories/initiativeDexieRepository'
import { reflectionDexieRepository } from '@/repositories/reflectionDexieRepository'
import { connectTestDatabase } from '@/test/testDatabase'
import type { MonthRef, WeekRef } from '@/domain/period'
import { parsePeriodRef } from '@/utils/periods'

describe('reflection Dexie repository', () => {
  beforeEach(async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const db = await connectTestDatabase()
    await db.periodObjectReflections.clear()
    await db.periodReflections.clear()
    await db.goals.clear()
    await db.initiatives.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('upserts period reflections by [periodType+periodRef]', async () => {
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    const created = await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: ' Strong week ',
    })
    const updated = await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: 'Refined week summary',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.note).toBe('Refined week summary')
  })

  it('upserts object reflections by [periodType+periodRef+subjectType+subjectId]', async () => {
    const initiative = await initiativeDexieRepository.create({
      title: 'Prepare deck',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const monthRef = parsePeriodRef('2026-03') as MonthRef

    const created = await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'month',
      periodRef: monthRef,
      subjectType: 'initiative',
      subjectId: initiative.id,
      note: '  Good momentum ',
    })
    const updated = await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'month',
      periodRef: monthRef,
      subjectType: 'initiative',
      subjectId: initiative.id,
      note: 'Great finish',
    })

    expect(updated.id).toBe(created.id)
    expect(updated.note).toBe('Great finish')
    expect(await reflectionDexieRepository.listPeriodObjectReflections()).toHaveLength(1)
  })

  it('rejects reflections for missing subjects', async () => {
    await expect(
      reflectionDexieRepository.upsertPeriodObjectReflection({
        periodType: 'week',
        periodRef: parsePeriodRef('2026-W10') as WeekRef,
        subjectType: 'goal',
        subjectId: 'missing-goal',
        note: 'Nope',
      })
    ).rejects.toThrow('Failed to persist period object reflection in database')
  })

  it('deletes reflections cleanly', async () => {
    const goal = await goalDexieRepository.create({
      title: 'Finish migration',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      status: 'open',
    })
    const weekRef = parsePeriodRef('2026-W10') as WeekRef

    await reflectionDexieRepository.upsertPeriodReflection({
      periodType: 'week',
      periodRef: weekRef,
      note: 'Keep moving',
    })
    await reflectionDexieRepository.upsertPeriodObjectReflection({
      periodType: 'week',
      periodRef: weekRef,
      subjectType: 'goal',
      subjectId: goal.id,
      note: 'Helpful week',
    })

    await reflectionDexieRepository.deletePeriodReflection('week', weekRef)
    await reflectionDexieRepository.deletePeriodObjectReflection('week', weekRef, 'goal', goal.id)

    expect(await reflectionDexieRepository.getPeriodReflection('week', weekRef)).toBeUndefined()
    expect(
      await reflectionDexieRepository.getPeriodObjectReflection('week', weekRef, 'goal', goal.id)
    ).toBeUndefined()
  })
})
