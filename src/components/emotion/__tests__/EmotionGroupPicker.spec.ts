import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import EmotionGroupPicker from '../EmotionGroupPicker.vue'
import { GROUPS_BY_QUADRANT, type EmotionGroupSelection } from '@/domain/emotionGroups'

vi.mock('@/composables/useT', () => ({ useT: () => ({ t: (key: string) => key }) }))

const HELP = 'high-energy-low-pleasantness'
const FIRST = GROUPS_BY_QUADRANT[HELP][0].slug

function mountHost(initial: EmotionGroupSelection[] = []) {
  return mount(
    defineComponent({
      components: { EmotionGroupPicker },
      setup: () => ({ selections: ref<EmotionGroupSelection[]>(initial) }),
      template: '<EmotionGroupPicker v-model="selections" />',
    })
  )
}

describe('EmotionGroupPicker', () => {
  it('keeps selection and intensity across quadrants, and clears both on deselection', async () => {
    const host = mountHost()
    await host.get(`[data-testid="egp-quadrant-${HELP}"]`).trigger('click')
    const tile = () => host.get(`[data-testid="egp-tile-${FIRST}"]`)
    await tile().trigger('click')
    expect(tile().attributes('aria-pressed')).toBe('true')
    expect(host.vm.selections).toEqual([{ emotionId: FIRST }])
    await tile().trigger('keydown', { key: 'ArrowRight' })
    expect(host.vm.selections[0].intensity).toBe(1)
    await host
      .get('[data-testid="egp-quadrant-mini-low-energy-high-pleasantness"]')
      .trigger('click')
    await host.get(`[data-testid="egp-quadrant-mini-${HELP}"]`).trigger('click')
    expect(tile().attributes('aria-pressed')).toBe('true')
    expect(host.vm.selections[0].intensity).toBe(1)
    await tile().trigger('click')
    expect(tile().attributes('aria-pressed')).toBe('false')
    expect(host.vm.selections).toEqual([])
    host.unmount()
  })

  it('shows example words at rest and five empty slots on hover; a slot sets the level', async () => {
    const host = mountHost()
    await host.get(`[data-testid="egp-quadrant-${HELP}"]`).trigger('click')
    const tile = () => host.get(`[data-testid="egp-tile-${FIRST}"]`)
    expect(tile().find('.ct-aux').exists()).toBe(true)
    expect(tile().findAll('.ct-dot')).toHaveLength(0)

    await tile().trigger('mouseenter')
    expect(tile().findAll('.ct-dot')).toHaveLength(5)
    expect(tile().findAll('.ct-dot.is-empty')).toHaveLength(5)

    // klik w 3. miejsce zaznacza i ustawia poziom 3
    await tile().findAll('.ct-dot')[2].trigger('click')
    expect(host.vm.selections).toEqual([{ emotionId: FIRST, intensity: 3 }])
    // klik w obecny poziom zdejmuje jedną kropkę
    await tile().findAll('.ct-dot')[2].trigger('click')
    expect(host.vm.selections).toEqual([{ emotionId: FIRST, intensity: 2 }])

    await tile().trigger('mouseleave')
    expect(tile().find('.ct-aux').exists()).toBe(false)
    expect(tile().findAll('.ct-dot')).toHaveLength(2)
    host.unmount()
  })

  it('shows a quiet "?" on hover that opens the group note without selecting the tile', async () => {
    const host = mountHost()
    await host.get(`[data-testid="egp-quadrant-${HELP}"]`).trigger('click')
    const tile = () => host.get(`[data-testid="egp-tile-${FIRST}"]`)
    expect(host.find(`[data-testid="egp-help-${FIRST}"]`).exists()).toBe(false)
    await tile().trigger('mouseenter')
    const help = host.get(`[data-testid="egp-help-${FIRST}"]`)
    await help.trigger('click')
    expect(host.get(`[data-testid="egp-note-${FIRST}"]`).text()).toContain(
      `emotionGroups.groups.${FIRST}.appraisal`
    )
    expect(host.vm.selections).toEqual([])
    // klik poza notką ją zamyka
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await host.vm.$nextTick()
    expect(host.find(`[data-testid="egp-note-${FIRST}"]`).exists()).toBe(false)
    host.unmount()
  })

  it('arrow keys never go below zero or above five, and left does not select', async () => {
    const host = mountHost()
    await host.get(`[data-testid="egp-quadrant-${HELP}"]`).trigger('click')
    const tile = host.get(`[data-testid="egp-tile-${FIRST}"]`)
    await tile.trigger('keydown', { key: 'ArrowLeft' })
    expect(host.vm.selections).toEqual([])
    for (let i = 0; i < 7; i++) await tile.trigger('keydown', { key: 'ArrowRight' })
    expect(host.vm.selections[0].intensity).toBe(5)
    host.unmount()
  })

  it('lists selections as removable badges by the title and counts them as quadrant dots', async () => {
    const second = GROUPS_BY_QUADRANT[HELP][1].slug
    const host = mountHost([{ emotionId: FIRST, intensity: 4 }, { emotionId: second }])
    expect(host.findAll('[data-testid^="egp-chip-"]')).toHaveLength(2)
    expect(host.get(`[data-testid="egp-quadrant-${HELP}"]`).findAll('.cq-dots > i')).toHaveLength(2)
    await host.get(`[data-testid="egp-chip-${FIRST}"] .fx`).trigger('click')
    expect(host.vm.selections).toEqual([{ emotionId: second }])
    host.unmount()
  })
})
