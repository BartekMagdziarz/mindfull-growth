import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuietTagField from '../QuietTagField.vue'

const SUGGESTIONS = ['Spokój', 'Sen', 'Praca', 'Bliscy']

function mountField(modelValue: string[] = []) {
  return mount(QuietTagField, {
    props: { modelValue, suggestions: SUGGESTIONS, label: 'Balans' },
    attachTo: document.body,
  })
}

describe('QuietTagField', () => {
  it('shows chosen tags as pills and only a chevron until opened', () => {
    const wrapper = mountField(['Sen'])
    expect(wrapper.findAll('.qr-tagfield-list li').map(li => li.text())).toEqual(['Sen'])
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('.qr-tagfield-toggle').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })

  it('opens a search box that re-uses earlier tags, skipping ones already chosen', async () => {
    const wrapper = mountField(['Sen'])
    await wrapper.find('.qr-tagfield-toggle').trigger('click')
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(document.activeElement).toBe(input.element)
    expect(wrapper.findAll('.qr-tagfield-suggestions button').map(b => b.text())).toEqual([
      'Spokój',
      'Praca',
      'Bliscy',
    ])

    await input.setValue('spok')
    const buttons = wrapper.findAll('.qr-tagfield-suggestions button')
    // "spok" matches an earlier tag (case-insensitive) and is also offered as a new tag
    expect(buttons.map(b => b.text())).toEqual(['spok', 'Spokój'])
    expect(buttons[0].classes()).toContain('qr-tagfield-create')

    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['Sen', 'Spokój']])
    wrapper.unmount()
  })

  it('creates the typed tag on Enter and never offers an exact duplicate', async () => {
    const wrapper = mountField([])
    await wrapper.find('.qr-tagfield-toggle').trigger('click')
    const input = wrapper.find('input')
    await input.setValue('Nowy tag')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['Nowy tag']])

    await input.setValue('praca')
    // exact match of an earlier tag → re-use only, no "create" chip
    expect(wrapper.find('.qr-tagfield-create').exists()).toBe(false)
    expect(wrapper.findAll('.qr-tagfield-suggestions button').map(b => b.text())).toEqual(['Praca'])
    wrapper.unmount()
  })

  it('removes a tag only while editing', async () => {
    const wrapper = mountField(['Sen', 'Praca'])
    expect(wrapper.find('.qr-tagfield-list li button').exists()).toBe(false)
    await wrapper.find('.qr-tagfield-toggle').trigger('click')
    await wrapper.find('[aria-label="Usuń tag: Sen"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['Praca']])
    wrapper.unmount()
  })
})
