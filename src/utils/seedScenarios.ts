/**
 * Focused Mock Data Seeders for Manual QA
 *
 * Each seeder creates only the data needed to test a specific feature area.
 * Seeders are composable: each detects and reuses existing foundation data
 * (life areas + priorities), so you can run them in any combination.
 *
 * Usage:
 *   - Click individual seeder buttons in Profile → Developer Tools
 *   - Or call from browser console: window.seedFoundation(), etc.
 *
 * Scenarios:
 *   1. seedFoundation()           — Life Areas + Priorities
 *   2. seedHabitsScenario()       — Habits + auto-generation chain
 *   3. seedProjectsScenario()     — Projects + Key Results
 *   4. seedWeeklyPlanningScenario() — Full current week
 *   5. seedFullTimeline()         — Everything + reflections + exercises
 */

import {
  priorityDexieRepository,
  projectDexieRepository,
  commitmentDexieRepository,
  weeklyPlanDexieRepository,
  monthlyPlanDexieRepository,
  yearlyPlanDexieRepository,
  weeklyReflectionDexieRepository,
  monthlyReflectionDexieRepository,
  trackerDexieRepository,
  trackerPeriodDexieRepository,
  habitDexieRepository,
  habitOccurrenceDexieRepository,
} from '@/repositories/planningDexieRepository'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import {
  wheelOfLifeSnapshotDexieRepository,
  valuesDiscoveryDexieRepository,
  shadowBeliefsDexieRepository,
  transformativePurposeDexieRepository,
} from '@/repositories/exercisesDexieRepository'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { CommitmentStatus, ValueDirection } from '@/domain/planning'

// ============================================================================
// TYPES
// ============================================================================

export interface FoundationIds {
  lifeAreas: Record<string, string>
  priorities: Record<string, string>
}

export interface SeedResult {
  summary: string
  counts: Record<string, number>
}

// ============================================================================
// DATE UTILITIES
// ============================================================================

/** Format a Date as 'YYYY-MM-DD' in local timezone (matches app's toLocalISODateString) */
function localDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Monday of the current week (ISO date string, local timezone) */
function getCurrentWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday = 1
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return localDate(monday)
}

/** Sunday of the current week */
function getCurrentWeekEnd(): string {
  const start = parseLocalDate(getCurrentWeekStart())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return localDate(end)
}

/** Parse a 'YYYY-MM-DD' string as local-timezone midnight */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** First day of the current month */
function getCurrentMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/** Last day of the current month */
function getCurrentMonthEnd(): string {
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return localDate(lastDay)
}

/** Get N weeks back from current week, returns {start, end} pairs */
function getPastWeeks(count: number): Array<{ start: string; end: string }> {
  const currentStart = parseLocalDate(getCurrentWeekStart())
  const weeks: Array<{ start: string; end: string }> = []
  for (let i = count; i >= 1; i--) {
    const start = new Date(currentStart)
    start.setDate(currentStart.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    weeks.push({
      start: localDate(start),
      end: localDate(end),
    })
  }
  return weeks
}

/** Get N months back from current month */
function getPastMonths(count: number): Array<{ start: string; end: string; year: number; name: string }> {
  const now = new Date()
  const months: Array<{ start: string; end: string; year: number; name: string }> = []
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  for (let i = count; i >= 1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    months.push({
      start: localDate(d),
      end: localDate(lastDay),
      year: d.getFullYear(),
      name: `${monthNames[d.getMonth()]} ${d.getFullYear()}`,
    })
  }
  return months
}

// ============================================================================
// CLEAR FUNCTIONS
// ============================================================================

/** Clear ALL data from all tables */
export async function clearAllData(): Promise<SeedResult> {
  console.log('Clearing all data...')
  const db = getUserDatabase()

  await db.journalEntries.clear()
  await db.emotionLogs.clear()
  await db.peopleTags.clear()
  await db.contextTags.clear()

  await db.lifeAreas.clear()
  await db.priorities.clear()
  await db.projects.clear()
  await db.commitments.clear()
  await db.weeklyPlans.clear()
  await db.monthlyPlans.clear()
  await db.yearlyPlans.clear()

  await db.trackers.clear()
  await db.trackerPeriods.clear()
  await db.habits.clear()
  await db.habitOccurrences.clear()

  await db.weeklyReflections.clear()
  await db.monthlyReflections.clear()
  await db.yearlyReflections.clear()

  await db.wheelOfLifeSnapshots.clear()
  await db.valuesDiscoveries.clear()
  await db.shadowBeliefs.clear()
  await db.transformativePurposes.clear()

  console.log('All data cleared.')
  return { summary: 'All data cleared', counts: {} }
}

/** Clear planning data but keep journals, emotion logs, and tags */
export async function clearPlanningData(): Promise<SeedResult> {
  console.log('Clearing planning data...')
  const db = getUserDatabase()

  await db.lifeAreas.clear()
  await db.priorities.clear()
  await db.projects.clear()
  await db.commitments.clear()
  await db.weeklyPlans.clear()
  await db.monthlyPlans.clear()
  await db.yearlyPlans.clear()

  await db.trackers.clear()
  await db.trackerPeriods.clear()
  await db.habits.clear()
  await db.habitOccurrences.clear()

  await db.weeklyReflections.clear()
  await db.monthlyReflections.clear()
  await db.yearlyReflections.clear()

  await db.wheelOfLifeSnapshots.clear()
  await db.valuesDiscoveries.clear()
  await db.shadowBeliefs.clear()
  await db.transformativePurposes.clear()

  console.log('Planning data cleared. Journals, emotions, and tags preserved.')
  return { summary: 'Planning data cleared (journals/emotions kept)', counts: {} }
}

// ============================================================================
// FOUNDATION DATA
// ============================================================================

const LIFE_AREA_SEEDS = [
  {
    key: 'health',
    name: 'Health & Vitality',
    purpose: 'Build steady energy through movement, sleep, and nourishing routines.',
    color: '#22C55E',
    maintenanceStandard: 'Move 3x/week, sleep 7+ hours, cook most meals.',
    successPicture: 'I wake up energized, enjoy challenging runs, and eat foods that fuel me.',
    measures: [
      { name: 'Workouts per week', type: 'leading' as const },
      { name: 'Energy level', type: 'lagging' as const },
    ],
    reviewCadence: 'weekly' as const,
    sortOrder: 0,
  },
  {
    key: 'career',
    name: 'Craft & Career',
    purpose: 'Ship meaningful work and deepen my design craft.',
    color: '#3B82F6',
    maintenanceStandard: 'Protect 2 focus blocks/day, share work monthly.',
    successPicture: 'I do deep work daily, my portfolio reflects my best craft, and I attract exciting projects.',
    measures: [
      { name: 'Deep work blocks', type: 'leading' as const },
      { name: 'Portfolio quality', type: 'lagging' as const },
    ],
    reviewCadence: 'weekly' as const,
    sortOrder: 1,
  },
  {
    key: 'relationships',
    name: 'Relationships & Community',
    purpose: 'Invest in close connections and show up consistently.',
    color: '#F97316',
    maintenanceStandard: '1 friend catch-up/week, family dinner weekly.',
    successPicture: 'I have a close circle I see regularly and a small community I help nurture.',
    measures: [
      { name: 'Social events per week', type: 'leading' as const },
      { name: 'Connection quality', type: 'lagging' as const },
    ],
    reviewCadence: 'monthly' as const,
    sortOrder: 2,
  },
  {
    key: 'mind',
    name: 'Mind & Spirit',
    purpose: 'Cultivate calm, clarity, and a resilient nervous system.',
    color: '#14B8A6',
    maintenanceStandard: 'Meditate 5x/week, journal 3x/week, screen off by 10:30pm.',
    successPicture: 'I feel grounded most days, bounce back from setbacks quickly, and sleep well.',
    measures: [
      { name: 'Meditation sessions', type: 'leading' as const },
      { name: 'Stress resilience', type: 'lagging' as const },
    ],
    reviewCadence: 'weekly' as const,
    sortOrder: 3,
  },
  {
    key: 'home',
    name: 'Home & Finances',
    purpose: 'Create stability with simple systems and mindful spending.',
    color: '#6366F1',
    maintenanceStandard: 'Weekly money check-in, tidy space, pay bills on time.',
    successPicture: 'My home is calm, finances are organized, and I never worry about bills.',
    measures: [
      { name: 'Budget reviews', type: 'leading' as const },
      { name: 'Financial stress', type: 'lagging' as const },
    ],
    reviewCadence: 'monthly' as const,
    sortOrder: 4,
  },
]

const PRIORITY_SEEDS = [
  { key: 'move', lifeAreaKey: 'health', name: 'Consistent movement', successSignals: ['4+ workouts per week', 'Afternoon walk 4x per week'], constraints: ['No training through pain'], sortOrder: 0 },
  { key: 'fuel', lifeAreaKey: 'health', name: 'Fuel with intention', successSignals: ['Protein with breakfast', '80% meals cooked at home'], constraints: ['No calorie obsession'], sortOrder: 1 },
  { key: 'portfolio', lifeAreaKey: 'career', name: 'Ship portfolio stories', successSignals: ['2 case studies published', 'Share work with 3 peers'], constraints: ['Avoid endless polishing'], sortOrder: 2 },
  { key: 'deep-work', lifeAreaKey: 'career', name: 'Protect deep work', successSignals: ['2 focus blocks per day'], constraints: ['No meetings before 10am'], sortOrder: 3 },
  { key: 'connection', lifeAreaKey: 'relationships', name: 'Weekly connection rhythm', successSignals: ['1 friend hangout per week', 'Family dinner weekly'], sortOrder: 4 },
  { key: 'contribution', lifeAreaKey: 'relationships', name: 'Community contribution', successSignals: ['Host monthly gathering'], sortOrder: 5 },
  { key: 'nervous', lifeAreaKey: 'mind', name: 'Nervous system care', successSignals: ['Meditation 5x per week', 'Screen off by 10:30pm'], sortOrder: 6 },
  { key: 'home-systems', lifeAreaKey: 'home', name: 'Simple money system', successSignals: ['Weekly money check-in', 'Spending tracked in one place'], sortOrder: 7 },
]

/**
 * Ensures life areas + priorities exist. Reuses existing if found, creates if not.
 * This is the composability backbone — every seeder calls this first.
 */
async function ensureFoundation(): Promise<FoundationIds> {
  const lifeAreas: Record<string, string> = {}
  const priorities: Record<string, string> = {}

  // Check for existing life areas by name
  const existingAreas = await lifeAreaDexieRepository.getAll()
  const existingByName = new Map(existingAreas.map((la) => [la.name, la.id]))

  for (const seed of LIFE_AREA_SEEDS) {
    const existingId = existingByName.get(seed.name)
    if (existingId) {
      lifeAreas[seed.key] = existingId
    } else {
      const created = await lifeAreaDexieRepository.create({
        name: seed.name,
        color: seed.color,
        purpose: seed.purpose,
        maintenanceStandard: seed.maintenanceStandard,
        successPicture: seed.successPicture,
        measures: seed.measures,
        constraints: [],
        reviewCadence: seed.reviewCadence,
        isActive: true,
        sortOrder: seed.sortOrder,
      })
      lifeAreas[seed.key] = created.id
    }
  }

  // Check for existing priorities by name
  const existingPriorities = await priorityDexieRepository.getAll()
  const existingPriByName = new Map(existingPriorities.map((p) => [p.name, p.id]))
  const currentYear = new Date().getFullYear()

  for (const seed of PRIORITY_SEEDS) {
    const existingId = existingPriByName.get(seed.name)
    if (existingId) {
      priorities[seed.key] = existingId
    } else {
      const created = await priorityDexieRepository.create({
        lifeAreaIds: [lifeAreas[seed.lifeAreaKey]].filter(Boolean),
        year: currentYear,
        name: seed.name,
        successSignals: seed.successSignals,
        constraints: seed.constraints,
        isActive: true,
        sortOrder: seed.sortOrder,
      })
      priorities[seed.key] = created.id
    }
  }

  return { lifeAreas, priorities }
}

/** Ensure a weekly plan exists for the current week. Reuses if found. */
async function ensureCurrentWeeklyPlan(options?: {
  capacityNote?: string
  focusSentence?: string
  adaptiveIntention?: string
  selectedTrackerIds?: string[]
}): Promise<string> {
  const weekStart = getCurrentWeekStart()
  const weekEnd = getCurrentWeekEnd()

  const existingPlans = await weeklyPlanDexieRepository.getAll()
  const existing = existingPlans.find((p) => p.startDate === weekStart)
  if (existing) {
    // Update if options provided
    if (options && (options.capacityNote || options.focusSentence || options.selectedTrackerIds)) {
      await weeklyPlanDexieRepository.update(existing.id, {
        ...(options.capacityNote && { capacityNote: options.capacityNote }),
        ...(options.focusSentence && { focusSentence: options.focusSentence }),
        ...(options.adaptiveIntention && { adaptiveIntention: options.adaptiveIntention }),
        ...(options.selectedTrackerIds && { selectedTrackerIds: options.selectedTrackerIds }),
      })
    }
    return existing.id
  }

  const plan = await weeklyPlanDexieRepository.create({
    startDate: weekStart,
    endDate: weekEnd,
    name: 'Current Week',
    capacityNote: options?.capacityNote || 'Moderate energy this week.',
    focusSentence: options?.focusSentence || 'Focus on what matters most.',
    adaptiveIntention: options?.adaptiveIntention || 'If things get messy, protect the essentials.',
    selectedTrackerIds: options?.selectedTrackerIds || [],
  })
  return plan.id
}

/** Ensure a monthly plan exists for the current month. Reuses if found. */
async function ensureCurrentMonthlyPlan(projectIds?: string[]): Promise<string> {
  const monthStart = getCurrentMonthStart()
  const monthEnd = getCurrentMonthEnd()

  const existingPlans = await monthlyPlanDexieRepository.getAll()
  const existing = existingPlans.find((p) => p.startDate === monthStart)
  if (existing) return existing.id

  const now = new Date()
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  const plan = await monthlyPlanDexieRepository.create({
    startDate: monthStart,
    endDate: monthEnd,
    year: now.getFullYear(),
    name: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    monthIntention: 'Build steady momentum with healthy habits and focused work.',
    projectIds: projectIds || [],
  })
  return plan.id
}

// ============================================================================
// 1. SEED FOUNDATION
// ============================================================================

export async function seedFoundation(): Promise<SeedResult> {
  console.log('Seeding foundation (life areas + priorities)...')
  const foundation = await ensureFoundation()

  const areaCount = Object.keys(foundation.lifeAreas).length
  const priCount = Object.keys(foundation.priorities).length
  console.log(`Foundation: ${areaCount} life areas, ${priCount} priorities`)

  return {
    summary: `${areaCount} life areas, ${priCount} priorities`,
    counts: { lifeAreas: areaCount, priorities: priCount },
  }
}

// ============================================================================
// 2. SEED HABITS SCENARIO
// ============================================================================

export async function seedHabitsScenario(): Promise<SeedResult> {
  console.log('Seeding habits scenario...')
  const foundation = await ensureFoundation()

  // Check existing habits to avoid duplicates
  const existingHabits = await habitDexieRepository.getAll()
  const existingHabitNames = new Set(existingHabits.map((h) => h.name))

  let habitCount = 0
  let occurrenceCount = 0
  let periodCount = 0
  const weeklyHabitTrackerIds: string[] = []
  const monthlyHabitTrackerIds: string[] = []

  const currentWeekStart = getCurrentWeekStart()
  const currentWeekEnd = getCurrentWeekEnd()
  const currentMonthStart = getCurrentMonthStart()
  const currentMonthEnd = getCurrentMonthEnd()
  const pastWeeks = getPastWeeks(4)
  await ensureCurrentWeeklyPlan()

  const habitDefs = [
    {
      name: 'Gym sessions',
      cadence: 'weekly' as const,
      lifeAreaKey: 'health',
      priorityKey: 'move',
      tickCount: 4,
      tickLabels: ['Mon', 'Wed', 'Fri', 'Sat'],
      standaloneTracker: {
        name: 'Movement sessions',
        type: 'count' as const,
        cadence: 'weekly' as const,
        targetCount: 4,
        rollup: 'sum' as const,
      },
    },
    {
      name: 'Daily meditation',
      cadence: 'weekly' as const,
      lifeAreaKey: 'mind',
      priorityKey: 'nervous',
      tickCount: undefined, // value tracker -- no ticks
      standaloneTracker: {
        name: 'Meditation minutes',
        type: 'value' as const,
        cadence: 'weekly' as const,
        unit: 'min',
        targetValue: 70,
        direction: 'increase' as const,
        rollup: 'sum' as const,
      },
    },
    {
      name: 'Sunday meal prep',
      cadence: 'weekly' as const,
      lifeAreaKey: 'health',
      priorityKey: 'fuel',
      tickCount: 1,
      tickLabels: ['Sunday'] as string[] | undefined,
      standaloneTracker: {
        name: 'Home-cooked meals',
        type: 'count' as const,
        cadence: 'weekly' as const,
        targetCount: 12,
        rollup: 'sum' as const,
      },
    },
    {
      name: 'Deep work blocks',
      cadence: 'weekly' as const,
      lifeAreaKey: 'career',
      priorityKey: 'deep-work',
      tickCount: 8,
      tickLabels: ['Mon AM', 'Mon PM', 'Tue AM', 'Tue PM', 'Wed AM', 'Wed PM', 'Thu AM', 'Thu PM'] as string[] | undefined,
      standaloneTracker: {
        name: 'Focus blocks completed',
        type: 'count' as const,
        cadence: 'weekly' as const,
        targetCount: 8,
        rollup: 'sum' as const,
      },
    },
    {
      name: 'Sleep quality check-in',
      cadence: 'weekly' as const,
      lifeAreaKey: 'health',
      priorityKey: 'move',
      standaloneTracker: {
        name: 'Sleep quality (habit)',
        type: 'rating' as const,
        cadence: 'weekly' as const,
        ratingScaleMin: 1,
        ratingScaleMax: 5,
        notePrompt: 'How did sleep feel this week?',
        rollup: 'average' as const,
      },
    },
    {
      name: 'Monthly budget review',
      cadence: 'monthly' as const,
      lifeAreaKey: 'home',
      priorityKey: 'home-systems',
      standaloneTracker: {
        name: 'Financial health',
        type: 'rating' as const,
        cadence: 'monthly' as const,
        ratingScaleMin: 1,
        ratingScaleMax: 5,
        notePrompt: 'How did spending feel this month?',
        rollup: 'average' as const,
      },
    },
  ]

  for (const def of habitDefs) {
    if (existingHabitNames.has(def.name)) {
      console.log(`  Habit "${def.name}" already exists, skipping.`)
      continue
    }

    // Create habit first (habits own trackers via parentType: 'habit')
    const habit = await habitDexieRepository.create({
      name: def.name,
      isActive: true,
      isPaused: false,
      cadence: def.cadence,
      lifeAreaIds: def.lifeAreaKey ? [foundation.lifeAreas[def.lifeAreaKey]].filter(Boolean) : [],
      priorityIds: def.priorityKey ? [foundation.priorities[def.priorityKey]].filter(Boolean) : [],
    })
    habitCount++

    // Create owned tracker with parentType/parentId referencing the habit
    let trackerId: string = ''

    if (def.standaloneTracker) {
      const st = def.standaloneTracker
      const tracker = await trackerDexieRepository.create({
        parentType: 'habit',
        parentId: habit.id,
        name: st.name,
        type: st.type,
        cadence: st.cadence,
        notePrompt: (st as { notePrompt?: string }).notePrompt,
        rollup: st.rollup,
        ratingScaleMin: (st as { ratingScaleMin?: number }).ratingScaleMin,
        ratingScaleMax: (st as { ratingScaleMax?: number }).ratingScaleMax,
        targetCount: (st as { targetCount?: number }).targetCount,
        targetValue: (st as { targetValue?: number }).targetValue,
        unit: (st as { unit?: string }).unit,
        direction: (st as { direction?: ValueDirection }).direction,
        lifeAreaIds: def.lifeAreaKey ? [foundation.lifeAreas[def.lifeAreaKey]].filter(Boolean) : [],
        priorityIds: def.priorityKey ? [foundation.priorities[def.priorityKey]].filter(Boolean) : [],
        sortOrder: 0,
        isActive: true,
      })
      trackerId = tracker.id
      if (st.cadence === 'weekly') weeklyHabitTrackerIds.push(tracker.id)
      if (st.cadence === 'monthly') monthlyHabitTrackerIds.push(tracker.id)
    }

    // Generate occurrences + commitments + tracker periods for past weeks + current
    if (def.cadence === 'weekly') {
      const allWeeks = [...pastWeeks, { start: currentWeekStart, end: currentWeekEnd }]
      for (let wi = 0; wi < allWeeks.length; wi++) {
        const week = allWeeks[wi]
        const isCurrent = wi === allWeeks.length - 1
        const status: CommitmentStatus = isCurrent ? 'planned' : (wi % 5 === 3 ? 'skipped' : 'done')

        // Tracker period
        if (trackerId && def.tickCount) {
          const completed = status === 'done' ? def.tickCount : (isCurrent ? Math.floor(def.tickCount * 0.5) : 0)
          await trackerPeriodDexieRepository.create({
            trackerId,
            startDate: week.start,
            endDate: week.end,
            ticks: Array.from({ length: def.tickCount }, (_, i) => ({
              index: i,
              completed: i < completed,
            })),
            sourceType: 'habit',
            habitId: habit.id,
          })
          periodCount++
        } else if (trackerId && def.standaloneTracker?.type === 'value') {
          const st = def.standaloneTracker as { targetValue?: number; direction?: string; unit?: string }
          const target = st.targetValue || 0
          // Simulate gradual increase with some variation
          const base = target * 0.4
          const jitter = Math.sin(wi * 2.1) * target * 0.1
          const value = isCurrent
            ? Math.round((base + target * 0.3 + jitter) * 10) / 10
            : Math.round((base + wi * (target * 0.1) + jitter) * 10) / 10
          await trackerPeriodDexieRepository.create({
            trackerId,
            startDate: week.start,
            endDate: week.end,
            entries: [{ value, date: week.start }],
            sourceType: 'habit',
            habitId: habit.id,
          })
          periodCount++
        } else if (trackerId && def.standaloneTracker?.type === 'rating' && !isCurrent) {
          const rating = Math.min(5, 2.5 + wi * 0.4)
          await trackerPeriodDexieRepository.create({
            trackerId,
            startDate: week.start,
            endDate: week.end,
            rating: Math.round(rating * 10) / 10,
            note: rating >= 3.5 ? 'Good week.' : 'Room to improve.',
            sourceType: 'habit',
            habitId: habit.id,
          })
          periodCount++
        }

        // Habit occurrence
        await habitOccurrenceDexieRepository.create({
          habitId: habit.id,
          periodType: 'weekly',
          periodStartDate: week.start,
          status: status === 'done' ? 'completed' : status === 'skipped' ? 'skipped' : 'generated',
        })
        occurrenceCount++
      }
    } else if (def.cadence === 'monthly') {
      // Monthly habit — create for current month + 2 past months
      const pastMonths = getPastMonths(2)
      const allMonths = [...pastMonths, { start: currentMonthStart, end: currentMonthEnd, year: new Date().getFullYear(), name: 'Current' }]

      for (let mi = 0; mi < allMonths.length; mi++) {
        const month = allMonths[mi]
        const isCurrent = mi === allMonths.length - 1
        const status: CommitmentStatus = isCurrent ? 'planned' : 'done'

        if (trackerId && !isCurrent) {
          if (def.standaloneTracker?.type === 'rating') {
            const rating = Math.min(5, 2.5 + mi * 0.8)
            await trackerPeriodDexieRepository.create({
              trackerId,
              startDate: month.start,
              endDate: month.end,
              rating: Math.round(rating * 10) / 10,
              note: rating >= 3.5 ? 'Good financial discipline.' : 'Overspent a bit.',
              sourceType: 'habit',
              habitId: habit.id,
            })
          } else {
            await trackerPeriodDexieRepository.create({
              trackerId,
              startDate: month.start,
              endDate: month.end,
              note: status === 'done' ? 'Completed budget review.' : '',
              sourceType: 'habit',
              habitId: habit.id,
            })
          }
          periodCount++
        }

        await habitOccurrenceDexieRepository.create({
          habitId: habit.id,
          periodType: 'monthly',
          periodStartDate: month.start,
          status: status === 'done' ? 'completed' : 'generated',
        })
        occurrenceCount++
      }
    }
  }

  // Ensure all weekly plans (current + past) include habit tracker IDs in selection
  if (weeklyHabitTrackerIds.length > 0) {
    const existingPlans = await weeklyPlanDexieRepository.getAll()
    const existingPlansByStart = new Map(existingPlans.map((p) => [p.startDate, p]))

    const allWeeks = [...pastWeeks, { start: currentWeekStart, end: currentWeekEnd }]
    for (const week of allWeeks) {
      const plan = existingPlansByStart.get(week.start)
      if (plan) {
        const existing = plan.selectedTrackerIds ?? []
        const merged = Array.from(new Set([...existing, ...weeklyHabitTrackerIds]))
        await weeklyPlanDexieRepository.update(plan.id, { selectedTrackerIds: merged })
      } else {
        await weeklyPlanDexieRepository.create({
          startDate: week.start,
          endDate: week.end,
          name: 'Auto-created',
          selectedTrackerIds: weeklyHabitTrackerIds,
        })
      }
    }
  }

  // Update monthly plan to include habit tracker IDs in selection
  if (monthlyHabitTrackerIds.length > 0) {
    const monthStart = getCurrentMonthStart()
    const existingPlans = await monthlyPlanDexieRepository.getAll()
    const monthlyPlan = existingPlans.find((p) => p.startDate === monthStart)
    if (monthlyPlan) {
      const existing = monthlyPlan.selectedTrackerIds ?? []
      const merged = Array.from(new Set([...existing, ...monthlyHabitTrackerIds]))
      await monthlyPlanDexieRepository.update(monthlyPlan.id, { selectedTrackerIds: merged })
    }
  }

  const summary = `${habitCount} habits, ${occurrenceCount} occurrences, ${periodCount} tracker periods`
  console.log(`Habits scenario: ${summary}`)
  return { summary, counts: { habits: habitCount, occurrences: occurrenceCount, trackerPeriods: periodCount } }
}

// ============================================================================
// 4. SEED PROJECTS SCENARIO
// ============================================================================
//
// Test scenarios for KR tracker behaviour:
//
// A) "5K Base Build" — 2-month project (previous + current month)
//    - Weekly KR "Training runs completed" (count): gaps at past-week indices 2 & 4
//      → QA: vertical bars show 2 empty blocks in the weekly row
//    - Weekly KR "Average pace" (value, min/km, decrease): gap at index 4
//      → QA: sparkline with ~6 data points showing downward trend
//    - Monthly KR "5K personal best" (value, min, decrease): data in both months
//      → QA: sparkline shows progress across 3 months
//
// B) "Mindful Mornings Sprint" — 1-month project (current month only)
//    - Weekly KR "Sessions this week" (count): 2-week gap at indices 3 & 4
//      → QA: vertical bars show gaps
//    - Weekly KR "Session quality" (rating): alternating gaps at indices 1, 3, 4
//      → QA: vertical bars with missing weeks as empty
//    - Weekly KR "Morning routine completed" (adherence): gap at index 4
//      → QA: completion dots — filled for done, empty for not done
//
// C) "Portfolio Refresh" — completed project, monthly count KR
// D) "Home Systems Reset" — abandoned project, no KRs
// ============================================================================

export async function seedProjectsScenario(): Promise<SeedResult> {
  console.log('Seeding projects scenario...')
  const foundation = await ensureFoundation()
  const currentMonthlyPlanId = await ensureCurrentMonthlyPlan()
  const weeklyPlanId = await ensureCurrentWeeklyPlan()

  // Create a previous monthly plan so we can test multi-month projects
  const prevMonthData = getPastMonths(1)[0]
  let previousMonthlyPlanId: string
  const existingMonthlyPlans = await monthlyPlanDexieRepository.getAll()
  const existingPrevMonthly = existingMonthlyPlans.find((p) => p.startDate === prevMonthData.start)
  if (existingPrevMonthly) {
    previousMonthlyPlanId = existingPrevMonthly.id
  } else {
    const plan = await monthlyPlanDexieRepository.create({
      startDate: prevMonthData.start,
      endDate: prevMonthData.end,
      year: prevMonthData.year,
      name: prevMonthData.name,
      monthIntention: 'Establish a training baseline and build consistency.',
      projectIds: [],
    })
    previousMonthlyPlanId = plan.id
  }

  // Check existing projects
  const existingProjects = await projectDexieRepository.getAll()
  const existingByName = new Set(existingProjects.map((p) => p.name))

  let projectCount = 0
  let trackerCount = 0
  let periodCount = 0
  let commitmentCount = 0

  // 8 past weeks + current week → enough for rolling compliance, visible gaps, & richer sparklines
  const pastWeeks = getPastWeeks(8)
  const currentWeek = { start: getCurrentWeekStart(), end: getCurrentWeekEnd() }
  const pastMonths = getPastMonths(4)
  const currentMonth = { start: getCurrentMonthStart(), end: getCurrentMonthEnd() }

  const projectDefs = [
    {
      name: '5K Base Build',
      description: 'Build aerobic base and improve 5K personal best.',
      objective: 'Run a sub-25 minute 5K by April',
      targetOutcome: 'Complete 5K in under 25 minutes with comfortable recovery.',
      lifeAreaKey: 'health',
      priorityKey: 'move',
      status: 'active' as const,
      // Linked to BOTH months — tests multi-month KR display
      monthPlanIds: [previousMonthlyPlanId, currentMonthlyPlanId],
      trackers: [
        {
          name: 'Training runs completed',
          type: 'count' as const,
          cadence: 'weekly' as const,
          targetCount: 3,
          rollup: 'sum' as const,
          // Gaps at weeks 2 & 4 (0-indexed): the user skipped tracking those weeks
          skipWeekIndices: [2, 4] as number[],
        },
        {
          name: 'Average pace',
          type: 'value' as const,
          cadence: 'weekly' as const,
          unit: 'min/km',
          baselineValue: 6.5,
          targetValue: 5.0,
          direction: 'decrease' as const,
          rollup: 'average' as const,
          skipWeekIndices: [4] as number[],
        },
        {
          name: '5K personal best',
          type: 'value' as const,
          cadence: 'monthly' as const,
          unit: 'min',
          baselineValue: 30,
          targetValue: 25,
          direction: 'decrease' as const,
          rollup: 'last' as const,
          skipWeekIndices: [] as number[],
        },
      ],
      commitments: ['Run 3x (easy pace)', 'Run 2x + 1 tempo session'],
    },
    {
      name: 'Mindful Mornings Sprint',
      description: 'Establish a daily meditation practice anchored in the morning.',
      objective: 'Meditate 5x/week consistently for 12 weeks',
      targetOutcome: 'Meditation feels automatic and noticeably improves my day.',
      lifeAreaKey: 'mind',
      priorityKey: 'nervous',
      status: 'active' as const,
      // Linked to current month only — tests single-month KR display
      monthPlanIds: [currentMonthlyPlanId],
      trackers: [
        {
          name: 'Sessions this week',
          type: 'count' as const,
          cadence: 'weekly' as const,
          targetCount: 5,
          rollup: 'sum' as const,
          // 2-week gap in the middle (stopped tracking, then resumed)
          skipWeekIndices: [3, 4] as number[],
        },
        {
          name: 'Session quality',
          type: 'rating' as const,
          cadence: 'weekly' as const,
          ratingScaleMin: 1,
          ratingScaleMax: 5,
          rollup: 'average' as const,
          notePrompt: 'How present did you feel?',
          // Alternating + big gap: skipped weeks 1, 3, 4
          skipWeekIndices: [1, 3, 4] as number[],
        },
        {
          name: 'Morning routine completed',
          type: 'adherence' as const,
          cadence: 'weekly' as const,
          targetCount: 1,
          rollup: 'sum' as const,
          skipWeekIndices: [4] as number[],
        },
      ],
      commitments: ['Meditate 5 mornings this week'],
    },
    {
      name: 'Portfolio Refresh',
      description: 'Update portfolio with 2 new case studies from recent work.',
      objective: 'Publish 2 polished case studies',
      targetOutcome: 'Portfolio updated and generating inbound interest.',
      lifeAreaKey: 'career',
      priorityKey: 'portfolio',
      status: 'completed' as const,
      completedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      reflectionNote: 'Publishing early unlocked client conversations I was putting off.',
      monthPlanIds: [currentMonthlyPlanId],
      trackers: [
        {
          name: 'Case studies published',
          type: 'count' as const,
          cadence: 'monthly' as const,
          targetCount: 2,
          rollup: 'sum' as const,
          skipWeekIndices: [] as number[],
        },
      ],
      commitments: [],
    },
    {
      name: 'Home Systems Reset',
      description: 'Create simple routines for budget tracking and home tidiness.',
      objective: 'Weekly review habit and shared task list',
      targetOutcome: 'Spending tracked, bills automated, home tidy.',
      lifeAreaKey: 'home',
      priorityKey: 'home-systems',
      status: 'abandoned' as const,
      completedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      reflectionNote: 'Too many parallel initiatives. Will revisit with simpler scope.',
      monthPlanIds: [currentMonthlyPlanId],
      trackers: [],
      commitments: [],
    },
  ]

  for (const def of projectDefs) {
    if (existingByName.has(def.name)) {
      console.log(`  Project "${def.name}" already exists, skipping.`)
      continue
    }

    const project = await projectDexieRepository.create({
      lifeAreaIds: [foundation.lifeAreas[def.lifeAreaKey]].filter(Boolean),
      priorityIds: [foundation.priorities[def.priorityKey]].filter(Boolean),
      monthIds: def.monthPlanIds,
      focusMonthIds: def.monthPlanIds,
      focusWeekIds: [],
      name: def.name,
      description: def.description,
      objective: def.objective,
      targetOutcome: def.targetOutcome,
      status: def.status,
      completedAt: (def as { completedAt?: string }).completedAt,
      reflectionNote: (def as { reflectionNote?: string }).reflectionNote,
    })
    projectCount++

    // Create trackers (KRs) + tracker periods with intentional gaps
    const projectTrackerIds: string[] = []
    const projectWeeklyTrackerIds: string[] = []
    for (const tr of def.trackers) {
      const tracker = await trackerDexieRepository.create({
        parentType: 'project',
        parentId: project.id,
        name: tr.name,
        type: tr.type,
        cadence: tr.cadence,
        targetCount: (tr as { targetCount?: number }).targetCount,
        unit: (tr as { unit?: string }).unit,
        baselineValue: (tr as { baselineValue?: number }).baselineValue,
        targetValue: (tr as { targetValue?: number }).targetValue,
        direction: (tr as { direction?: 'increase' | 'decrease' }).direction,
        rollup: tr.rollup,
        ratingScaleMin: (tr as { ratingScaleMin?: number }).ratingScaleMin,
        ratingScaleMax: (tr as { ratingScaleMax?: number }).ratingScaleMax,
        notePrompt: (tr as { notePrompt?: string }).notePrompt,
        lifeAreaIds: [],
        priorityIds: [],
        sortOrder: 0,
        isActive: true,
      })
      trackerCount++
      projectTrackerIds.push(tracker.id)
      if (tr.cadence === 'weekly') {
        projectWeeklyTrackerIds.push(tracker.id)
      }

      const skipWeeks = new Set(tr.skipWeekIndices)

      // --- Weekly tracker periods (with gap support) ---
      if (tr.cadence === 'weekly') {
        // Past weeks: skip indices in skipWeeks set
        for (let wi = 0; wi < pastWeeks.length; wi++) {
          if (skipWeeks.has(wi)) continue
          const week = pastWeeks[wi]

          if (tr.type === 'count' || tr.type === 'adherence') {
            const target = (tr as { targetCount: number }).targetCount
            const completed = tr.type === 'adherence'
              ? (wi % 3 === 0 ? 0 : target) // adherence: sometimes not done
              : Math.max(0, target - (wi % 2))
            await trackerPeriodDexieRepository.create({
              trackerId: tracker.id,
              startDate: week.start,
              endDate: week.end,
              ticks: Array.from({ length: target }, (_, i) => ({ index: i, completed: i < completed })),
              sourceType: 'manual',
            })
            periodCount++
          } else if (tr.type === 'rating') {
            const rating = Math.min(5, 2.5 + wi * 0.3)
            await trackerPeriodDexieRepository.create({
              trackerId: tracker.id,
              startDate: week.start,
              endDate: week.end,
              rating: Math.round(rating * 10) / 10,
              note: rating >= 3.5 ? 'Focused and present.' : 'Still settling in.',
              sourceType: 'manual',
            })
            periodCount++
          } else if (tr.type === 'value') {
            const baseline = (tr as { baselineValue?: number }).baselineValue || 0
            const target = (tr as { targetValue?: number }).targetValue || 0
            const direction = (tr as { direction?: string }).direction
            // Multiple entries per period to simulate realistic logging
            const entryCount = 2 + (wi % 2) // 2-3 entries per week
            const entries: Array<{ value: number; date: string }> = []
            for (let ei = 0; ei < entryCount; ei++) {
              const jitter = Math.sin(wi * 1.7 + ei * 0.9) * 0.12
              const progressFraction = 0.08 + wi * 0.09 + ei * 0.02 + jitter
              const value = direction === 'decrease'
                ? baseline - (baseline - target) * Math.min(progressFraction, 0.95)
                : baseline + (target - baseline) * Math.min(progressFraction, 0.95)
              const entryDay = new Date(parseLocalDate(week.start))
              entryDay.setDate(entryDay.getDate() + ei * 2)
              entries.push({ value: Math.round(value * 100) / 100, date: localDate(entryDay) })
            }
            await trackerPeriodDexieRepository.create({
              trackerId: tracker.id,
              startDate: week.start,
              endDate: week.end,
              entries,
              sourceType: 'manual',
            })
            periodCount++
          }
        }

        // Current week: always gets a partial entry (not skipped)
        if (tr.type === 'count' || tr.type === 'adherence') {
          const target = (tr as { targetCount: number }).targetCount
          const completed = tr.type === 'adherence' ? 0 : Math.floor(target * 0.3)
          await trackerPeriodDexieRepository.create({
            trackerId: tracker.id,
            startDate: currentWeek.start,
            endDate: currentWeek.end,
            ticks: Array.from({ length: target }, (_, i) => ({ index: i, completed: i < completed })),
            sourceType: 'manual',
          })
          periodCount++
        } else if (tr.type === 'value') {
          const baseline = (tr as { baselineValue?: number }).baselineValue || 0
          const target = (tr as { targetValue?: number }).targetValue || 0
          const direction = (tr as { direction?: string }).direction
          const progress = direction === 'decrease'
            ? baseline - (baseline - target) * 0.75
            : baseline + (target - baseline) * 0.75
          await trackerPeriodDexieRepository.create({
            trackerId: tracker.id,
            startDate: currentWeek.start,
            endDate: currentWeek.end,
            entries: [{ value: Math.round(progress * 100) / 100, date: currentWeek.start }],
            sourceType: 'manual',
          })
          periodCount++
        }
        // Rating: no current-week entry (user hasn't rated yet this week)

      // --- Monthly tracker periods (no gaps — always filled) ---
      } else if (tr.cadence === 'monthly') {
        const months = [...pastMonths, currentMonth]
        for (let mi = 0; mi < months.length; mi++) {
          const month = months[mi]
          const isCurrent = mi === months.length - 1

          if (tr.type === 'count' || tr.type === 'adherence') {
            const target = (tr as { targetCount: number }).targetCount
            const completed = isCurrent ? Math.floor(target * 0.5) : target
            await trackerPeriodDexieRepository.create({
              trackerId: tracker.id,
              startDate: month.start,
              endDate: month.end,
              ticks: Array.from({ length: target }, (_, i) => ({ index: i, completed: i < completed })),
              sourceType: 'manual',
            })
            periodCount++
          } else if (tr.type === 'value') {
            const baseline = (tr as { baselineValue?: number }).baselineValue || 0
            const target = (tr as { targetValue?: number }).targetValue || 0
            const direction = (tr as { direction?: string }).direction
            const jitter = Math.sin(mi * 2.3) * 0.08
            const progressFraction = Math.min(0.15 + mi * 0.17 + jitter, 0.95)
            const progress = direction === 'decrease'
              ? baseline - (baseline - target) * progressFraction
              : baseline + (target - baseline) * progressFraction
            await trackerPeriodDexieRepository.create({
              trackerId: tracker.id,
              startDate: month.start,
              endDate: month.end,
              entries: [{ value: Math.round(progress * 10) / 10, date: month.start }],
              sourceType: 'manual',
            })
            periodCount++
          }
        }
      }
    }

    // Create project-linked commitments for active projects in current week
    if (def.status === 'active' && def.commitments.length > 0) {
      for (const commitmentName of def.commitments) {
        const status: CommitmentStatus = def.commitments.indexOf(commitmentName) === 0 ? 'done' : 'planned'
        await commitmentDexieRepository.create({
          weeklyPlanId,
          projectId: project.id,
          lifeAreaIds: [foundation.lifeAreas[def.lifeAreaKey]].filter(Boolean),
          priorityIds: [foundation.priorities[def.priorityKey]].filter(Boolean),
          name: commitmentName,
          status,
          startDate: currentWeek.start,
          endDate: currentWeek.end,
          periodType: 'weekly' as const,
        })
        commitmentCount++
      }
    }

    // Update weekly plan with project tracker IDs
    if (projectWeeklyTrackerIds.length > 0 && def.status === 'active') {
      const plan = await weeklyPlanDexieRepository.getById(weeklyPlanId)
      if (plan) {
        const existing = plan.selectedTrackerIds || []
        await weeklyPlanDexieRepository.update(weeklyPlanId, {
          selectedTrackerIds: [...new Set([...existing, ...projectWeeklyTrackerIds])],
        })
      }
    }
  }

  // Create past weekly plans so the Planning calendar shows all 6 past weeks
  const existingWeeklyPlans = await weeklyPlanDexieRepository.getAll()
  const existingWeekStarts = new Set(existingWeeklyPlans.map((p) => p.startDate))

  // Collect all project tracker IDs (for selectedTrackerIds on past plans)
  const allTrackers = await trackerDexieRepository.getAll()
  const allProjectTrackerIds = allTrackers
    .filter((t) => t.parentType === 'project' && t.isActive && t.cadence === 'weekly')
    .map((t) => t.id)

  // Template responses for past weeks to make them look complete
  const weeklyPlanTemplates = [
    { capacity: 'Good energy this week.', focus: 'Build momentum and close open loops.', adaptive: 'If overwhelmed, focus on the most important commitment.' },
    { capacity: 'Moderate capacity. Work picking up.', focus: 'Maintain habits and push one project forward.', adaptive: 'Protect morning routine if work gets busy.' },
    { capacity: 'Lower energy. Keep it simple.', focus: 'Finish what I started. No new projects.', adaptive: 'Scale back to essentials if needed.' },
    { capacity: 'Full energy. Ready to build.', focus: 'Set a strong foundation this week.', adaptive: 'If a commitment stalls, swap it for something small.' },
    { capacity: 'Balanced week ahead.', focus: 'Maintain habits and make steady progress.', adaptive: 'Rest early if fatigue shows up.' },
    { capacity: 'Social week — energy for people.', focus: 'Show up for relationships and community.', adaptive: 'If social energy runs low, opt for 1-on-1 over groups.' },
  ]

  let weeklyPlanCount = 0
  for (let i = 0; i < pastWeeks.length; i++) {
    const week = pastWeeks[i]
    if (existingWeekStarts.has(week.start)) continue

    const tmpl = weeklyPlanTemplates[i % weeklyPlanTemplates.length]
    await weeklyPlanDexieRepository.create({
      startDate: week.start,
      endDate: week.end,
      name: `Week of ${week.start}`,
      capacityNote: tmpl.capacity,
      focusSentence: tmpl.focus,
      adaptiveIntention: tmpl.adaptive,
      selectedTrackerIds: allProjectTrackerIds,
    })
    weeklyPlanCount++
  }
  if (weeklyPlanCount > 0) {
    console.log(`  Created ${weeklyPlanCount} past weekly plans`)
  }

  // Link projects to monthly plans (both current and previous)
  const allProjects = await projectDexieRepository.getAll()
  const activeProjectIds = allProjects
    .filter((p) => p.status === 'active' || p.status === 'planned')
    .map((p) => p.id)

  if (activeProjectIds.length > 0) {
    // Link active projects to current monthly plan
    await monthlyPlanDexieRepository.update(currentMonthlyPlanId, {
      projectIds: activeProjectIds,
    })

    // Link projects to previous monthly plan only if they reference it
    const prevMonthProjectIds = activeProjectIds.filter((id) => {
      const proj = allProjects.find((p) => p.id === id)
      return proj?.monthIds?.includes(previousMonthlyPlanId)
    })
    if (prevMonthProjectIds.length > 0) {
      await monthlyPlanDexieRepository.update(previousMonthlyPlanId, {
        projectIds: prevMonthProjectIds,
      })
    }
  }

  // Update active projects with weekly plan IDs in their focusWeekIds
  // This is crucial for the weekly planning wizard to show projects as "focused"
  console.log('Updating active projects with focusWeekIds...')
  const allWeeklyPlans = await weeklyPlanDexieRepository.getAll()
  const activeProjects = allProjects.filter((p) => p.status === 'active' || p.status === 'planned')

  for (const project of activeProjects) {
    // Active projects should be focused in all weeks where they have commitments or tracker data
    // For simplicity, focus them in all existing weekly plans (current + past weeks)
    const weeklyPlanIds = allWeeklyPlans.map((p) => p.id)

    if (weeklyPlanIds.length > 0) {
      await projectDexieRepository.update(project.id, {
        focusWeekIds: weeklyPlanIds,
      })
      console.log(`  ${project.name}: ${weeklyPlanIds.length} focused weeks`)
    }
  }

  const summary = `${projectCount} projects, ${trackerCount} trackers, ${periodCount} tracker periods, ${commitmentCount} commitments, ${weeklyPlanCount + 1} weekly plans`
  console.log(`Projects scenario: ${summary}`)
  return { summary, counts: { projects: projectCount, trackers: trackerCount, trackerPeriods: periodCount, commitments: commitmentCount, weeklyPlans: weeklyPlanCount + 1 } }
}

// ============================================================================
// 5. SEED WEEKLY PLANNING SCENARIO
// ============================================================================

export async function seedWeeklyPlanningScenario(): Promise<SeedResult> {
  console.log('Seeding weekly planning scenario...')
  const foundation = await ensureFoundation()

  // Ensure habits and projects exist
  const existingHabits = await habitDexieRepository.getAll()
  if (existingHabits.length === 0) {
    await seedHabitsScenario()
  }

  const existingProjects = await projectDexieRepository.getAll()
  if (existingProjects.length === 0) {
    await seedProjectsScenario()
  }

  // Ensure monthly plan
  await ensureCurrentMonthlyPlan()

  // Get all weekly tracker IDs for active projects + active habits
  const allTrackers = await trackerDexieRepository.getAll()
  const activeProjects = (await projectDexieRepository.getAll()).filter(
    (p) => p.status === 'active' || p.status === 'planned',
  )
  const activeHabits = (await habitDexieRepository.getAll()).filter(
    (h) => h.isActive && !h.isPaused,
  )
  const weeklyTrackerIds = allTrackers
    .filter(
      (t) =>
        t.cadence === 'weekly' &&
        ((t.parentType === 'project' && activeProjects.some((p) => p.id === t.parentId)) ||
         (t.parentType === 'habit' && activeHabits.some((h) => h.id === t.parentId)))
    )
    .map((t) => t.id)

  // Create/update the weekly plan with full details
  const weeklyPlanId = await ensureCurrentWeeklyPlan({
    capacityNote: 'Good energy this week. Ready to push forward.',
    focusSentence: 'Build on last week\'s wins and close one open loop.',
    adaptiveIntention: 'If a commitment stalls, swap it for something small and move on.',
    selectedTrackerIds: weeklyTrackerIds,
  })

  // Add standalone commitments for variety
  let commitmentCount = 0
  const currentWeekStart = getCurrentWeekStart()
  const currentWeekEnd = getCurrentWeekEnd()

  const standaloneCommitments = [
    { name: 'Coffee catch-up with Sarah', laKey: 'relationships', priKey: 'connection', status: 'planned' as const },
    { name: 'Read 30 min before bed', laKey: 'mind', priKey: 'nervous', status: 'done' as const },
  ]

  for (const sc of standaloneCommitments) {
    await commitmentDexieRepository.create({
      weeklyPlanId,
      lifeAreaIds: [foundation.lifeAreas[sc.laKey]].filter(Boolean),
      priorityIds: [foundation.priorities[sc.priKey]].filter(Boolean),
      name: sc.name,
      status: sc.status,
      startDate: currentWeekStart,
      endDate: currentWeekEnd,
      periodType: 'weekly' as const,
    })
    commitmentCount++
  }

  // Count total commitments for this week
  const allCommitments = await commitmentDexieRepository.getAll()
  const weekCommitments = allCommitments.filter(
    (c) => c.startDate === currentWeekStart && c.periodType === 'weekly',
  )

  const summary = `Weekly plan with ${weekCommitments.length} commitments, ${weeklyTrackerIds.length} selected trackers`
  console.log(`Weekly planning scenario: ${summary}`)
  return { summary, counts: { weeklyPlans: 1, commitments: commitmentCount, selectedTrackers: weeklyTrackerIds.length } }
}

// ============================================================================
// 6. SEED FULL TIMELINE
// ============================================================================

export async function seedFullTimeline(): Promise<SeedResult> {
  console.log('Seeding full timeline...')
  const foundation = await ensureFoundation()

  // Ensure all sub-scenarios
  await seedHabitsScenario()
  await seedProjectsScenario()
  await seedWeeklyPlanningScenario()

  let weeklyPlanCount = 0
  let monthlyPlanCount = 0
  let commitmentCount = 0
  let reflectionCount = 0

  const pastWeeks = getPastWeeks(8)
  const pastMonths = getPastMonths(3)

  // Collect weekly habit tracker IDs for past week plans
  const allTrackers = await trackerDexieRepository.getAll()
  const activeHabits = (await habitDexieRepository.getAll()).filter((h) => h.isActive && !h.isPaused)
  const weeklyHabitTrackerIds = allTrackers
    .filter((t) => t.parentType === 'habit' && t.cadence === 'weekly' && activeHabits.some((h) => h.id === t.parentId))
    .map((t) => t.id)

  // --- Past weekly plans ---
  const existingWeeklyPlans = await weeklyPlanDexieRepository.getAll()
  const existingWeekStarts = new Set(existingWeeklyPlans.map((p) => p.startDate))

  const weeklyTemplates = [
    { suffix: 'Fresh Start', capacity: 'Full energy. Ready to build.', focus: 'Set a strong foundation this week.', adaptive: 'If overwhelmed, pick just one priority.' },
    { suffix: 'Building Rhythm', capacity: 'Moderate capacity.', focus: 'Deepen habits and push one project forward.', adaptive: 'Protect morning routine if work gets busy.' },
    { suffix: 'Consolidation', capacity: 'Lower energy. Keep it simple.', focus: 'Finish what you started. No new projects.', adaptive: 'Scale back to essentials if needed.' },
    { suffix: 'Momentum', capacity: 'Good energy this week.', focus: 'Build on last week\'s wins.', adaptive: 'If a commitment stalls, swap it for something small.' },
    { suffix: 'Steady Progress', capacity: 'Balanced week ahead.', focus: 'Maintain habits and close one open loop.', adaptive: 'Rest early if fatigue shows up.' },
    { suffix: 'Connection Focus', capacity: 'Social week — energy for people.', focus: 'Show up for relationships and community.', adaptive: 'If social energy runs low, opt for 1-on-1 over groups.' },
    { suffix: 'Deep Work', capacity: 'Quiet week. Protect focus.', focus: 'Ship something meaningful.', adaptive: 'Block calendar and decline meetings.' },
    { suffix: 'Recovery', capacity: 'Coming off a big week. Rest needed.', focus: 'Recharge and reflect.', adaptive: 'Do the minimum. Energy first.' },
  ]

  for (let wi = 0; wi < pastWeeks.length; wi++) {
    const week = pastWeeks[wi]
    if (existingWeekStarts.has(week.start)) continue

    const tmpl = weeklyTemplates[wi % weeklyTemplates.length]
    const plan = await weeklyPlanDexieRepository.create({
      startDate: week.start,
      endDate: week.end,
      name: tmpl.suffix,
      capacityNote: tmpl.capacity,
      focusSentence: tmpl.focus,
      adaptiveIntention: tmpl.adaptive,
      selectedTrackerIds: weeklyHabitTrackerIds,
    })
    weeklyPlanCount++

    // Add 2-3 commitments per past week
    const commitmentNames = [
      'Focus on priority task',
      'Catch up with a friend',
      'Complete project milestone',
    ]
    for (let ci = 0; ci < commitmentNames.length; ci++) {
      const status: CommitmentStatus = ci === 0 ? 'done' : (wi % 3 === 0 && ci === 2 ? 'skipped' : 'done')
      await commitmentDexieRepository.create({
        weeklyPlanId: plan.id,
        lifeAreaIds: [foundation.lifeAreas[ci === 0 ? 'career' : ci === 1 ? 'relationships' : 'health']].filter(Boolean),
        priorityIds: [],
        name: commitmentNames[ci],
        status,
        startDate: week.start,
        endDate: week.end,
        periodType: 'weekly' as const,
      })
      commitmentCount++
    }
  }

  // --- Past monthly plans ---
  const existingMonthlyPlans = await monthlyPlanDexieRepository.getAll()
  const existingMonthStarts = new Set(existingMonthlyPlans.map((p) => p.startDate))

  const monthThemes = [
    'Build steadier health routines.',
    'Protect focused work and simplify execution.',
    'Recover attention and reconnect with people that matter.',
  ]

  for (let mi = 0; mi < pastMonths.length; mi++) {
    const month = pastMonths[mi]
    if (existingMonthStarts.has(month.start)) continue

    await monthlyPlanDexieRepository.create({
      startDate: month.start,
      endDate: month.end,
      year: month.year,
      name: month.name,
      monthIntention: monthThemes[mi % monthThemes.length],
      projectIds: [],
    })
    monthlyPlanCount++
  }

  // --- Yearly plan (current year) ---
  const currentYear = new Date().getFullYear()
  const existingYearlyPlans = await yearlyPlanDexieRepository.getAll()
  const hasYearlyPlan = existingYearlyPlans.some((p) => p.year === currentYear)

  if (!hasYearlyPlan) {
    await yearlyPlanDexieRepository.create({
      startDate: `${currentYear}-01-01`,
      endDate: `${currentYear}-12-31`,
      year: currentYear,
      name: `${currentYear} — Year of Momentum`,
      yearTheme: 'Momentum with kindness',
      yourStory: 'This is the year I stop waiting for perfect conditions. I show up consistently, share my work before it feels ready, and build a community around what matters to me.',
      fantasticDay: 'I wake up rested at 6:30. Morning run in the park, shower, healthy breakfast. Deep work on a project I care about until lunch. Afternoon walk with a friend. Evening cooking dinner while listening to music.',
      lifeAreaNarratives: {
        [foundation.lifeAreas.health]: 'Deepen the running habit — faster times, more consistent movement, and better fuel.',
        [foundation.lifeAreas.career]: 'Portfolio is live. Now it\'s about deep work: protecting focus blocks and shipping quality stories.',
        [foundation.lifeAreas.relationships]: 'The area I most want to grow. Community dinners, regular friend catch-ups, and being more present.',
        [foundation.lifeAreas.mind]: 'Meditation started recently. This year I want it to be as natural as brushing my teeth.',
        [foundation.lifeAreas.home]: 'Simple systems: weekly budget review, tidy space, automated bills.',
      },
    })
  }

  // --- Reflections ---
  // Weekly reflections for past weeks
  const allWeeklyPlans = await weeklyPlanDexieRepository.getAll()
  const existingReflections = await weeklyReflectionDexieRepository.getAll()
  const reflectedPlanIds = new Set(existingReflections.map((r) => r.weeklyPlanId))

  const reflectionPool = {
    whatHelped: [
      'Morning routine is becoming automatic.',
      'Time-blocked mornings and Sunday prep.',
      'Having a concrete event to work toward.',
      'Running in the morning set a positive tone.',
      'Journaling before bed helped process the day.',
    ],
    whatGotInTheWay: [
      'Work meetings ate into deep-work time.',
      'Late nights disrupted morning routine.',
      'Too many parallel commitments.',
      'Low energy from poor sleep.',
      'Procrastination on the hard task.',
    ],
    whatILearned: [
      'Starting small works better than ambitious plans.',
      'Consistency matters more than intensity.',
      'Rest is productive when done intentionally.',
      'Energy management > time management.',
      'Progress is not linear — bad weeks are data, not failure.',
    ],
    nextWeekSeed: [
      'Build on running momentum.',
      'Protect deep work blocks.',
      'Simplify — fewer commitments, more presence.',
      'Try a new meditation technique.',
      'Focus on one thing per day, not five.',
    ],
  }

  const currentWeekStart = getCurrentWeekStart()
  const pastPlans = allWeeklyPlans.filter((p) => p.startDate < currentWeekStart)
  for (let i = 0; i < pastPlans.length; i++) {
    const plan = pastPlans[i]
    if (reflectedPlanIds.has(plan.id)) continue

    await weeklyReflectionDexieRepository.create({
      weeklyPlanId: plan.id,
      completedAt: new Date(`${plan.endDate}T20:00:00`).toISOString(),
      whatHelped: reflectionPool.whatHelped[i % reflectionPool.whatHelped.length],
      whatGotInTheWay: reflectionPool.whatGotInTheWay[i % reflectionPool.whatGotInTheWay.length],
      whatILearned: reflectionPool.whatILearned[i % reflectionPool.whatILearned.length],
      nextWeekSeed: reflectionPool.nextWeekSeed[i % reflectionPool.nextWeekSeed.length],
    })
    reflectionCount++
  }

  // Monthly reflections for past months
  const allMonthlyPlans = await monthlyPlanDexieRepository.getAll()
  const allProjectsForReflection = await projectDexieRepository.getAll()
  const existingMonthlyReflections = await monthlyReflectionDexieRepository.getAll()
  const reflectedMonthPlanIds = new Set(existingMonthlyReflections.map((r) => r.monthlyPlanId))
  const currentMonthStart = getCurrentMonthStart()

  const pastMonthPlans = allMonthlyPlans.filter((p) => p.startDate < currentMonthStart)
  const monthlyReflectionData = [
    {
      wins: ['Running habit solid', 'Deep work blocks established'],
      challenges: ['Too many parallel projects'],
      learnings: ['Less is more'],
      adjustments: 'Reduce project load.',
    },
    {
      wins: ['Meditation 5x/week achieved', 'Portfolio updated'],
      challenges: ['Holiday disruptions'],
      learnings: ['Consistency beats intensity'],
      adjustments: 'Plan for disruptions.',
    },
    {
      wins: ['Community dinner hosted', 'Sleep improved'],
      challenges: ['End-of-month fatigue'],
      learnings: ['Energy management is key'],
      adjustments: 'Schedule recovery time.',
    },
  ]

  for (let i = 0; i < pastMonthPlans.length; i++) {
    const plan = pastMonthPlans[i]
    if (reflectedMonthPlanIds.has(plan.id)) continue

    const data = monthlyReflectionData[i % monthlyReflectionData.length]
    const inScopeProjects = allProjectsForReflection.filter((project) =>
      (project.monthIds ?? []).includes(plan.id)
    )

    const useStructuredFields = i % 2 === 0

    const reviewLifeAreaIds = Array.from(
      new Set(inScopeProjects.flatMap((project) => project.lifeAreaIds ?? []))
    )

    await monthlyReflectionDexieRepository.create({
      monthlyPlanId: plan.id,
      completedAt: new Date(`${plan.endDate}T20:00:00`).toISOString(),
      wins: data.wins,
      challenges: data.challenges,
      learnings: data.learnings,
      adjustments: data.adjustments,
      ...(useStructuredFields
        ? {
            directionRatings: {
              projects: 4,
              priorities: 4,
              relationships: 3,
              meaning: 4,
              impact: 3,
              stuckness: 2,
            },
            focusAreaReview: reviewLifeAreaIds.slice(0, 2).map((lifeAreaId, index) => ({
              lifeAreaId,
              progress: index === 0 ? 4 : 2,
              deteriorated: index > 0,
              note:
                index === 0
                  ? 'This area moved forward with steady effort.'
                  : 'Attention drifted due to work pressure.',
            })),
            projectReviews: inScopeProjects.slice(0, 2).map((project, index) => ({
              projectId: project.id,
              progress: index === 0 ? 4 : 2,
              decision: index === 0 ? ('continue' as const) : ('rescope' as const),
              note:
                index === 0
                  ? 'Momentum is solid, keep the current cadence.'
                  : 'Scope needs reduction to avoid overload.',
            })),
            weeklyDigest: {
              weeklyPlanIds: [],
              reflectedWeeks: 0,
              commitmentCompletion: {
                done: 0,
                skipped: 0,
                planned: 0,
              },
            },
            courseCorrection: {
              start: ['Protect two deep-work blocks each week.'],
              stop: ['Starting new initiatives mid-month.'],
              continue: ['Weekly planning and reflection cadence.'],
              ifThenPlan:
                'If I feel spread thin by week two, then I will pause one low-impact project.',
            },
          }
        : {}),
    })
    reflectionCount++
  }

  // --- Self-discovery exercises ---
  const existingWol = await wheelOfLifeSnapshotDexieRepository.getAll()
  if (existingWol.length === 0) {
    await wheelOfLifeSnapshotDexieRepository.create({
      areas: [
        { name: 'Health & Fitness', rating: 7, note: 'Running habit established!', lifeAreaId: foundation.lifeAreas.health },
        { name: 'Career & Work', rating: 8, note: 'Portfolio live, new opportunities', lifeAreaId: foundation.lifeAreas.career },
        { name: 'Finances', rating: 6, lifeAreaId: foundation.lifeAreas.home },
        { name: 'Relationships', rating: 6, note: 'Better but want more community', lifeAreaId: foundation.lifeAreas.relationships },
        { name: 'Family', rating: 7 },
        { name: 'Personal Growth', rating: 8, note: 'Meditation practice starting', lifeAreaId: foundation.lifeAreas.mind },
        { name: 'Fun & Recreation', rating: 5, note: 'Improving with running outdoors' },
        { name: 'Physical Environment', rating: 6 },
      ],
      notes: 'Health improved dramatically. Relationships is the growth edge.',
    })
  }

  const existingValues = await valuesDiscoveryDexieRepository.getAll()
  if (existingValues.length === 0) {
    await valuesDiscoveryDexieRepository.create({
      admirablePeople: [
        { name: 'Bren\u00e9 Brown', qualities: ['Vulnerability', 'Courage', 'Authenticity'] },
        { name: 'My grandmother', qualities: ['Patience', 'Generosity', 'Resilience'] },
        { name: 'A former mentor', qualities: ['Clarity', 'Kindness', 'Discipline'] },
      ],
      coreValues: ['Authenticity', 'Courage', 'Generosity', 'Clarity', 'Resilience'],
      notes: 'These values feel true. Courage and authenticity keep showing up.',
    })
  }

  const existingShadow = await shadowBeliefsDexieRepository.getAll()
  if (existingShadow.length === 0) {
    await shadowBeliefsDexieRepository.create({
      selfSabotagingBeliefs: [
        'I need to be perfect before sharing my work',
        'Rest is laziness',
        'If I slow down, I\'ll fall behind',
      ],
      adviceToOthers: [
        'Done is better than perfect',
        'Rest is productive',
        'You can\'t pour from an empty cup',
      ],
      reframedBeliefs: [
        'Sharing imperfect work creates connection and feedback',
        'Rest rebuilds my capacity to do meaningful work',
        'Slowing down lets me move with intention, not just speed',
      ],
      notes: 'The perfectionism pattern is strong. Working on it.',
    })
  }

  const existingPurpose = await transformativePurposeDexieRepository.getAll()
  if (existingPurpose.length === 0) {
    await transformativePurposeDexieRepository.create({
      curiosities: [
        'How people build lasting habits',
        'The intersection of design and wellbeing',
        'Community building in digital spaces',
        'Mindfulness in everyday life',
        'Making self-reflection accessible',
      ],
      intersection: 'Designing tools that help people live more intentionally',
      problems: [
        'People feel overwhelmed by self-improvement advice',
        'Reflection tools are either too simple or too complex',
        'Digital wellness apps lack warmth and personality',
        'Communities struggle to maintain authentic connection online',
        'People abandon habits because systems don\'t adapt to real life',
      ],
      purposeStatement: 'I help people build intentional lives through thoughtful, human-centered tools that adapt to the messiness of real life.',
      notes: 'This feels provisional but directionally right.',
    })
  }

  const summary = `${weeklyPlanCount} weekly plans, ${monthlyPlanCount} monthly plans, ${commitmentCount} commitments, ${reflectionCount} reflections, exercises seeded`
  console.log(`Full timeline: ${summary}`)
  return {
    summary,
    counts: {
      weeklyPlans: weeklyPlanCount,
      monthlyPlans: monthlyPlanCount,
      commitments: commitmentCount,
      reflections: reflectionCount,
    },
  }
}

// ============================================================================
// DEBUG HELPER
// ============================================================================

/**
 * Debug helper: Check weekly plan data integrity
 * Call from browser console: window.debugWeeklyPlanData(startDate)
 *
 * Example: await window.debugWeeklyPlanData('2026-02-02')
 */
export async function debugWeeklyPlanData(startDate: string): Promise<void> {
  const db = getUserDatabase()

  // Find the weekly plan for this date
  const plans = await db.weeklyPlans.filter((p) => p.startDate === startDate).toArray()
  console.log(`\n=== Weekly Plan Debug for ${startDate} ===`)
  console.log('Plans found:', plans.length)

  if (plans.length === 0) {
    console.log('No plan found for this date')
    return
  }

  const plan = plans[0]
  console.log('\nPlan details:')
  console.log('  ID:', plan.id)
  console.log('  Name:', plan.name)
  console.log('  selectedTrackerIds:', plan.selectedTrackerIds?.length ?? 0, 'trackers')

  // Find projects with this plan in their focusWeekIds
  const allProjects = await db.projects.toArray()
  const focusedProjects = allProjects.filter(
    (p) => p.focusWeekIds && p.focusWeekIds.includes(plan.id)
  )

  console.log('\nProjects with this week in focusWeekIds:', focusedProjects.length)
  for (const project of focusedProjects) {
    console.log(`  - ${project.name} (${project.status})`)
    console.log(`    focusWeekIds count: ${project.focusWeekIds?.length ?? 0}`)
  }

  // Check trackers for these projects
  const allTrackers = await db.trackers.toArray()
  const projectTrackers = focusedProjects.flatMap((project) =>
    allTrackers.filter(
      (t) => t.parentType === 'project' && t.parentId === project.id && t.cadence === 'weekly'
    )
  )

  console.log('\nWeekly trackers for focused projects:', projectTrackers.length)
  for (const tracker of projectTrackers) {
    const isSelected = plan.selectedTrackerIds?.includes(tracker.id)
    console.log(`  - ${tracker.name} (${isSelected ? 'SELECTED' : 'not selected'})`)
  }

  // Check if tracker periods exist
  const trackerPeriods = await db.trackerPeriods
    .filter((tp) => tp.startDate === startDate)
    .toArray()

  console.log('\nTracker periods for this week:', trackerPeriods.length)

  console.log('\n=== End Debug ===\n')
}

// ============================================================================
// WINDOW EXPORTS (for browser console access)
// ============================================================================

if (typeof window !== 'undefined') {
  const w = window as unknown as Record<string, unknown>
  w.seedFoundation = seedFoundation
  w.seedHabits = seedHabitsScenario
  w.seedProjects = seedProjectsScenario
  w.seedWeeklyPlanning = seedWeeklyPlanningScenario
  w.seedFullTimeline = seedFullTimeline
  w.clearAllData = clearAllData
  w.clearPlanningData = clearPlanningData
  w.debugWeeklyPlanData = debugWeeklyPlanData
}
