import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuietRatingBar from '../QuietRatingBar.vue'

describe('QuietRatingBar · symmetric column', () => {
  it('renders the shared quiet rating stack: value above, −/+ below, nothing before a rating', async () => {
    const wrapper = mount(QuietRatingBar, { props: { modelValue: null, label: 'Balans' } })
    const body = wrapper.find('.qr-bar-body')
    expect(body.classes()).toEqual(expect.arrayContaining(['ds-rating', 'ds-rating--quiet']))
    const children = body.element.children
    expect(children[0].tagName).toBe('OUTPUT')
    expect(children[1].className).toContain('ds-rating__stack')
    expect(children[2].className).toContain('ds-rating__steps')

    // empty state reserves the slot without a dash
    expect(body.find('output').text()).toBe('')
    expect(body.find('output').classes()).toContain('is-empty')

    const steps = body.findAll('.ds-rating__steps button')
    expect(steps.map(b => b.attributes('aria-label'))).toEqual([
      'Zmniejsz: Balans',
      'Zwiększ: Balans',
    ])
    expect(steps[0].attributes('disabled')).toBeDefined()

    await steps[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([1])

    await wrapper.setProps({ modelValue: 3 })
    expect(body.find('output').text()).toBe('3')
    expect(body.find('output').classes()).not.toContain('is-empty')
  })

  it('hands the previous period to the stack as a ghost until the bar is rated', async () => {
    const wrapper = mount(QuietRatingBar, {
      props: { modelValue: null, label: 'Stan', previous: 3, previousLabel: 'Poprzednio' },
    })
    const radios = wrapper.findAll('.ds-rating__bars [role="radio"]')
    expect(radios.map(r => r.classes().includes('is-ghost'))).toEqual([
      true,
      true,
      true,
      false,
      false,
    ])
    expect(radios[0].attributes('title')).toBe('Poprzednio: 3')
    await wrapper.setProps({ modelValue: 2 })
    expect(wrapper.findAll('.ds-rating__bars .is-ghost')).toHaveLength(0)
  })

  it('renders slot content inside the card, under the bar', () => {
    const wrapper = mount(QuietRatingBar, {
      props: { modelValue: 2, label: 'Sens', compact: true },
      slots: { default: '<div class="probe">tags</div>' },
    })
    const probe = wrapper.find('.qr-axis > .probe')
    expect(probe.exists()).toBe(true)
    expect(
      wrapper.find('.qr-bar-body').element.compareDocumentPosition(probe.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
  it('offers five explicit row choices, clearing and keyboard adjustment', async () => {
    const wrapper = mount(QuietRatingBar, {
      props: { modelValue: 2, label: 'Wpływ', layout: 'row' },
    })
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
