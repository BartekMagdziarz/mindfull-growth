import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { WeekPoint } from '@/domain/loadStateSeries'
import type { MaybeRating } from '@/domain/loadState'
import type { WeekRef } from '@/domain/period'
import LoadStateMatrix from '../charts/LoadStateMatrix.vue'
import LoadStateTrack from '../charts/LoadStateTrack.vue'

type Pair = [MaybeRating, MaybeRating]
const WEEKS = [
  { weekRef: '2026-W40' as WeekRef, label: '28.09' },
  { weekRef: '2026-W41' as WeekRef, label: '5.10' },
  { weekRef: '2026-W42' as WeekRef, label: '12.10' },
]
const points = (pairs: Pair[]): WeekPoint[] =>
  WEEKS.map((week, i) => ({ ...week, load: pairs[i][0], state: pairs[i][1] }))
const AREAS = [
  { key: 'body', label: 'Ciało', icon: 'fitness_center' },
  { key: 'emotions', label: 'Emocje', icon: 'favorite' },
  { key: 'tasks', label: 'Zadania', icon: 'checklist' },
  { key: 'closeOnes', label: 'Bliscy', icon: 'group' },
]
const series: Record<string, WeekPoint[]> = {
  body: points([
    [5, 2],
    [null, null],
    [1, 5],
  ]),
  emotions: points([
    [2, 2],
    [null, null],
    [3, 3],
  ]),
  tasks: points([
    [5, 5],
    [null, null],
    [4, 3],
  ]),
  closeOnes: points([
    [1, 4],
    [null, null],
    [5, 1],
  ]),
}

describe('LoadStateTrack', () => {
  it('draws the bar up to the load and puts the dot at the state', () => {
    const track = mount(LoadStateTrack, {
      props: { load: 5, state: 2, subject: 'Ciało · tydzień od 28.09' },
    })
    expect(track.find('.ls-track__bar').attributes('style')).toContain('--ls-track-to: 5')
    expect(track.find('.ls-track__dot').attributes('style')).toContain('--ls-track-at: 2')
    expect(track.find('.ls-track__bar').attributes('style')).toContain(
      'var(--mg-color-load-strain-3)'
    )
    expect(track.attributes('aria-label')).toBe(
      'Ciało · tydzień od 28.09: obciążenie 5, stan 2 · tydzień trudny'
    )
  })

  it('uses the shared completion well for the dot, recoloured to the bar', () => {
    const track = mount(LoadStateTrack, { props: { load: 5, state: 5, subject: 'Zadania' } })
    const dot = track.find('.ls-track__dot')
    expect(dot.classes()).toEqual(expect.arrayContaining(['mg-well', 'mg-well--done']))
    expect(dot.attributes('style')).toContain('--mg-well-mark: var(--mg-color-load-good-5)')
    expect(dot.attributes('style')).toContain('--mg-well-field: color-mix(')
  })

  it('leaves an empty rail for a pair without both ratings', () => {
    const track = mount(LoadStateTrack, {
      props: { load: 4, state: null, subject: 'Emocje · tydzień od 5.10' },
    })
    expect(track.find('.ls-track__rail--empty').exists()).toBe(true)
    expect(track.find('.ls-track__bar').exists()).toBe(false)
    expect(track.find('.ls-track__dot').exists()).toBe(false)
    expect(track.attributes('aria-label')).toBe('Emocje · tydzień od 5.10: bez refleksji')
  })

  it('paints state 3 as a transition along the bar and comes in three sizes', () => {
    const track = mount(LoadStateTrack, {
      props: { load: 4, state: 3, subject: 'Zadania', size: 'xs' },
    })
    expect(track.find('.ls-track__bar').attributes('style')).toContain('linear-gradient(90deg')
    expect(track.classes()).toContain('ls-track--xs')
  })
})

describe('LoadStateMatrix', () => {
  it('lays weeks out as rows and the areas as columns, naming each once', () => {
    const matrix = mount(LoadStateMatrix, { props: { series, areas: AREAS } })
    expect(matrix.findAll('.ls-matrix__area').map(node => node.text())).toEqual([
      'Ciało',
      'Emocje',
      'Zadania',
      'Bliscy',
    ])
    expect(matrix.findAll('.ls-matrix__week').map(node => node.text())).toEqual([
      '28.09',
      '5.10',
      '12.10',
    ])
    expect(matrix.findAll('.ls-matrix__cell')).toHaveLength(12)
    expect(matrix.findAllComponents(LoadStateTrack)).toHaveLength(12)
  })

  it('reads row by row: the second cell of a week is the second area', () => {
    const matrix = mount(LoadStateMatrix, { props: { series, areas: AREAS } })
    const tracks = matrix.findAllComponents(LoadStateTrack)
    expect(tracks[1].attributes('aria-label')).toBe(
      'Emocje · tydzień od 28.09: obciążenie 2, stan 2 · tydzień słaby'
    )
    expect(tracks[11].attributes('aria-label')).toBe(
      'Bliscy · tydzień od 12.10: obciążenie 5, stan 1 · tydzień trudny'
    )
  })

  it('keeps the row of a week without a reflection as empty rails', () => {
    const matrix = mount(LoadStateMatrix, { props: { series, areas: AREAS } })
    expect(matrix.findAll('.ls-track__rail--empty')).toHaveLength(4)
  })

  it('opens the week of the clicked cell', async () => {
    const matrix = mount(LoadStateMatrix, { props: { series, areas: AREAS } })
    await matrix.findAll('.ls-matrix__cell')[9].trigger('click')
    expect(matrix.emitted('open-week')).toEqual([['2026-W42']])
  })

  it('becomes a plain column for one area: no headers, no buttons', async () => {
    const matrix = mount(LoadStateMatrix, {
      props: {
        series,
        areas: [AREAS[0]],
        size: 'xs',
        showAreas: false,
        interactive: false,
      },
    })
    expect(matrix.findAll('.ls-matrix__area')).toHaveLength(0)
    expect(matrix.findAll('.ls-matrix__week')).toHaveLength(3)
    expect(matrix.findAll('button')).toHaveLength(0)
    expect(matrix.findAllComponents(LoadStateTrack)).toHaveLength(3)
    await matrix.find('.ls-matrix__cell').trigger('click')
    expect(matrix.emitted('open-week')).toBeUndefined()
  })

  it('becomes a single row for one week without the week column', () => {
    const oneWeek = Object.fromEntries(AREAS.map(area => [area.key, [series[area.key][0]]]))
    const matrix = mount(LoadStateMatrix, {
      props: { series: oneWeek, areas: AREAS, showWeeks: false, interactive: false },
    })
    expect(matrix.findAll('.ls-matrix__week')).toHaveLength(0)
    expect(matrix.findAllComponents(LoadStateTrack)).toHaveLength(4)
    expect(matrix.attributes('style')).toContain('--ls-matrix-cols: 4')
    expect(matrix.classes()).not.toContain('ls-matrix--weeks')
  })
})
