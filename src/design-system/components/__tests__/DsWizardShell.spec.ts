import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DsWizardShell from '../DsWizardShell.vue'

const steps = Array.from({ length: 6 }, (_, index) => ({
  id: `step-${index + 1}`,
  label: `Krok ${index + 1}`,
}))

describe('DsWizardShell', () => {
  it('renders a compact horizontal path with only the current label expanded', () => {
    const wrapper = mount(DsWizardShell, {
      props: { title: 'Tytuł kroku', current: 2, steps },
    })

    const chapters = wrapper.get('.mg-v2-wizard-shell__chapters')
    const items = chapters.findAll('li')

    expect(chapters.element.tagName).toBe('NAV')
    expect(items).toHaveLength(6)
    expect(chapters.findAll('.mg-v2-progress-marker')).toHaveLength(6)
    expect(chapters.findAll('.mg-v2-wizard-shell__chapter-copy')).toHaveLength(1)
    expect(chapters.get('.mg-v2-wizard-shell__chapter-copy strong').text()).toBe('Krok 3')
    expect(items[2].attributes('aria-current')).toBe('step')
    expect(items.filter(item => item.classes().includes('done'))).toHaveLength(2)
  })
})
