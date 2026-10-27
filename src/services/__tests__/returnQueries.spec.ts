import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { RETURN_RITUAL_SETTINGS_KEY } from '@/domain/returnRitual'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import {
  buildReturnInventory,
  detectReturnBreak,
  getLastSignalAt,
  getPendingReturnBreak,
  getReturnBreakForRitual,
  getReturnRitualSettings,
} from '@/services/returnQueries'
import { dismissReturnBreak, markReturnBreakDone } from '@/services/returnRitualService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getTestDatabase } from '@/test/testDatabase'
import { parsePeriodRef } from '@/utils/periods'

const W39 = parsePeriodRef('2026-W39') as WeekRef // 28 Sep – 4 Oct
const W40 = parsePeriodRef('2026-W40') as WeekRef
const W41 = parsePeriodRef('2026-W41') as WeekRef
const OCTOBER = parsePeriodRef('2026-10') as MonthRef
const TODAY = '2026-10-25' as DayRef
const LAST = '2026-09-30T12:00:00Z'
const stamps = (at: string) => ({ createdAt: at, updatedAt: at })

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const db = await resetPlanningTestData()
  await Promise.all([
    db.journalEntries.clear(),
    db.emotionLogs.clear(),
    db.exercisePlanItems.clear(),
    db.programEnrollments.clear(),
    db.userSettings.clear(),
    db.companionConversations.clear(),
    db.thoughtRecords.clear(),
  ])
})

describe('getLastSignalAt', () => {
  it('is undefined on a fresh account', async () => {
    expect(await getLastSignalAt()).toBeUndefined()
    expect(await detectReturnBreak(TODAY)).toBeUndefined()
  })

  it('takes the latest user-authored write across tables', async () => {
    const db = getTestDatabase()
    await db.journalEntries.put({
      id: 'j1',
      content: 'x',
      ...stamps('2026-09-20T08:00:00Z'),
    } as never)
    await db.thoughtRecords.put({ id: 'tr1', createdAt: '2026-09-25T08:00:00Z' } as never)
    await db.emotionLogs.put({ id: 'e1', ...stamps(LAST) } as never)
    expect(await getLastSignalAt()).toBe(LAST)
  })

  it('ignores what schedulers, drafts and settings write', async () => {
    const db = getTestDatabase()
    await db.journalEntries.put({ id: 'j1', ...stamps(LAST) } as never)
    // Scheduler-made: a pending plan item and a day assignment, both later.
    await db.exercisePlanItems.put({
      id: 'p1',
      status: 'pending',
      dayRef: '2026-10-20',
      ...stamps('2026-10-20T08:00:00Z'),
    } as never)
    await db.measurementDayAssignments.put({
      id: 'a1',
      dayRef: '2026-10-20',
      subjectType: 'habit',
      subjectId: 'h',
      ...stamps('2026-10-20T08:00:00Z'),
    } as never)
    await db.drafts.put({ key: 'd', data: '', updatedAt: '2026-10-21T08:00:00Z' })
    await db.userSettings.put({ key: 'theme', value: 'x' })
    expect(await getLastSignalAt()).toBe(LAST)

    // The same plan item, once the user decided it, is a signal.
    await db.exercisePlanItems.put({
      id: 'p1',
      status: 'done',
      dayRef: '2026-10-20',
      ...stamps('2026-10-20T08:00:00Z'),
    } as never)
    expect(await getLastSignalAt()).toBe('2026-10-20T08:00:00Z')
  })

  it('reads completed path steps, not the enrollment row', async () => {
    const db = getTestDatabase()
    await db.programEnrollments.put({
      id: 'en1',
      programSlug: 'shame',
      status: 'active',
      startedAt: '2026-09-01T08:00:00Z',
      currentStepIndex: 2,
      completedSteps: [
        { stepIndex: 0, completedAt: '2026-09-02T08:00:00Z' },
        { stepIndex: 1, completedAt: '2026-09-10T08:00:00Z' },
      ],
      ...stamps('2026-10-20T08:00:00Z'), // touched by the scheduler
    } as never)
    expect(await getLastSignalAt()).toBe('2026-09-10T08:00:00Z')
  })
})

describe('getPendingReturnBreak', () => {
  beforeEach(async () => {
    await getTestDatabase().journalEntries.put({ id: 'j1', ...stamps(LAST) } as never)
  })

  it('offers a break above the threshold until it is handled', async () => {
    const brk = await getPendingReturnBreak(TODAY)
    expect(brk).toMatchObject({ breakStart: '2026-10-01', days: 25, weeks: [W39, W40, W41] })

    await dismissReturnBreak(brk!, '2026-10-25T09:00:00Z')
    expect(await getReturnRitualSettings()).toMatchObject({
      breakStart: '2026-10-01',
      state: 'dismissed',
    })
    expect(await getPendingReturnBreak(TODAY)).toBeUndefined()
    // „Później” wears off with the day.
    expect(await getPendingReturnBreak('2026-10-26' as DayRef)).toBeDefined()

    await markReturnBreakDone(brk!, '2026-10-26T09:00:00Z')
    expect(await getPendingReturnBreak('2026-10-26' as DayRef)).toBeUndefined()
    expect(await getPendingReturnBreak('2026-11-30' as DayRef)).toBeUndefined()
  })

  it('a later signal is a new break the old decision does not cover', async () => {
    const brk = await getPendingReturnBreak(TODAY)
    await markReturnBreakDone(brk!, '2026-10-25T09:00:00Z')
    await getTestDatabase().journalEntries.put({
      id: 'j2',
      ...stamps('2026-10-25T10:00:00Z'),
    } as never)
    expect(await getPendingReturnBreak('2026-11-20' as DayRef)).toMatchObject({
      breakStart: '2026-10-26',
    })
  })

  it('survives an unreadable settings value', async () => {
    await userSettingsDexieRepository.set(RETURN_RITUAL_SETTINGS_KEY, '{broken')
    expect(await getReturnRitualSettings()).toBeUndefined()
    expect(await getPendingReturnBreak(TODAY)).toBeDefined()
  })
})

describe('getReturnBreakForRitual', () => {
  // Without any signal the service reads the wall clock as the last signal; the
  // assertions assume TODAY, so the clock is frozen there (B-12).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  it('by hand there is no threshold: a short gap, or none at all, still opens the ritual', async () => {
    expect(await getReturnBreakForRitual(false, TODAY)).toBeUndefined()
    const fresh = await getReturnBreakForRitual(true, TODAY)
    // No signal yet: the break is empty but defined — the other rows still get a pass.
    expect(fresh).toMatchObject({ weeks: [], crossedMonth: false })
    expect(fresh!.days).toBeLessThanOrEqual(0)

    await getTestDatabase().journalEntries.put({
      id: 'j1',
      ...stamps('2026-10-15T08:00:00Z'),
    } as never)
    expect(await getPendingReturnBreak(TODAY)).toBeUndefined() // 10 days < threshold
    expect(await getReturnBreakForRitual(true, TODAY)).toMatchObject({
      lastSignalDay: '2026-10-15',
      breakStart: '2026-10-16',
      days: 10,
      weeks: [W41],
    })
  })
})

describe('buildReturnInventory', () => {
  // Records created through repositories are stamped with the clock, so the
  // setup happens "before the break".
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(LAST))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('groups what piled up during the break', async () => {
    const db = getTestDatabase()
    const alive = await habitDexieRepository.create({
      title: 'Spacer',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
      status: 'open',
    })
    const quiet = await habitDexieRepository.create({
      title: 'Czytanie',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
      status: 'open',
    })
    const retired = await habitDexieRepository.create({
      title: 'Stare',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      cadence: 'weekly',
      entryMode: 'completion',
      target: { kind: 'count', operator: 'min', value: 3 },
      status: 'retired',
    })
    for (const habit of [alive, quiet, retired]) {
      await planningStateDexieRepository.upsertMeasurementMonthState({
        monthRef: OCTOBER,
        subjectType: 'habit',
        subjectId: habit.id,
        activityState: 'active',
        scheduleScope: 'whole-month',
      })
    }
    // 28 Sep lies in W39 already: that week has an entry for the habit.
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: alive.id,
      dayRef: '2026-09-28' as DayRef,
      value: null,
    })
    // One entry inside the break: that week is not "without entries" for this habit.
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: alive.id,
      dayRef: '2026-10-07' as DayRef,
      value: null,
    })
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: quiet.id,
      dayRef: '2026-08-10' as DayRef,
      value: null,
    })

    const openGoal = await goalDexieRepository.create({
      title: 'Cel po terminie',
      isActive: true,
      status: 'open',
      priorityIds: [],
      lifeAreaIds: [],
      targetDate: '2026-10-15',
    })
    const closedGoal = await goalDexieRepository.create({
      title: 'Zamknięty',
      isActive: true,
      status: 'completed',
      priorityIds: [],
      lifeAreaIds: [],
      targetDate: '2026-09-15',
    })
    const kr = await keyResultDexieRepository.create({
      title: 'KR',
      goalId: openGoal.id,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 2 },
    })
    await keyResultDexieRepository.create({
      title: 'KR zamkniętego celu',
      goalId: closedGoal.id,
      isActive: true,
      status: 'open',
      cadence: 'weekly',
      entryMode: 'counter',
      target: { kind: 'count', operator: 'min', value: 2 },
    })

    await db.weeklyIntentions.bulkPut([
      { id: 'i-old', weekRef: W40, status: 'open', title: 'a', ...stamps(LAST) },
      { id: 'i-now', weekRef: '2026-W42', status: 'open', title: 'b', ...stamps(LAST) },
    ] as never[])
    await db.exercisePlanItems.bulkPut([
      { id: 'p-old', status: 'pending', dayRef: '2026-10-03', ...stamps(LAST) },
      { id: 'p-today', status: 'pending', dayRef: TODAY, ...stamps(LAST) },
      { id: 'p-done', status: 'done', dayRef: '2026-10-03', ...stamps(LAST) },
    ] as never[])
    await db.programEnrollments.bulkPut([
      { id: 'en-active', status: 'active', completedSteps: [], ...stamps(LAST) },
      { id: 'en-paused', status: 'paused', completedSteps: [], ...stamps(LAST) },
    ] as never[])

    const brk = (await detectReturnBreak(TODAY))!
    const inventory = await buildReturnInventory(brk)

    expect(inventory.break).toEqual(brk)
    expect(
      inventory.weeksWithoutEntries.map(week => [
        week.weekRef,
        week.subjects.map(s => s.subjectId).sort(),
      ])
    ).toEqual([
      [W39, [quiet.id]],
      [W40, [quiet.id]],
      [W41, [alive.id, quiet.id].sort()],
    ])
    expect(inventory.staleIntentions.map(i => i.id)).toEqual(['i-old'])
    expect(inventory.overduePlanItems.map(i => i.id)).toEqual(['p-old'])
    expect(inventory.activeEnrollments.map(e => e.id)).toEqual(['en-active'])
    expect(inventory.overdueGoals.map(g => g.id)).toEqual([openGoal.id])
    expect(
      inventory.subjects
        .map(s => [s.subject.id, s.aliveBeforeBreak])
        .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    ).toEqual(
      [
        [alive.id, true],
        [quiet.id, false],
        [kr.id, false],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    )
  })
})
