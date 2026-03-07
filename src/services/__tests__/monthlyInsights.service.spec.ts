import { describe, expect, it } from 'vitest'
import type {
  Commitment,
  MonthlyPlan,
  Project,
  Tracker,
  TrackerPeriod,
  WeeklyPlan,
} from '@/domain/planning'
import type { WeeklyReflection } from '@/domain/reflection'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import { buildMonthlyInsights } from '@/services/monthlyInsights.service'

const baseTimestamp = '2026-03-01T00:00:00.000Z'

function monthlyPlan(overrides: Partial<MonthlyPlan> = {}): MonthlyPlan {
  return {
    id: 'month-1',
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    year: 2026,
    secondaryFocusLifeAreaIds: [],
    projectIds: [],
    ...overrides,
  }
}

function weeklyPlan(id: string, startDate: string, endDate: string): WeeklyPlan {
  return {
    id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    startDate,
    endDate,
  }
}

function weeklyReflection(
  weeklyPlanId: string,
  demand: number,
  state: number
): WeeklyReflection {
  return {
    id: `reflection-${weeklyPlanId}`,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    weeklyPlanId,
    completedAt: `${weeklyPlanId}-done`,
    whatHelped: `Helped ${weeklyPlanId}`,
    whatGotInTheWay: `Blocked ${weeklyPlanId}`,
    whatILearned: `Learned ${weeklyPlanId}`,
    batterySnapshot: {
      body: { demand, state },
      mind: { demand, state },
      emotion: { demand, state },
      social: { demand, state },
    },
  }
}

function commitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: crypto.randomUUID(),
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    startDate: '2026-03-03',
    endDate: '2026-03-09',
    periodType: 'weekly',
    lifeAreaIds: [],
    priorityIds: [],
    name: 'Commitment',
    status: 'planned',
    ...overrides,
  }
}

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    lifeAreaIds: [],
    priorityIds: [],
    monthIds: ['month-1'],
    name: 'Project One',
    status: 'active',
    ...overrides,
  }
}

function tracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    parentType: 'project',
    parentId: 'project-1',
    lifeAreaIds: [],
    priorityIds: [],
    name: 'Tracker One',
    type: 'count',
    cadence: 'weekly',
    targetCount: 4,
    sortOrder: 0,
    isActive: true,
    ...overrides,
  }
}

function trackerPeriod(overrides: Partial<TrackerPeriod> = {}): TrackerPeriod {
  return {
    id: crypto.randomUUID(),
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    trackerId: 'tracker-1',
    startDate: '2026-03-03',
    endDate: '2026-03-09',
    periodTarget: 4,
    ticks: [
      { index: 0, completed: true },
      { index: 1, completed: true },
      { index: 2, completed: false },
      { index: 3, completed: false },
    ],
    ...overrides,
  }
}

function journalEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: crypto.randomUUID(),
    title: 'Journal',
    body: 'Entry body',
    createdAt: '2026-03-15T10:00:00.000Z',
    updatedAt: '2026-03-15T10:00:00.000Z',
    emotionIds: ['emotion-a'],
    peopleTagIds: ['person-a'],
    contextTagIds: ['context-a'],
    chatSessions: [],
    ...overrides,
  }
}

function emotionLog(overrides: Partial<EmotionLog> = {}): EmotionLog {
  return {
    id: crypto.randomUUID(),
    createdAt: '2026-03-16T10:00:00.000Z',
    updatedAt: '2026-03-16T10:00:00.000Z',
    emotionIds: ['emotion-a'],
    peopleTagIds: ['person-a'],
    contextTagIds: ['context-a'],
    note: 'Emotion note',
    ...overrides,
  }
}

describe('buildMonthlyInsights', () => {
  it('includes weekly plans by overlap and computes battery averages', () => {
    const result = buildMonthlyInsights({
      monthlyPlan: monthlyPlan(),
      weeklyPlans: [
        weeklyPlan('week-overlap-left', '2026-02-24', '2026-03-02'),
        weeklyPlan('week-inside', '2026-03-03', '2026-03-09'),
        weeklyPlan('week-overlap-right', '2026-03-30', '2026-04-05'),
        weeklyPlan('week-outside', '2026-04-06', '2026-04-12'),
      ],
      weeklyReflections: [
        weeklyReflection('week-overlap-left', 4, 3),
        weeklyReflection('week-inside', 2, 5),
      ],
      commitments: [],
      projects: [],
      trackers: [],
      trackerPeriods: [],
      journalEntries: [],
      emotionLogs: [],
    })

    expect(result.weeklyPlanIdsInMonth).toEqual([
      'week-overlap-left',
      'week-inside',
      'week-overlap-right',
    ])
    expect(result.reflectedWeeks).toBe(2)
    expect(result.batteryAverages?.body.demand).toBe(3)
    expect(result.batteryAverages?.body.state).toBe(4)
  })

  it('aggregates commitment completion and tracker-based project signals', () => {
    const result = buildMonthlyInsights({
      monthlyPlan: monthlyPlan(),
      weeklyPlans: [weeklyPlan('week-inside', '2026-03-03', '2026-03-09')],
      weeklyReflections: [],
      commitments: [
        commitment({ weeklyPlanId: 'week-inside', status: 'done', lifeAreaIds: ['la-1'] }),
        commitment({ weeklyPlanId: 'week-inside', status: 'done', lifeAreaIds: ['la-1'] }),
        commitment({ weeklyPlanId: 'week-inside', status: 'skipped', lifeAreaIds: ['la-1'] }),
        commitment({ weeklyPlanId: 'week-inside', status: 'planned' }),
      ],
      projects: [project()],
      trackers: [tracker()],
      trackerPeriods: [trackerPeriod()],
      journalEntries: [],
      emotionLogs: [],
    })

    expect(result.commitmentCompletion).toEqual({ done: 2, skipped: 1, planned: 1 })
    expect(result.projectSignals).toHaveLength(1)
    expect(result.projectSignals[0].trackerCompletionPercent).toBe(50)
    expect(result.deterioratingLifeAreaIds).toEqual([])
  })

  it('handles empty inputs and keeps stable defaults', () => {
    const result = buildMonthlyInsights({
      monthlyPlan: monthlyPlan(),
      weeklyPlans: [],
      weeklyReflections: [],
      commitments: [],
      projects: [],
      trackers: [],
      trackerPeriods: [],
      journalEntries: [journalEntry()],
      emotionLogs: [emotionLog()],
    })

    expect(result.weekCards).toEqual([])
    expect(result.reflectedWeeks).toBe(0)
    expect(result.batteryAverages).toBeUndefined()
    expect(result.commitmentCompletion).toEqual({ done: 0, skipped: 0, planned: 0 })
    expect(result.topEmotionIds[0]).toBe('emotion-a')
    expect(result.summarySuggestions.wins.length).toBeGreaterThanOrEqual(0)
  })
})
