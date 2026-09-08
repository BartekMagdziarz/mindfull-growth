import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import NextRitualHost from '../NextRitualHost.vue'
import AnnualPlanningWizard from '@/components/calendar/AnnualPlanningWizard.vue'
import NextMonthlyPlanRitual from '../NextMonthlyPlanRitual.vue'
import NextMonthlyReflectionRitual from '../NextMonthlyReflectionRitual.vue'
import NextWeeklyPlanRitual from '../NextWeeklyPlanRitual.vue'
import NextWeeklyReflectionRitual from '../NextWeeklyReflectionRitual.vue'
import QuietMonthlyPlan from '@/features/quiet-ritual/QuietMonthlyPlan.vue'
import QuietMonthlyReflection from '@/features/quiet-ritual/QuietMonthlyReflection.vue'
import QuietWeeklyPlan from '@/features/quiet-ritual/QuietWeeklyPlan.vue'
import QuietWeeklyReflection from '@/features/quiet-ritual/QuietWeeklyReflection.vue'

describe('NextRitualHost', () => {
  it.each([
    ['year', '2026', 'plan', AnnualPlanningWizard],
    ['month', '2026-07', 'plan', QuietMonthlyPlan],
    ['month', '2026-07', 'reflect', QuietMonthlyReflection],
    ['week', '2026-W29', 'plan', QuietWeeklyPlan],
    ['week', '2026-W29', 'reflect', QuietWeeklyReflection],
  ] as const)('dispatches %s/%s/%s to the quiet ritual by default', (scale, periodRef, action, expectedComponent) => {
    const wrapper = shallowMount(NextRitualHost, { props: { scale, periodRef, action } })

    expect(wrapper.findComponent(expectedComponent).exists()).toBe(true)
  })

  it.each([
    ['month', '2026-07', 'plan', NextMonthlyPlanRitual],
    ['month', '2026-07', 'reflect', NextMonthlyReflectionRitual],
    ['week', '2026-W29', 'plan', NextWeeklyPlanRitual],
    ['week', '2026-W29', 'reflect', NextWeeklyReflectionRitual],
  ] as const)('keeps the previous %s/%s wizard reachable as the classic variant', (scale, periodRef, action, expectedComponent) => {
    const wrapper = shallowMount(NextRitualHost, { props: { scale, periodRef, action, variant: 'classic' } })

    expect(wrapper.findComponent(expectedComponent).exists()).toBe(true)
  })

  it('forwards the weekly reflection continuation without writing domain data itself', async () => {
    const wrapper = shallowMount(NextRitualHost, {
      props: { scale: 'week', periodRef: '2026-W29', action: 'reflect' },
    })

    await wrapper.findComponent(QuietWeeklyReflection).vm.$emit('plan-next-week')

    expect(wrapper.emitted('plan-next-period')).toHaveLength(1)
  })

  it('forwards the monthly reflection continuation and the week entry points', async () => {
    const wrapper = shallowMount(NextRitualHost, {
      props: { scale: 'month', periodRef: '2026-07', action: 'reflect' },
    })

    await wrapper.findComponent(QuietMonthlyReflection).vm.$emit('plan-next-month')
    await wrapper.findComponent(QuietMonthlyReflection).vm.$emit('open-week', '2026-W29')

    expect(wrapper.emitted('plan-next-period')).toHaveLength(1)
    expect(wrapper.emitted('open-period')).toEqual([['week', '2026-W29']])
  })
})
