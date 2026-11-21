import { describe, expect, it } from 'vitest'
import type { ExercisePlanItem } from '@/domain/exercisePlan'
import type { ProgramEnrollment } from '@/domain/program'
import { getProgramDefinition } from '@/data/programCatalog'
import { derivePracticeStates } from '@/services/programSchedulerService'

/**
 * The shame path's practices as the path view reads them (plan
 * ideas/html-plans/2026-11-17-shame-path-phase-practices.html): Momenty
 * all the way, one practice per phase, earlier ones on demand.
 */
const SHAME = getProgramDefinition('shame-compassion')!

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'e1',
    programSlug: 'shame-compassion',
    status: 'active',
    startedAt: '2026-09-01T10:00:00.000Z',
    currentStepIndex: 0,
    completedSteps: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

function byState(index: number, overrides: Partial<ProgramEnrollment> = {}) {
  const states = derivePracticeStates(
    SHAME,
    enrollment({ currentStepIndex: index, ...overrides }),
    []
  )
  const slugs = (state: string) =>
    states.filter(item => item.state === state).map(item => item.practice.exerciseSlug)
  return { active: slugs('active'), onDemand: slugs('onDemand'), upcoming: slugs('upcoming') }
}

describe('shame path practices by phase', () => {
  it('week 1: the breath from day one, Momenty once the map is done', () => {
    expect(byState(0).active).toEqual(['paced-breathing'])
    expect(byState(3).active).toEqual(['moment-shame', 'paced-breathing'])
    expect(byState(0).onDemand).toEqual([])
  })

  it('a phase practice waits for its phase’s first step and then replaces the previous one', () => {
    // Step 5 (index 4) builds the safe place: until it is done the breath still runs.
    expect(byState(4).active).toEqual(['moment-shame', 'paced-breathing'])
    expect(byState(5)).toEqual({
      active: ['moment-shame', 'safe-place-return'],
      onDemand: ['paced-breathing'],
      upcoming: [
        'response-rehearsal',
        'self-compassion-break',
        'critic-handover',
        'shame-writing',
        'positive-data-log',
        'step-toward-people',
      ],
    })
  })

  it('never more than Momenty and one phase practice at once, through every step', () => {
    for (let index = 0; index < 24; index += 1) {
      const { active } = byState(index)
      expect(active.length, `step ${index}`).toBeLessThanOrEqual(2)
      expect(active.filter(slug => slug !== 'moment-shame').length, `step ${index}`).toBe(1)
    }
  })

  it('each phase hands over its own practice', () => {
    const phasePractice = (index: number) =>
      byState(index).active.find(slug => slug !== 'moment-shame')
    expect(phasePractice(8)).toBe('response-rehearsal') // week 3, after the plan
    expect(phasePractice(10)).toBe('self-compassion-break') // week 4, after the thought record
    expect(phasePractice(13)).toBe('critic-handover') // week 5, after the trailhead
    expect(phasePractice(16)).toBe('shame-writing') // week 6, after the letter
    expect(phasePractice(18)).toBe('positive-data-log') // week 7, after the beliefs step
    expect(phasePractice(21)).toBe('step-toward-people') // week 8, after the measure
    expect(byState(21).active).toContain('moment-shame')
  })

  it('a closed path keeps every practice on demand', () => {
    const closed = byState(24, { status: 'completed' })
    expect(closed.active).toEqual([])
    expect(closed.upcoming).toEqual([])
    expect(closed.onDemand).toHaveLength(9)
  })

  it('an active practice carries its pending occurrence', () => {
    const pending = {
      id: 'p1',
      exerciseSlug: 'response-rehearsal',
      status: 'pending',
      source: 'program',
      sourceRef: 'e1',
      programRole: 'practice',
      dayRef: '2026-09-20',
    } as unknown as ExercisePlanItem
    const states = derivePracticeStates(SHAME, enrollment({ currentStepIndex: 8 }), [pending])
    expect(
      states.find(item => item.practice.exerciseSlug === 'response-rehearsal')?.pendingItem?.id
    ).toBe('p1')
  })
})
