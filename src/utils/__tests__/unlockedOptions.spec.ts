import { describe, expect, it } from 'vitest'
import type { MicroOptionUnlock } from '@/domain/microExercises'
import { MOMENT_FAMILIES, SHAME_MOVE_UNLOCK } from '@/domain/momentFamilies'
import { reachedPhaseKeys } from '@/domain/program'
import { getMicroExercise } from '@/data/microExercises'
import { getProgramDefinition } from '@/data/programCatalog'
import { unlockedOptions } from '@/utils/microExerciseFlow'

const unlock: MicroOptionUnlock = {
  program: 'p',
  groups: [
    { phase: 'w1', options: ['a', 'b'] },
    { phase: 'w2', options: ['c'] },
    { phase: 'w3', options: ['d', 'e'] },
  ],
}
const options = ['e', 'a', 'none', 'c', 'b', 'd']

describe('unlockedOptions', () => {
  it('shows the reached phases newest first, in each group’s own order, ungated options last', () => {
    expect(unlockedOptions(options, unlock, ['w1'])).toEqual(['a', 'b', 'none'])
    expect(unlockedOptions(options, unlock, ['w1', 'w2'])).toEqual(['c', 'a', 'b', 'none'])
    expect(unlockedOptions(options, unlock, ['w1', 'w2', 'w3'])).toEqual([
      'd',
      'e',
      'c',
      'a',
      'b',
      'none',
    ])
  })

  it('without an open enrollment, or without a gate, everything shows in definition order', () => {
    expect(unlockedOptions(options, unlock, null)).toEqual(options)
    expect(unlockedOptions(options, undefined, ['w1'])).toEqual(options)
  })

  it('never invents an option the step does not have', () => {
    expect(unlockedOptions(['a', 'none'], unlock, ['w1', 'w2', 'w3'])).toEqual(['a', 'none'])
  })
})

describe('the shame moves grow with the phases', () => {
  const shame = getProgramDefinition('shame-compassion')!
  const step = getMicroExercise('moments')!.steps.find(candidate => candidate.key === 'response')!
  const moves = (currentStepIndex: number, status: 'active' | 'completed' = 'active') =>
    unlockedOptions(
      step.type === 'choice' ? step.options : [],
      SHAME_MOVE_UNLOCK,
      reachedPhaseKeys(shame, { status, currentStepIndex })
    )

  it('the Momenty step and the family share one gate', () => {
    expect(step.type === 'choice' && step.unlockByPhase).toBe(SHAME_MOVE_UNLOCK)
    expect(MOMENT_FAMILIES.shame.responseUnlock).toBe(SHAME_MOVE_UNLOCK)
  })

  it('week 1 offers three answers; each phase adds its moves on top once its first step is done', () => {
    expect(moves(3)).toEqual(['named', 'breath', 'nothing'])
    // The safe place (step 5, index 4) is still ahead: nothing new yet.
    expect(moves(4)).toEqual(['named', 'breath', 'nothing'])
    expect(moves(5)).toEqual(['place', 'gesture', 'sentence', 'named', 'breath', 'nothing'])
    expect(moves(8).slice(0, 4)).toEqual(['unblend', 'question', 'contact', 'repair'])
    expect(moves(13)[0]).toBe('thanked')
    expect(moves(21)[0]).toBe('shown')
    expect(moves(21)).toHaveLength(17)
  })

  it('a closed path offers every move', () => {
    expect(moves(24, 'completed')).toHaveLength(17)
  })

  it('the backfill list keeps to what the path has handed over', () => {
    const backfill = (index: number) =>
      unlockedOptions(
        MOMENT_FAMILIES.shame.backfillResponses,
        SHAME_MOVE_UNLOCK,
        reachedPhaseKeys(shame, { status: 'active', currentStepIndex: index })
      )
    expect(backfill(3)).toEqual(['breath', 'nothing'])
    expect(backfill(10)).toEqual(['kindAct', 'unblend', 'contact', 'breath', 'nothing'])
  })
})
