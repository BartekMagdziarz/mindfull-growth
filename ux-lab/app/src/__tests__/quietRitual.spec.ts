import { describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import QuietWeeklyRitual from '~lab/experiments/QuietWeeklyRitual.vue'
import RitualPlanGroups from '~lab/components/RitualPlanGroups.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import {
  busyEmotionDays,
  evidenceResult,
  isPlaced,
  toggleDay,
  useQuietRitualStore,
} from '~lab/lab/quietRitual'
import EmotionDayStack from '~lab/components/EmotionDayStack.vue'
import { useLabStore } from '~lab/stores/lab.store'

async function setup(preset = 'plan', step = 0, sample = '') {
  const pinia = createPinia()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: QuietWeeklyRitual }],
  })
  await router.push(`/preview/ritual-week/quiet-v2/${preset}?step=${step}&sample=${sample}`)
  await router.isReady()
  const wrapper = mount(QuietWeeklyRitual, {
    props: { presetId: preset },
    global: { plugins: [pinia, router] },
  })
  return { wrapper, router, pinia }
}

describe('quiet weekly ritual', () => {
  it('distinguishes a whole-week commitment from seven daily assignments and keeps both through navigation', async () => {
    const { wrapper } = await setup('plan', 1)
    const rows = () => wrapper.findAll('.qr-plan-row')
    expect(rows()[2].find('.qr-whole').exists()).toBe(true)
    await rows()[0].findAll('.qr-row-tools button')[0].trigger('click')
    await wrapper.get('[aria-label="Następny krok"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('.qr-undated').exists()).toBe(false)
    expect(wrapper.find('.qr-unplaced').exists()).toBe(false)
    expect(wrapper.find('.qr-day-empty').exists()).toBe(false)
    expect(
      wrapper.findAll('.qr-day-card').map(card => card.findAll('li:not(.qr-plan-week)').length)
    ).toEqual([1, 1, 0, 1, 1, 0, 0])
    expect(wrapper.findAll('.qr-day-card').map(card => card.findAll('li.qr-plan-week').length)).toEqual([
      2, 2, 2, 2, 2, 2, 2,
    ])
    expect(wrapper.findAll('.qr-day-card')[0].text()).toContain('Cztery sesje deep work')
    expect(wrapper.findAll('.qr-day-card')[2].text()).toContain('Poranne rozciąganie')
    expect(
      wrapper.findAll('.qr-day-card')[2].get('li.qr-plan-week button').attributes('aria-label')
    ).toBe('Zmień przypisanie: Biegi 3 razy w tygodniu, cały tydzień')
    await wrapper.get('[aria-label="Poprzedni krok"]').trigger('click')
    await flushPromises()
    await rows()[0].get('.qr-flexible').trigger('click')
    expect(rows()[0].findAll('.qr-day-button[aria-pressed="true"]')).toHaveLength(3)
    expect(rows()[0].get('.qr-target').text()).toBe('3')
    expect(wrapper.text()).not.toContain('Wszystkie dni')
    for (const button of rows()[0].findAll('.qr-day-button[aria-pressed="false"]')) {
      await button.trigger('click')
    }
    expect(rows()[0].findAll('.qr-day-button[aria-pressed="true"]')).toHaveLength(7)
    expect(rows()[0].get('.qr-target').text()).toBe('3')
    await rows()[0].get('.qr-clear').trigger('click')
    expect(rows()[0].findAll('.qr-day-button[aria-pressed="true"]')).toHaveLength(0)
  })

  it('shows every planned name on a busy day by default and links each to its planner row', async () => {
    const { wrapper } = await setup('plan', 2, 'busy')
    const monday = wrapper.findAll('.qr-day-card')[0]
    expect(monday.findAll('details')).toHaveLength(0)
    expect(
      monday
        .findAll('.qr-plan-flat li:not(.qr-plan-week) button')
        .map(button => button.get('.qr-plan-title').text())
    ).toEqual([
      'Biegi 3 razy w tygodniu',
      'Cztery sesje deep work w tygodniu',
      'Wspólna kolacja',
      'Czytanie 20 minut',
      'Jakość snu',
      'Kawy w ciągu dnia',
      'Zaplanować budżet miesiąca',
    ])
    expect(monday.findAll('li.qr-plan-week')).toHaveLength(4)
    expect(wrapper.findAll('.qr-day-card').every(card => card.findAll('li.qr-plan-week').length === 4)).toBe(true)
    await monday.findAll('.qr-plan-flat li:not(.qr-plan-week) button')[2].trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Kiedy znajdziesz na to miejsce?')
    expect(
      wrapper.findAll('.qr-plan-row').some(row => row.text().includes('Wspólna kolacja'))
    ).toBe(true)
  })

  it('falls back to collapsed family groups only above the flat limit', () => {
    const items = Array.from({ length: 9 }, (_, n) => ({
      key: `k${n}`,
      title: `Działanie ${n}`,
      family: n < 5 ? 'habit' : 'tracker',
      cadence: 'weekly',
      entryMode: 'completion',
      priorityKeys: [],
      chart: [],
    })) as unknown as LabFixtureObject[]
    const grouped = mount(RitualPlanGroups, { props: { items, context: 'Poniedziałek' } })
    expect(grouped.findAll('details').map(d => d.get('summary').attributes('aria-label'))).toEqual(
      ['Nawyki: 5, Poniedziałek', 'Trackery: 4, Poniedziałek']
    )
    expect(grouped.findAll('details[open]')).toHaveLength(0)
    const flat = mount(RitualPlanGroups, {
      props: { items: items.slice(0, 8), context: 'Poniedziałek' },
    })
    expect(flat.findAll('details')).toHaveLength(0)
    expect(flat.findAll('.qr-plan-flat li')).toHaveLength(8)
  })

  it('creates, edits and removes intentions, preserving other form choices across steps', async () => {
    const { wrapper, pinia } = await setup()
    expect(wrapper.find('.qr-composer').exists()).toBe(false)
    await wrapper.get('.qr-add').trigger('click')
    await wrapper.get('.qr-name input').setValue('Spacer bez telefonu')
    await wrapper.get('.qr-times input').setValue(2)
    await wrapper.get('.qr-composer input[type=checkbox]').setValue(true)
    await wrapper.get('.qr-composer').trigger('submit')
    expect(wrapper.get('.qr-count').text()).toBe('4 wybrane')
    await wrapper.get('[aria-label="Następny krok"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Spacer bez telefonu')
    await wrapper.get('[aria-label="Poprzedni krok"]').trigger('click')
    await flushPromises()
    await wrapper.get('[aria-label="Edytuj intencję: Spacer bez telefonu"]').trigger('click')
    expect((wrapper.get('.qr-times input').element as HTMLInputElement).value).toBe('2')
    expect(
      (wrapper.get('.qr-composer input[type=checkbox]').element as HTMLInputElement).checked
    ).toBe(true)
    await wrapper.get('.qr-name input').setValue('Spacer w lesie')
    await wrapper.get('.qr-composer').trigger('submit')
    await wrapper.get('[aria-label="Edytuj intencję: Spacer w lesie"]').trigger('click')
    await wrapper.get('.qr-composer details button').trigger('click')
    expect(wrapper.text()).not.toContain('Spacer w lesie')
    expect(wrapper.get('.qr-count').text()).toBe('3 wybrane')
    expect(Object.values(useQuietRitualStore(pinia).drafts)[0].intentions).toHaveLength(0)
  })

  it('keeps comments, nullable ratings and text on revisit without pre-filling scores', async () => {
    const { wrapper, router } = await setup('reflect', 0)
    expect(wrapper.findAll('textarea')).toHaveLength(0)
    await wrapper.findAll('.qr-comment-toggle')[0].trigger('click')
    await wrapper.get('textarea').setValue('Pomogło umówienie terminu.')
    await wrapper.get('[aria-label="Następny krok"]').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('.qr-scale [aria-pressed="true"]')).toHaveLength(0)
    const rating = wrapper.get('[aria-label="Ciało, Wysiłek: 4 z 5"]')
    await rating.trigger('click')
    expect(rating.attributes('aria-pressed')).toBe('true')
    await rating.trigger('click')
    expect(rating.attributes('aria-pressed')).toBe('false')
    await router.replace({ query: { step: '0' } })
    await flushPromises()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe(
      'Pomogło umówienie terminu.'
    )
    await router.replace({ query: { step: '6' } })
    await flushPromises()
    expect(wrapper.find('.qr-context').exists()).toBe(false)
    await wrapper.get('[aria-label="Dziennik tygodnia"]').setValue('To był dobry tydzień.')
    expect(wrapper.get('.qr-journal-tools').text()).toContain('4 słów')
    await wrapper.get('.qr-finish .qr-primary').trigger('click')
    expect(wrapper.get('.qr-save').text()).toContain('Zakończono')
    await wrapper.get('[aria-label="Dziennik tygodnia"]').setValue('Zmiana')
    expect(wrapper.get('.qr-save').text()).toContain('Szkic w Labie')
  })

  it('resets with Lab revision and preserves completion on remount', async () => {
    const { wrapper, pinia, router } = await setup('plan', 2)
    await wrapper.get('.qr-finish .qr-primary').trigger('click')
    wrapper.unmount()
    const again = mount(QuietWeeklyRitual, {
      props: { presetId: 'plan' },
      global: { plugins: [pinia, router] },
    })
    expect(again.get('.qr-save').text()).toContain('Zakończono')
    useLabStore(pinia).resetExperiment()
    await flushPromises()
    expect(again.get('.qr-save').text()).toContain('Szkic w Labie')
  })

  it('routes the completed reflection to the immediately following week', async () => {
    const { wrapper, router, pinia } = await setup('reflect', 6)
    await wrapper.get('.qr-finish .qr-quiet').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/preview/ritual-week/quiet-v2/plan')
    expect(router.currentRoute.value.query.ref).toBe(useLabStore(pinia).fixture.refs.currentWeek)
    expect(Object.values(useQuietRitualStore(pinia).drafts).some(d => d.completed)).toBe(true)
  })

  it('merges facts into the review: day headers count records, journal/emotion rows use symbols, a column can be selected', async () => {
    const { wrapper } = await setup('reflect', 0)
    expect(wrapper.text()).not.toContain('zapisów działań')
    expect(wrapper.text()).not.toContain('Działanie')
    const heads = wrapper.findAll('.qr-day-head')
    expect(heads).toHaveLength(7)
    expect(heads[0].attributes('aria-label')).toMatch(/^Poniedziałek \d+$/)
    expect(wrapper.findAll('.qr-record-stack')).toHaveLength(0)
    expect(wrapper.get('.qr-journal-row').findAll('.qr-journal-mark')).toHaveLength(3)
    expect(wrapper.get('.qr-emotion-row').findAll('.eds i')).toHaveLength(10)
    expect(wrapper.get('.qr-journal-row .qr-result').text()).toBe('3 wpisy')
    expect(wrapper.get('.qr-emotion-row .qr-result').text()).toBe('10 zapisów')
    expect(wrapper.find('.qr-day-detail').exists()).toBe(false)
    await heads[1].trigger('click')
    expect(wrapper.get('.qr-day-detail').text()).toMatch(/^Wtorek \d+/)
    expect(wrapper.get('.qr-day-detail').text()).not.toMatch(/\d+ zapis/)
    expect(wrapper.findAll('.qr-evidence-row').every(row => row.findAll('.qr-col-selected').length === 1)).toBe(true)
    await heads[1].trigger('click')
    expect(wrapper.find('.qr-day-detail').exists()).toBe(false)
  })

  it('rates with vertical bars and +/- controls and keeps free tags per area in their own field', async () => {
    const { wrapper, router } = await setup('reflect', 1)
    const effort = () => wrapper.get('.qr-axis--effort')
    const state = () => wrapper.get('.qr-axis--state')
    expect(effort().get('output').text()).toBe('—')
    expect(effort().get('[aria-label="Zmniejsz: Wysiłek"]').attributes('disabled')).toBeDefined()
    // Previous-week ghost (Ciało · Wysiłek = 3) only before first use of this bar
    expect(effort().findAll('.qr-scale--vertical button.ghost')).toHaveLength(3)
    expect(effort().get('.qr-scale--vertical button.ghost').attributes('title')).toBe('Poprzedni tydzień: 3')
    expect(state().findAll('.qr-scale--vertical button.ghost')).toHaveLength(4)
    await effort().get('[aria-label="Zwiększ: Wysiłek"]').trigger('click')
    await effort().get('[aria-label="Zwiększ: Wysiłek"]').trigger('click')
    expect(effort().get('output').text()).toBe('2')
    expect(effort().findAll('.qr-scale--vertical button.filled')).toHaveLength(2)
    expect(effort().findAll('.qr-scale--vertical button.ghost')).toHaveLength(0)
    expect(state().findAll('.qr-scale--vertical button.ghost')).toHaveLength(4)
    expect(effort().get('[aria-label="Ciało, Wysiłek: 2 z 5"]').attributes('aria-pressed')).toBe('true')
    await effort().get('.qr-scale--vertical').trigger('keydown', { key: 'ArrowUp' })
    expect(effort().get('output').text()).toBe('3')
    await effort().get('[aria-label="Zmniejsz: Wysiłek"]').trigger('click')
    await effort().get('[aria-label="Zmniejsz: Wysiłek"]').trigger('click')
    await effort().get('[aria-label="Zmniejsz: Wysiłek"]').trigger('click')
    expect(effort().get('output').text()).toBe('—')
    expect(effort().findAll('.qr-scale--vertical button.ghost')).toHaveLength(0)
    // Tags are one field under both rating fields, shared by the whole life area
    const tags = () => wrapper.get('.qr-tags')
    expect(effort().find('.qr-tags').exists()).toBe(false)
    expect(state().find('.qr-tags').exists()).toBe(false)
    expect(wrapper.findAll('.qr-tags')).toHaveLength(1)
    expect(tags().findAll('.qr-tag-list li')).toHaveLength(0)
    expect(tags().find('.qr-tag-suggestions').exists()).toBe(false)
    await tags().get('.qr-tag-form input').setValue('sen')
    await tags().get('.qr-tag-form').trigger('submit')
    expect(tags().findAll('.qr-tag-list li').map(li => li.get('span').text())).toEqual(['sen'])
    expect(tags().get('h2').text()).toContain('Tagi · 1')
    expect(tags().find('.qr-tag-suggestions').exists()).toBe(false)
    await router.replace({ query: { step: '2' } })
    await flushPromises()
    expect(tags().findAll('.qr-tag-list li')).toHaveLength(0)
    expect(tags().findAll('.qr-tag-suggestions button').map(b => b.text())).toEqual(['sen'])
    await tags().get('.qr-tag-suggestions button').trigger('click')
    expect(tags().findAll('.qr-tag-list li')).toHaveLength(1)
    expect(tags().find('.qr-tag-suggestions').exists()).toBe(false)
    await tags().get('[aria-label="Usuń tag: sen"]').trigger('click')
    expect(tags().findAll('.qr-tag-list li')).toHaveLength(0)
  })

  it('renders journal context as a side column with visual summaries, no text inserts, and only filled anchors', async () => {
    const { wrapper, router } = await setup('reflect', 5)
    await wrapper.findAll('.qr-anchors article > button')[1].trigger('click')
    await wrapper.get('.qr-anchors textarea').setValue('Za dużo spotkań.')
    await router.replace({ query: { step: '6' } })
    await flushPromises()
    expect(wrapper.find('.qr-context-col').exists()).toBe(false)
    await wrapper.get('[aria-expanded]:not(.qr-icon)').trigger('click')
    const aside = wrapper.get('.qr-context-col')
    expect(wrapper.find('.qr-inserts').exists()).toBe(false)
    expect(aside.text()).not.toContain('Wdzięczność:')
    expect(aside.findAll('.qr-ctx-pair')).toHaveLength(4)
    expect(aside.findAll('.qr-ctx-quadrants i')).toHaveLength(4)
    expect(aside.findAll('.qr-ctx-days li')).toHaveLength(7)
    expect(aside.findAll('.qr-ctx-days li')[1].findAll('.eds i')).toHaveLength(2)
    expect(aside.findAll('.qr-ctx-list li')).toHaveLength(3)
    expect(aside.findAll('.qr-ctx-action')).toHaveLength(8)
    expect(aside.findAll('.qr-ctx-action--none')).toHaveLength(2)
    const quotes = aside.findAll('.qr-ctx-quotes li')
    expect(quotes).toHaveLength(1)
    expect(quotes[0].text()).toContain('Co było trudne')
    expect(quotes[0].text()).toContain('Za dużo spotkań.')
    expect(aside.text()).not.toContain('Co poszło dobrze')
    expect(aside.text()).not.toContain('pon · ')
  })

  it('stacks a day with all four emotion quadrants as four bands scaled by count', async () => {
    const four = mount(EmotionDayStack, {
      props: { emotions: busyEmotionDays[0], dayLabel: 'pon' },
    })
    expect(four.findAll('i')).toHaveLength(4)
    expect(four.attributes('aria-label')).toBe(
      'pon: Spokój, Radość, Napięcie, Zmęczenie (Energia · przyjemne 1 · Energia · nieprzyjemne 1 · Spokój · przyjemne 1 · Spokój · nieprzyjemne 1)'
    )
    const six = mount(EmotionDayStack, { props: { emotions: busyEmotionDays[3] } })
    const heights = six.findAll('i').map(i => parseFloat((i.element as HTMLElement).style.height))
    expect(heights).toEqual([12, 6, 6, 12])
    expect(heights.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(36)
    const empty = mount(EmotionDayStack, { props: { emotions: [], dayLabel: 'niedz' } })
    expect(empty.findAll('i')).toHaveLength(0)
    expect(empty.classes()).toContain('eds--empty')
    expect(empty.attributes('aria-label')).toBe('niedz: bez zapisu emocji')
    const { wrapper } = await setup('reflect', 0, 'busy')
    expect(wrapper.get('.qr-emotion-row .qr-result').text()).toBe('19 zapisów')
    expect(wrapper.findAll('.qr-emotion-row .eds')[0].findAll('i')).toHaveLength(4)
    expect(wrapper.findAll('.qr-emotion-row .eds')[1].findAll('i')).toHaveLength(1)
  })

  it('does not turn missing evidence into a zero or weekly flexibility into daily load', () => {
    expect(evidenceResult('intention-budget')).toBeNull()
    expect(evidenceResult('tracker-coffee')).toBe(7)
    expect(evidenceResult('kr-runs')).toBe(3)
    expect(isPlaced({ days: [], wholeWeek: true })).toBe(true)
    expect(toggleDay({ days: [], wholeWeek: true }, '2026-09-07')).toEqual({
      days: ['2026-09-07'],
      wholeWeek: false,
    })
  })
})
