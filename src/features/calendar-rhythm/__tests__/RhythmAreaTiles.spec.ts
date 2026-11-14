import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import RhythmAreaTiles, { type AreaRating } from '../RhythmAreaTiles.vue'

const AREAS: AreaRating[] = [
  { key: 'body', label: 'Ciało', icon: 'fitness_center', load: 4, state: 4 },
  { key: 'emotions', label: 'Emocje', icon: 'favorite', load: 5, state: 2 },
  { key: 'tasks', label: 'Zadania', icon: 'checklist', load: 2, state: 1 },
  { key: 'closeOnes', label: 'Bliscy', icon: 'diversity_1', load: null, state: null },
]

describe('RhythmAreaTiles', () => {
  it('draws one tile per area with the shared load & state mark', () => {
    const wrapper = mount(RhythmAreaTiles, { props: { areas: AREAS } })
    const tiles = wrapper.findAll('.rat__tile')
    expect(tiles).toHaveLength(4)
    expect(tiles.map(tile => tile.find('.rat__name').text())).toEqual(AREAS.map(a => a.label))
    expect(wrapper.findAll('.ls-track')).toHaveLength(4)
    expect(wrapper.findAll('.ls-track__bar')).toHaveLength(3)
  })

  it('spells both ratings out as dots on the 1–5 scale, revealed under the cursor', () => {
    const wrapper = mount(RhythmAreaTiles, { props: { areas: AREAS } })
    const rows = wrapper.findAll('.rat__tile')[1].findAll('.rat__row')
    expect(rows.map(row => row.find('small').text())).toEqual(['obciążenie', 'stan'])
    expect(rows.map(row => row.findAll('.mg-well')).map(dots => dots.length)).toEqual([5, 5])
    expect(rows.map(row => row.findAll('.mg-well--done').length)).toEqual([5, 2])
    // the dots repeat the description, so they stay out of the accessibility tree
    expect(wrapper.find('.rat__more').attributes('aria-hidden')).toBe('true')
  })

  it('takes the colour of the pair and stays plain without a rating', () => {
    const wrapper = mount(RhythmAreaTiles, { props: { areas: AREAS } })
    const tiles = wrapper.findAll('.rat__tile')
    expect(tiles[0].attributes('style')).toContain('--rat-tint')
    expect(tiles[3].attributes('style')).toBeUndefined()
    expect(tiles[3].classes()).toContain('rat__tile--empty')
    expect(tiles[3].find('.rat__more').exists()).toBe(false)
    expect(tiles[3].attributes('aria-label')).toBe('Bliscy: bez oceny · pokaż w tabeli: Refleksja')
  })

  it('describes the ratings in words and opens the reflection lens on click', async () => {
    const wrapper = mount(RhythmAreaTiles, { props: { areas: AREAS, draft: true } })
    const tile = wrapper.findAll('.rat__tile')[1]
    expect(tile.attributes('aria-label')).toBe(
      'Emocje: obciążenie 5 z 5, stan 2 z 5 · szkic · pokaż w tabeli: Refleksja'
    )
    expect(tile.attributes('aria-pressed')).toBe('false')
    await tile.trigger('click')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('marks every tile as pressed while the reflection lens is on', () => {
    const wrapper = mount(RhythmAreaTiles, { props: { areas: AREAS, active: true } })
    const tiles = wrapper.findAll('.rat__tile')
    expect(tiles.every(tile => tile.attributes('aria-pressed') === 'true')).toBe(true)
    expect(tiles.every(tile => tile.classes().includes('is-active'))).toBe(true)
  })
})
