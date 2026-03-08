import { describe, expect, it } from 'vitest'
import {
  buildTodayFocusChains,
  buildTodayPriorityCompass,
  buildTodayProgressLanes,
  buildTodaySupportState,
} from '@/composables/useTodayGrounding'
import type { LifeArea } from '@/domain/lifeArea'
import type { Habit } from '@/domain/habit'
import type {
  Commitment,
  MonthlyPlan,
  Priority,
  Project,
  Tracker,
  WeeklyPlan,
} from '@/domain/planning'

function buildLifeArea(overrides: Partial<LifeArea> = {}): LifeArea {
  return {
    id: 'life-area-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Relationships',
    measures: [],
    reviewCadence: 'monthly',
    isActive: true,
    sortOrder: 0,
    ...overrides,
  }
}

function buildPriority(overrides: Partial<Priority> = {}): Priority {
  return {
    id: 'priority-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lifeAreaIds: ['life-area-1'],
    year: 2026,
    name: 'Strengthen family routines',
    successSignals: [],
    isActive: true,
    sortOrder: 0,
    ...overrides,
  }
}

function buildProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 'project-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lifeAreaIds: ['life-area-1'],
    priorityIds: ['priority-1'],
    monthIds: ['month-1'],
    name: 'Weekly family rhythm',
    status: 'active',
    ...overrides,
  }
}

function buildCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'commitment-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    startDate: '2026-03-02',
    endDate: '2026-03-08',
    periodType: 'weekly',
    weeklyPlanId: 'week-1',
    lifeAreaIds: ['life-area-1'],
    priorityIds: ['priority-1'],
    name: 'Plan one evening together',
    status: 'planned',
    ...overrides,
  }
}

function buildMonthlyPlan(overrides: Partial<MonthlyPlan> = {}): MonthlyPlan {
  return {
    id: 'month-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    year: 2026,
    secondaryFocusLifeAreaIds: [],
    projectIds: [],
    ...overrides,
  }
}

function buildWeeklyPlan(overrides: Partial<WeeklyPlan> = {}): WeeklyPlan {
  return {
    id: 'week-1',
    createdAt: '2026-03-02T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
    startDate: '2026-03-02',
    endDate: '2026-03-08',
    ...overrides,
  }
}

function buildTracker(overrides: Partial<Tracker> = {}): Tracker {
  return {
    id: 'tracker-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    parentType: 'project',
    parentId: 'project-1',
    lifeAreaIds: ['life-area-1'],
    priorityIds: ['priority-1'],
    name: 'Progress',
    type: 'count',
    cadence: 'weekly',
    sortOrder: 0,
    isActive: true,
    ...overrides,
  }
}

function buildHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    name: 'Family reset',
    isActive: true,
    isPaused: false,
    cadence: 'monthly',
    lifeAreaIds: ['life-area-1'],
    priorityIds: ['priority-1'],
    ...overrides,
  }
}

describe('buildTodayFocusChains', () => {
  it('ranks weekly-linked projects ahead of month-linked and priority-only chains', () => {
    const lifeAreas = [buildLifeArea()]
    const priorities = [
      buildPriority({ id: 'priority-week', name: 'Weekly priority', sortOrder: 0 }),
      buildPriority({ id: 'priority-month', name: 'Monthly priority', sortOrder: 1 }),
      buildPriority({ id: 'priority-only', name: 'Priority only', sortOrder: 2 }),
    ]

    const projects = [
      buildProject({
        id: 'project-week',
        priorityIds: ['priority-week'],
        focusWeekIds: ['week-1'],
        monthIds: [],
      }),
      buildProject({
        id: 'project-month',
        priorityIds: ['priority-month'],
        monthIds: ['month-1'],
      }),
    ]

    const commitments = [
      buildCommitment({ id: 'commitment-week', priorityIds: ['priority-week'], projectId: 'project-week' }),
      buildCommitment({ id: 'commitment-month', priorityIds: ['priority-month'], projectId: undefined }),
    ]

    const chains = buildTodayFocusChains({
      currentMonthPlan: buildMonthlyPlan(),
      currentWeekPlan: buildWeeklyPlan(),
      priorities,
      projects,
      commitments,
      lifeAreas,
    })

    expect(chains.map((chain) => chain.priority.id)).toEqual([
      'priority-week',
      'priority-month',
      'priority-only',
    ])
  })
})

describe('buildTodayPriorityCompass', () => {
  it('keeps incomplete projects before completed ones for a priority', () => {
    const items = buildTodayPriorityCompass({
      currentMonthPlan: buildMonthlyPlan(),
      currentWeekPlan: buildWeeklyPlan(),
      priorities: [buildPriority()],
      projects: [
        buildProject({ id: 'project-active', name: 'Active project', status: 'active', focusWeekIds: ['week-1'] }),
        buildProject({ id: 'project-done', name: 'Done project', status: 'completed' }),
      ],
      lifeAreas: [buildLifeArea()],
      commitments: [buildCommitment({ projectId: 'project-active' })],
    })

    expect(items).toHaveLength(1)
    expect(items[0].projectSignals.map((project) => project.id)).toEqual([
      'project-active',
      'project-done',
    ])
    expect(items[0].projectSignals[1].isDone).toBe(true)
  })
})

describe('buildTodayProgressLanes', () => {
  it('separates weekly and monthly trackers into matching lanes', () => {
    const lanes = buildTodayProgressLanes({
      currentWeekPlan: buildWeeklyPlan({ selectedTrackerIds: ['tracker-weekly'] }),
      currentMonthPlan: buildMonthlyPlan({ selectedTrackerIds: ['tracker-monthly', 'tracker-habit'] }),
      projects: [buildProject({ id: 'project-1', focusWeekIds: ['week-1'] })],
      trackers: [
        buildTracker({ id: 'tracker-weekly', cadence: 'weekly' }),
        buildTracker({ id: 'tracker-monthly', cadence: 'monthly' }),
        buildTracker({
          id: 'tracker-habit',
          cadence: 'monthly',
          parentType: 'habit',
          parentId: 'habit-1',
        }),
      ],
      commitments: [buildCommitment({ projectId: 'project-1' })],
      habits: [buildHabit()],
      now: new Date('2026-03-07T10:00:00.000Z'),
    })

    expect(lanes[0].cadence).toBe('weekly')
    expect(lanes[0].items.map((item) => item.id)).toEqual(['tracker-weekly'])
    expect(lanes[1].cadence).toBe('monthly')
    expect(lanes[1].items.map((item) => item.id)).toEqual(['tracker-monthly', 'tracker-habit'])
  })
})

describe('buildTodaySupportState', () => {
  it('prefers adaptive intention as the primary reminder before reflections and recommendations', () => {
    const state = buildTodaySupportState({
      now: new Date('2026-03-07T10:00:00.000Z'),
      currentWeekPlan: buildWeeklyPlan({ adaptiveIntention: 'Slow down when the week gets noisy.' }),
      todayJournalCount: 0,
      hasTodayJournal: false,
      todayEmotionCount: 1,
      emotionTarget: 3,
      reflectionBadges: [
        { key: 'weekly', isDue: true },
        { key: 'monthly', isDue: false },
        { key: 'yearly', isDue: false },
      ],
      recommendations: [
        {
          id: 'rec-1',
          title: 'Thought Record',
          description: 'Untangle stress.',
          route: '/exercises/thought-record',
          modality: 'cbt',
          tone: 'regulation',
          whyNow: 'Because things feel activated.',
          score: 1,
        },
      ],
      ifsPartCount: 1,
      ifsDoneToday: false,
      ifsWeeklyCheckInCount: 2,
    })

    expect(state.primaryReminder?.kind).toBe('adaptive')
    expect(state.primaryReminder?.description).toContain('Slow down')
  })
})
