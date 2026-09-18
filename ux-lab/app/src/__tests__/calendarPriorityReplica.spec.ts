import { createPinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import CalendarPriorityRhythmReplica from '~lab/experiments/CalendarPriorityRhythmReplica.vue'

async function mountRouted(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/preview/:viewId/:variantId/:presetId', component: CalendarPriorityRhythmReplica, props: true }],
  })
  await router.push(`/preview/calendar/priority-rhythm-v1/closed${query}`)
  await router.isReady()
  const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return { wrapper, router }
}

type Routed = Awaited<ReturnType<typeof mountRouted>>['wrapper']
type Wrapper = { find: Routed['find']; findAll: Routed['findAll'] }
const viewSelect = (wrapper: Wrapper) => wrapper.find<HTMLSelectElement>('.rb-view__select')
const viewIds = (wrapper: Wrapper) => viewSelect(wrapper).findAll('option').map(o => (o.element as HTMLOptionElement).value)
const setView = async (wrapper: Wrapper, id: string) => { await viewSelect(wrapper).setValue(id); await flushPromises() }
const seriesNames = (wrapper: Wrapper) => wrapper.findAll('.rb-series .rb-name--series').map(n => n.text())
/** Etykiety akcji okresu w nagłówku podsumowania (bez nazw ikon). */
const actionLabels = (wrapper: Wrapper) => wrapper.findAll('.ps__actions .cp-btn:not(.cp-btn--quiet)').map(b => b.text().replace(/^[a-z_]+(?=[A-ZŁŚŹŻ])/, ''))

describe('05 · Rytm kierunków — powierzchnia miesiąca', () => {
  it('wejście: lista spojrzeń w rogu osi, domyślnie pierwszy kierunek fokusu z seriami, bez panelu i bez pustej kolumny narzędzi', async () => {
    const { wrapper } = await mountRouted('?sample=closed')
    expect(wrapper.text()).toContain('Luty 2027')
    expect(wrapper.findAll('.rb-axis__unit').map(b => b.text())).toEqual(['01–07.02', '08–14.02', '15–21.02', '22–28.02'])
    // lista: kierunki z aktywnością (Rzemiosło bez obiektów odpada), fokus tygodni, rodziny z aktywnością, oceny, wpisy
    expect(viewIds(wrapper)).toEqual(['dir:fitness', 'dir:support', 'focus', 'type:keyResult', 'type:habit', 'type:tracker', 'type:intention', 'reflection', 'entries'])
    expect(viewSelect(wrapper).findAll('optgroup').map(g => g.attributes('label'))).toEqual(['Kierunki', 'Obiekty', 'Okres'])
    expect(viewSelect(wrapper).element.value).toBe('dir:fitness')
    // brak grup z kropkami: tabela od razu pokazuje serie Formy
    expect(wrapper.find('.rb-group').exists()).toBe(false)
    const labels = seriesNames(wrapper)
    expect(labels[0]).toContain('Trening siłowy')
    expect(labels[1]).toContain('Cardio')
    expect(labels[2]).toContain('Waga')
    expect(wrapper.text()).toContain('Pozostałe działania (1)')
    expect(wrapper.findAll('.sm-slot.done')).toHaveLength(7)
    expect(wrapper.findAll('.sm-slot')).toHaveLength(8)
    expect(wrapper.find('.rb-sigma--head').text()).toContain('Σ')
    expect(wrapper.find('.pd').exists()).toBe(false)
    expect(wrapper.find('.rb-tools').exists()).toBe(false)
    // jedna akcja okresu w nagłówku podsumowania (luty zamknięty, refleksja jest) — bez stopki i bez powtórzeń
    expect(actionLabels(wrapper)).toEqual(['Edytuj refleksję'])
    expect(wrapper.find('.cp__foot').exists()).toBe(false)
  })

  it('zmiana spojrzenia listą: inny kierunek podmienia serie; wybór trafia do URL', async () => {
    const { wrapper, router } = await mountRouted('?sample=closed')
    await setView(wrapper, 'dir:support')
    expect(router.currentRoute.value.query.view).toBe('dir:support')
    expect(seriesNames(wrapper).join(' ')).not.toContain('Cardio')
    expect(wrapper.text()).toContain('Sprawa organizacyjna')
    // dawny parametr `open` nadal działa jako alias
    await router.push('/preview/calendar/priority-rhythm-v1/closed?open=type:habit')
    await flushPromises()
    expect(viewSelect(wrapper).element.value).toBe('type:habit')
  })

  it('komórka serii i nagłówek jednostki to zoom: tydzień 3 otwiera się w skali tygodnia ze spojrzeniem Formy', async () => {
    const { wrapper, router } = await mountRouted('?sample=closed')
    await wrapper.findAll('.rb-series')[0].findAll('.rb-cell--series')[2].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.scale).toBe('week')
    expect(router.currentRoute.value.query.ref).toBe('2027-W07')
    expect(wrapper.text()).toContain('15–21 lutego 2027')
    expect(wrapper.find('.rb-board--week').exists()).toBe(true)
    expect(viewSelect(wrapper).element.value).toBe('dir:fitness')
    expect(wrapper.find('.pd').exists()).toBe(false)
    // dzień w tygodniu: przejście do Dzisiaj (w Labie symulowane)
    await wrapper.findAll('.rb-axis__unit')[3].trigger('click')
    expect(wrapper.find('.cp__toast').text()).toContain('→ Dzisiaj · 2027-02-18')
    // Wstecz wraca do miesiąca (adres startowy bez query = domyślny luty)
    router.back()
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()
    expect(wrapper.find('.rb-board--month').exists()).toBe(true)
    expect(wrapper.text()).toContain('Luty 2027')
  })

  it('spojrzenia okresu: fokus tygodni jako pasy z gwiazdką, oceny tygodni jako wiersz Wysiłek/Stan', async () => {
    const { wrapper } = await mountRouted('?sample=closed')
    await setView(wrapper, 'focus')
    const lanes = wrapper.findAll('.rb-focus-lane')
    expect(lanes).toHaveLength(2)
    expect(lanes[0].text()).toContain('Forma fizyczna')
    expect(lanes[1].text()).toContain('Przygotowanie do ciąży')
    expect(lanes[0].findAll('.rb-focus-band')).toHaveLength(4)
    expect(lanes[1].findAll('.rb-focus-band')).toHaveLength(2) // tygodnie 1 (Rozmowa) i 3 (Sprawa)
    await setView(wrapper, 'reflection')
    const units = wrapper.find('.rb-series--ratings')
    expect(units.findAll('.ratings-mini')).toHaveLength(3)
    expect(units.findAll('.ev-mark--empty')).toHaveLength(1)
    // ocena własna miesiąca żyje w podsumowaniu, nie w tabeli
    expect(wrapper.find('.rb-period').exists()).toBe(false)
    expect(wrapper.findAll('.ps__hero .ps__bars li')).toHaveLength(5)
  })

  it('rodziny: Nawyki i Trackery jako serie; Wpisy: 7 slotów dni', async () => {
    const { wrapper } = await mountRouted('?sample=closed')
    await setView(wrapper, 'type:habit')
    expect(wrapper.findAll('.rb-series').map(r => r.text())).toEqual([expect.stringContaining('Poranek'), expect.stringContaining('Wieczór'), expect.stringContaining('Kawy')])
    expect(wrapper.findAll('.rb-series')[0].findAll('.sm-day--partial')).toHaveLength(1)
    await setView(wrapper, 'type:tracker')
    expect(wrapper.findAll('.rb-series').map(r => r.text())).toEqual([expect.stringContaining('Sen')])
    await setView(wrapper, 'entries')
    const journalRow = wrapper.findAll('.rb-series--entries')[0]
    expect(journalRow.findAll('.entry-slots')).toHaveLength(4)
    expect(journalRow.findAll('.rb-cell--series')[2].attributes('title')).toBe('Otwórz tydzień')
  })

  it('podsumowanie: ocena jako słupki bez średniej, kafle rodzin z procentem i kleksem, skróty ustawiają spojrzenie tabeli', async () => {
    const { wrapper } = await mountRouted('?sample=closed')
    expect(wrapper.find('.ps__hero .ps__eyebrow').text()).toContain('Ocena miesiąca')
    expect(wrapper.findAll('.ps__hero .ps__bars li').map(li => li.find('small').text())).toEqual(['Balans', 'Sens', 'Rozwój', 'Zasady', 'Wpływ'])
    expect(wrapper.findAll('.ps__hero .ps__col b').map(b => b.text())).toEqual(['3', '4', '3', '4', '3'])
    expect(wrapper.text()).not.toContain('3,4 / 5')
    const tiles = wrapper.findAll('.ps__tile')
    expect(tiles.map(t => t.find('.ps__tile-label').text())).toEqual(['Cele', 'Nawyki', 'Trackery', 'Intencje'])
    expect(tiles.map(t => t.find('.ps__pct').text())).toEqual(['60%', '33%', '100%', '100%'])
    expect(tiles.map(t => t.find('.ps__tile-hit').attributes('title')!.replace(/\s+/g, ''))).toEqual([expect.stringContaining('6/10'), expect.stringContaining('4/12'), expect.stringContaining('4/4'), expect.stringContaining('2/2')])
    expect(wrapper.find('.ps__quote').text()).toContain('Z powrotu po słabszym trzecim tygodniu')
    expect(wrapper.text()).not.toContain('bez dnia')
    // chip fokusu Formy jest aktywny, bo tabela pokazuje Formę; kafel Nawyki to skrót do spojrzenia type:habit
    expect(wrapper.findAll('.ps__chip.is-active').map(c => c.text())).toEqual([expect.stringContaining('Forma fizyczna')])
    await tiles[1].find('.ps__tile-hit').trigger('click')
    expect(viewSelect(wrapper).element.value).toBe('type:habit')
    expect(seriesNames(wrapper)[0]).toContain('Poranek')
    expect(wrapper.findAll('.ps__tile.is-active').map(t => t.find('.ps__tile-label').text())).toEqual(['Nawyki'])
    expect(wrapper.find('.ps__chip.is-active').exists()).toBe(false)
    // skrót z kafla oceny → oceny tygodni
    await wrapper.find('.ps__drill').trigger('click')
    expect(viewSelect(wrapper).element.value).toBe('reflection')
    expect(wrapper.find('.rb-series--ratings').exists()).toBe(true)
  })

  it('granulacja per wykres: lupa w rogu wiersza tylko przy linii/słupkach; Cardio w dniach → słupki na warstwie wiersza, Waga zostaje w tygodniach', async () => {
    const { wrapper, router } = await mountRouted('?sample=closed')
    // Forma otwarta domyślnie: Trening = sloty (bez lupy), Cardio = słupki, Waga = linia
    const rows = wrapper.findAll('.rb-series')
    expect(rows.map(r => r.find('.rb-zoom').exists())).toEqual([false, true, true])
    expect(wrapper.find('.cp__grain').exists()).toBe(false)
    const weightRow = rows.find(r => r.text().includes('Waga'))!
    expect(weightRow.findAll('.sl-dot')).toHaveLength(3)
    expect(weightRow.findAll('.sl-bridge')).toHaveLength(1)
    expect(wrapper.findAll('.sm-bar__value').length).toBeGreaterThan(0)
    const cardioRow = rows.find(r => r.text().includes('Cardio'))!
    expect(cardioRow.find('.rb-zoom').attributes('title')).toBe('Wykres w dniach')
    await cardioRow.find('.rb-zoom').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.fine).toBe('cardio')
    expect(cardioRow.findAll('.sl-bar')).toHaveLength(7)
    expect(cardioRow.findAll('.sl-target')).toHaveLength(0)
    expect(cardioRow.findAll('.sm-bar__value')).toHaveLength(0)
    expect(cardioRow.find('.rb-zoom').attributes('title')).toBe('Wykres w tygodniach')
    // inny wykres nie zmienia granulacji
    expect(weightRow.findAll('.sl-dot')).toHaveLength(3)
    // wybór przechodzi do URL i wraca; w tygodniu lupa znika (dzień nie ma podjednostek)
    await wrapper.findAll('.cp__scales button').find(b => b.text() === 'Tydzień')!.trigger('click')
    await flushPromises()
    expect(wrapper.find('.rb-zoom').exists()).toBe(false)
  })

  it('domyślna próbka to history: rok 2026 z danymi w każdym miesiącu', async () => {
    const { wrapper } = await mountRouted()
    expect(wrapper.text()).toContain('history')
    expect(wrapper.find('.rb-board--year').exists()).toBe(true)
    expect(wrapper.text()).toContain('Motyw roku')
    const strength = wrapper.findAll('.rb-series')[0]
    expect(strength.text()).toContain('Trening siłowy')
    // każda z 12 kolumn ma zapis
    const cells = strength.findAll('.rb-cell--series')
    expect(cells).toHaveLength(12)
    expect(cells.every(c => !c.attributes('title')?.includes('Brak zapisu'))).toBe(true)
  })

  it('empty: brak znaczników, spojrzenie kierunku pokazuje jedno zdanie', async () => {
    const { wrapper } = await mountRouted('?sample=empty')
    expect(wrapper.findAll('.rb-cell .ev-mark--recorded')).toHaveLength(0)
    expect(viewSelect(wrapper).element.value).toBe('dir:fitness')
    expect(wrapper.text()).toContain('Brak działań w tym okresie.')
    expect(wrapper.find('.rb-series').exists()).toBe(false)
  })
})

describe('05 · Rytm kierunków — nawigacja, URL, edycja', () => {
  it('rok: spojrzenie przechodzi między skalami; fokus miesięcy per priorytet; tydzień wraca z zachowaniem kotwicy', async () => {
    const { wrapper, router } = await mountRouted('?sample=closed')
    await wrapper.findAll('.cp__scales button').find(b => b.text() === 'Rok')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.scale).toBe('year')
    expect(router.currentRoute.value.query.ref).toBe('2027')
    // spojrzenie zachowane: Forma nadal otwarta w roku
    expect(viewSelect(wrapper).element.value).toBe('dir:fitness')
    expect(wrapper.findAll('.rb-series').length).toBeGreaterThan(0)
    await setView(wrapper, 'focus')
    const folded = wrapper.findAll('.rb-focus-lane')
    expect(folded).toHaveLength(3)
    expect(folded[0].text()).toContain('Forma fizyczna')
    expect(folded[1].text()).toContain('Przygotowanie do ciąży')
    expect(folded[2].text()).toContain('Rzemiosło zawodowe')
    expect(folded[0].findAll('.rb-cell')).toHaveLength(12)
    expect(folded[0].findAll('.rb-focus-band')).toHaveLength(4) // sty–kwi
    expect(folded[1].findAll('.rb-focus-band')).toHaveLength(1) // luty
    expect(folded[2].findAll('.rb-focus-band')).toHaveLength(1) // styczeń

    // rok → miesiąc wraca do lutego (kotwica), nie do miesiąca zegara; fokus zostaje jako spojrzenie
    await wrapper.findAll('.cp__scales button').find(b => b.text() === 'Miesiąc')!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.ref).toBe('2027-02')
    expect(viewSelect(wrapper).element.value).toBe('focus')
    await wrapper.findAll('.cp__scales button').find(b => b.text() === 'Tydzień')!.trigger('click')
    await flushPromises()
    expect(String(router.currentRoute.value.query.ref)).toMatch(/^2027-W0[5-8]$/)
    expect(wrapper.find('.rb-board--week').exists()).toBe(true)
    // w tygodniu nie ma fokusu podokresów → lista wraca do pierwszego kierunku
    expect(viewSelect(wrapper).element.value).toBe('dir:fitness')
    // Wstecz odtwarza miesiąc
    router.back()
    await flushPromises()
    await new Promise(r => setTimeout(r, 0))
    await flushPromises()
    expect(router.currentRoute.value.query.scale).toBe('month')
    expect(wrapper.text()).toContain('Luty 2027')
  })

  it('current: bieżący miesiąc ma Plan i Refleksję; w tygodniu plan „na cały tydzień” to ułamek w kolumnie Σ, nie „bez dnia”', async () => {
    const { wrapper, router } = await mountRouted('?sample=current')
    expect(actionLabels(wrapper)).toEqual(['Plan', 'Refleksja'])
    const returnTo = router.currentRoute.value.fullPath
    await wrapper.findAll('.ps__actions .cp-btn')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/preview/ritual-month/quiet-v2/plan')
    expect(router.currentRoute.value.query).toMatchObject({ month: '2027-02', step: '2', returnTo })
    await router.push(returnTo)
    await flushPromises()
    // Poranek jest przypisany do całego tygodnia: w skali tygodnia wykonanie wobec celu stoi tylko w Σ (jeden wskaźnik, nie dwa)
    await wrapper.findAll('.cp__scales button').find(b => b.text() === 'Tydzień')!.trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('15–21 lutego 2027')
    await setView(wrapper, 'type:habit')
    const morning = wrapper.findAll('.rb-series').find(r => r.text().includes('Poranek'))!
    expect(wrapper.find('.rb-sigma--head').text()).toBe('Σ tydzień')
    expect(morning.find('.rb-span').exists()).toBe(false)
    expect(morning.find('.rb-sigma__well').text()).toMatch(/^\d \/ 5$/)
    expect(morning.find('.rb-sigma').attributes('title')).toMatch(/^Plan na cały tydzień · \d \/ 5 dni$/)
    expect(morning.find('.rb-sigma__well').classes().some(c => ['rb-sigma__well--partial', 'rb-sigma__well--planned', 'rb-sigma__well--done'].includes(c))).toBe(true)
    expect(wrapper.text()).not.toContain('Bez dnia')
    // przyszły tydzień: tylko „Zaplanuj tydzień”, Σ = „plan”
    await wrapper.find('[aria-label="Następny okres"]').trigger('click')
    await flushPromises()
    expect(actionLabels(wrapper)).toEqual(['Zaplanuj tydzień'])
    const nextMorning = wrapper.findAll('.rb-series').find(r => r.text().includes('Poranek'))!
    expect(nextMorning.find('.rb-sigma__well').text()).toBe('plan')
    expect(nextMorning.find('.rb-sigma__well').classes()).toContain('rb-sigma__well--planned')
  })

  it('boundary: częściowe tygodnie w nagłówkach; klik w częściowy tydzień otwiera cały tydzień, a plan tygodniowy stoi w Σ', async () => {
    const { wrapper, router } = await mountRouted('?sample=boundary')
    expect(wrapper.findAll('.rb-axis__unit').map(b => b.text())[0]).toBe('31.08–06.09')
    expect(wrapper.findAll('.rb-axis__unit').map(b => b.text())[4]).toBe('28.09–04.10')
    const cardio = wrapper.findAll('.rb-series')[1]
    expect(cardio.text()).toContain('Cardio')
    await cardio.findAll('.rb-cell--series')[4].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.query.scale).toBe('week')
    expect(wrapper.text()).toContain('28 września – 4 października 2026')
    const weekCardio = wrapper.findAll('.rb-series').find(r => r.text().includes('Cardio'))!
    expect(weekCardio.find('.rb-span').exists()).toBe(false)
    expect(weekCardio.find('.rb-sigma').attributes('title')).toContain('cały tydzień')
  })
})
