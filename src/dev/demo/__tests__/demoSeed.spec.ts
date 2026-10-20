import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { connectTestDatabase, getTestDatabase } from '@/test/testDatabase'
import { getPeriodRefsForDate } from '@/utils/periods'
import { DEMO_CLOSED_MONTHS, demoPeriods, seedDemoData } from '../demoSeed'

/**
 * Runs the whole demo seed against fake-indexeddb on a fixed date and checks
 * the story landed: half a year of reflections, a closed goal, a completed
 * path with its measures, an IFS path in progress and a planned current week.
 */
describe('demo seed', () => {
  const NOW = new Date('2026-10-17T10:00:00')

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    const db = await connectTestDatabase()
    await Promise.all(db.tables.map(table => table.clear()))
    await seedDemoData()
  }, 240_000)

  afterAll(() => {
    vi.useRealTimers()
  })

  it('reflects every closed week and month, never the current ones', async () => {
    const db = getTestDatabase()
    const { closedWeeks, closedMonths, currentWeek, currentMonth } = demoPeriods(NOW)
    expect(closedMonths).toHaveLength(DEMO_CLOSED_MONTHS)
    const weekly = await db.weeklyReflections.toArray()
    expect(weekly.map(row => row.weekRef).sort()).toEqual([...closedWeeks].sort())
    expect(weekly.some(row => row.weekRef === currentWeek)).toBe(false)
    const monthly = await db.monthlyReflections.toArray()
    expect(monthly.map(row => row.monthRef).sort()).toEqual([...closedMonths].sort())
    expect(monthly.some(row => row.monthRef === currentMonth)).toBe(false)
    // Reflections are dated in their own week, not on the seed day.
    expect(weekly.every(row => row.createdAt < `${getPeriodRefsForDate(NOW).day}`)).toBe(true)
  })

  it('closes the 10 km goal with the ritual and keeps the others open', async () => {
    const goals = await getTestDatabase().goals.toArray()
    const tenK = goals.find(goal => goal.title.startsWith('Przebiec 10 km'))!
    expect(tenK.status).not.toBe('open')
    expect(tenK.closingReflection?.outcome).toBe('achieved')
    expect(tenK.closingReflection?.closedAt).toBe('2026-09-07')
    expect(tenK.closingReflection?.keyResults.length).toBe(2)
    expect(goals.filter(goal => goal.status === 'open').map(goal => goal.title).sort()).toEqual(['Kończę pracę o 18:00', 'Półmaraton wiosną'])
  })

  it('completes the shame path with measures and leaves the return step ahead', async () => {
    const db = getTestDatabase()
    const enrollments = await db.programEnrollments.toArray()
    const shame = enrollments.find(row => row.programSlug === 'shame-compassion')!
    expect(shame.status).toBe('completed')
    expect(shame.currentStepIndex).toBe(24)
    expect(shame.completedSteps).toHaveLength(23)
    expect(shame.weekLog?.length).toBeGreaterThanOrEqual(10)
    expect(shame.futureLetter?.showAt).toBe('2026-10-17')
    const attempts = await db.assessmentAttempts.toArray()
    const scs = attempts.filter(row => row.assessmentId === 'scs-sf').sort((a, b) => a.completedAt!.localeCompare(b.completedAt!))
    expect(scs).toHaveLength(3)
    expect(scs[0].completedAt!.slice(0, 10)).toBe('2026-05-20')
    const returnStep = (await db.exercisePlanItems.toArray()).find(item => item.sourceRef === shame.id && item.programStepIndex === 24)
    expect(returnStep?.dayRef).toBe('2026-10-20')
    const ifs = enrollments.find(row => row.programSlug === 'ifs-parts')!
    expect(ifs.status).toBe('active')
    expect(ifs.currentStepIndex).toBe(3)
  })

  it('spreads the journal and check-ins across the whole horizon', async () => {
    const db = getTestDatabase()
    const journal = await db.journalEntries.toArray()
    const logs = await db.emotionLogs.toArray()
    const { closedMonths } = demoPeriods(NOW)
    const months = new Set([...journal, ...logs].map(row => row.createdAt.slice(0, 7)))
    for (const monthRef of closedMonths) expect(months.has(monthRef)).toBe(true)
    expect(logs.every(row => (row.emotions?.length ?? 0) > 0)).toBe(true)
  })
})
