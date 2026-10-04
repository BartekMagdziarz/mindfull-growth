import { describe, expect, it } from 'vitest'
import type { WeekRef } from '@/domain/period'
import type { ProgramEnrollment, ProgramWeekEntry } from '@/domain/program'
import type { WeeklyReflection } from '@/domain/reflection'
import { getProgramDefinition } from '@/data/programCatalog'
import {
  currentPhase,
  programReflectionKeys,
  proposeWeeklyTask,
  proposeWeeklyTaskOptions,
  severitySeries,
} from '@/services/programWeekService'

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

  it('a phase without tasks repeats the last accepted task, or proposes nothing', () => {
    // shame-compassion v3: the follow-up phase "return" (from step 24) has no tasks.
    const deeper = enrollment({ programSlug: 'shame-compassion', currentStepIndex: 24 })
    expect(proposeWeeklyTask(SHAME, deeper, week('2026-W45'))).toBeNull()
    const withHistory = enrollment({
      programSlug: 'shame-compassion',
      currentStepIndex: 24,
      weekLog: [entry({ weekRef: week('2026-W44'), taskKey: 'askQuestion' })],
    })
    expect(proposeWeeklyTask(SHAME, withHistory, week('2026-W45'))).toEqual({
      task: expect.objectContaining({ key: 'askQuestion' }),
      repeat: true,
    })
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

describe('proposeWeeklyTaskOptions', () => {
  const shame = (overrides: Partial<ProgramEnrollment> = {}) => enrollment({ programSlug: 'shame-compassion', ...overrides })
  const keys = (tasks: { key: string }[]) => tasks.map((task) => task.key)

  it('first phase: the phase tasks, nothing earlier, the first one suggested', () => {
    const options = proposeWeeklyTaskOptions(SHAME, shame(), week('2026-W36'))!
    expect(keys(options.current)).toEqual(['nameShame', 'catchBody'])
    expect(options.earlier).toEqual([])
    expect(options.suggested.key).toBe('nameShame')
    expect(options.repeat).toBe(false)
  })

  it('a middle phase lists its own tasks and every earlier phase’s, in definition order', () => {
    // step 10 (thought record, index 9) → week 4 "Spojrzeć inaczej"
    const options = proposeWeeklyTaskOptions(
      SHAME,
      shame({ currentStepIndex: 9, weekLog: [entry({ weekRef: week('2026-W36'), taskKey: 'nameShame' })] }),
      week('2026-W38'),
    )!
    expect(keys(options.current)).toEqual(['stayLonger', 'repairGuilt'])
    expect(keys(options.earlier)).toEqual([
      'nameShame',
      'catchBody',
      'soothingGesture',
      'receiveKindness',
      'kindAct',
      'useResponse',
      'unblendSay',
      'friendTest',
    ])
    expect(options.suggested.key).toBe('stayLonger')
  })

  it('suggests the first task of the phase not accepted yet, then repeats the last', () => {
    const accepted = [entry({ weekRef: week('2026-W39'), taskKey: 'stayLonger' })]
    const e = shame({ currentStepIndex: 9, weekLog: accepted })
    expect(proposeWeeklyTaskOptions(SHAME, e, week('2026-W40'))).toMatchObject({
      suggested: { key: 'repairGuilt' },
      repeat: false,
    })
    const all = shame({ currentStepIndex: 9, weekLog: [...accepted, entry({ weekRef: week('2026-W40'), taskKey: 'repairGuilt' })] })
    expect(proposeWeeklyTaskOptions(SHAME, all, week('2026-W41'))).toMatchObject({
      suggested: { key: 'repairGuilt' },
      repeat: true,
    })
  })

  it('"stay" preselects last week’s task even when it belongs to an earlier phase', () => {
    const e = shame({
      currentStepIndex: 9,
      weekLog: [entry({ weekRef: week('2026-W37'), taskKey: 'useResponse', stayNextWeek: true })],
    })
    const options = proposeWeeklyTaskOptions(SHAME, e, week('2026-W38'))!
    expect(options.suggested.key).toBe('useResponse')
    expect(options.repeat).toBe(true)
    expect(keys(options.earlier)).toContain('useResponse')
    expect(keys(options.current)).not.toContain('useResponse')
  })

  it('a phase without tasks offers the earlier ones with the last accepted task preselected', () => {
    const e = shame({ currentStepIndex: 24, weekLog: [entry({ weekRef: week('2026-W44'), taskKey: 'askQuestion' })] })
    const options = proposeWeeklyTaskOptions(SHAME, e, week('2026-W45'))!
    expect(options.current).toEqual([])
    expect(keys(options.earlier)).toContain('askQuestion')
    expect(options.suggested.key).toBe('askQuestion')
    expect(options.repeat).toBe(true)
  })

  it('stays silent once the week has a decision', () => {
    const e = shame({ weekLog: [entry({ weekRef: week('2026-W36'), taskKey: 'nameShame', decision: 'declined' })] })
    expect(proposeWeeklyTaskOptions(SHAME, e, week('2026-W36'))).toBeNull()
  })
})
