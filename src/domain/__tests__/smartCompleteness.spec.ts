import { describe, expect, it } from 'vitest'
import { computeSmartCompleteness } from '@/domain/smartCompleteness'

describe('computeSmartCompleteness', () => {
  const completeGoal = {
    title: 'Run 10K race',
    description: 'Complete a 10K in under 60 min',
    successDefinition: 'Finished in <60 min',
    whyMatters: 'Health',
    confidenceRating: 7,
    obstacles: 'Travel',
    resources: 'Coach',
    priorityIds: ['p1'],
    lifeAreaIds: ['la1'],
    targetDate: '2026-12-31',
  }

  it('returns score 5 and no missing letters when fully SMART', () => {
    const result = computeSmartCompleteness(completeGoal, 2)
    expect(result.S).toBe(true)
    expect(result.M).toBe(true)
    expect(result.A).toBe(true)
    expect(result.R).toBe(true)
    expect(result.T).toBe(true)
    expect(result.score).toBe(5)
    expect(result.missing).toEqual([])
  })

  it('marks M false when no key results', () => {
    const result = computeSmartCompleteness(completeGoal, 0)
    expect(result.M).toBe(false)
    expect(result.score).toBe(4)
    expect(result.missing).toContain('M')
  })

  it('marks T false when targetDate missing', () => {
    const result = computeSmartCompleteness({ ...completeGoal, targetDate: undefined }, 1)
    expect(result.T).toBe(false)
    expect(result.missing).toContain('T')
  })

  it('marks S false when only title present without description/successDefinition', () => {
    const result = computeSmartCompleteness(
      { ...completeGoal, description: undefined, successDefinition: undefined },
      1,
    )
    expect(result.S).toBe(false)
    expect(result.missing).toContain('S')
  })

  it('marks A false when no contingency or support plan', () => {
    const noFollowUp = computeSmartCompleteness(
      { ...completeGoal, obstacles: undefined, resources: undefined },
      1,
    )
    expect(noFollowUp.A).toBe(false)
  })

  it('marks R true with only whyMatters even without ids', () => {
    const result = computeSmartCompleteness(
      { ...completeGoal, priorityIds: [], lifeAreaIds: [], whyMatters: 'It matters' },
      1,
    )
    expect(result.R).toBe(true)
  })

  it('marks R false when no priority, life area, or whyMatters', () => {
    const result = computeSmartCompleteness(
      { ...completeGoal, priorityIds: [], lifeAreaIds: [], whyMatters: undefined },
      1,
    )
    expect(result.R).toBe(false)
    expect(result.missing).toContain('R')
  })

  it('treats whitespace-only strings as missing', () => {
    const result = computeSmartCompleteness(
      { ...completeGoal, targetDate: '   ', whyMatters: '   ', priorityIds: [], lifeAreaIds: [] },
      1,
    )
    expect(result.T).toBe(false)
    expect(result.R).toBe(false)
  })
})
