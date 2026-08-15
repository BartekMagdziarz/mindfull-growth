import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MonthReplica from '~lab/experiments/MonthReplica.vue'
import MonthlyRitualReplica from '~lab/experiments/MonthlyRitualReplica.vue'
import TodayReplica from '~lab/experiments/TodayReplica.vue'
import WeekReplica from '~lab/experiments/WeekReplica.vue'
import WeeklyRitualReplica from '~lab/experiments/WeeklyRitualReplica.vue'
import YearReplica from '~lab/experiments/YearReplica.vue'
import AnnualRitualReplica from '~lab/experiments/AnnualRitualReplica.vue'

function mountReplica(component: Parameters<typeof mount>[0], props: Record<string, unknown>) {
  return mount(component, { props, global: { plugins: [createPinia()] } })
}

describe('rich-v1 replicas', () => {
  it('zachowuje sześć kroków rocznego planowania w gramatyce szkicownika', async () => {
    const wrapper = mountReplica(AnnualRitualReplica, { presetId: 'plan', variantId: 'sketchbook-v1' })

    expect(wrapper.find('.annual-ritual').exists()).toBe(true)
    expect(wrapper.findAll('.annual-ritual__rail li')).toHaveLength(6)
    expect(wrapper.findAll('.annual-ritual__rail li').map(item => item.find('strong').text())).toEqual([
      'Brief',
      'Obszary życia',
      'Narracja',
      'Priorytety',
      'Wykonanie',
      'Podsumowanie',
    ])

    for (let step = 0; step < 5; step += 1) {
      await wrapper.find('.annual-next').trigger('click')
    }

    expect(wrapper.find('.annual-summary').exists()).toBe(true)
    await wrapper.find('.annual-next').trigger('click')
    expect(wrapper.find('.annual-next').text()).toContain('Zapisano')
  })

  it('edytuje wykonanie obiektu w widoku Dzisiaj', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'shared-axis-v1' })
    expect(wrapper.text()).toContain('6/8')
    const deepWorkRow = wrapper.findAll('.day-row').find(row => row.text().includes('Cztery sesje deep work'))

    expect(deepWorkRow).toBeTruthy()
    await deepWorkRow!.find('.day-row__completion').trigger('click')
    expect(wrapper.text()).toContain('7/8')
  })

  it('renderuje pięć odmiennych hipotez progresu w widoku Dzisiaj', () => {
    const variants = [
      ['shared-axis-v1', '.shared-axis'],
      ['family-lanes-v1', '.family-lanes'],
      ['evidence-stream-v1', '.evidence-stream'],
      ['priority-compass-v1', '.priority-compass'],
      ['quiet-pulse-v1', '.quiet-pulse'],
    ]

    for (const [variantId, selector] of variants) {
      const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId })
      expect(wrapper.find(selector).exists(), variantId).toBe(true)
      expect(wrapper.findAll('.wellness-card')).toHaveLength(3)
      expect(wrapper.findAll('.focus-ribbon button')).toHaveLength(3)
      expect(wrapper.text()).toContain('Priorytet roku')
      expect(wrapper.text()).toContain('Fokus miesiąca')
      expect(wrapper.text()).toContain('Fokus tygodnia')
    }
  })

  it('przełącznik fokusu zmienia okres i dane prawego przeglądu', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'shared-axis-v1' })

    expect(wrapper.find('.progress-context__label').text()).toContain('Fokus miesiąca')
    expect(wrapper.find('.object-hero h4').text()).toContain('Przebiec 10 km')

    await wrapper.findAll('.focus-ribbon button')[2].trigger('click')

    expect(wrapper.find('.progress-context__label').text()).toContain('Fokus tygodnia')
    expect(wrapper.find('.object-hero h4').text()).toContain('Biegi 3 razy w tygodniu')
  })

  it('wybór priorytetu podmienia miesięczny i tygodniowy fokus', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'shared-axis-v1' })

    await wrapper.find('.priority-picker select').setValue('stream')

    expect(wrapper.findAll('.focus-ribbon button')[0].text()).toContain('Dowieźć projekt Strumień')
    expect(wrapper.findAll('.focus-ribbon button')[1].text()).toContain('Wydać MVP aplikacji')
    expect(wrapper.findAll('.focus-ribbon button')[2].text()).toContain('Cztery sesje deep work')
    expect(wrapper.find('.progress-context__label').text()).toContain('Priorytet roku')
  })

  it('rozwija i zwija rysunkowy przegląd kategorii', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    expect(wrapper.find('.sketch-board').exists()).toBe(true)
    expect(wrapper.findAll('.sketch-board__category')).toHaveLength(3)

    await wrapper.findAll('.sketch-board__category')[0].trigger('click')
    expect(wrapper.find('.sketch-details').exists()).toBe(true)
    expect(wrapper.find('.sketch-details__header').text()).toContain('Cele · bieżący tydzień')
    expect(wrapper.findAll('.sketch-detail-card')).toHaveLength(5)
    expect(wrapper.findAll('.detail-weekdays')).toHaveLength(5)
    expect(wrapper.findAll('.detail-weekdays').every(row => row.findAll('span').length === 7)).toBe(true)
    expect(wrapper.findAll('.sketch-detail-card__summary')).toHaveLength(5)
    expect(wrapper.findAll('.detail-dots')[0].findAll('i').map(dot => dot.classes()[0])).toEqual([
      'done',
      'missed',
      'unassigned',
      'done',
      'assigned',
      'unassigned',
      'assigned',
    ])

    await wrapper.find('.sketch-tabs button.active').trigger('click')
    expect(wrapper.find('.sketch-board').exists()).toBe(true)
  })

  it('zmienia gęstość kart w rysunkowym przeglądzie', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'sketchbook-v1' })
    await wrapper.findAll('.sketch-board__category')[2].trigger('click')
    await wrapper.findAll('.density-switch button')[2].trigger('click')

    expect(wrapper.find('.detail-grid').attributes('style')).toContain('repeat(3')
  })

  it('zmienia kropkę wykonania i rysuje gładkie krzywe', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'sketchbook-v1' })
    const completionStamp = wrapper.find('.sketch-day__row .sketch-value')

    expect(completionStamp.find('.sketch-value__dot').exists()).toBe(false)
    await completionStamp.trigger('click')
    expect(completionStamp.find('.sketch-value__dot').exists()).toBe(true)
    expect(completionStamp.attributes('aria-pressed')).toBe('true')
    expect(wrapper.find('.priority-mark').exists()).toBe(false)

    const chartPath = wrapper.find('.sketch-preview-line path:not(.pencil-echo)')
    expect(chartPath.attributes('d')).toContain('C ')
  })

  it('używa dokładnego zestawu ikon z rysunkowego wzorca', () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'sketchbook-v1' })
    const icons = wrapper
      .findAll('.sketch-board .sketch-icon-box .material-symbols-outlined')
      .map(icon => icon.text())

    expect(icons).toEqual([
      'mountain_flag',
      'change_circle',
      'show_chart',
      'history_edu',
      'cognition',
      'psychology',
      'pregnant_woman',
      'health_and_safety',
      'stress_management',
    ])
  })

  it('zachowuje błękitne pola ikon po rozwinięciu kategorii', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    await wrapper.findAll('.sketch-board__category')[0].trigger('click')

    expect(wrapper.findAll('.sketch-tabs__icon-field')).toHaveLength(3)
    expect(wrapper.findAll('.sketch-shortcuts__icon-field')).toHaveLength(9)
  })

  it('rozwija obszar miesiąca do kart obiektów w szkicowniku', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    expect(wrapper.find('.sketch-month').exists()).toBe(true)
    expect(wrapper.findAll('.month-week-row').length).toBeGreaterThanOrEqual(4)
    expect(wrapper.findAll('.week-dual-chart')).toHaveLength(wrapper.findAll('.month-week-row').length)
    expect(wrapper.findAll('.week-axis-line--effort').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.week-axis-line--effort')).toHaveLength(wrapper.findAll('.week-axis-line--state').length)
    expect(wrapper.findAll('.week-chart-area-icons')).toHaveLength(wrapper.findAll('.month-week-row').length)
    expect(wrapper.find('.week-areas-legend').exists()).toBe(false)
    expect(wrapper.find('.week-axis-key').text()).toContain('Wysiłek')
    expect(wrapper.find('.week-axis-key').text()).toContain('Stan')
    expect(wrapper.findAll('.month-priority')).toHaveLength(3)
    expect(wrapper.findAll('.month-board__cell')).toHaveLength(9)

    await wrapper.findAll('.board-variant-switch button')[2].trigger('click')
    expect(wrapper.find('.month-board__row').classes()).toContain('month-board--c')
    await wrapper.findAll('.board-variant-switch button')[0].trigger('click')

    await wrapper.findAll('.month-board__cell').find(cell => cell.text().includes('Cele'))!.trigger('click')
    expect(wrapper.find('.sketch-details').exists()).toBe(true)
    expect(wrapper.find('.sketch-details__header').text()).toContain('Cele · tygodnie miesiąca')
    expect(wrapper.find('.sketch-tabs button.active').text()).toContain('Cele')
    expect(wrapper.findAll('.sketch-detail-card').length).toBeGreaterThan(5)
    expect(wrapper.findAll('.detail-dots').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.detail-line').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.detail-span').length).toBeGreaterThan(0)

    await wrapper.find('.sketch-tabs__close').trigger('click')
    expect(wrapper.find('.month-board__row').exists()).toBe(true)
  })

  it('przełącza gęstość kart i tygodnie w szkicowniku miesiąca', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    await wrapper.findAll('.month-week-row')[0].trigger('click')
    expect(wrapper.find('.month-week-note').exists()).toBe(true)

    await wrapper.findAll('.month-board__cell').find(cell => cell.text().includes('Nawyki'))!.trigger('click')
    expect(wrapper.find('.sketch-tabs button.active').text()).toContain('Nawyki')

    await wrapper.findAll('.density-switch button')[2].trigger('click')
    expect(wrapper.find('.detail-grid').attributes('style')).toContain('repeat(3')
  })

  it('przełącza skalę widoku miesiąca: prawdziwy rok i widok dnia', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current', variantId: 'sketchbook-v1' })
    const scaleButton = (label: string) => wrapper.findAll('.scale-switch button').find(button => button.text() === label)

    expect(wrapper.findAll('.scale-switch button')).toHaveLength(4)

    await scaleButton('Rok')!.trigger('click')
    expect(wrapper.find('.sketch-year').exists()).toBe(true)
    expect(wrapper.findAll('.year-month-row')).toHaveLength(12)
    expect(wrapper.find('.month-rail').exists()).toBe(false)

    await wrapper.findAll('.year-scale-switch button').find(button => button.text() === 'Dzień')!.trigger('click')
    expect(wrapper.find('.sketch-today').exists()).toBe(true)
    expect(wrapper.find('.sketch-today .day-nav-card').exists()).toBe(true)
    expect(wrapper.find('.day-nav-card__header > div > span').exists()).toBe(false)

    await wrapper.findAll('.sketch-today .scale-switch button').find(button => button.text() === 'Miesiąc')!.trigger('click')
    expect(wrapper.find('.month-rail').exists()).toBe(true)
    expect(wrapper.findAll('.month-board__cell')).toHaveLength(9)
  })

  it('pokazuje rytm siedmiu dni i progresywny detal tygodnia', async () => {
    const wrapper = mountReplica(WeekReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    expect(wrapper.find('.sketch-week').exists()).toBe(true)
    expect(wrapper.findAll('.week-day-row')).toHaveLength(7)
    expect(wrapper.findAll('.week-ratings__label').map(label => label.text())).toEqual(['Ciało', 'Emocje', 'Działanie', 'Relacje'])
    expect(wrapper.find('.week-ratings__legend').text()).toContain('Wysiłek')
    expect(wrapper.find('.week-ratings__legend').text()).toContain('Stan')
    expect(wrapper.findAll('.week-ratings__bubble')).toHaveLength(8)
    expect(wrapper.findAll('.week-ratings__value')).toHaveLength(8)
    expect(wrapper.findAll('.week-ratings__areas .material-symbols-outlined')).toHaveLength(4)
    expect(wrapper.findAll('.week-day-row__context')).toHaveLength(0)
    expect(wrapper.find('.week-nav-card__header h2').text()).toBe('20–26 lipca')
    expect(wrapper.findAll('.week-board__cell')).toHaveLength(9)
    expect(wrapper.findAll('.week-board__copy small')).toHaveLength(0)
    expect(wrapper.findAll('.week-board__row')[0].attributes('aria-label')).toContain('Najważniejsze')

    await wrapper.findAll('.week-round-button')[0].trigger('click')
    expect(wrapper.find('.week-nav-card__header h2').text()).toContain('13–19 lipca')
    await wrapper.findAll('.week-round-button')[1].trigger('click')
    expect(wrapper.find('.week-nav-card__header h2').text()).toContain('20–26 lipca')

    await wrapper.findAll('.week-board__cell').find(cell => cell.text().includes('Cele'))!.trigger('click')
    expect(wrapper.find('.week-details').exists()).toBe(true)
    expect(wrapper.find('.week-details__header').text()).toContain('Cele · dzień po dniu')
    expect(wrapper.find('.week-rail__heading').text()).toContain('Cele · aktywności w dniach')
    expect(wrapper.findAll('.week-day-row__context')).toHaveLength(7)
    expect(wrapper.findAll('.week-detail-card').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.week-detail-card')).toHaveLength(wrapper.findAll('.sketch-detail-card').length)
    expect(wrapper.findAll('.week-detail-card .detail-weekdays').every(labels => labels.findAll('span').length === 7)).toBe(true)
  })

  it('pokazuje dwanaście miesięcy i roczne trendy obiektów', async () => {
    const wrapper = mountReplica(YearReplica, { presetId: 'current', variantId: 'sketchbook-v1' })

    expect(wrapper.findAll('.year-month-row')).toHaveLength(12)
    expect(wrapper.find('.year-nav-card__header h2').text()).toBe('2026')
    expect(wrapper.find('.year-nav-card__header small').exists()).toBe(false)
    expect(wrapper.findAll('.year-month-row__context')).toHaveLength(0)
    expect(wrapper.find('.year-month-row__pulse').exists()).toBe(false)
    expect(wrapper.find('.year-month-row__score').exists()).toBe(false)
    expect(wrapper.find('.year-month-row__reflection').exists()).toBe(false)
    expect(wrapper.findAll('.year-board__cell')).toHaveLength(9)
    expect(wrapper.findAll('.year-board__copy small')).toHaveLength(0)
    expect(wrapper.findAll('.year-round-button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.find('.year-ritual').text()).toContain('12 miesięcy')

    await wrapper.findAll('.year-month-row')[0].trigger('click')
    expect(wrapper.find('.year-board-caption strong').text()).toContain('Styczeń')

    await wrapper.findAll('.year-board__cell').find(cell => cell.text().includes('Cele'))!.trigger('click')
    expect(wrapper.find('.year-details__header').text()).toContain('Cele · miesiące roku')
    expect(wrapper.find('.year-rail__heading').text()).toContain('Cele · sygnały w miesiącach')
    expect(wrapper.findAll('.year-month-row__context')).toHaveLength(12)
    expect(wrapper.findAll('.year-detail-card').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.year-detail-card footer').every(footer => footer.findAll('span').length === 12)).toBe(true)
  })

  it('filtruje obiekty wymagające uwagi w miesiącu', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current' })
    const initialCards = wrapper.findAll('.month-object-card').length
    const attention = wrapper.findAll('button').find(button => button.text() === 'Wymagają uwagi')

    expect(attention).toBeTruthy()
    await attention!.trigger('click')
    expect(wrapper.findAll('.month-object-card').length).toBeLessThan(initialCards)
    expect(wrapper.findAll('.month-week-row')).toHaveLength(5)
  })

  it('zmienia aktywny dzień w tygodniu', async () => {
    const wrapper = mountReplica(WeekReplica, { presetId: 'current' })
    const thursday = wrapper.findAll('.week-days-ribbon button').find(button => button.text().includes('Cz'))

    expect(thursday).toBeTruthy()
    await thursday!.trigger('click')
    expect(wrapper.find('.week-replica__left .replica-card__header small').text()).toBe(thursday!.attributes('data-day-ref'))
  })

  it('przechodzi z planu do dni w rytuale tygodniowym', async () => {
    const wrapper = mountReplica(WeeklyRitualReplica, { presetId: 'reflect' })
    expect(wrapper.find('.replica-stepper li.active small').text()).toBe('Plan')

    await wrapper.find('.replica-wizard__footer .lab-button--filled').trigger('click')
    expect(wrapper.find('.replica-stepper li.active small').text()).toBe('Dni')
  })

  it('przechodzi z priorytetów do tygodni w rytuale miesięcznym', async () => {
    const wrapper = mountReplica(MonthlyRitualReplica, { presetId: 'reflect' })
    expect(wrapper.find('.replica-stepper li.active small').text()).toBe('Priorytety')

    await wrapper.find('.replica-wizard__footer .lab-button--filled').trigger('click')
    expect(wrapper.find('.replica-stepper li.active small').text()).toBe('Tygodnie')
  })

  it('prowadzi szkicownik planowania tygodnia przez trzy krótkie rozdziały', async () => {
    const wrapper = mountReplica(WeeklyRitualReplica, { presetId: 'plan', variantId: 'sketchbook-v1' })

    expect(wrapper.findAll('.ritual-rail li')).toHaveLength(3)
    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Co naprawdę zasługuje')
    expect(wrapper.findAll('.ritual-choice-grid--objects article')).toHaveLength(9)
    expect(wrapper.findAll('.ritual-choice-select').filter(button => button.attributes('disabled') !== undefined)).toHaveLength(0)
    expect(wrapper.find('.ritual-soft-limit').text()).toContain('Trzy to sugestia')

    await wrapper.find('.ritual-intention-composer input').setValue('Domknąć decyzję o zakresie')
    await wrapper.find('.ritual-intention-add').trigger('submit')
    expect(wrapper.findAll('.ritual-choice-grid--objects article')).toHaveLength(10)

    await wrapper.find('.ritual-next').trigger('click')
    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Kiedy to ma realną szansę')
    expect(wrapper.findAll('.weekly-row')).toHaveLength(4)
    expect(wrapper.find('.weekly-target-editor').exists()).toBe(true)
    expect(wrapper.find('.weekly-row__underbar .weekly-target-editor').exists()).toBe(true)
    expect(wrapper.find('.weekly-row__underbar').text()).toContain('Cały tydzień')
    expect(wrapper.find('.weekly-planner__rest').text()).toContain('Pozostałe obiekty')

    const firstTarget = wrapper.find('.weekly-target-editor input')
    await firstTarget.setValue(5)
    await wrapper.find('.ritual-next').trigger('click')

    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Czy plan ma rytm i oddech')
    expect(wrapper.findAll('.ritual-plan-review__objects article')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-plan-review__rhythm > div > span')).toHaveLength(7)
    expect(wrapper.findAll('.ritual-plan-review__checks > span')).toHaveLength(3)
    expect(wrapper.find('.ritual-plan-review__objects').text()).toContain('Target ≥ 5')
    expect(wrapper.find('.ritual-plan-review__status').classes()).toContain('warning')
    expect(wrapper.find('.ritual-plan-review__status').text()).toContain('wymaga dnia')
  })

  it('prowadzi refleksję tygodniową przez przegląd, dwie osie ocen i dziennik', async () => {
    const wrapper = mountReplica(WeeklyRitualReplica, { presetId: 'reflect', variantId: 'sketchbook-v1' })

    expect(wrapper.findAll('.ritual-rail li')).toHaveLength(8)
    expect(wrapper.find('.ritual-rail li button.active strong').text()).toBe('Fakty')
    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Jak wyglądał rytm tygodnia')
    expect(wrapper.findAll('.ritual-picture-facts article')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-day-strip button')).toHaveLength(7)
    expect(wrapper.find('.ritual-picture-legend').text()).toContain('zaplanowane')
    expect(wrapper.find('.ritual-picture-legend').text()).toContain('wykonane')
    expect(wrapper.findAll('.ritual-evidence-list button')).toHaveLength(0)
    expect(wrapper.find('.ritual-picture-next').text()).toContain('6 obiektów przejrzysz osobno')
    expect(wrapper.text()).not.toContain('Co chcesz zrobić inaczej?')

    await wrapper.findAll('.ritual-day-strip button')[0].trigger('click')
    expect(wrapper.findAll('.ritual-day-strip button')[0].text()).toContain('wykonania')
    expect(wrapper.findAll('.ritual-day-strip button')[0].text()).toContain('wpisy')

    await wrapper.findAll('.ritual-rail li button')[1].trigger('click')
    expect(wrapper.findAll('.ritual-object-review article')).toHaveLength(6)
    expect(wrapper.findAll('.ritual-object-review textarea')).toHaveLength(6)

    await wrapper.findAll('.ritual-rail li button')[2].trigger('click')
    expect(wrapper.findAll('.ritual-area-rating article')).toHaveLength(2)
    expect(wrapper.text()).toContain('Wysiłek')
    expect(wrapper.text()).toContain('Stan')

    await wrapper.findAll('.ritual-rail li button')[6].trigger('click')
    expect(wrapper.findAll('.ritual-anchor-list label')).toHaveLength(3)
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Co poszło dobrze')
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Co było trudne')
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Lekcje i spostrzeżenia')
    expect(wrapper.find('.ritual-anchor-list').text()).not.toContain('Co dało Ci energię')

    await wrapper.findAll('.ritual-rail li button')[7].trigger('click')
    expect(wrapper.find('.journal-writing textarea').exists()).toBe(true)
    expect((wrapper.find('.journal-writing textarea').element as HTMLTextAreaElement).value).not.toBe('')
    expect(wrapper.find('.journal-context-card--ai').exists()).toBe(true)
    expect(wrapper.findAll('.ritual-final-actions button')).toHaveLength(2)

    const initialEntry = (wrapper.find('.journal-writing textarea').element as HTMLTextAreaElement).value
    await wrapper.findAll('.journal-writing footer button')[0].trigger('click')
    expect((wrapper.find('.journal-writing textarea').element as HTMLTextAreaElement).value.length).toBeGreaterThan(initialEntry.length)
  })

  it('rozróżnia miesięczne planowanie przez kierunki, wsparcie i tygodnie', async () => {
    const wrapper = mountReplica(MonthlyRitualReplica, { presetId: 'plan', variantId: 'sketchbook-v1' })

    expect(wrapper.findAll('.ritual-rail li')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-choice-grid--priorities article').length).toBeGreaterThanOrEqual(3)

    await wrapper.find('.ritual-next').trigger('click')
    expect(wrapper.findAll('.ritual-choice-grid--objects article')).toHaveLength(5)

    await wrapper.find('.ritual-next').trigger('click')
    expect(wrapper.findAll('.target-row')).toHaveLength(4)
    expect(wrapper.find('.target-editor').exists()).toBe(false)

    await wrapper.findAll('.target-row__target')[0].trigger('click')
    expect(wrapper.find('.target-editor').exists()).toBe(true)
    expect(wrapper.find('.target-row__underbar .target-editor').exists()).toBe(true)
    expect(wrapper.find('.target-row__underbar').text()).toContain('Cały miesiąc')
    expect(wrapper.findAll('.target-row__week-value')).toHaveLength(3)
    expect(wrapper.findAll('.target-row__week-value strong')).toHaveLength(3)
    expect(wrapper.find('.target-editor').text()).not.toContain('T26')
    expect(wrapper.find('.target-editor__balance').text()).toContain('Gotowe')
    expect(wrapper.find('.target-editor__advanced').exists()).toBe(false)

    await wrapper.findAll('.distribution-switch button').find(button => button.text().includes('Ręcznie'))!.trigger('click')
    expect(wrapper.findAll('.target-row__week-value input')).toHaveLength(3)
    await wrapper.find('.target-editor__advanced-trigger').trigger('click')
    expect(wrapper.findAll('.target-editor__advanced select')).toHaveLength(2)

    await wrapper.findAll('.ritual-rail li button')[3].trigger('click')
    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Czy każdy kierunek ma realne wsparcie')
    expect(wrapper.findAll('.ritual-plan-review__directions article')).toHaveLength(3)
    expect(wrapper.findAll('.ritual-plan-review__rhythm > div > span')).toHaveLength(5)
    expect(wrapper.findAll('.ritual-plan-review__checks > span')).toHaveLength(3)
    expect(wrapper.find('.ritual-plan-review__status').classes()).toContain('warning')
    expect(wrapper.find('.ritual-plan-review__status').text()).toContain('kierunek nie ma wsparcia')
    expect(wrapper.find('.ritual-plan-review__status button').text()).toContain('Dobierz wsparcie')

    await wrapper.find('.ritual-plan-review__status button').trigger('click')
    expect(wrapper.find('.ritual-rail li button.active strong').text()).toBe('Wsparcie')
  })

  it('prowadzi miesięczną refleksję przez priorytety, kompas, właściwe kotwice i dziennik', async () => {
    const wrapper = mountReplica(MonthlyRitualReplica, { presetId: 'reflect', variantId: 'sketchbook-v1' })

    expect(wrapper.findAll('.ritual-rail li')).toHaveLength(4)
    expect(wrapper.find('.ritual-stage__header h1').text()).toContain('Jak poszło z priorytetami')
    expect(wrapper.text()).not.toContain('Co kontynuujesz, zmieniasz albo odpuszczasz?')
    expect(wrapper.findAll('.ritual-priority-review > article')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-priority-axis')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-priority-review select')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-priority-rollup')).toHaveLength(4)
    expect(wrapper.findAll('.ritual-priority-review header small .material-symbols-outlined')).toHaveLength(3)

    await wrapper.findAll('.ritual-rail li button')[2].trigger('click')
    expect(wrapper.findAll('.ritual-anchor-list label')).toHaveLength(3)
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Z czego jestem dumny')
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Największe wyzwania')
    expect(wrapper.find('.ritual-anchor-list').text()).toContain('Jak się rozwinąłem')

    await wrapper.findAll('.ritual-rail li button')[3].trigger('click')
    expect(wrapper.find('.journal-writing textarea').exists()).toBe(true)
  })

  it('plansza fokusu dnia: trzy strefy, słowny fokus i filtry bez intencji', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'focus-board-v1' })

    expect(wrapper.find('.focus-board').exists()).toBe(true)
    expect(wrapper.findAll('.fb-action')).toHaveLength(3)
    expect(wrapper.findAll('.fb-action').map(action => action.find('strong').text())).toEqual(['Dziennik', 'Emocje', 'Ćwiczenia'])

    // intencje żyją w Planie dnia po lewej, nie jako opcja filtra
    expect(wrapper.find('.fb-day-list').text()).toContain('Intencje tygodnia')
    expect(wrapper.findAll('.fb-filter option').map(option => option.text())).not.toContain('Intencje')

    // słowny fokus dnia: pusty stan → edycja → zapis
    expect(wrapper.find('.fb-day-focus__empty').exists()).toBe(true)
    await wrapper.find('.fb-day-focus__empty').trigger('click')
    await wrapper.find('.fb-day-focus__form input').setValue('Domykam decyzję o budżecie.')
    await wrapper.find('.fb-day-focus__form').trigger('submit')
    expect(wrapper.find('.fb-day-focus__quote p').text()).toBe('Domykam decyzję o budżecie.')

    // domyślny filtr = fokus tygodnia (3 karty), jeden dropdown przełącza typ i priorytet
    expect(wrapper.findAll('.sketch-detail-card')).toHaveLength(3)
    await wrapper.find('.fb-filter select').setValue('habits')
    expect(wrapper.findAll('.sketch-detail-card').length).toBeGreaterThan(3)

    // filtr po priorytecie zawęża karty do obiektów wspierających
    await wrapper.find('.fb-filter select').setValue('priority:movement')
    const supportingCount = wrapper.findAll('.sketch-detail-card').length
    expect(supportingCount).toBeGreaterThan(0)
    await wrapper.find('.fb-filter select').setValue('priority:relationships')
    expect(wrapper.findAll('.sketch-detail-card').length).toBeLessThan(supportingCount)
  })

  it('plansza fokusu tygodnia: akcje rytuałów, wpis prowadzony i fokus jako filtr', async () => {
    const wrapper = mountReplica(WeekReplica, { presetId: 'current', variantId: 'focus-board-v1' })

    expect(wrapper.findAll('.fb-action').map(action => action.find('strong').text())).toEqual(['Plan tygodnia', 'Refleksja', 'Wpis tygodnia'])
    expect(wrapper.findAll('.week-day-row')).toHaveLength(7)
    expect(wrapper.findAll('.fb-focus-tile')).toHaveLength(3)
    expect(wrapper.findAll('.fb-filter option').map(option => option.text())).toContain('Intencje')

    // fokus tygodnia podświetla kartę obiektu
    await wrapper.findAll('.fb-focus-tile')[0].trigger('click')
    expect(wrapper.find('.sketch-detail-card.active').exists()).toBe(true)

    // wpis tygodnia: panel z trzema pytaniami, przełącznik źródła, zapis
    await wrapper.findAll('.fb-action')[2].trigger('click')
    expect(wrapper.find('.fb-entry').exists()).toBe(true)
    expect(wrapper.findAll('.fb-entry__question')).toHaveLength(3)
    expect(wrapper.find('.fb-entry__ai-note').exists()).toBe(false)
    await wrapper.findAll('.fb-entry__source button')[1].trigger('click')
    expect(wrapper.find('.fb-entry__ai-note').exists()).toBe(true)
    await wrapper.find('.fb-entry__save').trigger('click')
    expect(wrapper.find('.fb-entry').exists()).toBe(false)

    // karty intencji rysują się jako completion (kropki)
    await wrapper.find('.fb-filter select').setValue('intentions')
    expect(wrapper.findAll('.sketch-detail-card--dots').length).toBeGreaterThan(0)
  })

  it('plansza fokusu miesiąca: priorytety filtrują karty tygodni', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current', variantId: 'focus-board-v1' })

    expect(wrapper.findAll('.fb-action').map(action => action.find('strong').text())).toEqual(['Plan miesiąca', 'Refleksja', 'Wpis miesiąca'])
    expect(wrapper.findAll('.fb-focus-tile--priority')).toHaveLength(3)
    expect(wrapper.findAll('.month-week-row').length).toBeGreaterThanOrEqual(4)

    // kafel priorytetu i dropdown sterują tym samym filtrem
    await wrapper.findAll('.fb-focus-tile--priority')[0].trigger('click')
    expect((wrapper.find('.fb-filter select').element as HTMLSelectElement).value).toBe('priority:movement')
    expect(wrapper.findAll('.fb-focus-tile--priority')[0].classes()).toContain('active')
    expect(wrapper.findAll('.sketch-detail-card').length).toBeGreaterThan(0)

    // ponowne kliknięcie wraca do fokusu miesiąca
    await wrapper.findAll('.fb-focus-tile--priority')[0].trigger('click')
    expect((wrapper.find('.fb-filter select').element as HTMLSelectElement).value).toBe('focus')

    // przełączenie skali na dzień zostaje w planszy fokusu
    await wrapper.findAll('.scale-switch button').find(button => button.text() === 'Dzień')!.trigger('click')
    expect(wrapper.find('.fb-day-list').exists()).toBe(true)
    expect(wrapper.findAll('.fb-action').map(action => action.find('strong').text())).toEqual(['Dziennik', 'Emocje', 'Ćwiczenia'])
  })

  it('pozwala przejść z bieżącego miesiąca do zamkniętego i otworzyć jego refleksję', async () => {
    const wrapper = mountReplica(MonthReplica, { presetId: 'current', variantId: 'sketchbook-v1' })
    const navigation = wrapper.findAll('.month-nav')

    expect(navigation[1].attributes('disabled')).toBeDefined()
    expect(wrapper.find('.month-ritual').text()).toContain('Zaplanuj miesiąc')

    await navigation[0].trigger('click')
    expect(wrapper.find('.month-ritual').text()).toContain('Dokończ refleksję')
    expect(wrapper.findAll('.month-nav')[1].attributes('disabled')).toBeUndefined()
  })
})
