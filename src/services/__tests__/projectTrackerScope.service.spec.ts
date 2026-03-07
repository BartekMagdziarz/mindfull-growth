import { describe, it, expect } from 'vitest'
import type { Commitment, Project } from '@/domain/planning'
import {
  resolveEntryDateWithinPeriod,
  resolveMonthlyTrackerProjects,
  resolveWeeklyTrackerProjects,
} from '@/services/projectTrackerScope.service'

const baseTimestamp = '2026-02-01T00:00:00.000Z'

function buildProject(params: {
  id: string
  monthIds?: string[]
  focusWeekIds?: string[]
  focusMonthIds?: string[]
}): Project {
  return {
    id: params.id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    lifeAreaIds: [],
    priorityIds: [],
    monthIds: params.monthIds ?? [],
    name: `Project ${params.id}`,
    status: 'active',
    focusWeekIds: params.focusWeekIds ?? [],
    focusMonthIds: params.focusMonthIds ?? [],
  }
}

function buildCommitment(params: {
  id: string
  periodType: 'weekly' | 'monthly'
  startDate: string
  endDate: string
  weeklyPlanId?: string
  monthlyPlanId?: string
  projectId?: string
}): Commitment {
  return {
    id: params.id,
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    startDate: params.startDate,
    endDate: params.endDate,
    periodType: params.periodType,
    weeklyPlanId: params.weeklyPlanId,
    monthlyPlanId: params.monthlyPlanId,
    projectId: params.projectId,
    lifeAreaIds: [],
    priorityIds: [],
    name: `Commitment ${params.id}`,
    status: 'planned',
  }
}

describe('projectTrackerScope.service', () => {
  it('returns weekly projects that are focused or linked by weekly commitments', () => {
    const projects = [
      buildProject({ id: 'p-focused', focusWeekIds: ['week-1'] }),
      buildProject({ id: 'p-linked' }),
      buildProject({ id: 'p-other' }),
    ]

    const commitments = [
      buildCommitment({
        id: 'c-1',
        periodType: 'weekly',
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        weeklyPlanId: 'week-1',
        projectId: 'p-linked',
      }),
      buildCommitment({
        id: 'c-2',
        periodType: 'weekly',
        startDate: '2026-01-26',
        endDate: '2026-02-01',
        weeklyPlanId: 'week-0',
        projectId: 'p-other',
      }),
    ]

    const result = resolveWeeklyTrackerProjects({
      projects,
      commitments,
      weeklyPlanId: 'week-1',
      startDate: '2026-02-02',
      endDate: '2026-02-08',
    })

    expect(result.map((project) => project.id)).toEqual(['p-focused', 'p-linked'])
  })

  it('returns monthly projects that are focused, linked to the plan month, or linked by monthly commitments', () => {
    const projects = [
      buildProject({ id: 'p-month-linked', monthIds: ['month-2'] }),
      buildProject({ id: 'p-focused', focusMonthIds: ['month-2'] }),
      buildProject({ id: 'p-linked' }),
      buildProject({ id: 'p-other' }),
    ]

    const commitments = [
      buildCommitment({
        id: 'c-1',
        periodType: 'monthly',
        startDate: '2026-02-01',
        endDate: '2026-02-28',
        monthlyPlanId: 'month-2',
        projectId: 'p-linked',
      }),
      buildCommitment({
        id: 'c-2',
        periodType: 'monthly',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        monthlyPlanId: 'month-1',
        projectId: 'p-other',
      }),
    ]

    const result = resolveMonthlyTrackerProjects({
      projects,
      commitments,
      monthlyPlanId: 'month-2',
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    })

    expect(result.map((project) => project.id)).toEqual([
      'p-month-linked',
      'p-focused',
      'p-linked',
    ])
  })

  it('returns today when reference date is inside period bounds', () => {
    const value = resolveEntryDateWithinPeriod(
      '2026-02-02',
      '2026-02-08',
      new Date(2026, 1, 4)
    )

    expect(value).toBe('2026-02-04')
  })

  it('clamps to period end date when reference date is outside period bounds', () => {
    const beforePeriod = resolveEntryDateWithinPeriod(
      '2026-02-02',
      '2026-02-08',
      new Date(2026, 0, 30)
    )

    const afterPeriod = resolveEntryDateWithinPeriod(
      '2026-02-02',
      '2026-02-08',
      new Date(2026, 1, 20)
    )

    expect(beforePeriod).toBe('2026-02-08')
    expect(afterPeriod).toBe('2026-02-08')
  })
})
