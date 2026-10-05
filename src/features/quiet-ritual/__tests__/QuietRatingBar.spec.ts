import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuietRatingBar from '../QuietRatingBar.vue'

describe('QuietRatingBar · symmetric column', () => {
  it('puts the value above the bar, the −/+ pair below it, and nothing where there is no rating yet', async () => {
    const wrapper = mount(QuietRatingBar, { props: { modelValue: null, label: 'Balans' } })
    const body = wrapper.find('.qr-bar-body')
    const children = body.element.children
    expect(children[0].tagName).toBe('OUTPUT')
    expect(children[1].className).toContain('qr-bar-stack')
    expect(children[2].className).toContain('qr-bar-steps')

    // empty state reserves the slot without a dash
    expect(body.find('output').text()).toBe('')
    expect(body.find('output').classes()).toContain('qr-bar-value--empty')

    const steps = body.findAll('.qr-bar-steps button')
    expect(steps.map(b => b.attributes('aria-label'))).toEqual(['Zmniejsz: Balans', 'Zwiększ: Balans'])
    expect(steps[0].attributes('disabled')).toBeDefined()

    await steps[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])

    await wrapper.setProps({ modelValue: 3 })
    expect(body.find('output').text()).toBe('3')
    expect(body.find('output').classes()).not.toContain('qr-bar-value--empty')
  })

  it('renders slot content inside the card, under the bar', () => {
    const wrapper = mount(QuietRatingBar, {
      props: { modelValue: 2, label: 'Sens', compact: true },
      slots: { default: '<div class="probe">tags</div>' },
    })
    const probe = wrapper.find('.qr-axis > .probe')
    expect(probe.exists()).toBe(true)
    expect(wrapper.find('.qr-bar-body').element.compareDocumentPosition(probe.element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
  it('offers five explicit row choices, clearing and keyboard adjustment', async () => {
    const wrapper = mount(QuietRatingBar, { props: { modelValue: 2, label: 'Wpływ', layout: 'row' } })
    expect(wrapper.find('.qr-bar-body').exists()).toBe(false)
    const buttons = wrapper.findAll('.qr-scale--row button')
    expect(buttons.map(b => b.text())).toEqual(['1', '2', '3', '4', '5'])
    await buttons[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    await buttons[3].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
    await buttons[1].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([3])
  })

})
