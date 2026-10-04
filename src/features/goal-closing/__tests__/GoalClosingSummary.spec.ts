import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { GoalClosingReflection } from '@/domain/planning'

const push = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ fullPath: '/objects/goals?x=1' }),
}))
vi.mock('@/composables/useT', () => ({
  useT: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      `${key.split('.').at(-1)}${params ? `:${JSON.stringify(params)}` : ''}`,
    tg: (key: string) => `${key.split('.').at(-1)}/f`,
    locale: ref('pl-PL'),
  }),
}))

import GoalClosingSummary from '../GoalClosingSummary.vue'

const reflection: GoalClosingReflection = {
  closedAt: '2026-10-04',
  outcome: 'partial',
  successMet: 'partly',
  confidenceInHindsight: 6,
  workedWell: 'Stały dzień i godzina.',
  learned: 'Rezultat „co wieczór” był nierealny.',
  followUp: { kind: 'habit', note: 'Treningi zostają.' },
  keyResults: [
    { id: 'kr-1', title: '3 treningi', entryMode: 'completion', cadence: 'weekly', evaluation: 'met', monthsMet: 2, monthsPlanned: 3, months: [], lastReadout: '9/13 tyg.' },
    { id: 'kr-2', title: 'Rozciąganie', entryMode: 'completion', cadence: 'weekly', evaluation: 'missed', monthsMet: 0, monthsPlanned: 3, months: [] },
  ],
  window: { weeksPlanned: 13 },
}

describe('GoalClosingSummary', () => {
  it('shows outcome, key results and the lesson as the lead line, then everything on demand', async () => {
    const wrapper = mount(GoalClosingSummary, { props: { goalId: 'g-1', reflection, confidenceThen: 8 } })
    expect(wrapper.find('.gc-summary__head span').text()).toContain('partial')
    expect(wrapper.findAll('.gc-summary__krs span').map(s => s.classes().join(' '))).toEqual(['is-met', 'is-missed'])
    expect(wrapper.find('.gc-summary__lead').text()).toBe('learned/f: Rezultat „co wieczór” był nierealny.')
    expect(wrapper.find('.gc-summary__full').exists()).toBe(false)

    await wrapper.findAll('.gc-summary__actions button')[0].trigger('click')
    const full = wrapper.find('.gc-summary__full')
    expect(full.exists()).toBe(true)
    expect(full.text()).toContain('confidence:{"then":8,"now":6}')
    expect(full.text()).toContain('Stały dzień i godzina.')
    expect(full.text()).toContain('habit')
    expect(wrapper.find('.gc-summary__lead').exists()).toBe(false)
  })

  it('reopens the ritual on the closed goal with a return path', async () => {
    const wrapper = mount(GoalClosingSummary, { props: { goalId: 'g-1', reflection } })
    await wrapper.findAll('.gc-summary__actions button').at(-1)!.trigger('click')
    expect(push).toHaveBeenCalledWith({
      name: 'goal-closing-ritual',
      params: { goalId: 'g-1' },
      query: { return: '/objects/goals?x=1' },
    })
  })

  it('hides the expand action when there is nothing beyond the facts', () => {
    const bare: GoalClosingReflection = { closedAt: '2026-10-04', outcome: 'missed', keyResults: [], window: { weeksPlanned: 0 } }
    const wrapper = mount(GoalClosingSummary, { props: { goalId: 'g-1', reflection: bare } })
    expect(wrapper.findAll('.gc-summary__actions button')).toHaveLength(1)
    expect(wrapper.find('.gc-summary__lead').exists()).toBe(false)
  })
})
