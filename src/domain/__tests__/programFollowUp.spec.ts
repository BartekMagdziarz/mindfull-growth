import { describe, expect, it } from 'vitest'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import type { DayRef } from '@/domain/period'
import type { ProgramDefinition, ProgramEnrollment } from '@/domain/program'
import {
  doseProposal,
  futureLetterDue,
  futureLetterShowAt,
  keepRhythmOverrides,
} from '@/domain/programFollowUp'

const program: ProgramDefinition = {
  slug: 'shame-compassion',
  i18nKey: 'programs.shame-compassion',
  icon: 'x',
  estimatedWeeks: 8,
  steps: Array.from({ length: 24 }, (_, i) => ({ exerciseSlug: `s${i}`, minGapDays: 0 })),
  practices: [
    { exerciseSlug: 'paced-breathing', everyDays: 1, endsAfterStep: 6 },
    { exerciseSlug: 'moment-shame', everyDays: 2, startsAfterStep: 2, endsAfterStep: 13 },
    { exerciseSlug: 'self-compassion-break', everyDays: 2, startsAfterStep: 6, endsAfterStep: 23 },
    { exerciseSlug: 'positive-data-log', everyDays: 2, startsAfterStep: 17, endsAfterStep: 23 },
  ],
}

function enrollment(overrides: Partial<ProgramEnrollment> = {}): ProgramEnrollment {
  return {
    id: 'e1',
    programSlug: 'shame-compassion',
    status: 'active',
    startedAt: '2026-09-01T10:00:00.000Z',
    currentStepIndex: 11,
    completedSteps: [],
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-01T10:00:00.000Z',
    ...overrides,
  }
}

function check(load: string, createdAt = '2026-10-01T10:00:00.000Z'): MicroExerciseEntry {
  return {
    id: 'dc',
    exerciseSlug: 'dose-check',
    createdAt,
    updatedAt: createdAt,
    responses: { load },
  }
}

describe('future letter', () => {
  it('comes back after the chosen number of weeks, eight by default', () => {
    expect(futureLetterShowAt({ returnIn: 'w4' }, '2026-10-05' as DayRef)).toBe('2026-11-02')
    expect(futureLetterShowAt({}, '2026-10-05' as DayRef)).toBe('2026-11-30')
    expect(futureLetterShowAt({ returnIn: 'w12' }, '2026-10-05' as DayRef)).toBe('2026-12-28')
  })

  it('is due from its day on', () => {
    const e = enrollment({ futureLetter: { entryId: 'l', showAt: '2026-11-02' } })
    expect(futureLetterDue(e, '2026-11-01' as DayRef)).toBe(false)
    expect(futureLetterDue(e, '2026-11-02' as DayRef)).toBe(true)
    expect(futureLetterDue(e, '2027-01-01' as DayRef)).toBe(true)
    expect(futureLetterDue(enrollment(), '2026-11-02' as DayRef)).toBe(false)
  })
})

describe('doseProposal', () => {
  it('slows the open practices that run more often than every third day when the check said "za dużo"', () => {
    const proposal = doseProposal(program, enrollment(), [check('tooMuch')])
    expect(proposal?.kind).toBe('tooMuch')
    // Step 11: breath ended, moments and the break are open; both run every 2 days.
    expect(proposal?.items).toEqual([
      { slug: 'moment-shame', from: 2, to: 3 },
      { slug: 'self-compassion-break', from: 2, to: 3 },
    ])
  })

  it('leaves only the breath when the check said "nie robię ich"', () => {
    const early = enrollment({ currentStepIndex: 4 })
    const proposal = doseProposal(program, early, [check('none')])
    expect(proposal?.kind).toBe('none')
    expect(proposal?.items).toEqual([{ slug: 'moment-shame', from: 2, to: 7 }])
  })

  it('is silent for "w sam raz", for checks before this enrollment and once the user decided', () => {
    expect(doseProposal(program, enrollment(), [check('right')])).toBeNull()
    expect(
      doseProposal(program, enrollment(), [check('tooMuch', '2026-08-01T10:00:00.000Z')])
    ).toBeNull()
    const decided = enrollment({
      practiceOverrides: { 'moment-shame': { everyDays: 3 } },
      updatedAt: '2026-10-02T10:00:00.000Z',
    })
    expect(doseProposal(program, decided, [check('tooMuch')])).toBeNull()
  })

  it("reads the user's current rhythm when an older override exists", () => {
    const slowed = enrollment({
      practiceOverrides: { 'moment-shame': { everyDays: 4 } },
      updatedAt: '2026-09-20T10:00:00.000Z',
    })
    expect(doseProposal(program, slowed, [check('tooMuch')])?.items).toEqual([
      { slug: 'self-compassion-break', from: 2, to: 3 },
    ])
  })

  it('"zostaw jak jest" records every open practice at its current rhythm', () => {
    expect(keepRhythmOverrides(program, enrollment())).toEqual({
      'moment-shame': { everyDays: 2 },
      'self-compassion-break': { everyDays: 2 },
    })
  })
})
