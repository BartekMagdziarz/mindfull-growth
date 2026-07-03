import { describe, it, expect } from 'vitest'
import { LEGACY_STEP_MAP, STEP_ORDER } from '../useWeeklyReflectionWizard'

describe('weekly reflection wizard steps', () => {
  it('orders steps: planning, review, four area steps, anchors, journal', () => {
    expect(STEP_ORDER).toEqual([
      'plan',
      'days',
      'review',
      'body',
      'emotions',
      'tasks',
      'closeOnes',
      'anchors',
      'journal',
    ])
  })

  it('maps every legacy step to a step present in STEP_ORDER', () => {
    for (const [legacy, mapped] of Object.entries(LEGACY_STEP_MAP)) {
      expect(STEP_ORDER, `legacy step "${legacy}" maps outside STEP_ORDER`).toContain(mapped)
    }
  })

  it('lands all old section-grouped rating steps on the first area step', () => {
    for (const legacy of ['reflect', 'ratings', 'context', 'demands', 'evaluation', 'actions', 'state']) {
      expect(LEGACY_STEP_MAP[legacy]).toBe('body')
    }
  })

  it('maps every current step to itself (drafts always go through the map)', () => {
    for (const step of STEP_ORDER) {
      expect(LEGACY_STEP_MAP[step]).toBe(step)
    }
  })
})
