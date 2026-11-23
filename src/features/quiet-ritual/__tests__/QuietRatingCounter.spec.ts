import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuietRatingCounter from '../QuietRatingCounter.vue'

function mountCounter(modelValue: number | null) {
  return mount(QuietRatingCounter, {
    props: { modelValue, label: 'Ciało · Obciążenie', lowLabel: 'Lekko', highLabel: 'Ciężko' },
    attachTo: document.body,
  })
}
const emitted = (wrapper: ReturnType<typeof mountCounter>, name: string) =>
  (wrapper.emitted(name) ?? []).map(args => args[0])

describe('QuietRatingCounter', () => {
  it('shows one digit and names the scale ends for assistive tech', () => {
    const wrapper = mountCounter(5)
    expect(wrapper.find('.qr-counter__number').text()).toBe('5')
    expect(wrapper.attributes('role')).toBe('spinbutton')
    expect(wrapper.attributes('aria-valuenow')).toBe('5')
    expect(wrapper.attributes('aria-valuetext')).toBe('Ciężko')
    expect(wrapper.findAll('.qr-counter__end').map(end => end.text())).toEqual(['Lekko', 'Ciężko'])
    wrapper.unmount()
  })

  it('invites while unrated: a dash, the class that keeps the arrows visible, "more" starts at 1', async () => {
    const wrapper = mountCounter(null)
    expect(wrapper.find('.qr-counter__number').text()).toBe('–')
    expect(wrapper.classes()).toContain('is-unset')
    expect(wrapper.attributes('aria-valuenow')).toBeUndefined()
    const [less, more] = wrapper.findAll('.qr-counter__nudge')
    expect(less.attributes('disabled')).toBeDefined()
    await more.trigger('click')
    expect(emitted(wrapper, 'update:modelValue')).toEqual([1])
    wrapper.unmount()
  })

  it('steps by one, clears below 1 and stops at 5', async () => {
    const one = mountCounter(1)
    await one.findAll('.qr-counter__nudge')[0].trigger('click')
    expect(emitted(one, 'update:modelValue')).toEqual([null])
    one.unmount()

    const five = mountCounter(5)
    expect(five.findAll('.qr-counter__nudge')[1].attributes('disabled')).toBeDefined()
    await five.trigger('keydown', { key: 'ArrowRight' })
    expect(five.emitted('update:modelValue')).toBeUndefined()
    await five.trigger('keydown', { key: 'ArrowLeft' })
    await five.trigger('keydown', { key: 'Home' })
    await five.trigger('keydown', { key: 'Delete' })
    expect(emitted(five, 'update:modelValue')).toEqual([4, 1, null])
    five.unmount()
  })

  it('previews the next rating only for a pointer on an arrow, never for the keyboard', async () => {
    const wrapper = mountCounter(3)
    const more = wrapper.findAll('.qr-counter__nudge')[1]
    await more.trigger('pointerenter')
    expect(emitted(wrapper, 'preview')).toEqual([4])
    await more.trigger('pointerleave')
    expect(emitted(wrapper, 'preview')).toEqual([4, null])
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(emitted(wrapper, 'preview')).toEqual([4, null])
    wrapper.unmount()
  })

  it('names the previous period instead of scale ends when the scale has no end words', () => {
    const compass = mount(QuietRatingCounter, {
      props: { modelValue: null, label: 'Balans', previous: 4, previousLabel: 'Poprzedni miesiąc' },
    })
    expect(compass.findAll('.qr-counter__end')).toHaveLength(0)
    expect(compass.find('.qr-counter__previous').text()).toBe('Poprzedni miesiąc: 4')
    expect(compass.attributes('aria-valuetext')).toBe('bez oceny')
    compass.unmount()

    const weekly = mountCounter(1)
    expect(weekly.find('.qr-counter__previous').exists()).toBe(false)
    weekly.unmount()
  })
})
