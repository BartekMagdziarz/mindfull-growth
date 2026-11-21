import { describe, expect, it } from 'vitest'
import {
  handedOverPractices,
  isPracticeWindowOpen,
  practiceStepWindow,
  reachedPhaseKeys,
  type ProgramDefinition,
  type ProgramEnrollment,
} from '@/domain/program'

// Three week phases (steps 0–1 · 2–4 · 5–6) and a follow-up phase (step 7).
const program: ProgramDefinition = {
  slug: 'p',
  i18nKey: 'programs.p',
  icon: 'x',
  estimatedWeeks: 3,
  steps: Array.from({ length: 8 }, (_, i) => ({ exerciseSlug: `s${i}`, minGapDays: 0 })),
  phases: [
    { key: 'w1', fromStepIndex: 0, week: 1 },
    { key: 'w2', fromStepIndex: 2, week: 2 },
    { key: 'w3', fromStepIndex: 5, week: 3 },
    { key: 'return', fromStepIndex: 7 },
  ],
  practices: [
    { exerciseSlug: 'log', everyDays: 2, startsAfterStep: 0 },
    { exerciseSlug: 'first', everyDays: 1, phaseKey: 'w1' },
    { exerciseSlug: 'second', everyDays: 2, phaseKey: 'w2' },
    { exerciseSlug: 'third', everyDays: 2, phaseKey: 'w3' },
  ],
}
const practice = (slug: string) => program.practices!.find(item => item.exerciseSlug === slug)!

function at(
  currentStepIndex: number,
  status: ProgramEnrollment['status'] = 'active'
): Pick<ProgramEnrollment, 'status' | 'currentStepIndex'> {
  return { status, currentStepIndex }
}

const openAt = (index: number) =>
  program
    .practices!.filter(item => isPracticeWindowOpen(program, item, at(index)))
    .map(item => item.exerciseSlug)

describe('practiceStepWindow', () => {
  it('a phase practice opens after its phase’s first step and closes after the next phase’s first step', () => {
    expect(practiceStepWindow(program, practice('first'))).toEqual({
      startsAfterStep: undefined,
      endsAfterStep: 2,
    })
    expect(practiceStepWindow(program, practice('second'))).toEqual({
      startsAfterStep: 2,
      endsAfterStep: 5,
    })
    expect(practiceStepWindow(program, practice('third'))).toEqual({
      startsAfterStep: 5,
      endsAfterStep: 7,
    })
  })

  it('other practices keep their own step indices; an unknown phase falls back to them', () => {
    expect(practiceStepWindow(program, practice('log'))).toEqual({
      startsAfterStep: 0,
      endsAfterStep: undefined,
    })
    expect(
      practiceStepWindow(program, { exerciseSlug: 'x', everyDays: 1, phaseKey: 'nope' })
    ).toEqual({ startsAfterStep: undefined, endsAfterStep: undefined })
  })
})

describe('isPracticeWindowOpen', () => {
  it('hands the phases’ practices over one after another, never two of them at once', () => {
    expect(openAt(0)).toEqual(['first'])
    expect(openAt(1)).toEqual(['log', 'first'])
    // Step 2 opens phase 2, but its practice waits for that step: the first one still runs.
    expect(openAt(2)).toEqual(['log', 'first'])
    expect(openAt(3)).toEqual(['log', 'second'])
    expect(openAt(5)).toEqual(['log', 'second'])
    expect(openAt(6)).toEqual(['log', 'third'])
  })

  it('nothing runs for a paused or closed enrollment', () => {
    for (const item of program.practices!) {
      expect(isPracticeWindowOpen(program, item, at(3, 'paused'))).toBe(false)
      expect(isPracticeWindowOpen(program, item, at(7, 'completed'))).toBe(false)
    }
  })
})

describe('handedOverPractices', () => {
  const slugs = (index: number, status: ProgramEnrollment['status'] = 'active') =>
    handedOverPractices(program, at(index, status)).map(item => item.exerciseSlug)

  it('lists what runs now and what stayed on demand, not what is still ahead', () => {
    expect(slugs(0)).toEqual(['first'])
    expect(slugs(3)).toEqual(['log', 'first', 'second'])
    expect(slugs(6)).toEqual(['log', 'first', 'second', 'third'])
    expect(slugs(3, 'paused')).toEqual(['log', 'first', 'second'])
  })

  it('a closed path has handed over everything', () => {
    expect(slugs(7, 'completed')).toEqual(['log', 'first', 'second', 'third'])
  })
})

describe('reachedPhaseKeys', () => {
  it('a phase counts once its first step is done; the first one from the start', () => {
    expect(reachedPhaseKeys(program, at(0))).toEqual(['w1'])
    expect(reachedPhaseKeys(program, at(2))).toEqual(['w1'])
    expect(reachedPhaseKeys(program, at(3))).toEqual(['w1', 'w2'])
    expect(reachedPhaseKeys(program, at(6))).toEqual(['w1', 'w2', 'w3'])
  })

  it('a closed path has reached every phase', () => {
    expect(reachedPhaseKeys(program, at(7, 'completed'))).toEqual(['w1', 'w2', 'w3', 'return'])
  })
})
