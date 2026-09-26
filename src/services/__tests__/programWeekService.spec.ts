import { describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import type { ProgramEnrollment, ProgramWeekEntry } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { getProgramDefinition } from '@/data/programCatalog'
import { currentPhase, programReflectionKeys, proposeWeeklyTask, severitySeries } from '@/services/programWeekService'

const week = (value: string) => value as WeekRef
const ANGER = getProgramDefinition('anger-signal')!
const SHAME = getProgramDefinition('shame-compassion')!

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

const entry = (overrides: Partial<ProgramWeekEntry>): ProgramWeekEntry => ({
  weekRef: week('2026-W36'),
  taskKey: 'noticeSigns',
  decision: 'accepted',
  ...overrides,
})

describe('currentPhase', () => {
  it('maps the current step to its phase, the last step once walked', () => {
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: 0 }))?.key).toBe('understanding')
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: 4 }))?.key).toBe('thoughts')
    expect(currentPhase(ANGER, enrollment({ currentStepIndex: ANGER.steps.length }))?.key).toBe('consolidation')
  })
})

describe('proposeWeeklyTask', () => {
  it('proposes the first task of the current phase', () => {
    expect(proposeWeeklyTask(ANGER, enrollment(), week('2026-W36'))).toEqual({
      task: expect.objectContaining({ key: 'noticeSigns', times: 3 }),
      repeat: false,
    })
  })

  it('stays silent once the week has a decision (accepted or declined)', () => {
    const declined = enrollment({ weekLog: [entry({ weekRef: week('2026-W36'), decision: 'declined' })] })
    expect(proposeWeeklyTask(ANGER, declined, week('2026-W36'))).toBeNull()
  })

  it('moves to the next task of a phase with several tasks', () => {
    const e = enrollment({ currentStepIndex: 8, weekLog: [entry({ weekRef: week('2026-W40'), taskKey: 'applySolution' })] })
    expect(proposeWeeklyTask(ANGER, e, week('2026-W41'))?.task.key).toBe('calmRequest')
  })

  it('repeats the phase task when every task of the phase was accepted', () => {
    const e = enrollment({ weekLog: [entry({ weekRef: week('2026-W36') })] })
    expect(proposeWeeklyTask(ANGER, e, week('2026-W37'))).toEqual({
      task: expect.objectContaining({ key: 'noticeSigns' }),
      repeat: true,
    })
  })

  it('a declined task is proposed again in a later week', () => {
    const e = enrollment({ weekLog: [entry({ weekRef: week('2026-W36'), decision: 'declined' })] })
    expect(proposeWeeklyTask(ANGER, e, week('2026-W37'))).toEqual({
      task: expect.objectContaining({ key: 'noticeSigns' }),
      repeat: false,
    })
  })

  it('"stay next week" repeats the previous task even after the phase moved on', () => {
    const e = enrollment({
      currentStepIndex: 3,
      weekLog: [entry({ weekRef: week('2026-W37'), taskKey: 'pauseInConversation', stayNextWeek: true })],
    })
    expect(proposeWeeklyTask(ANGER, e, week('2026-W38'))).toEqual({
      task: expect.objectContaining({ key: 'pauseInConversation' }),
      repeat: true,
    })
  })

  it('an optional phase without tasks proposes nothing', () => {
    // shame-compassion step 10 (shadow-beliefs) opens the optional "deeper" phase.
    expect(proposeWeeklyTask(SHAME, enrollment({ programSlug: 'shame-compassion', currentStepIndex: 10 }), week('2026-W45'))).toBeNull()
  })

  it('never proposes for paused or completed enrollments', () => {
    expect(proposeWeeklyTask(ANGER, enrollment({ status: 'paused' }), week('2026-W36'))).toBeNull()
    expect(proposeWeeklyTask(ANGER, enrollment({ status: 'completed' }), week('2026-W36'))).toBeNull()
  })
})

describe('severitySeries', () => {
  it('reads 1–5 answers per week from the reflection prompt responses, gaps as null', () => {
    const key = programReflectionKeys('enr-1').severity
    const reflection = (weekRef: string, value?: string) =>
      ({ weekRef: week(weekRef), promptResponses: value === undefined ? {} : { [key]: value } }) as unknown as WeeklyReflection
    const series = severitySeries(
      'enr-1',
      [reflection('2026-W38', '3'), reflection('2026-W35', '5'), reflection('2026-W36', '4'), reflection('2026-W37')],
      week('2026-W36'),
    )
    expect(series).toEqual([
      { weekRef: '2026-W36', value: 4 },
      { weekRef: '2026-W37', value: null },
      { weekRef: '2026-W38', value: 3 },
    ])
  })
})
