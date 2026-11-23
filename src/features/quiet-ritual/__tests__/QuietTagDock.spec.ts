import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import QuietTagDock from '../QuietTagDock.vue'

const POOL = ['delegacja', 'mało snu', 'termin oferty', 'dwa treningi', 'remont']

function mountDock(modelValue: string[] = [], pool: string[] = POOL) {
  return mount(QuietTagDock, {
    props: { modelValue, pool, label: 'Ciało · Obciążenie' },
    attachTo: document.body,
  })
}
const lastTags = (wrapper: ReturnType<typeof mountDock>) =>
  (wrapper.emitted('update:modelValue') ?? []).at(-1)?.[0]

describe('QuietTagDock', () => {
  it('is two small buttons and no caption while empty', () => {
    const wrapper = mountDock()
    expect(wrapper.classes()).toContain('is-empty')
    expect(wrapper.findAll('.qr-tags__btn')).toHaveLength(2)
    expect(wrapper.find('.qr-tags__line').exists()).toBe(false)
    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.find('.qr-tags__shelf').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
    wrapper.unmount()
  })

  it('keeps the buttons in their own row under the chips once tags exist', () => {
    const wrapper = mountDock(['mało snu', 'remont'])
    expect(wrapper.classes()).not.toContain('is-empty')
    expect(wrapper.findAll('.qr-tags__line .qr-tags__tag').map(tag => tag.text())).toEqual([
      'mało snu',
      'remont',
    ])
    expect(wrapper.findAll('.qr-tags__line .qr-tags__btn')).toHaveLength(0)
    expect(wrapper.findAll('.qr-tags__tools .qr-tags__btn')).toHaveLength(2)
    wrapper.unmount()
  })

  it('plus opens a focused input; matching earlier tags pop up only while typing', async () => {
    const wrapper = mountDock(['remont'])
    await wrapper.find('.qr-tags__btn').trigger('click')
    const input = wrapper.find('.qr-tags__input')
    expect(document.activeElement).toBe(input.element)
    expect(wrapper.find('.qr-tags__hits').exists()).toBe(false)

    await input.setValue('t')
    // prefix match first, then tags that contain the text; a chosen tag is never offered
    expect(wrapper.findAll('.qr-tags__hit').map(hit => hit.text())).toEqual([
      'termin oferty',
      'dwa treningi',
    ])

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.findAll('.qr-tags__hit')[0].classes()).toContain('is-active')
    await input.trigger('keydown', { key: 'Enter' })
    expect(lastTags(wrapper)).toEqual(['remont', 'termin oferty'])
    expect((input.element as HTMLInputElement).value).toBe('')
    wrapper.unmount()
  })

  it('Enter without a chosen hit adds the typed text; Escape closes the input', async () => {
    const wrapper = mountDock()
    await wrapper.find('.qr-tags__btn').trigger('click')
    const input = wrapper.find('.qr-tags__input')
    await input.setValue('  zupełnie   nowy ')
    await input.trigger('keydown', { key: 'Enter' })
    expect(lastTags(wrapper)).toEqual(['zupełnie nowy'])
    await input.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.qr-tags__input').exists()).toBe(false)
    expect(wrapper.findAll('.qr-tags__btn')).toHaveLength(2)
    wrapper.unmount()
  })

  it('the chevron opens the shelf of earlier tags; typing filters it in place', async () => {
    const wrapper = mountDock(['remont'])
    const more = wrapper.find('.qr-tags__btn--more')
    expect(more.attributes('aria-expanded')).toBe('false')
    await more.trigger('click')
    expect(more.attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('.qr-tags__pick').map(pick => pick.text())).toEqual([
      'delegacja',
      'mało snu',
      'termin oferty',
      'dwa treningi',
    ])

    await wrapper.findAll('.qr-tags__pick')[0].trigger('mousedown')
    expect(lastTags(wrapper)).toEqual(['remont', 'delegacja'])
    expect(wrapper.find('.qr-tags__shelf').exists()).toBe(true)

    await wrapper.find('.qr-tags__btn').trigger('click')
    await wrapper.find('.qr-tags__input').setValue('sn')
    expect(wrapper.findAll('.qr-tags__pick').map(pick => pick.text())).toEqual(['mało snu'])
    expect(wrapper.find('.qr-tags__hits').exists()).toBe(false)

    await wrapper.find('.qr-tags__input').setValue('qqq')
    expect(wrapper.find('.qr-tags__shelf p').text()).toContain('Enter doda nowy')
    wrapper.unmount()
  })

  it('says so when there is nothing to re-use yet', async () => {
    const wrapper = mountDock([], [])
    await wrapper.find('.qr-tags__btn--more').trigger('click')
    expect(wrapper.find('.qr-tags__shelf p').text()).toBe('Nie masz jeszcze wcześniejszych tagów')
    wrapper.unmount()
  })

  it('removes a chip with its ×', async () => {
    const wrapper = mountDock(['mało snu', 'remont'])
    await wrapper.find('.qr-tags__x').trigger('click')
    expect(lastTags(wrapper)).toEqual(['remont'])
    wrapper.unmount()
  })
})
