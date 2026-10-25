import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import { defaultReturnPlan, weekDraftKey, type ReturnInventory } from '@/domain/returnRitual'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import {
  buildReturnInventory,
  detectReturnBreak,
  getPendingReturnBreak,
  getReturnRitualSettings,
} from '@/services/returnQueries'
import { applyReturnPlan, undoReturnSteps } from '@/services/returnRitualService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getTestDatabase } from '@/test/testDatabase'
import { parsePeriodRef } from '@/utils/periods'

const W39 = parsePeriodRef('2026-W39') as WeekRef
const W40 = parsePeriodRef('2026-W40') as WeekRef
const W41 = parsePeriodRef('2026-W41') as WeekRef
const W42 = parsePeriodRef('2026-W42') as WeekRef
const OCTOBER = parsePeriodRef('2026-10') as MonthRef
const TODAY = '2026-10-25' as DayRef // Sunday of W42
const LAST = '2026-09-30T12:00:00Z'
const NOW = '2026-10-25T10:00:00Z'
const stamps = (at: string) => ({ createdAt: at, updatedAt: at })

async function habit(title: string, rhythm = false) {
  return habitDexieRepository.create({
    title,
    isActive: true,
    priorityIds: [],
    lifeAreaIds: [],
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    status: 'open',
    ...(rhythm
      ? {
          rhythm: { kind: 'weekdays', weekdays: ['tue', 'thu'], scope: 'placed-weeks', since: W39 },
        }
      : {}),
  })
}

async function seedScenario() {
  const db = getTestDatabase()
  const alive = await habit('Trening', true)
  const quiet = await habit('Czytanie')
  for (const h of [alive, quiet]) {
    await planningStateDexieRepository.upsertMeasurementMonthState({
      monthRef: OCTOBER,
      subjectType: 'habit',
      subjectId: h.id,
      activityState: 'active',
      scheduleScope: 'whole-month',
    })
  }
  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType: 'habit',
    subjectId: alive.id,
    dayRef: '2026-09-22' as DayRef,
    value: null,
  })
  const goal = await goalDexieRepository.create({
    title: 'Cel po terminie',
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
    targetDate: '2026-10-15',
  })
  await db.weeklyIntentions.put({
    id: 'i-old',
    weekRef: W40,
    status: 'open',
    title: 'a',
    isActive: true,
    entryMode: 'completion',
    cadence: 'weekly',
    target: { kind: 'count', operator: 'min', value: 1 },
    priorityIds: [],
    ...stamps(LAST),
  } as never)
  await db.exercisePlanItems.put({
    id: 'p-old',
    status: 'pending',
    dayRef: '2026-10-03',
    source: 'manual',
    exerciseSlug: 'x',
    ...stamps(LAST),
  } as never)
  await db.programEnrollments.put({
    id: 'en-1',
    programSlug: 'shame-path',
    status: 'active',
    startedAt: '2026-09-01T08:00:00Z',
    currentStepIndex: 1,
    completedSteps: [{ stepIndex: 0, completedAt: '2026-09-02T08:00:00Z' }],
    ...stamps(LAST),
  } as never)
  return { alive, quiet, goal }
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const db = await resetPlanningTestData()
  await Promise.all([
    db.journalEntries.clear(),
    db.contextTags.clear(),
    db.exercisePlanItems.clear(),
    db.programEnrollments.clear(),
    db.userSettings.clear(),
  ])
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(LAST))
})
afterEach(() => {
  vi.useRealTimers()
})

async function inventoryNow(): Promise<ReturnInventory> {
  const brk = (await detectReturnBreak(TODAY))!
  return buildReturnInventory(brk)
}

describe('applyReturnPlan', () => {
  it('applies the defaults: skips placed weeks, closes, sweeps, keeps paths, leaves goals, resumes the alive', async () => {
    const { alive, quiet, goal } = await seedScenario()
    const inventory = await inventoryNow()
    expect(inventory.columns).toEqual([W39, W40, W41, W42]) // Sunday → current week too
    const plan = defaultReturnPlan(inventory)
    expect(plan.resume[`habit:${alive.id}`]).toBe(true)
    expect(plan.resume[`habit:${quiet.id}`]).toBe(false)

    vi.setSystemTime(new Date(NOW))
    const result = await applyReturnPlan(plan, inventory, NOW)

    // Every placed column week got a tombstone, for both habits.
    for (const h of [alive, quiet]) {
      for (const week of [W39, W40, W41, W42]) {
        const state = await planningStateDexieRepository.getMeasurementWeekState(
          week,
          'habit',
          h.id
        )
        expect(state, `${h.title} ${week}`).toMatchObject({
          activityState: 'paused',
          scheduleScope: 'unassigned',
        })
      }
    }
    const db = getTestDatabase()
    expect((await db.weeklyIntentions.get('i-old'))?.status).toBe('retired')
    expect((await db.exercisePlanItems.get('p-old'))?.status).toBe('skipped')
    expect((await db.programEnrollments.get('en-1'))?.status).toBe('active')
    expect((await db.goals.get(goal.id))?.targetDate).toBe('2026-10-15')
    // The quiet habit sits October out; the alive one keeps its month.
    expect(
      await planningStateDexieRepository.getMeasurementMonthState(OCTOBER, 'habit', quiet.id)
    ).toBeUndefined()
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(OCTOBER, 'habit', alive.id))
        ?.activityState
    ).toBe('active')
    expect(await db.journalEntries.count()).toBe(0)
    expect(await getReturnRitualSettings()).toMatchObject({
      breakStart: '2026-10-01',
      state: 'done',
    })
    expect(await getPendingReturnBreak(TODAY)).toBeUndefined()
    expect(result.undoSteps.length).toBeGreaterThan(0)

    // Undo restores every touched row and the break is pending again.
    await undoReturnSteps(result.undoSteps)
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W40, 'habit', alive.id)
    ).toBeUndefined()
    expect((await db.weeklyIntentions.get('i-old'))?.status).toBe('open')
    expect((await db.exercisePlanItems.get('p-old'))?.status).toBe('pending')
    expect(
      (await planningStateDexieRepository.getMeasurementMonthState(OCTOBER, 'habit', quiet.id))
        ?.activityState
    ).toBe('active')
    expect(await getReturnRitualSettings()).toBeUndefined()
    expect(await getPendingReturnBreak(TODAY)).toBeDefined()
  })

  it('keeps a week as planned with chosen days, entries and target; shifts a goal; pauses a path; writes the note', async () => {
    const { alive, goal } = await seedScenario()
    const inventory = await inventoryNow()
    const plan = defaultReturnPlan(inventory)
    const key = weekDraftKey({ subjectType: 'habit', subjectId: alive.id, weekRef: W40 })
    const week = plan.weeks.find(w => weekDraftKey(w) === key)!
    // The rhythm proposed Tue/Thu of W40.
    expect(week.dayRefs).toEqual(['2026-10-06', '2026-10-08'])
    week.keep = true
    week.dayRefs = ['2026-10-06', '2026-10-08', '2026-10-10'] as DayRef[]
    week.entries = { '2026-10-06': { value: null }, '2026-10-10': { value: null } }
    week.targetOverride = { kind: 'count', operator: 'min', value: 2 }
    plan.goals[goal.id] = 'shift'
    plan.enrollments['en-1'] = 'pause'
    plan.reflection = {
      whatHappened: 'Choroba, potem wyjazd.',
      aliveAndDropped: 'Bieganie zostało.',
      wantNow: '',
    }
    plan.gentleWeek = true

    vi.setSystemTime(new Date(NOW))
    const result = await applyReturnPlan(plan, inventory, NOW)

    const db = getTestDatabase()
    const state = await planningStateDexieRepository.getMeasurementWeekState(W40, 'habit', alive.id)
    expect(state).toMatchObject({
      activityState: 'active',
      scheduleScope: 'specific-days',
      daysMode: 'custom',
      targetOverride: { kind: 'count', operator: 'min', value: 2 },
    })
    const assignments = (await planningStateDexieRepository.listMeasurementDayAssignments())
      .filter(a => a.subjectId === alive.id && a.dayRef >= '2026-10-05' && a.dayRef <= '2026-10-11')
      .map(a => a.dayRef)
      .sort()
    expect(assignments).toEqual(['2026-10-06', '2026-10-08', '2026-10-10'])
    const entries = (await planningStateDexieRepository.listDailyMeasurementEntries())
      .filter(e => e.subjectId === alive.id && e.dayRef >= '2026-10-05' && e.dayRef <= '2026-10-11')
      .map(e => e.dayRef)
      .sort()
    expect(entries).toEqual(['2026-10-06', '2026-10-10'])
    // Other columns still got the tombstone.
    expect(
      (await planningStateDexieRepository.getMeasurementWeekState(W41, 'habit', alive.id))
        ?.activityState
    ).toBe('paused')
    // Three full break weeks → the deadline moves three weeks.
    expect((await db.goals.get(goal.id))?.targetDate).toBe('2026-11-05')
    expect((await db.programEnrollments.get('en-1'))?.status).toBe('paused')
    const journal = await db.journalEntries.toArray()
    expect(journal).toHaveLength(1)
    expect(journal[0]).toMatchObject({
      title: 'Powrót po przerwie · 1 paź – 25 paź',
      body: 'Co się działo: Choroba, potem wyjazd.\n\nŻywe i odpadłe: Bieganie zostało.',
    })
    const tags = await db.contextTags.toArray()
    expect(tags.map(tag => tag.name)).toEqual(['Powrót'])
    expect(journal[0]!.contextTagIds).toEqual([tags[0]!.id])
    expect(result.journalEntryId).toBe(journal[0]!.id)
    // Gentle first week: the current week's target is halved for the resumed habit.
    expect(
      (await planningStateDexieRepository.getMeasurementWeekState(W42, 'habit', alive.id))
        ?.targetOverride
    ).toEqual({ kind: 'count', operator: 'min', value: 2 })

    // Rerunning the same plan changes nothing more.
    const again = await applyReturnPlan(plan, inventory, NOW)
    expect(again.undoSteps.filter(step => step.table !== 'userSettings')).toEqual([])

    await undoReturnSteps(result.undoSteps)
    expect(await db.journalEntries.count()).toBe(0)
    expect(await db.contextTags.count()).toBe(0)
    expect((await db.goals.get(goal.id))?.targetDate).toBe('2026-10-15')
    expect((await db.programEnrollments.get('en-1'))?.status).toBe('active')
    expect(
      await planningStateDexieRepository.getMeasurementWeekState(W40, 'habit', alive.id)
    ).toBeUndefined()
  })

  it('is atomic: a bad day in one week leaves everything untouched', async () => {
    await seedScenario()
    const inventory = await inventoryNow()
    const plan = defaultReturnPlan(inventory)
    const week = plan.weeks[0]!
    week.keep = true
    week.dayRefs = ['2026-12-24' as DayRef] // not a day of that week
    vi.setSystemTime(new Date(NOW))
    await expect(applyReturnPlan(plan, inventory, NOW)).rejects.toThrow()
    const db = getTestDatabase()
    expect((await db.weeklyIntentions.get('i-old'))?.status).toBe('open')
    expect(await db.measurementWeekStates.count()).toBe(0)
    expect(await getReturnRitualSettings()).toBeUndefined()
  })

  it('leaves what the user did after „Start” alone when undoing', async () => {
    const { alive } = await seedScenario()
    const inventory = await inventoryNow()
    vi.setSystemTime(new Date(NOW))
    const result = await applyReturnPlan(defaultReturnPlan(inventory), inventory, NOW)
    // Later, in Today, the user logs a day.
    await planningStateDexieRepository.upsertDailyMeasurementEntry({
      subjectType: 'habit',
      subjectId: alive.id,
      dayRef: TODAY,
      value: null,
    })
    await undoReturnSteps(result.undoSteps)
    expect(
      await planningStateDexieRepository.getDailyMeasurementEntry('habit', alive.id, TODAY)
    ).toBeDefined()
  })
})
