import { describe, expect, it } from 'vitest'
import type { MicroExerciseStep } from '@/domain/microExercises'
import { hasStepsAfter, isMicroStepVisible, visibleMicroSteps } from '@/utils/microExerciseFlow'

const steps: MicroExerciseStep[] = [
  { key: 'had', type: 'choice', options: ['none', 'mild', 'strong'] },
  { key: 'intensity', type: 'slider', min: 0, max: 10, showWhen: { step: 'had', in: ['mild', 'strong'] } },
  { key: 'quiet', type: 'textarea', showWhen: { step: 'had', in: ['none'] } },
  { key: 'areas', type: 'choice', options: ['work', 'body'], multiple: true },
  { key: 'body', type: 'textarea', showWhen: { step: 'areas', in: ['body'] } },
  { key: 'always', type: 'textarea' },
]

describe('micro exercise flow', () => {
  it('hides conditional steps until the choice is answered', () => {
    expect(visibleMicroSteps(steps, {}).map((step) => step.key)).toEqual(['had', 'areas', 'always'])
  })

  it('shows the branch matching a single choice', () => {
    expect(visibleMicroSteps(steps, { had: 'none' }).map((step) => step.key)).toEqual([
      'had',
      'quiet',
      'areas',
      'always',
    ])
    expect(visibleMicroSteps(steps, { had: 'strong' }).map((step) => step.key)).toEqual([
      'had',
      'intensity',
      'areas',
      'always',
    ])
  })

  it('matches a multiple choice when any picked option is listed', () => {
    const body = steps[4]!
    expect(isMicroStepVisible(body, { areas: ['work'] })).toBe(false)
    expect(isMicroStepVisible(body, { areas: ['work', 'body'] })).toBe(true)
    expect(isMicroStepVisible(body, { areas: [] })).toBe(false)
  })

  it('counts gated steps behind an unanswered choice as still ahead', () => {
    const branchOnly = steps.slice(0, 3)
    expect(hasStepsAfter(branchOnly, 'had', {})).toBe(true)
    expect(hasStepsAfter(branchOnly, 'had', { had: 'none' })).toBe(true)
    expect(hasStepsAfter(branchOnly, 'quiet', { had: 'none' })).toBe(false)
    expect(hasStepsAfter(branchOnly, 'intensity', { had: 'strong' })).toBe(false)
  })
})
