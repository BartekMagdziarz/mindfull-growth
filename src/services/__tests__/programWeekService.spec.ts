import { describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import type { ProgramEnrollment } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { getProgramDefinition } from '@/data/programCatalog'
import {
  currentPhase,
  phaseInWeek,
  programReflectionKeys,
  severitySeries,
} from '@/services/programWeekService'
import { getPeriodRefsForDate } from '@/utils/periods'

const week = (value: string) => value as WeekRef
const ANGER = getProgramDefinition('anger-signal')!

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-1',
    programSlug: 'anger-signal',
    status: 'active',
    startedAt: '2026-09-01T10:00:00.000Z',
    currentStepIndex: 0,
    completedSteps: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

describe('currentPhase', () => {
  it('maps the current step to its phase, the last step once walked', () => {
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: 0 }))?.key).toBe('w1')
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: 4 }))?.key).toBe('w2')
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: ANGER.steps.length }))?.key).toBe(
      'return'
    )
  })
})

describe('phaseInWeek', () => {
  // Steps 1–3 of the anger path are week 1, step 4 opens week 2.
  const walked = enrollment({
    currentStepIndex: 4,
    completedSteps: [
      { stepIndex: 0, completedAt: '2026-09-01T10:00:00.000Z' },
      { stepIndex: 1, completedAt: '2026-09-02T10:00:00.000Z' },
      { stepIndex: 2, completedAt: '2026-09-03T10:00:00.000Z' },
      { stepIndex: 3, completedAt: '2026-09-09T10:00:00.000Z' },
    ],
  })

  it('a past week is read in the phase the path had reached by its end', () => {
    // Weeks are not ISO in this app: take the refs from the days themselves.
    const weekOf = (day: string) => getPeriodRefsForDate(day).week
    // Before the first step: the first phase.
    expect(phaseInWeek(ANGER, walked, weekOf('2026-08-20'))?.key).toBe('w1')
    // The week of 3 Sep: three steps done, the fourth (week 2) is next.
    expect(phaseInWeek(ANGER, walked, weekOf('2026-09-03'))?.key).toBe('w2')
    // The week of 9 Sep: the pause plan is done too, the next step is still week 2.
    expect(phaseInWeek(ANGER, walked, weekOf('2026-09-09'))?.key).toBe('w2')
  })

  it('the running week (and later ones) read the current step', () => {
    const running = getPeriodRefsForDate(new Date()).week
    expect(phaseInWeek(ANGER, enrollment({ currentStepIndex: 8 }), running)?.key).toBe('w4')
  })
})

describe('severitySeries', () => {
  it('reads 1–5 answers per week from the reflection prompt responses, gaps as null', () => {
    const key = programReflectionKeys('enr-1').severity
    const reflection = (weekRef: string, value?: string) =>
      ({
        weekRef: week(weekRef),
        promptResponses: value === undefined ? {} : { [key]: value },
      }) as unknown as WeeklyReflection
    const series = severitySeries(
      'enr-1',
      [
        reflection('2026-W38', '3'),
        reflection('2026-W35', '5'),
        reflection('2026-W36', '4'),
        reflection('2026-W37'),
      ],
      week('2026-W36')
    )
    expect(series).toEqual([
      { weekRef: '2026-W36', value: 4 },
      { weekRef: '2026-W37', value: null },
      { weekRef: '2026-W38', value: 3 },
    ])
  })
})
