import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyIntention } from '@/domain/planning'
import type { ProgramEnrollment } from '@/domain/program'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'
import { matchProgramTasks, recordTaskProgress, taskCountsEntry } from '@/services/programTaskBridgeService'
import { listWeeklyIntentions } from '@/services/weeklyIntentionService'
import { getPeriodRefsForDate } from '@/utils/periods'

vi.mock('@/repositories/programEnrollmentDexieRepository', () => ({
  programEnrollmentDexieRepository: { listAll: vi.fn(async () => [] as ProgramEnrollment[]) },
}))
vi.mock('@/repositories/planningStateDexieRepository', () => ({
  planningStateDexieRepository: { upsertDailyMeasurementEntry: vi.fn(async () => undefined) },
}))
vi.mock('@/repositories/microExerciseEntryDexieRepository', () => ({
  microExerciseEntryDexieRepository: {
    update: vi.fn(async () => undefined),
    getById: vi.fn(async (id: string) => moment(id)),
  },
}))

/** A shame Moment with a breath — any move other than "nothing" satisfies the plan tasks. */
function moment(id: string, responses: Record<string, string | string[]> = {}): MicroExerciseEntry {
  return {
    id,
    exerciseSlug: 'moments',
    createdAt: '2026-09-24T18:00:00.000Z',
    updatedAt: '2026-09-24T18:00:00.000Z',
    responses: { kind: 'shame', hadMoment: 'yes', compass: 'attackSelf', noticed: 'soon', response: ['breath'], ...responses },
  }
}
vi.mock('@/services/weeklyIntentionService', () => ({
  listWeeklyIntentions: vi.fn(async () => [] as WeeklyIntention[]),
}))

const DAY = '2026-09-24' as DayRef
// The app's weeks are not ISO weeks: derive the ref the way the bridge does.
const WEEK = getPeriodRefsForDate(new Date(`${DAY}T12:00:00`)).week as WeekRef
const NEXT_WEEK = getPeriodRefsForDate(new Date('2026-10-01T12:00:00')).week as WeekRef

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'enr-shame',
    programSlug: 'shame-compassion',
    status: 'active',
    startedAt: '2026-09-14T10:00:00.000Z',
    currentStepIndex: 4,
    completedSteps: [],
    contentVersion: 2,
    weekLog: [{ weekRef: WEEK, taskKey: 'useResponse', decision: 'accepted', intentionId: 'int-1' }],
    createdAt: '2026-09-14T10:00:00.000Z',
    updatedAt: '2026-09-14T10:00:00.000Z',
    ...overrides,
  }
}

function intention(id = 'int-1'): WeeklyIntention {
  return { id, weekRef: WEEK, title: 'Użyj odpowiedzi' } as unknown as WeeklyIntention
}

describe('matchProgramTasks', () => {
  it('matches the accepted task of the week whose linkSlug is the completed exercise', () => {
    const matches = matchProgramTasks('moment-shame', WEEK, [enrollment()], [intention()])
    expect(matches).toHaveLength(1)
    expect(matches[0]!.task.key).toBe('useResponse')
    expect(matches[0]!.intention.id).toBe('int-1')
  })

  it('ignores other exercises, other weeks, declined tasks, missing intentions and inactive enrollments', () => {
    expect(matchProgramTasks('self-compassion-break', WEEK, [enrollment()], [intention()])).toEqual([])
    expect(matchProgramTasks('moment-shame', NEXT_WEEK, [enrollment()], [intention()])).toEqual([])
    expect(
      matchProgramTasks(
        'moment-shame',
        WEEK,
        [enrollment({ weekLog: [{ weekRef: WEEK, taskKey: 'useResponse', decision: 'declined' }] })],
        [intention()],
      ),
    ).toEqual([])
    expect(matchProgramTasks('moment-shame', WEEK, [enrollment()], [intention('other')])).toEqual([])
    expect(matchProgramTasks('moment-shame', WEEK, [enrollment({ status: 'paused' })], [intention()])).toEqual([])
  })

  it('a task anchored on a bespoke exercise matches that exercise (positive data log)', () => {
    const e = enrollment({ weekLog: [{ weekRef: WEEK, taskKey: 'collectEvidence', decision: 'accepted', intentionId: 'int-1' }] })
    expect(matchProgramTasks('positive-data-log', WEEK, [e], [intention()])).toHaveLength(1)
    expect(matchProgramTasks('moment-shame', WEEK, [e], [intention()])).toEqual([])
  })
})

describe('recordTaskProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('upserts a day entry for every matching intention and tags a micro entry', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment()])
    vi.mocked(listWeeklyIntentions).mockResolvedValueOnce([intention()])

    const result = await recordTaskProgress('moment-shame', DAY, 'entry-1')

    expect(result.intentionIds).toEqual(['int-1'])
    expect(planningStateDexieRepository.upsertDailyMeasurementEntry).toHaveBeenCalledWith({
      subjectType: 'weeklyIntention',
      subjectId: 'int-1',
      dayRef: DAY,
      value: null,
    })
    expect(microExerciseEntryDexieRepository.update).toHaveBeenCalledWith('entry-1', {
      programRef: { enrollmentId: 'enr-shame', taskKey: 'useResponse', weekRef: WEEK },
    })
  })

  it('does nothing without an active enrollment or without a match', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment({ status: 'completed' })])
    expect(await recordTaskProgress('moment-shame', DAY, 'entry-1')).toEqual({ intentionIds: [] })
    expect(listWeeklyIntentions).not.toHaveBeenCalled()

    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([enrollment()])
    vi.mocked(listWeeklyIntentions).mockResolvedValueOnce([intention()])
    expect(await recordTaskProgress('paced-breathing', DAY, 'entry-2')).toEqual({ intentionIds: [] })
    expect(planningStateDexieRepository.upsertDailyMeasurementEntry).not.toHaveBeenCalled()
    expect(microExerciseEntryDexieRepository.update).not.toHaveBeenCalled()
  })

  it('a Moment counts a day only when its answers say the task happened (count rule)', async () => {
    const kindAct = enrollment({ weekLog: [{ weekRef: WEEK, taskKey: 'kindAct', decision: 'accepted', intentionId: 'int-1' }] })
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValue([kindAct])
    vi.mocked(listWeeklyIntentions).mockResolvedValue([intention()])

    vi.mocked(microExerciseEntryDexieRepository.getById).mockResolvedValueOnce(moment('nothing', { response: ['nothing'] }))
    expect(await recordTaskProgress('moment-shame', DAY, 'nothing')).toEqual({ intentionIds: [] })
    expect(planningStateDexieRepository.upsertDailyMeasurementEntry).not.toHaveBeenCalled()
    expect(microExerciseEntryDexieRepository.update).not.toHaveBeenCalled()

    vi.mocked(microExerciseEntryDexieRepository.getById).mockResolvedValueOnce(moment('kind', { response: ['breath', 'kindAct'] }))
    expect((await recordTaskProgress('moment-shame', DAY, 'kind')).intentionIds).toEqual(['int-1'])
    expect(microExerciseEntryDexieRepository.update).toHaveBeenCalledWith('kind', {
      programRef: { enrollmentId: 'enr-shame', taskKey: 'kindAct', weekRef: WEEK },
    })

    // without an entry to read, a rule-bearing task cannot count
    expect(await recordTaskProgress('moment-shame', DAY)).toEqual({ intentionIds: [] })
    vi.mocked(programEnrollmentDexieRepository.listAll).mockReset()
    vi.mocked(listWeeklyIntentions).mockReset()
  })

  it('a bespoke exercise counts the day but tags no micro entry', async () => {
    vi.mocked(programEnrollmentDexieRepository.listAll).mockResolvedValueOnce([
      enrollment({ weekLog: [{ weekRef: WEEK, taskKey: 'collectEvidence', decision: 'accepted', intentionId: 'int-1' }] }),
    ])
    vi.mocked(listWeeklyIntentions).mockResolvedValueOnce([intention()])
    expect((await recordTaskProgress('positive-data-log', DAY, 'log-1')).intentionIds).toEqual(['int-1'])
    expect(microExerciseEntryDexieRepository.update).not.toHaveBeenCalled()
  })
})

describe('taskCountsEntry', () => {
  const task = (countRule?: { any?: true; options?: string[]; part?: string }) =>
    ({ key: 't', phaseKey: 'w2', entryMode: 'counter' as const, times: 2, linkSlug: 'moment-shame', ...(countRule ? { countRule } : {}) })

  it('counts every entry without a rule, and nothing without an entry under a rule', () => {
    expect(taskCountsEntry(task(), undefined)).toBe(true)
    expect(taskCountsEntry(task({ any: true }), undefined)).toBe(false)
    expect(taskCountsEntry(task({ any: true }), moment('calm', { hadMoment: 'none' }))).toBe(false)
  })

  it('reads the answers and the part at the wheel', () => {
    expect(taskCountsEntry(task({ any: true }), moment('a', { response: ['nothing'] }))).toBe(false)
    expect(taskCountsEntry(task({ any: true }), moment('b', { response: ['sentence'] }))).toBe(true)
    expect(taskCountsEntry(task({ options: ['kindAct'] }), moment('c', { response: ['breath'] }))).toBe(false)
    expect(taskCountsEntry(task({ options: ['kindAct'] }), moment('d', { response: ['breath', 'kindAct'] }))).toBe(true)
    const critic = task({ options: ['named', 'unblend'], part: 'attackSelf' })
    expect(taskCountsEntry(critic, moment('e', { compass: 'attackSelf', response: ['named'] }))).toBe(true)
    expect(taskCountsEntry(critic, moment('f', { compass: 'withdraw', response: ['named'] }))).toBe(false)
  })
})
