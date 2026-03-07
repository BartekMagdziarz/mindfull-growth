import { describe, it, expect } from 'vitest'
import { generateHabitItems } from '@/services/habitGeneration.service'
import type { Habit } from '@/domain/habit'
import type { HabitGenerationInput } from '@/services/habitGeneration.service'

const baseTimestamp = '2026-01-01T00:00:00.000Z'

function buildHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    createdAt: baseTimestamp,
    updatedAt: baseTimestamp,
    name: 'Daily Walk',
    isActive: true,
    isPaused: false,
    cadence: 'weekly',
    lifeAreaIds: [],
    priorityIds: [],
    ...overrides,
  }
}

function buildInput(overrides: Partial<HabitGenerationInput> = {}): HabitGenerationInput {
  return {
    habits: [],
    periodStartDate: '2026-01-05',
    periodEndDate: '2026-01-11',
    periodCadence: 'weekly',
    occurrences: [],
    suppressedOccurrences: [],
    ...overrides,
  }
}

describe('habitGeneration.service', () => {
  it('returns eligible weekly habits for a weekly period', () => {
    const habit = buildHabit({ id: 'habit-weekly', cadence: 'weekly' })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
      })
    )

    expect(result.eligibleHabits).toHaveLength(1)
    expect(result.eligibleHabits[0].habitId).toBe('habit-weekly')
    expect(result.eligibleHabits[0].periodStartDate).toBe('2026-01-05')
    expect(result.eligibleHabits[0].periodEndDate).toBe('2026-01-11')
  })

  it('excludes habits whose cadence does not match the period cadence', () => {
    const weeklyHabit = buildHabit({ id: 'habit-weekly', cadence: 'weekly' })
    const monthlyHabit = buildHabit({ id: 'habit-monthly', cadence: 'monthly' })

    const result = generateHabitItems(
      buildInput({
        habits: [weeklyHabit, monthlyHabit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
      })
    )

    expect(result.eligibleHabits).toHaveLength(1)
    expect(result.eligibleHabits[0].habitId).toBe('habit-weekly')
  })

  it('skips paused habits', () => {
    const habit = buildHabit({ id: 'habit-paused', isPaused: true })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
      })
    )

    expect(result.eligibleHabits).toHaveLength(0)
  })

  it('skips inactive habits', () => {
    const habit = buildHabit({ id: 'habit-inactive', isActive: false })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
      })
    )

    expect(result.eligibleHabits).toHaveLength(0)
  })

  it('skips habits with a suppressed occurrence for the period', () => {
    const habit = buildHabit({ id: 'habit-1' })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
        suppressedOccurrences: [{ habitId: 'habit-1', periodStartDate: '2026-01-05' }],
      })
    )

    expect(result.eligibleHabits).toHaveLength(0)
  })

  it('skips habits with a skipped occurrence for the period', () => {
    const habit = buildHabit({ id: 'habit-1' })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-05',
        periodEndDate: '2026-01-11',
        periodCadence: 'weekly',
        occurrences: [
          {
            id: 'occ-1',
            createdAt: baseTimestamp,
            updatedAt: baseTimestamp,
            habitId: 'habit-1',
            periodType: 'weekly',
            periodStartDate: '2026-01-05',
            status: 'skipped',
          },
        ],
      })
    )

    expect(result.eligibleHabits).toHaveLength(0)
  })

  it('returns monthly habits for a monthly period', () => {
    const habit = buildHabit({ id: 'habit-monthly', cadence: 'monthly' })

    const result = generateHabitItems(
      buildInput({
        habits: [habit],
        periodStartDate: '2026-01-01',
        periodEndDate: '2026-01-31',
        periodCadence: 'monthly',
      })
    )

    expect(result.eligibleHabits).toHaveLength(1)
    expect(result.eligibleHabits[0].habitId).toBe('habit-monthly')
  })
})
