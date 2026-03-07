import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  projectDexieRepository,
  trackerDexieRepository,
  trackerPeriodDexieRepository,
  weeklyPlanDexieRepository,
  monthlyPlanDexieRepository,
} from '@/repositories/planningDexieRepository'
import { getTestDatabase } from '@/test/testDatabase'
import {
  computeProjectKRsProgress,
  computeRollingCompliance,
  computeTrackerProgressById,
  resolveProjectTrendRanges,
} from '@/services/trackerRollup.service'
import { getWeekRange, toLocalISODateString } from '@/utils/periodUtils'

async function createWeeklyPlanForDate(date: Date) {
  const range = getWeekRange(date)
  return weeklyPlanDexieRepository.create({
    startDate: toLocalISODateString(range.start),
    endDate: toLocalISODateString(range.end),
    name: '',
    capacityNote: undefined,
    focusSentence: undefined,
    adaptiveIntention: undefined,
  })
}

describe('trackerRollup.service', () => {
  beforeEach(async () => {
    vi.useRealTimers()
    const db = getTestDatabase()
    await db.projects.clear()
    await db.trackers.clear()
    await db.trackerPeriods.clear()
    await db.weeklyPlans.clear()
  })

  it('computes direct rollups for value and rating trackers', async () => {
    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Progress Project',
      description: undefined,
      targetOutcome: undefined,
      objective: 'Improve',
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      focusWeekIds: [],
      focusMonthIds: [],
      status: 'planned',
    })

    // Create a value tracker (replaces embedded keyResult)
    const valueTracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Revenue',
      type: 'value',
      cadence: 'weekly',
      rollup: 'last',
      targetValue: 100,
      direction: 'increase',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    // Create a rating tracker (replaces embedded keyResult)
    const ratingTracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Energy',
      type: 'rating',
      cadence: 'weekly',
      rollup: 'average',
      ratingScaleMin: 1,
      ratingScaleMax: 10,
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 1,
      isActive: true,
    })

    // Create TrackerPeriod with value entries for the value tracker
    await trackerPeriodDexieRepository.create({
      trackerId: valueTracker.id,
      startDate: '2026-01-06',
      endDate: '2026-01-12',
      entries: [
        { value: 20, date: '2026-01-10' },
        { value: 55, date: '2026-01-12' },
      ],
    })

    // Create TrackerPeriod with a rating for the rating tracker
    await trackerPeriodDexieRepository.create({
      trackerId: ratingTracker.id,
      startDate: '2026-01-06',
      endDate: '2026-01-12',
      rating: 7,
    })

    await trackerPeriodDexieRepository.create({
      trackerId: ratingTracker.id,
      startDate: '2026-01-13',
      endDate: '2026-01-19',
      rating: 9,
    })

    // Use computeTrackerProgressById for individual tracker progress
    const valueProgress = await computeTrackerProgressById(valueTracker.id)
    expect(valueProgress?.value).toBe(55)
    expect(valueProgress?.percent).toBeCloseTo(55)

    const ratingProgress = await computeTrackerProgressById(ratingTracker.id)
    expect(ratingProgress?.value).toBeCloseTo(8)
    expect(ratingProgress?.percent).toBeCloseTo(80)
  })

  it('aggregates progress from tracker period ticks', async () => {
    const weekPlan = await createWeeklyPlanForDate(new Date('2026-01-05'))

    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Aggregate Project',
      description: undefined,
      targetOutcome: undefined,
      objective: 'Ship',
      startDate: weekPlan.startDate,
      endDate: weekPlan.endDate,
      focusWeekIds: [],
      focusMonthIds: [],
      status: 'planned',
    })

    // Create a count tracker for the project (replaces embedded keyResult)
    const countTracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Sessions',
      type: 'count',
      cadence: 'weekly',
      targetCount: 4,
      rollup: 'sum',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    // Create a TrackerPeriod with ticks (replaces commitment + trackerTicks)
    await trackerPeriodDexieRepository.create({
      trackerId: countTracker.id,
      startDate: weekPlan.startDate,
      endDate: weekPlan.endDate,
      periodTarget: 4,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: true },
        { index: 2, completed: false },
        { index: 3, completed: false },
      ],
    })

    const results = await computeProjectKRsProgress(project.id)
    expect(results.length).toBe(1)
    expect(results[0].numerator).toBe(2)
    expect(results[0].denominator).toBeUndefined()
    expect(results[0].percent).toBeNull()
  })

  it('computes rolling compliance for weekly trackers', async () => {
    const reference = new Date()

    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Weekly Ritual Project',
      description: undefined,
      targetOutcome: undefined,
      status: 'active',
    })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Consistency',
      type: 'count',
      cadence: 'weekly',
      targetCount: 2,
      rollup: 'sum',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    // Create 6 weekly TrackerPeriods with varying completion
    for (let i = 0; i < 6; i += 1) {
      const date = new Date(reference)
      date.setDate(date.getDate() - i * 7)
      const range = getWeekRange(date)
      const startDate = toLocalISODateString(range.start)
      const endDate = toLocalISODateString(range.end)

      const completedTicks = i % 2 === 0 ? 2 : 1
      const ticks = Array.from({ length: 2 }, (_, idx) => ({
        index: idx,
        completed: idx < completedTicks,
      }))

      await trackerPeriodDexieRepository.create({
        trackerId: tracker.id,
        startDate,
        endDate,
        periodTarget: 2,
        ticks,
      })
    }

    const compliance = await computeRollingCompliance(tracker.id, 'weekly')
    expect(compliance?.periods.length).toBe(6)
    expect(compliance?.successCount).toBe(6)
  })

  it('computes rolling compliance for monthly trackers', async () => {
    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Monthly Standard Project',
      description: undefined,
      targetOutcome: undefined,
      status: 'active',
    })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Monthly Compliance',
      type: 'count',
      cadence: 'monthly',
      targetCount: 2,
      rollup: 'sum',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    const reference = new Date()
    const monthlyDates = [
      new Date(reference.getFullYear(), reference.getMonth(), 1),
      new Date(reference.getFullYear(), reference.getMonth() - 1, 1),
      new Date(reference.getFullYear(), reference.getMonth() - 2, 1),
    ]
    const completions = [2, 1, 2]

    for (let i = 0; i < monthlyDates.length; i += 1) {
      const monthDate = monthlyDates[i]
      const startDate = toLocalISODateString(monthDate)
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
      const endDate = toLocalISODateString(lastDay)

      const ticks = Array.from({ length: 2 }, (_, idx) => ({
        index: idx,
        completed: idx < completions[i],
      }))

      await trackerPeriodDexieRepository.create({
        trackerId: tracker.id,
        startDate,
        endDate,
        periodTarget: 2,
        ticks,
      })
    }

    const compliance = await computeRollingCompliance(tracker.id, 'monthly')
    expect(compliance?.periods.length).toBe(3)
    expect(compliance?.successCount).toBe(3)
  })

  it('keeps monthly cadence denominator as monthly target for full-month windows', async () => {
    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Monthly Tracker Project',
      description: undefined,
      targetOutcome: undefined,
      objective: 'Consistency',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      focusWeekIds: [],
      focusMonthIds: [],
      status: 'active',
    })

    const tracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Training runs',
      type: 'count',
      cadence: 'monthly',
      targetCount: 12,
      rollup: 'sum',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate: '2026-02-02',
      endDate: '2026-02-08',
      periodTarget: 4,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: true },
        { index: 2, completed: true },
      ],
    })

    await trackerPeriodDexieRepository.create({
      trackerId: tracker.id,
      startDate: '2026-02-09',
      endDate: '2026-02-15',
      periodTarget: 4,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: true },
      ],
    })

    const fullMonthProgress = await computeTrackerProgressById(tracker.id, {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })
    expect(fullMonthProgress?.numerator).toBe(5)
    expect(fullMonthProgress?.denominator).toBeUndefined()

    const weeklyProgress = await computeTrackerProgressById(tracker.id, {
      startDate: '2026-02-02',
      endDate: '2026-02-08',
    })
    expect(weeklyProgress?.numerator).toBe(3)
    expect(weeklyProgress?.denominator).toBeUndefined()
  })

  it('respects focus week tags for project rollups', async () => {
    const focusWeek = await createWeeklyPlanForDate(new Date('2026-03-03'))
    const otherWeek = await createWeeklyPlanForDate(new Date('2026-03-17'))

    const project = await projectDexieRepository.create({
      monthIds: [],
      lifeAreaIds: [],
      priorityIds: [],
      name: 'Focus Project',
      description: undefined,
      targetOutcome: undefined,
      objective: 'Focus',
      startDate: focusWeek.startDate,
      endDate: otherWeek.endDate,
      focusWeekIds: [focusWeek.id],
      focusMonthIds: [],
      status: 'planned',
    })

    const countTracker = await trackerDexieRepository.create({
      parentType: 'project',
      parentId: project.id,
      name: 'Focused sessions',
      type: 'count',
      cadence: 'weekly',
      targetCount: 2,
      rollup: 'sum',
      lifeAreaIds: [],
      priorityIds: [],
      sortOrder: 0,
      isActive: true,
    })

    // TrackerPeriod for focus week — fully completed
    await trackerPeriodDexieRepository.create({
      trackerId: countTracker.id,
      startDate: focusWeek.startDate,
      endDate: focusWeek.endDate,
      periodTarget: 2,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: true },
      ],
    })

    // TrackerPeriod for other week — partially completed
    await trackerPeriodDexieRepository.create({
      trackerId: countTracker.id,
      startDate: otherWeek.startDate,
      endDate: otherWeek.endDate,
      periodTarget: 2,
      ticks: [
        { index: 0, completed: true },
        { index: 1, completed: true },
      ],
    })

    // computeProjectKRsProgress without a date range returns all periods,
    // but with a focus-week date range it should filter
    const results = await computeProjectKRsProgress(project.id, {
      startDate: focusWeek.startDate,
      endDate: focusWeek.endDate,
    })
    expect(results.length).toBe(1)
    expect(results[0].numerator).toBe(2)
    expect(results[0].denominator).toBeUndefined()
    expect(results[0].percent).toBeNull()
  })

  describe('resolveProjectTrendRanges', () => {
    beforeEach(async () => {
      const db = getTestDatabase()
      await db.monthlyPlans.clear()
      await db.weeklyPlans.clear()
    })

    it('generates scoped week ranges from project monthIds and matches tracker periods', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'))

      // Replicate exact "5K Base Build" scenario from seed data
      const prevMonthPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        year: 2026,
        name: 'January 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })
      const curMonthPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        name: 'February 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })

      const project = await projectDexieRepository.create({
        monthIds: [prevMonthPlan.id, curMonthPlan.id],
        lifeAreaIds: [],
        priorityIds: [],
        name: '5K Base Build Test',
        status: 'active',
      })

      const tracker = await trackerDexieRepository.create({
        parentType: 'project',
        parentId: project.id,
        name: 'Training runs completed',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        rollup: 'sum',
        lifeAreaIds: [],
        priorityIds: [],
        sortOrder: 0,
        isActive: true,
      })

      // Create tracker periods for known Monday-based weeks within the window
      // Jan 1 is Thursday → week starts Dec 29 (Monday)
      const weekDates = [
        { start: '2025-12-29', end: '2026-01-04', completed: 3 },
        // skip Jan 5-11
        { start: '2026-01-12', end: '2026-01-18', completed: 2 },
        // skip Jan 19-25
        { start: '2026-01-26', end: '2026-02-01', completed: 2 },
        { start: '2026-02-02', end: '2026-02-08', completed: 1 }, // current week
      ]

      for (const week of weekDates) {
        await trackerPeriodDexieRepository.create({
          trackerId: tracker.id,
          startDate: week.start,
          endDate: week.end,
          ticks: Array.from({ length: 3 }, (_, i) => ({
            index: i,
            completed: i < week.completed,
          })),
          sourceType: 'manual',
        })
      }

      // Call resolveProjectTrendRanges
      const result = await resolveProjectTrendRanges(project, 'weekly')

      // Should have a date label
      expect(result.dateRangeLabel).toBeTruthy()

      // Ranges should span from Dec 29 through Feb (excluding current week Feb 2-8)
      expect(result.ranges.length).toBeGreaterThan(0)

      // Verify the first range starts at the Monday of the week containing Jan 1
      expect(result.ranges[0].startDate).toBe('2025-12-29')

      // Now test that computeTrackerProgressById finds data for ranges with periods
      const dec29Range = result.ranges.find((r) => r.startDate === '2025-12-29')
      expect(dec29Range).toBeTruthy()

      const dec29Progress = await computeTrackerProgressById(tracker.id, dec29Range!)
      expect(dec29Progress).not.toBeNull()
      expect(dec29Progress!.numerator).toBe(3) // 3 completed
      expect(dec29Progress!.denominator).toBeUndefined()
      expect(dec29Progress!.percent).toBeNull()

      // Jan 12-18: should find 2 completed
      const jan12Range = result.ranges.find((r) => r.startDate === '2026-01-12')
      expect(jan12Range).toBeTruthy()
      const jan12Progress = await computeTrackerProgressById(tracker.id, jan12Range!)
      expect(jan12Progress).not.toBeNull()
      expect(jan12Progress!.numerator).toBe(2)
      expect(jan12Progress!.percent).toBeNull()

      // Jan 5-11: gap (no tracker period), should have 0 numerator
      const jan5Range = result.ranges.find((r) => r.startDate === '2026-01-05')
      expect(jan5Range).toBeTruthy()
      const jan5Progress = await computeTrackerProgressById(tracker.id, jan5Range!)
      // No periods → empty reduce → numerator=0, denominator=0 → percent=null
      expect(jan5Progress!.percent).toBeNull()

      // Current week (Feb 2-8) should be EXCLUDED from trend ranges
      expect(result.ranges.find((r) => r.startDate === '2026-02-02')).toBeUndefined()

      vi.useRealTimers()
    })

    it('prefers focusWeekIds over month links for weekly trend ranges', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'))

      const fallbackMonth = await monthlyPlanDexieRepository.create({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        year: 2026,
        name: 'March 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })

      const weekPast = await weeklyPlanDexieRepository.create({
        startDate: '2025-12-29',
        endDate: '2026-01-04',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
      })
      const weekCurrent = await weeklyPlanDexieRepository.create({
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
      })
      const weekFuture = await weeklyPlanDexieRepository.create({
        startDate: '2026-02-09',
        endDate: '2026-02-15',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
      })

      const project = await projectDexieRepository.create({
        monthIds: [fallbackMonth.id],
        focusWeekIds: [weekFuture.id, weekCurrent.id, weekPast.id],
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Focus Week Project',
        status: 'active',
      })

      const result = await resolveProjectTrendRanges(project, 'weekly')

      expect(result.ranges.map((range) => range.startDate)).toEqual(['2025-12-29'])
      expect(result.dateRangeLabel).toBeTruthy()
      expect(result.dateRangeLabel).not.toContain('Mar')

      vi.useRealTimers()
    })

    it('filters focus-week trend ranges by selected tracker when trackerId is provided', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'))

      const janPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        year: 2026,
        name: 'January 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })

      const weekA = await weeklyPlanDexieRepository.create({
        startDate: '2026-01-12',
        endDate: '2026-01-18',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
        selectedTrackerIds: ['tracker-a'],
      })
      const weekB = await weeklyPlanDexieRepository.create({
        startDate: '2026-01-19',
        endDate: '2026-01-25',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
        selectedTrackerIds: ['tracker-b'],
      })
      const weekCurrent = await weeklyPlanDexieRepository.create({
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
        selectedTrackerIds: ['tracker-a'],
      })

      const project = await projectDexieRepository.create({
        monthIds: [janPlan.id],
        focusWeekIds: [weekA.id, weekB.id, weekCurrent.id],
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Tracker Scoped Focus',
        status: 'active',
      })

      const trackerA = await trackerDexieRepository.create({
        parentType: 'project',
        parentId: project.id,
        name: 'Tracker A',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        rollup: 'sum',
        lifeAreaIds: [],
        priorityIds: [],
        sortOrder: 0,
        isActive: true,
      })

      await trackerPeriodDexieRepository.create({
        trackerId: trackerA.id,
        startDate: weekA.startDate,
        endDate: weekA.endDate,
        ticks: [
          { index: 0, completed: true },
          { index: 1, completed: true },
          { index: 2, completed: false },
        ],
        sourceType: 'manual',
      })

      const trackerAResult = await resolveProjectTrendRanges(project, 'weekly', {
        trackerId: 'tracker-a',
      })
      expect(trackerAResult.ranges.map((range) => range.startDate)).toEqual(['2026-01-12'])

      const trackerAProgress = await computeTrackerProgressById(trackerA.id, trackerAResult.ranges[0])
      expect(trackerAProgress?.numerator).toBe(2)
      expect(trackerAProgress?.denominator).toBeUndefined()
      expect(trackerAProgress?.percent).toBeNull()

      const trackerBResult = await resolveProjectTrendRanges(project, 'weekly', {
        trackerId: 'tracker-b',
      })
      expect(trackerBResult.ranges.map((range) => range.startDate)).toEqual(['2026-01-19'])

      const trackerCResult = await resolveProjectTrendRanges(project, 'weekly', {
        trackerId: 'tracker-c',
      })
      expect(trackerCResult.ranges).toEqual([])

      vi.useRealTimers()
    })

    it('falls back to month links when focusWeekIds have no historical week ranges', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'))

      const janPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        year: 2026,
        name: 'January 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })

      const weekCurrent = await weeklyPlanDexieRepository.create({
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
        capacityNote: undefined,
        focusSentence: undefined,
        adaptiveIntention: undefined,
      })

      const project = await projectDexieRepository.create({
        monthIds: [janPlan.id],
        focusWeekIds: [weekCurrent.id],
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Current Focus Only',
        status: 'active',
      })

      const result = await resolveProjectTrendRanges(project, 'weekly')

      expect(result.ranges.map((range) => range.startDate)).toEqual([
        '2025-12-29',
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
      ])
      expect(result.ranges.find((range) => range.startDate === '2026-02-02')).toBeUndefined()

      vi.useRealTimers()
    })

    it('filters month-derived weekly trend ranges to historical periods only', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-02-08T12:00:00.000Z'))

      const janPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        year: 2026,
        name: 'January 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })
      const febPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        year: 2026,
        name: 'February 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })
      const marPlan = await monthlyPlanDexieRepository.create({
        startDate: '2026-03-01',
        endDate: '2026-03-31',
        year: 2026,
        name: 'March 2026',
        primaryFocusLifeAreaId: '',
        secondaryFocusLifeAreaIds: [],
        monthIntention: '',
        projectIds: [],
      })

      const project = await projectDexieRepository.create({
        monthIds: [janPlan.id, febPlan.id, marPlan.id],
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Month Scoped Project',
        status: 'active',
      })

      const result = await resolveProjectTrendRanges(project, 'weekly')
      expect(result.ranges.map((range) => range.startDate)).toEqual([
        '2025-12-29',
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
      ])
      expect(result.ranges.every((range) => range.startDate < '2026-02-02')).toBe(true)

      vi.useRealTimers()
    })

    it('falls back to rolling window when monthIds is empty', async () => {
      const project = await projectDexieRepository.create({
        monthIds: [],
        lifeAreaIds: [],
        priorityIds: [],
        name: 'No Month Links',
        status: 'active',
      })

      const result = await resolveProjectTrendRanges(project, 'weekly')
      expect(result.dateRangeLabel).toBeNull()
      expect(result.ranges.length).toBe(6) // 6 rolling weeks
    })
  })
})
