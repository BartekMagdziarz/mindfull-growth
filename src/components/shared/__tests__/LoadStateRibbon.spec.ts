import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import LoadStateRibbon from '../charts/LoadStateRibbon.vue'
import type { WeekPoint } from '@/domain/loadStateSeries'
import type { WeekRef } from '@/domain/period'

const pt = (i: number, load: number | null, state: number | null): WeekPoint => ({
  weekRef: `2026-W${String(30 + i).padStart(2, '0')}` as WeekRef,
  label: `${i}.09`,
  load: load as WeekPoint['load'],
  state: state as WeekPoint['state'],
})

describe('LoadStateRibbon', () => {
  it('renders one hit zone per point and a single unbroken segment for full data', () => {
    const w = mount(LoadStateRibbon, { props: { points: [pt(0, 2, 4), pt(1, 3, 4), pt(2, 5, 2)], label: 'Ciało' } })
    expect(w.findAll('.ls-ribbon__hit')).toHaveLength(3)
    expect(w.findAll('.ls-ribbon__line--state')).toHaveLength(1)
    expect(w.findAll('.ls-ribbon__band')).toHaveLength(1)
  })

  it('breaks the ribbon at weeks without a reflection', () => {
    const w = mount(LoadStateRibbon, { props: { points: [pt(0, 2, 4), pt(1, null, null), pt(2, 5, 2), pt(3, 4, 4)] } })
    expect(w.findAll('.ls-ribbon__line--state')).toHaveLength(2)
    expect(w.findAll('.ls-ribbon__band')).toHaveLength(2)
    // gradient stops only for rated weeks
    expect(w.findAll('stop')).toHaveLength(3)
  })

  it('emits select with the week ref of the clicked zone', async () => {
    const w = mount(LoadStateRibbon, { props: { points: [pt(0, 2, 4), pt(1, 3, 4)] } })
    await w.findAll('.ls-ribbon__hit')[1].trigger('click')
    expect(w.emitted('select')?.[0]).toEqual(['2026-W31'])
  })

  it('shows the quadrant tooltip on hover unless quiet', async () => {
    const w = mount(LoadStateRibbon, { props: { points: [pt(0, 5, 5)] } })
    await w.find('.ls-ribbon__hit').trigger('mouseenter')
    expect(w.find('.ls-ribbon__tip').text()).toContain('aktywny i dobry')
    const q = mount(LoadStateRibbon, { props: { points: [pt(0, 5, 5)], quiet: true } })
    await q.find('.ls-ribbon__hit').trigger('mouseenter')
    expect(q.find('.ls-ribbon__tip').exists()).toBe(false)
  })

  it('prints axis labels every tick', () => {
    const points = Array.from({ length: 10 }, (_, i) => pt(i, 3, 4))
    const w = mount(LoadStateRibbon, { props: { points, showAxis: true } })
    const labels = w.findAll('.ls-ribbon__axis span').map(s => s.text())
    expect(labels.filter(Boolean)).toHaveLength(5)
  })
})
