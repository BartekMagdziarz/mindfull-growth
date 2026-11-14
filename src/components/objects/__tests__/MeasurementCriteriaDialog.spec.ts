import { describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MeasurementCriteriaDialog from '../MeasurementCriteriaDialog.vue'
import { habitDexieRepository as habits } from '@/repositories/habitDexieRepository'
import { planningStateDexieRepository as state } from '@/repositories/planningStateDexieRepository'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import type { DayRef } from '@/domain/period'

describe('criterion scope dialog', () => {
  it('previews retroactive changes, rejects a midweek date, and submits only on save', async () => {
    await resetPlanningTestData()
    const habit = await habits.create({
      title: 'Training',
      entryMode: 'completion',
      cadence: 'weekly',
      status: 'open',
      isActive: true,
      priorityIds: [],
      lifeAreaIds: [],
      target: { kind: 'count', operator: 'min', value: 6 },
    })
    for (const day of ['09', '10', '11', '12', '13'])
      await state.upsertDailyMeasurementEntry({
        subjectType: 'habit',
        subjectId: habit.id,
        dayRef: `2026-11-${day}` as DayRef,
        value: null,
      })
    const wrapper = mount(MeasurementCriteriaDialog, {
      global: { stubs: { AppDialog: { template: '<div><slot /></div>' } } },
      props: {
        request: {
          subjectType: 'habit',
          subject: habit,
          next: { ...habit, target: { ...habit.target, value: 5 } },
        },
      },
    })
    await expect
      .poll(() => wrapper.find('button[type="submit"]').attributes('disabled'))
      .toBeUndefined()
    await wrapper.find('input[value="all"]').setValue()
    await flushPromises()
    expect(wrapper.get('[role="status"]').text()).toContain('Newly met periods: 1')
    expect(wrapper.emitted('choose')).toBeUndefined()
    await wrapper.find('input[value="date"]').setValue()
    await wrapper.find('input[type="date"]').setValue('2026-11-10')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.find('input[type="date"]').setValue('2026-11-16')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('choose')?.[0]).toEqual([
      { scope: 'from-date', effectiveFrom: '2026-11-16' },
    ])
    wrapper.unmount()
  })
})
