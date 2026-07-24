import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import NextRitualHost from '../NextRitualHost.vue'
import AnnualPlanningWizard from '@/components/calendar/AnnualPlanningWizard.vue'
import NextMonthlyPlanRitual from '../NextMonthlyPlanRitual.vue'
import NextMonthlyReflectionRitual from '../NextMonthlyReflectionRitual.vue'
import NextWeeklyPlanRitual from '../NextWeeklyPlanRitual.vue'
import NextWeeklyReflectionRitual from '../NextWeeklyReflectionRitual.vue'

describe('NextRitualHost', () => {
  it.each([
    ['year', '2026', 'plan', AnnualPlanningWizard],
    ['month', '2026-07', 'plan', NextMonthlyPlanRitual],
    ['month', '2026-07', 'reflect', NextMonthlyReflectionRitual],
    ['week', '2026-W29', 'plan', NextWeeklyPlanRitual],
    ['week', '2026-W29', 'reflect', NextWeeklyReflectionRitual],
  ] as const)('dispatches %s/%s/%s to its dedicated ritual', (scale, periodRef, action, expectedComponent) => {
    const wrapper = shallowMount(NextRitualHost, { props: { scale, periodRef, action } })

    expect(wrapper.findComponent(expectedComponent).exists()).toBe(true)
  })

  it('forwards the weekly reflection continuation without writing domain data itself', async () => {
    const wrapper = shallowMount(NextRitualHost, {
      props: { scale: 'week', periodRef: '2026-W29', action: 'reflect' },
    })

    await wrapper.findComponent(NextWeeklyReflectionRitual).vm.$emit('plan-next-week')

    expect(wrapper.emitted('plan-next-week')).toHaveLength(1)
  })
})
