import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import QuietMonthlyRitual from '~lab/experiments/QuietMonthlyRitual.vue'
import { buildRichVerificationScenario } from '@product/dev/richVerificationScenario'
import {
  monthWeeks,
  shiftMonth,
  toggleMonthWeek,
  weekValue,
  useQuietMonthlyRitualStore,
  canPlan,
} from '~lab/lab/quietMonthlyRitual'

async function setup(mode = 'plan', query = '') {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: QuietMonthlyRitual }],
  })
  await router.push(`/preview/ritual-month/quiet-v2/${mode}${query}`)
  await router.isReady()
  const wrapper = mount(QuietMonthlyRitual, {
    props: { presetId: mode },
    global: { plugins: [pinia, router] },
  })
  return { wrapper, router, pinia }
}
describe('quiet monthly state', () => {
  it('uses application week references and real bounds across month/year boundaries', () => {
    expect(monthWeeks('2026-02')).toHaveLength(5)
    expect(monthWeeks('2026-03')).toHaveLength(6)
    expect(monthWeeks('2027-02')).toHaveLength(4)
    expect(monthWeeks('2027-01')[0].weekRef).toBe('2026-W52')
    expect(monthWeeks('2027-01')[0].range).toContain('28 gru')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
  it('materializes whole-month coverage without losing other weeks', () => {
    expect(toggleMonthWeek({ wholeMonth: true, weeks: [] }, 'b', ['a', 'b', 'c'])).toEqual({
      wholeMonth: false,
      weeks: ['a', 'c'],
    })
    const t = {
      value: 10,
      distribution: 'auto' as const,
      operator: 'min' as const,
      weeks: {},
      entryDays: null,
    }
    expect(
      ['a', 'b', 'c'].map(w => weekValue(t, { wholeMonth: true, weeks: [] }, w, ['a', 'b', 'c']))
    ).toEqual([4, 3, 3])
    expect(t.value).toBe(10)
  })
  it('isolates months, modes and reset revisions and excludes retired/orphan objects', () => {
    setActivePinia(createPinia())
    const fixture = buildRichVerificationScenario(),
      store = useQuietMonthlyRitualStore()
    const get = (key: string) =>
      store.getDraft(key, fixture.priorities, fixture.objects, ['a', 'b'])
    get('0:aug:reflect').journal = 'Moje słowa'
    get('0:sep:plan').directions = ['learning']
    expect(get('0:sep:plan').directions).toEqual(['learning'])
    expect(get('1:aug:reflect').journal).toBe('')
    expect(get('0:aug:reflect').journal).toBe('Moje słowa')
    expect(
      fixture.objects.filter(canPlan).every(o => !['retired', 'orphan'].includes(o.status ?? ''))
    ).toBe(true)
  })
})
describe('quiet monthly flow', () => {
  it('edits actual week placement, preserves state through steps and shows concrete cards', async () => {
    const { wrapper } = await setup('plan', '?step=2')
    const row = wrapper.findAll('.qm-plan-item')[0]
    const button = row.findAll('.qm-dot')[0]
    const before = button.attributes('aria-pressed')
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).not.toBe(before)
    await wrapper.get('[aria-label="Następny krok"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.qm-week-card').length).toBeGreaterThan(3)
    expect(wrapper.text()).toContain('Dwie funkcje miesięcznie')
    await wrapper.get('[aria-label="Poprzedni krok"]').trigger('click')
    await flushPromises()
    expect(
      wrapper.findAll('.qm-plan-item')[0].findAll('.qm-dot')[0].attributes('aria-pressed')
    ).not.toBe(before)
  })
  it('keeps missing ratings empty, supports decisions, anchors and next-month handoff without overwriting a draft', async () => {
    const { wrapper, router, pinia } = await setup('reflect', '?month=2026-08')
    const store = useQuietMonthlyRitualStore(pinia)
    await wrapper.get('[aria-label="Wysiłek: 3 z 5"]').trigger('click')
    const reflectKey = Object.keys(store.drafts).find(k => k.endsWith(':reflect'))!
    expect(Object.values(store.drafts[reflectKey].assessments)[0].effort).toBe(3)
    await wrapper.findAll('.qm-verdicts button')[2].trigger('click')
    await wrapper.get('[aria-label="2. Kompas"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('output').map(o => o.text())).toEqual(['—', '—', '—', '—', '—'])
    await wrapper.get('[aria-label="Balans: 4 z 5"]').trigger('click')
    await wrapper.get('[aria-label="Balans: 4 z 5"]').trigger('click')
    expect(store.drafts[reflectKey].ratings.balance).toBeNull()
    await wrapper.get('[aria-label="4. Dziennik"]').trigger('click')
    await flushPromises()
    await wrapper.get('textarea').setValue('Chcę zachować więcej przestrzeni.')
    const fixture = buildRichVerificationScenario()
    store.getDraft('0::2026-09:plan', fixture.priorities, fixture.objects, []).directions = [
      'learning',
    ]
    await wrapper.findAll('.qr-finish button')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.month).toBe('2026-09')
    expect(store.drafts['0::2026-09:plan'].directions).toEqual(['learning'])
    expect(store.drafts[reflectKey].completed).toBe(true)
    expect(store.drafts[reflectKey].journal).toContain('przestrzeni')
  })
  it('allows an empty plan and does not require invented priorities', async () => {
    const { wrapper } = await setup('plan', '?sample=empty&step=2')
    expect(wrapper.text()).toContain('Nie wybrano działań')
    expect(wrapper.findAll('.qm-plan-item')).toHaveLength(0)
    await wrapper.get('[aria-label="Następny krok"]').trigger('click')
    await flushPromises()
    await wrapper.get('.qr-primary').trigger('click')
    expect(wrapper.text()).toContain('Zapisano w Labie')
  })
})

it('hands month support to a week as an explicit choice and returns to the saved month', async () => {
  const { default: QuietWeeklyRitual } = await import('~lab/experiments/QuietWeeklyRitual.vue')
  const pinia = createPinia()
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: '/preview/ritual-month/quiet-v2/:presetId', component: QuietMonthlyRitual, props: true },
    { path: '/preview/ritual-week/quiet-v2/:presetId', component: QuietWeeklyRitual, props: true },
  ] })
  await router.push('/preview/ritual-month/quiet-v2/plan?month=2026-09&sample=gentle&step=3')
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [pinia, router] } })
  await wrapper.get('.qr-primary').trigger('click'); await flushPromises()
  const monthPath = router.currentRoute.value.fullPath
  await wrapper.findAll('.qm-week-card')[0].get('.qr-quiet').trigger('click'); await flushPromises()
  expect(router.currentRoute.value.query.ref).toBe(monthWeeks('2026-09')[0].weekRef)
  expect(wrapper.text()).toContain('Wsparcie z planu miesiąca')
  const pick = wrapper.findAll('.qr-month-context button').find(b => b.text() === 'Porozmawiać o potrzebnym wsparciu')!
  expect(pick.attributes('aria-pressed')).toBe('false')
  await pick.trigger('click')
  expect(pick.attributes('aria-pressed')).toBe('true')
  await wrapper.get('[aria-label="Następny krok"]').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Porozmawiać o potrzebnym wsparciu')
  await router.push(monthPath); await flushPromises()
  expect(wrapper.text()).toContain('Zapisano w Labie')
})

it('keeps multiple priority links on one support row and resets a cleared target', async () => {
  const { wrapper, pinia } = await setup('plan', '?sample=gentle&step=2')
  const store = useQuietMonthlyRitualStore(pinia)
  const draft = Object.values(store.drafts)[0]
  expect(wrapper.findAll('.qm-plan-item')).toHaveLength(2)
  draft.targets['gentle-conversation'].value = 7
  draft.targets['gentle-conversation'].distribution = 'manual'
  await wrapper.get('[aria-label="Wyczyść przypisania: Porozmawiać o potrzebnym wsparciu"]').trigger('click')
  expect(draft.targets['gentle-conversation'].value).toBe(1)
  expect(draft.targets['gentle-conversation'].weeks).toEqual({})
  expect(draft.placements['gentle-conversation']).toEqual({ weeks: [], wholeMonth: false })
})
