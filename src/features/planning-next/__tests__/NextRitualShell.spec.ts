import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NextRitualShell, { type NextRitualStep } from '../NextRitualShell.vue'

const step = (index: number): NextRitualStep => ({
  id: `step-${index}`,
  label: `Krok ${index}`,
  short: `Opis ${index}`,
  kicker: `ETAP ${index}`,
  question: `Pytanie ${index}`,
  description: `Wyjaśnienie ${index}`,
})

describe('NextRitualShell', () => {
  it('keeps all eight reflection chapters in the compact path variant', () => {
    const wrapper = mount(NextRitualShell, {
      props: { eyebrow: 'Refleksja', periodTitle: 'T28', mode: 'reflect', steps: Array.from({ length: 8 }, (_, index) => step(index)), current: 0 },
    })

    expect(wrapper.find('.next-ritual__path--long').exists()).toBe(true)
    expect(wrapper.findAll('.next-ritual__path li')).toHaveLength(8)
  })

  it('offers the separate save-and-plan action only on the final step', async () => {
    const steps = [step(0), step(1)]
    const wrapper = mount(NextRitualShell, {
      props: { eyebrow: 'Refleksja', periodTitle: 'T28', mode: 'reflect', steps, current: 1, alternateFinishLabel: 'Zapisz i planuj kolejny tydzień' },
    })

    await wrapper.get('.next-ritual__alternate').trigger('click')

    expect(wrapper.emitted('alternate-finish')).toHaveLength(1)
  })
})
