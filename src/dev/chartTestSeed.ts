/**
 * Dev-only seed/cleanup utilities for testing chart rendering in Objects Library.
 *
 * Usage from browser DevTools:
 *   const { seedChartTestData, deleteChartTestData } = await import('/src/dev/chartTestSeed.ts')
 *   await seedChartTestData()    // create test objects with rich history
 *   await deleteChartTestData()  // remove all [DEV SEED] objects
 *
 * Or expose globally once via installDevHelpers(), then call:
 *   window.__seed()
 *   window.__unseed()
 *
 * What gets created:
 *   Goal "[DEV SEED] Chart Goal" with 4 KRs:
 *     - KR Weekly Completion  (weekly, completion, min 5/week)
 *     - KR Weekly Counter     (weekly, counter,    min 10/week)
 *     - KR Monthly Value Sum  (monthly, value,     sum ≥100/month)
 *     - KR Monthly Rating Avg (monthly, rating,    avg ≥3.5/month)
 *   Habit "[DEV SEED] Habit Weekly Completion"    (weekly,  completion, min 5/week)
 *   Habit "[DEV SEED] Habit Monthly Counter"      (monthly, counter,   min 20/month)
 *   Habit "[DEV SEED] Habit Weekly Value Sum"     (weekly,  value,     sum ≥100/week)
 *   Habit "[DEV SEED] Habit Weekly Rating Avg"    (weekly,  rating,    avg ≥3.5/week)
 *   Habit "[DEV SEED] Habit Monthly Rating Avg"   (monthly, rating,    avg ≥3.5/month)
 *   Habit "[DEV SEED] Habit No Entries"           (weekly,  completion) — active, but all no-data bars
 *   Habit "[DEV SEED] Habit No Periods"           (weekly,  completion) — no period states → empty chart
 *   Tracker "[DEV SEED] Tracker Weekly Counter"   (weekly,  counter)   — no target, primary bars
 *   Tracker "[DEV SEED] Tracker Monthly Value"    (monthly, value)     — no target, primary bars
 *   Tracker "[DEV SEED] Tracker Weekly Rating"    (weekly,  rating)    — no target, primary bars
 *
 * Data pattern (cycles per period): met → met → missed → no-data
 */

import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { MeasurementSubjectType } from '@/domain/planningState'
import { getPeriodRefsForDate, getPeriodBounds } from '@/utils/periods'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { periodPlanDexieRepository } from '@/repositories/periodPlanDexieRepository'
import { getUserDatabase } from '@/services/userDatabase.service'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'

const SEED_PREFIX = '[DEV SEED]'
const MONTHS_BACK = 6

// ─── Period helpers ──────────────────────────────────────────────────────────

function toMonthRef(year: number, month: number): MonthRef {
  return `${year}-${String(month).padStart(2, '0')}` as MonthRef
}

function toDayRef(year: number, month: number, day: number): DayRef {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` as DayRef
}

/** Returns all app-week refs that overlap the given calendar month (1-indexed month). */
function weeksInMonth(year: number, month: number): WeekRef[] {
  // new Date(year, month, 0) → last day of the 1-indexed month (Date month is 0-indexed)
  const daysInMonth = new Date(year, month, 0).getDate()
  const seen = new Set<WeekRef>()
  for (let day = 1; day <= daysInMonth; day++) {
    seen.add(getPeriodRefsForDate(toDayRef(year, month, day)).week)
  }
  return Array.from(seen).sort()
}

/** DayRefs for given Monday-offsets (0=Mon … 6=Sun) within an app-week. */
function daysOfWeek(weekRef: WeekRef, offsets: number[]): DayRef[] {
  const monday = getPeriodBounds(weekRef).start // "YYYY-MM-DD" of that Monday
  const [y, m, d] = monday.split('-').map(Number)
  return offsets.map(offset => {
    const date = new Date(y, m - 1, d + offset)
    return toDayRef(date.getFullYear(), date.getMonth() + 1, date.getDate())
  })
}

/** Returns [{ year, month }] for the last N months, sorted oldest-first. */
function lastNMonths(n: number): Array<{ year: number; month: number }> {
  const now = new Date()
  const result: Array<{ year: number; month: number }> = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return result
}

// ─── DB helpers ──────────────────────────────────────────────────────────────

async function ensureMonthPlan(mr: MonthRef): Promise<void> {
  if (!(await periodPlanDexieRepository.getMonthPlan(mr))) {
    await periodPlanDexieRepository.createMonthPlan({ monthRef: mr })
  }
}

async function createGoalMonthState(mr: MonthRef, goalId: string): Promise<void> {
  await ensureMonthPlan(mr)
  await planningStateDexieRepository.upsertGoalMonthState({
    monthRef: mr,
    goalId,
    activityState: 'active',
  })
}

async function createMonthState(
  mr: MonthRef,
  subjectType: MeasurementSubjectType,
  subjectId: string,
): Promise<void> {
  await ensureMonthPlan(mr)
  await planningStateDexieRepository.upsertMeasurementMonthState({
    monthRef: mr,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
}

async function createWeekState(
  wr: WeekRef,
  subjectType: MeasurementSubjectType,
  subjectId: string,
): Promise<void> {
  await planningStateDexieRepository.upsertMeasurementWeekState({
    weekRef: wr,
    subjectType,
    subjectId,
    activityState: 'active',
    scheduleScope: 'unassigned',
  })
}

async function createEntry(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  dr: DayRef,
  value: number | null,
): Promise<void> {
  await planningStateDexieRepository.upsertDailyMeasurementEntry({
    subjectType,
    subjectId,
    dayRef: dr,
    value,
  })
}

// ─── Pattern helpers ─────────────────────────────────────────────────────────

type EntryPattern = 'met' | 'missed' | 'no-data'

/** Cycles: met, met, missed, no-data (index 0,1,2,3 → index mod 4). */
function periodPattern(index: number): EntryPattern {
  const cycle = index % 4
  if (cycle === 0 || cycle === 1) return 'met'
  if (cycle === 2) return 'missed'
  return 'no-data'
}

/**
 * Create daily entries for a weekly-cadence subject.
 * Entry values are tuned so "met" satisfies the target and "missed" does not.
 */
async function createWeeklyEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  weekRef: WeekRef,
  entryMode: 'completion' | 'counter' | 'value' | 'rating',
  pattern: EntryPattern,
): Promise<void> {
  if (pattern === 'no-data') return

  switch (entryMode) {
    case 'completion': {
      // target: count min 5 → met=5 days, missed=2 days
      const offsets = pattern === 'met' ? [0, 1, 2, 3, 4] : [0, 1]
      await Promise.all(
        daysOfWeek(weekRef, offsets).map(dr => createEntry(subjectType, subjectId, dr, null)),
      )
      break
    }
    case 'counter': {
      // target: count min 10 → met: 3×4=12, missed: 3×2=6
      const val = pattern === 'met' ? 4 : 2
      await Promise.all(
        daysOfWeek(weekRef, [0, 2, 4]).map(dr => createEntry(subjectType, subjectId, dr, val)),
      )
      break
    }
    case 'value': {
      // target: sum ≥100 → met: 3×40=120, missed: 3×20=60
      const val = pattern === 'met' ? 40 : 20
      await Promise.all(
        daysOfWeek(weekRef, [0, 2, 4]).map(dr => createEntry(subjectType, subjectId, dr, val)),
      )
      break
    }
    case 'rating': {
      // target: avg ≥3.5 → met: 4, missed: 2
      const val = pattern === 'met' ? 4 : 2
      await Promise.all(
        daysOfWeek(weekRef, [0, 2, 4]).map(dr => createEntry(subjectType, subjectId, dr, val)),
      )
      break
    }
  }
}

/**
 * Create daily entries for a monthly-cadence subject.
 */
async function createMonthlyEntries(
  subjectType: MeasurementSubjectType,
  subjectId: string,
  year: number,
  month: number,
  entryMode: 'completion' | 'counter' | 'value' | 'rating',
  pattern: EntryPattern,
): Promise<void> {
  if (pattern === 'no-data') return

  switch (entryMode) {
    case 'completion': {
      // target: count min 20 → met: 20 days (1st-20th), missed: 8 days (1st-8th)
      const count = pattern === 'met' ? 20 : 8
      const days = Array.from({ length: count }, (_, i) => toDayRef(year, month, i + 1))
      await Promise.all(days.map(dr => createEntry(subjectType, subjectId, dr, null)))
      break
    }
    case 'counter': {
      // target: count min 20 → met: 3×8=24, missed: 3×4=12
      const val = pattern === 'met' ? 8 : 4
      const days = [toDayRef(year, month, 5), toDayRef(year, month, 12), toDayRef(year, month, 20)]
      await Promise.all(days.map(dr => createEntry(subjectType, subjectId, dr, val)))
      break
    }
    case 'value': {
      // target: sum ≥100 → met: 3×40=120, missed: 3×20=60
      const val = pattern === 'met' ? 40 : 20
      const days = [toDayRef(year, month, 5), toDayRef(year, month, 12), toDayRef(year, month, 20)]
      await Promise.all(days.map(dr => createEntry(subjectType, subjectId, dr, val)))
      break
    }
    case 'rating': {
      // target: avg ≥3.5 → met: 4, missed: 2
      const val = pattern === 'met' ? 4 : 2
      const days = [toDayRef(year, month, 5), toDayRef(year, month, 12), toDayRef(year, month, 20)]
      await Promise.all(days.map(dr => createEntry(subjectType, subjectId, dr, val)))
      break
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Seed chart test data: goals, KRs, habits, trackers with 6 months of history.
 */
export async function seedChartTestData(): Promise<void> {
  console.log('[chartTestSeed] Seeding chart test data...')

  const months = lastNMonths(MONTHS_BACK)

  // ── Planning objects ──────────────────────────────────────────────────────

  const goal = await goalDexieRepository.create({
    title: `${SEED_PREFIX} Chart Goal`,
    isActive: true,
    status: 'open',
    priorityIds: [],
    lifeAreaIds: [],
  })

  // KR1: weekly completion, target min 5 per week
  const kr1 = await keyResultDexieRepository.create({
    title: `${SEED_PREFIX} KR Weekly Completion (min 5/week)`,
    isActive: true,
    status: 'open',
    goalId: goal.id,
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 5 },
  })

  // KR2: weekly counter, target min 10 per week
  const kr2 = await keyResultDexieRepository.create({
    title: `${SEED_PREFIX} KR Weekly Counter (min 10/week)`,
    isActive: true,
    status: 'open',
    goalId: goal.id,
    cadence: 'weekly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 10 },
  })

  // KR3: monthly value sum ≥100
  const kr3 = await keyResultDexieRepository.create({
    title: `${SEED_PREFIX} KR Monthly Value Sum (≥100/month)`,
    isActive: true,
    status: 'open',
    goalId: goal.id,
    cadence: 'monthly',
    entryMode: 'value',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 100 },
  })

  // KR4: monthly rating avg ≥3.5
  const kr4 = await keyResultDexieRepository.create({
    title: `${SEED_PREFIX} KR Monthly Rating Avg (≥3.5/month)`,
    isActive: true,
    status: 'open',
    goalId: goal.id,
    cadence: 'monthly',
    entryMode: 'rating',
    target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3.5 },
  })

  // Habit1: weekly completion, target min 5/week
  const habit1 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit Weekly Completion (min 5/week)`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 5 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit2: monthly counter, target min 20/month
  const habit2 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit Monthly Counter (min 20/month)`,
    isActive: true,
    status: 'open',
    cadence: 'monthly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 20 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit3: weekly value sum ≥100/week
  const habit3 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit Weekly Value Sum (≥100/week)`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'value',
    target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 100 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit5: weekly rating, target avg ≥3.5/week
  const habit5 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit Weekly Rating Avg (≥3.5/week)`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'rating',
    target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3.5 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit6: monthly rating, target avg ≥3.5/month
  const habit6 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit Monthly Rating Avg (≥3.5/month)`,
    isActive: true,
    status: 'open',
    cadence: 'monthly',
    entryMode: 'rating',
    target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3.5 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit7: active periods but zero entries → all no-data bars
  const habit4 = await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit No Entries (all no-data bars)`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Habit5: no period states at all → empty chart state
  await habitDexieRepository.create({
    title: `${SEED_PREFIX} Habit No Periods (empty chart)`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'completion',
    target: { kind: 'count', operator: 'min', value: 3 },
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Tracker1: weekly counter, no target → primary-color bars
  const tracker1 = await trackerDexieRepository.create({
    title: `${SEED_PREFIX} Tracker Weekly Counter`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'counter',
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Tracker2: monthly value, no target → primary-color bars
  const tracker2 = await trackerDexieRepository.create({
    title: `${SEED_PREFIX} Tracker Monthly Value`,
    isActive: true,
    status: 'open',
    cadence: 'monthly',
    entryMode: 'value',
    priorityIds: [],
    lifeAreaIds: [],
  })

  // Tracker3: weekly rating, no target → primary-color bars
  const tracker3 = await trackerDexieRepository.create({
    title: `${SEED_PREFIX} Tracker Weekly Rating`,
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'rating',
    priorityIds: [],
    lifeAreaIds: [],
  })

  console.log('[chartTestSeed] Created planning objects')

  // ── Weekly subjects: month states must be created first ───────────────────

  const weeklySubjects: Array<{ subjectType: MeasurementSubjectType; id: string }> = [
    { subjectType: 'keyResult', id: kr1.id },
    { subjectType: 'keyResult', id: kr2.id },
    { subjectType: 'habit', id: habit1.id },
    { subjectType: 'habit', id: habit3.id },
    { subjectType: 'habit', id: habit5.id },
    { subjectType: 'habit', id: habit4.id },
    { subjectType: 'tracker', id: tracker1.id },
    { subjectType: 'tracker', id: tracker3.id },
  ]

  const monthlySubjects: Array<{ subjectType: MeasurementSubjectType; id: string }> = [
    { subjectType: 'keyResult', id: kr3.id },
    { subjectType: 'keyResult', id: kr4.id },
    { subjectType: 'habit', id: habit2.id },
    { subjectType: 'habit', id: habit6.id },
    { subjectType: 'tracker', id: tracker2.id },
  ]

  // Create month states for all subjects across all months.
  // GoalMonthState must be created first — KR month states require it.
  for (const { year, month } of months) {
    const mr = toMonthRef(year, month)
    await createGoalMonthState(mr, goal.id)
    for (const s of [...weeklySubjects, ...monthlySubjects]) {
      await createMonthState(mr, s.subjectType, s.id)
    }
  }

  console.log('[chartTestSeed] Created month states')

  // ── Week states + entries (weekly cadence) ────────────────────────────────

  // Collect all unique app-weeks across the target months (sorted by ref)
  const weekSet = new Set<WeekRef>()
  for (const { year, month } of months) {
    for (const wr of weeksInMonth(year, month)) {
      weekSet.add(wr)
    }
  }
  const allWeeks = Array.from(weekSet).sort()

  let weekIdx = 0
  for (const wr of allWeeks) {
    const pattern = periodPattern(weekIdx)

    // Create week states for all weekly subjects
    for (const s of weeklySubjects) {
      await createWeekState(wr, s.subjectType, s.id)
    }

    // Create entries (habit4 intentionally has no entries → all no-data bars)
    await createWeeklyEntries('keyResult', kr1.id, wr, 'completion', pattern)
    await createWeeklyEntries('keyResult', kr2.id, wr, 'counter', pattern)
    await createWeeklyEntries('habit', habit1.id, wr, 'completion', pattern)
    await createWeeklyEntries('habit', habit3.id, wr, 'value', pattern)
    await createWeeklyEntries('habit', habit5.id, wr, 'rating', pattern)
    await createWeeklyEntries('tracker', tracker1.id, wr, 'counter', pattern)
    await createWeeklyEntries('tracker', tracker3.id, wr, 'rating', pattern)
    // habit4: deliberately no entries

    weekIdx++
  }

  console.log(`[chartTestSeed] Created ${allWeeks.length} week states`)

  // ── Monthly entries ───────────────────────────────────────────────────────

  let monthIdx = 0
  for (const { year, month } of months) {
    const pattern = periodPattern(monthIdx)
    await createMonthlyEntries('keyResult', kr3.id, year, month, 'value', pattern)
    await createMonthlyEntries('keyResult', kr4.id, year, month, 'rating', pattern)
    await createMonthlyEntries('habit', habit2.id, year, month, 'counter', pattern)
    await createMonthlyEntries('habit', habit6.id, year, month, 'rating', pattern)
    await createMonthlyEntries('tracker', tracker2.id, year, month, 'value', pattern)
    monthIdx++
  }

  invalidatePlanningQueryCache()

  // ── Verification: confirm what was actually stored ────────────────────────

  const db = getUserDatabase()

  const monthlySubjectIds = [kr3.id, kr4.id, habit2.id, habit6.id, tracker2.id]
  const monthlySubjectLabels: Record<string, string> = {
    [kr3.id]: 'KR Monthly Value Sum',
    [kr4.id]: 'KR Monthly Rating Avg',
    [habit2.id]: 'Habit Monthly Counter',
    [habit6.id]: 'Habit Monthly Rating Avg',
    [tracker2.id]: 'Tracker Monthly Value',
  }

  const allMonthStates = await db.measurementMonthStates.toArray()
  const allEntries = await db.dailyMeasurementEntries.toArray()

  const verificationRows: string[] = []
  for (const subjectId of monthlySubjectIds) {
    const statesCount = allMonthStates.filter(s => s.subjectId === subjectId).length
    const entriesCount = allEntries.filter(e => e.subjectId === subjectId).length
    const label = monthlySubjectLabels[subjectId] ?? subjectId
    verificationRows.push(`  ${label}: ${statesCount} month states, ${entriesCount} entries`)
  }

  console.log(
    `[chartTestSeed] ✅ Done! Reload or navigate to Objects Library to see the charts.\n` +
      `  Goal: ${goal.id}\n  KRs: ${kr1.id}, ${kr2.id}, ${kr3.id}, ${kr4.id}\n` +
      `  Habits: ${habit1.id}, ${habit2.id}, ${habit3.id}, ${habit4.id}, ${habit5.id}, ${habit6.id}\n` +
      `  Trackers: ${tracker1.id}, ${tracker2.id}, ${tracker3.id}\n\n` +
      `[chartTestSeed] Monthly subject verification:\n${verificationRows.join('\n')}`,
  )
}

/**
 * Delete all objects created by seedChartTestData (identified by the "[DEV SEED]" title prefix).
 */
export async function deleteChartTestData(): Promise<void> {
  console.log('[chartTestSeed] Deleting chart test data...')

  const db = getUserDatabase()

  // Find seeded objects
  const [allGoals, allHabits, allTrackers, allKrs] = await Promise.all([
    goalDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
  ])

  const goals = allGoals.filter(g => g.title.startsWith(SEED_PREFIX))
  const habits = allHabits.filter(h => h.title.startsWith(SEED_PREFIX))
  const trackers = allTrackers.filter(t => t.title.startsWith(SEED_PREFIX))

  const goalIds = new Set(goals.map(g => g.id))
  const krs = allKrs.filter(kr => goalIds.has(kr.goalId))

  // All subject refs whose states/entries need cleanup
  const subjectRefs: Array<{ subjectType: MeasurementSubjectType; subjectId: string }> = [
    ...krs.map(kr => ({ subjectType: 'keyResult' as const, subjectId: kr.id })),
    ...habits.map(h => ({ subjectType: 'habit' as const, subjectId: h.id })),
    ...trackers.map(t => ({ subjectType: 'tracker' as const, subjectId: t.id })),
  ]

  // Delete all period states and entries for each subject using compound index
  await Promise.all(
    subjectRefs.map(({ subjectType, subjectId }) =>
      Promise.all([
        db.measurementMonthStates
          .where('[subjectType+subjectId]')
          .equals([subjectType, subjectId])
          .delete(),
        db.measurementWeekStates
          .where('[subjectType+subjectId]')
          .equals([subjectType, subjectId])
          .delete(),
        db.measurementDayAssignments
          .where('[subjectType+subjectId]')
          .equals([subjectType, subjectId])
          .delete(),
        db.dailyMeasurementEntries
          .where('[subjectType+subjectId]')
          .equals([subjectType, subjectId])
          .delete(),
      ]),
    ),
  )

  // Delete goal month states
  await Promise.all(goals.map(g => db.goalMonthStates.where('goalId').equals(g.id).delete()))

  // Delete goals (cascades to KRs via goalDexieRepository.delete)
  await Promise.all(goals.map(g => goalDexieRepository.delete(g.id)))
  await Promise.all(habits.map(h => habitDexieRepository.delete(h.id)))
  await Promise.all(trackers.map(t => trackerDexieRepository.delete(t.id)))

  invalidatePlanningQueryCache()
  console.log(
    `[chartTestSeed] ✅ Deleted: ${goals.length} goals (+ ${krs.length} KRs), ` +
      `${habits.length} habits, ${trackers.length} trackers`,
  )
}

/**
 * Expose seed helpers on window for easy access from browser DevTools.
 * Call once from App.vue or main.ts (in dev mode only):
 *
 *   if (import.meta.env.DEV) {
 *     import('@/dev/chartTestSeed').then(m => m.installDevHelpers())
 *   }
 *
 * Then from DevTools console:
 *   await window.__seed()
 *   await window.__unseed()
 */
export function installDevHelpers(): void {
  Object.assign(window, {
    __seed: seedChartTestData,
    __unseed: deleteChartTestData,
  })
  console.log('[chartTestSeed] Dev helpers installed: window.__seed() / window.__unseed()')
}
