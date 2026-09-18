import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import EmotionGroupPicker from '../EmotionGroupPicker.vue'
import type { EmotionGroupSelection } from '@/domain/emotionGroups'

vi.mock('@/composables/useT', () => ({ useT: () => ({ t: (key: string) => key }) }))

describe('EmotionGroupPicker selection', () => {
  it('keeps the pressed state and intensity when switching quadrants, and clears both on deselection', async () => {
    const host = mount(defineComponent({
      components: { EmotionGroupPicker },
      setup: () => ({ selections: ref<EmotionGroupSelection[]>([]) }),
      template: '<EmotionGroupPicker v-model="selections" />',
    }))
    await host.get('[data-testid="egp-quadrant-high-energy-low-pleasantness"]').trigger('click')
    const tile = () => host.get('.etile')
    await tile().get('.ethead').trigger('click')
    expect(tile().get('.ethead').attributes('aria-pressed')).toBe('true')
    await tile().get('.hthumb').trigger('keydown', { key: 'ArrowRight' })
    expect(host.vm.selections[0].intensity).toBe(1)
    await host.get('[data-testid="egp-quadrant-mini-low-energy-high-pleasantness"]').trigger('click')
    await host.get('[data-testid="egp-quadrant-mini-high-energy-low-pleasantness"]').trigger('click')
    expect(tile().get('.ethead').attributes('aria-pressed')).toBe('true')
    expect(host.vm.selections[0].intensity).toBe(1)
    await tile().get('.ethead').trigger('click')
    expect(tile().get('.ethead').attributes('aria-pressed')).toBe('false')
    expect(host.vm.selections).toEqual([])
    host.unmount()
  })
})
