import { describe, expect, it } from 'vitest'
import { DEFAULT_PLANNING_UI, resolvePlanningUi } from '@/router/planningUi'

describe('planning UI selection', () => {
  it('uses the atomic cutover renderer by default', () => {
    expect(DEFAULT_PLANNING_UI).toBe('next')
    expect(resolvePlanningUi({})).toBe('next')
  })

  it('keeps explicit next and legacy rollback values', () => {
    expect(resolvePlanningUi({ ui: 'next' })).toBe('next')
    expect(resolvePlanningUi({ ui: 'legacy' })).toBe('legacy')
  })

  it('ignores unknown values', () => {
    expect(resolvePlanningUi({ ui: 'v3' })).toBe('next')
  })
})
