import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { buildStorySeries, classifyPair, pairColor, verdictSentence } from '~lab/lab/weekLoadState'
import LoadStateLegend from '~lab/components/load-state/LoadStateLegend.vue'
import LoadStateRibbon from '~lab/components/load-state/LoadStateRibbon.vue'

describe('obciążenie × stan → ćwiartka', () => {
  it('cztery narożniki trafiają do czterech ćwiartek', () => {
    expect(classifyPair(5, 5).quadrant).toBe('recovery')
    expect(classifyPair(4, 1).quadrant).toBe('strain')
    expect(classifyPair(1, 4).quadrant).toBe('ease')
    expect(classifyPair(2, 2).quadrant).toBe('low')
  })

  it('trójka stanu zawsze daje środek, niezależnie od obciążenia i trybu', () => {
    for (const load of [1, 3, 5] as const) {
      expect(classifyPair(load, 3, 'blend').quadrant).toBe('neutral')
      expect(classifyPair(load, 3, 'strict').quadrant).toBe('neutral')
    }
  })

  it('trójka obciążenia: blend miesza sąsiadów po stronie stanu, strict daje środek', () => {
    expect(classifyPair(3, 5, 'blend')).toEqual({ quadrant: 'ease', blend: ['ease', 'recovery'] })
    expect(classifyPair(3, 1, 'blend')).toEqual({ quadrant: 'low', blend: ['low', 'strain'] })
    expect(classifyPair(3, 5, 'strict').quadrant).toBe('neutral')
    expect(pairColor(3, 5)).toContain('color-mix')
    expect(pairColor(3, 5, { midpoint: 'strict' })).toBe('rgb(var(--sky-500))')
  })

  it('brak oceny to środek, a odcień „ciężko · dobrze” jest konfigurowalny', () => {
    expect(classifyPair(null, 4).quadrant).toBe('neutral')
    expect(pairColor(5, 5)).toBe('rgb(var(--sky-600))')
    expect(pairColor(5, 5, { recoveryShade: 'sky-700' })).toBe('rgb(var(--sky-700))')
  })

  it('werdykt jest neutralny i nazywa obszar', () => {
    expect(verdictSentence('body', 5, 4)).toMatch(/^Ciało: ciężki tydzień, a kończysz go w dobrym stanie/)
    expect(verdictSentence('tasks', 1, 2)).toMatch(/poza tym tygodniem/)
    expect(verdictSentence('emotions', 4, 3)).toMatch(/bez wyraźnego wychylenia/)
  })

  it('opowieść ma 24 tygodnie na każdy obszar i zawiera każdą ćwiartkę', () => {
    const series = buildStorySeries()
    const quadrants = new Set<string>()
    for (const points of Object.values(series)) {
      expect(points).toHaveLength(24)
      for (const p of points) quadrants.add(classifyPair(p.load, p.state).quadrant)
    }
    expect([...quadrants].sort()).toEqual(['ease', 'low', 'neutral', 'recovery', 'strain'])
  })
})

describe('komponenty konceptu', () => {
  it('legenda ma 25 komórek i emituje kliknięty punkt', async () => {
    const wrapper = mount(LoadStateLegend)
    const cells = wrapper.findAll('.ls-legend__cell')
    expect(cells).toHaveLength(25)
    await cells[0].trigger('click')
    expect(wrapper.emitted('pick')?.[0]).toEqual([{ load: 1, state: 5 }])
  })

  it('wstęga rysuje jeden pasek na tydzień i dwie linie', () => {
    const points = buildStorySeries().body.slice(-12)
    const wrapper = mount(LoadStateRibbon, { props: { points, label: 'Ciało' } })
    expect(wrapper.findAll('.ls-ribbon__band')).toHaveLength(12)
    expect(wrapper.findAll('.ls-ribbon__line')).toHaveLength(2)
  })
})
