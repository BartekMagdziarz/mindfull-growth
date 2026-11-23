import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { MaybeRating } from '@/domain/loadState'
import LoadStateTrack from '../charts/LoadStateTrack.vue'

const mountTrack = (props: Record<string, unknown>) =>
  mount(LoadStateTrack, { props: { subject: 'Ciało · ten tydzień', ...props } as never })

describe('LoadStateTrack', () => {
  it('stays an empty rail without both ratings unless it is live', () => {
    const wrapper = mountTrack({ load: 3 as MaybeRating, state: null })
    expect(wrapper.find('.ls-track__rail--empty').exists()).toBe(true)
    expect(wrapper.find('.ls-track__bar').exists()).toBe(false)
    expect(wrapper.find('.ls-track__dot').exists()).toBe(false)
    expect(wrapper.attributes('aria-label')).toBe('Ciało · ten tydzień: bez refleksji')
  })

  it('live: draws a single rating at once and hides the missing one', () => {
    const wrapper = mountTrack({ load: 3 as MaybeRating, state: null, size: 'lg', live: true })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ls-track--lg', 'ls-track--live']))
    expect(wrapper.find('.ls-track__rail--empty').exists()).toBe(false)
    expect(wrapper.find('.ls-track__bar').classes()).not.toContain('is-off')
    expect(wrapper.find('.ls-track__dot').classes()).toContain('is-off')
    expect(wrapper.attributes('aria-label')).toBe('Ciało · ten tydzień: obciążenie 3')
  })

  it('live: an unrated mark says so and draws nothing', () => {
    const wrapper = mountTrack({ load: null, state: null, live: true })
    expect(wrapper.find('.ls-track__bar').classes()).toContain('is-off')
    expect(wrapper.find('.ls-track__dot').classes()).toContain('is-off')
    expect(wrapper.attributes('aria-label')).toBe('Ciało · ten tydzień: jeszcze bez oceny')
  })

  it('live: previews a rating about to be set and wakes the element of the active axis', () => {
    const wrapper = mountTrack({
      load: 3 as MaybeRating,
      state: 4 as MaybeRating,
      live: true,
      previewLoad: 4,
      previewState: 4,
      active: 'load',
    })
    expect(wrapper.find('.ls-track__ghost-bar').attributes('style')).toContain('--ls-track-to: 4')
    // a preview equal to the current rating draws nothing
    expect(wrapper.find('.ls-track__ghost-dot').exists()).toBe(false)
    expect(wrapper.classes()).toContain('ls-track--waking-load')
  })

  it('ignores preview and waking outside live', () => {
    const wrapper = mountTrack({
      load: 3 as MaybeRating,
      state: 4 as MaybeRating,
      previewLoad: 5,
      active: 'state',
    })
    expect(wrapper.find('.ls-track__ghost-bar').exists()).toBe(false)
    expect(wrapper.find('.ls-track__grip').exists()).toBe(false)
    expect(wrapper.classes().some(name => name.startsWith('ls-track--waking'))).toBe(false)
  })
})
