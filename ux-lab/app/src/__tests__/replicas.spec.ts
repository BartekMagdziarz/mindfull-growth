import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
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
      .map(icon => icon.attributes('data-icon'))

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

  it('widok działania: cztery strefy, podgląd dnia i przenoszenie wystąpień przez horyzont', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action-cockpit-v1' })

    expect(wrapper.find('.action-board.ab--cockpit').exists()).toBe(true)
    expect(wrapper.find('.ab-kompas').exists()).toBe(true)
    expect(wrapper.find('.ab-day-list').exists()).toBe(true)
    expect(wrapper.find('.ab-signals').exists()).toBe(true)
    expect(wrapper.find('.ab-horizon').exists()).toBe(true)
    expect(wrapper.findAll('.ab-priority')).toHaveLength(3)
    expect(wrapper.findAll('.ab-focus')).toHaveLength(3)
    expect(wrapper.findAll('.ab-hday')).toHaveLength(7)
    expect(wrapper.findAll('.ab-signal')).toHaveLength(3)
    expect(wrapper.findAll('.ab-chip--deadline').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.ab-row .ab-micro').length).toBeGreaterThan(0)

    // podgląd przyszłego dnia
    await wrapper.findAll('.ab-hday__cell')[2].trigger('click')
    expect(wrapper.find('.ab-peek').exists()).toBe(true)

    // przeniesienie dzisiejszego wystąpienia na jutro
    const initialRows = wrapper.findAll('.ab-row').length
    await wrapper.findAll('.ab-row .ab-move')[0].trigger('click')
    expect(wrapper.find('.ab-horizon.targeting').exists()).toBe(true)
    expect(wrapper.find('.ab-horizon__hint').text()).toContain('Wybierz dzień')
    await wrapper.findAll('.ab-hday__cell')[1].trigger('click')
    expect(wrapper.find('.ab-horizon.targeting').exists()).toBe(false)
    expect(wrapper.findAll('.ab-row')).toHaveLength(initialRows - 1)
    expect(wrapper.find('.ab-horizon__note').text()).toContain('→')
  })

  it('widok działania: hover na kierunku podświetla powiązane zadania, a warianty zmieniają układ', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action-cockpit-v1' })

    await wrapper.findAll('.ab-priority')[0].trigger('mouseenter')
    expect(wrapper.findAll('.ab-row.lit').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.ab-row.dim').length).toBeGreaterThan(0)
    await wrapper.find('.ab-kompas').trigger('mouseleave')
    expect(wrapper.findAll('.ab-row.dim')).toHaveLength(0)

    for (const [variantId, layoutClass] of [
      ['action-rhythm-v1', 'ab--rhythm'],
      ['action-context-rail-v1', 'ab--rail'],
      ['action-stream-v1', 'ab--stream'],
    ]) {
      const variantWrapper = mountReplica(TodayReplica, { presetId: 'current', variantId })
      expect(variantWrapper.find(`.action-board.${layoutClass}`).exists(), variantId).toBe(true)
      expect(variantWrapper.findAll('.ab-hday'), variantId).toHaveLength(7)
    }
  })

  it('zeszyt dnia: wąska lista, kompas ikonowy, mini-kalendarz z przełącznikiem i przenoszenie przez kalendarz', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action2-notebook-v1' })

    expect(wrapper.find('.act-notebook').exists()).toBe(true)
    expect(wrapper.findAll('.ac-tile')).toHaveLength(6)
    expect(wrapper.findAll('.ac-cal__wday')).toHaveLength(7)
    expect(wrapper.find('.ac-upcoming').exists()).toBe(true)
    expect(wrapper.find('.ac-row .ac-micro').exists()).toBe(false)

    // przełącznik tydzień/miesiąc
    await wrapper.findAll('.ac-cal__switch button')[1].trigger('click')
    expect(wrapper.findAll('.ac-cal__mday').length).toBeGreaterThanOrEqual(35)
    await wrapper.findAll('.ac-cal__switch button')[0].trigger('click')

    // taca akcji: jutro / wybierz dzień / ukryj / otwórz
    expect(wrapper.find('.ac-row .ac-row__tray').findAll('button')).toHaveLength(4)

    // przeniesienie: wybierz dzień → kalendarz w trybie celowania → klik dnia
    const initialRows = wrapper.findAll('.ac-row').length
    await wrapper.findAll('.ac-row__tray button')[1].trigger('click')
    expect(wrapper.find('.ac-cal.targeting').exists()).toBe(true)
    // celowanie pokazuje 7 dni w przód — każdy jest wybieralny, także gdy dziś to niedziela
    const pickable = wrapper.findAll('.ac-cal__wday').filter(cell => cell.attributes('disabled') === undefined)
    expect(pickable).toHaveLength(7)
    await pickable.at(-1)!.trigger('click')
    expect(wrapper.find('.ac-cal.targeting').exists()).toBe(false)
    expect(wrapper.findAll('.ac-row')).toHaveLength(initialRows - 1)

    // „na jutro” jednym kliknięciem
    await wrapper.findAll('.ac-row__tray button')[0].trigger('click')
    expect(wrapper.findAll('.ac-row')).toHaveLength(initialRows - 2)

    // hover na kaflu kompasu podświetla powiązane wiersze
    await wrapper.findAll('.ac-tile')[0].trigger('mouseenter')
    expect(wrapper.findAll('.ac-row.lit').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.ac-row.dim').length).toBeGreaterThan(0)
  })

  it('kolejka „Teraz”: scena z wykresem, awans z kolejki i domykanie zadań', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action2-queue-v1' })

    expect(wrapper.find('.act-queue').exists()).toBe(true)
    expect(wrapper.find('.aq-now').exists()).toBe(true)
    const firstTitle = wrapper.find('.aq-now__head h2').text()

    // awans z kolejki na scenę
    const queued = wrapper.findAll('.aq-queue__row')
    expect(queued.length).toBeGreaterThan(0)
    const promotedTitle = queued[0].find('strong').text()
    await queued[0].trigger('click')
    expect(wrapper.find('.aq-now__head h2').text()).toBe(promotedTitle)
    expect(wrapper.find('.aq-now__head h2').text()).not.toBe(firstTitle)

    // wykonanie zdejmuje zadanie ze sceny i zasila „Zrobione”
    const doneBefore = wrapper.find('.aq-done').exists() ? Number(wrapper.find('.aq-done').text().match(/\d+/)?.[0]) : 0
    await wrapper.find('.aq-do').trigger('click')
    expect(Number(wrapper.find('.aq-done').text().match(/\d+/)?.[0])).toBe(doneBefore + 1)
  })

  it('tablica tygodnia: dziś rozwinięte, podniesienie i upuszczenie w kolumnie, przełącznik miesiąca', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action2-board-v1' })

    expect(wrapper.find('.act-board').exists()).toBe(true)
    expect(wrapper.findAll('.ab2-col')).toHaveLength(7)
    expect(wrapper.find('.ab2-col.today .ac-row').exists()).toBe(true)

    // podnieś chip z przyszłej kolumny i upuść w innej
    const chips = wrapper.findAll('.ab2-chip')
    expect(chips.length).toBeGreaterThan(0)
    await chips[0].trigger('click')
    expect(wrapper.find('.ab2-hint').exists()).toBe(true)
    const targets = wrapper.findAll('.ab2-col.droppable .ab2-col__head')
    expect(targets.length).toBeGreaterThan(0)
    await targets.at(-1)!.trigger('click')
    expect(wrapper.find('.ab2-hint').exists()).toBe(false)

    // przełącznik na miesiąc: kolumny tygodni
    await wrapper.findAll('.ab2-switch button')[1].trigger('click')
    expect(wrapper.findAll('.ab2-col').length).toBeGreaterThanOrEqual(4)
    expect(wrapper.find('.ab2-week-foot').exists()).toBe(true)
  })

  it('cichy plan i rytm celu: szuflada szczegółów oraz paski postępu do celu tygodnia', async () => {
    const quiet = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action2-quiet-v1' })
    expect(quiet.find('.act-quiet').exists()).toBe(true)
    expect(quiet.find('.qp-drawer').exists()).toBe(false)
    await quiet.find('.qp-more').trigger('click')
    expect(quiet.find('.qp-drawer').exists()).toBe(true)
    expect(quiet.find('.qp-drawer .ac-cal').exists()).toBe(true)
    expect(quiet.findAll('.qp-chart').length).toBeGreaterThan(0)

    const pulse = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action2-pulse-v1' })
    expect(pulse.find('.act-pulse').exists()).toBe(true)
    expect(pulse.find('.tp-rhythm svg path').exists()).toBe(true)
    expect(pulse.findAll('.ac-row__gauge').length).toBeGreaterThan(0)
    expect(pulse.findAll('.tp-group__arc').length).toBeGreaterThan(0)
  })

  it('scena nad listą (17): kompakt „Teraz”, wykonane zostają na liście, kalendarz z datą i nawigacją', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-top-v1' })

    expect(wrapper.find('.act-focus.af--stage-top').exists()).toBe(true)
    expect(wrapper.find('.ac-now--strip').exists()).toBe(true)
    expect(wrapper.findAll('.af-entries .af-wpill')).toHaveLength(3)
    expect(wrapper.findAll('.ac-tile')).toHaveLength(6)

    // wykonanie ze sceny NIE chowa wiersza — lista trzyma pełny obraz dnia
    const rowsBefore = wrapper.findAll('.ac-row').length
    const stagedTitle = wrapper.find('.ac-now__copy strong').text()
    await wrapper.find('.ac-now__do').trigger('click')
    expect(wrapper.findAll('.ac-row')).toHaveLength(rowsBefore)
    expect(wrapper.find('.ac-now__copy strong').text()).not.toBe(stagedTitle) // scena poszła dalej

    // data + kalendarz w jednym: domyślnie zwinięty, rozwijany na życzenie, z nawigacją okresów
    expect(wrapper.find('.ac-cal__datehead h2').text().length).toBeGreaterThan(3)
    expect(wrapper.find('.ac-cal__week').exists()).toBe(false)
    await wrapper.find('.ac-cal__expand').trigger('click')
    expect(wrapper.find('.ac-cal__week').exists()).toBe(true)
    const navTitle = wrapper.find('.ac-cal__nav > strong').text()
    await wrapper.find('.ac-cal__nav > button').trigger('click')
    expect(wrapper.find('.ac-cal__nav > strong').text()).not.toBe(navTitle)
    await wrapper.find('.ac-cal__today-jump').trigger('click')
    expect(wrapper.find('.ac-cal__nav > strong').text()).toBe(navTitle)
    // tło nic nie koduje; legenda tylko dla znaczników termin/rytuał
    expect(wrapper.find('.ac-cal__modes').exists()).toBe(false)
    expect(wrapper.find('.ac-cal__scale').exists()).toBe(false)
    expect(wrapper.find('.ac-cal__marks-legend').text()).toContain('termin')
  })

  it('scena w kontekście (18) i w wierszu (19): rozmieszczenie sceny i przenoszenie jej klikiem', async () => {
    const rail = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-rail-v1' })
    expect(rail.find('.af--stage-rail .af-rail__card--stage .ac-now--card').exists()).toBe(true)
    expect(rail.find('.af-left .ac-now').exists()).toBe(false)

    const inline = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-inline-v1' })
    // scena w wierszu = rozszerzenie wiersza, bez drugiego komponentu (zero duplikacji tytułu/ikony/akcji)
    expect(inline.find('.af--stage-inline .ac-row.staged .ac-row__expansion').exists()).toBe(true)
    expect(inline.find('.ac-row.staged .ac-ochart').exists()).toBe(true)
    expect(inline.find('.ac-now').exists()).toBe(false)
    expect(inline.findAll('.ac-row.staged')).toHaveLength(1)

    // taca ikon znika z wiersza tytułu — akcje przechodzą do rozszerzenia jako podpisane przyciski
    expect(inline.find('.ac-row.staged .ac-row__tray').exists()).toBe(false)
    expect(inline.findAll('.ac-row.staged .af-expansion__actions button')).toHaveLength(4)

    // intencja tygodnia = pasmo „ten tydzień”, nie siedem kropek
    await inline.findAll('.ac-row').find(row => row.text().includes('Zaplanować budżet'))!.trigger('click')
    expect(inline.find('.ac-row.staged .ac-ochart__span').exists()).toBe(true)
    expect(inline.find('.ac-row.staged .ac-ochart__span small').text()).toBe('ten tydzień')

    // nawyk dzienny: klik przenosi rozszerzenie, wykres = kropki z osią dni tygodnia
    const habitRow = inline.findAll('.ac-row').find(row => row.text().includes('Poranne rozciąganie'))!
    await habitRow.trigger('click')
    expect(habitRow.classes()).toContain('staged')
    expect(habitRow.find('.ac-ochart__axis').findAll('span')).toHaveLength(7)
    expect(inline.findAll('.ac-row.staged')).toHaveLength(1)

    // brak tekstu celu w środku wiersza; postęp dnia jako niemy włosek na górze karty
    expect(inline.find('.ac-row__target').exists()).toBe(false)
    expect(inline.find('.af-list__filament').exists()).toBe(true)
    expect(inline.find('.af-list__segments').exists()).toBe(false)
    expect(inline.findAll('.af-entries .af-wpill')).toHaveLength(3)
    expect(inline.find('.af-head').exists()).toBe(false)
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
  it('wariant 19: przypina Kompas, zwija wykonane i dodaje obiekt z pickera', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-inline-v1' })
    const tile = wrapper.find('.ac-tile')
    const rowCount = wrapper.findAll('.ac-row').length
    await tile.trigger('click')
    await tile.trigger('mouseleave')
    expect(tile.attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('.ac-row.dim').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.ac-row')).toHaveLength(rowCount)
    await tile.trigger('click')
    expect(wrapper.findAll('.ac-row.dim')).toHaveLength(0)
    await wrapper.find('[aria-label="Zwiń wykonane"]').trigger('click')
    expect(wrapper.findAll('.ac-row').length).toBeLessThan(rowCount)
    expect(wrapper.find('[aria-label="Zwiększ: Jakość snu. Obecnie 4"]').exists()).toBe(true)
    // puste grupy nie zostawiają samotnych nagłówków
    expect(wrapper.findAll('.af-group').every(group => group.findAll('.ac-row').length > 0)).toBe(true)
    await wrapper.find('[aria-label="Pokaż wykonane"]').trigger('click')
    expect(wrapper.findAll('.ac-row')).toHaveLength(rowCount)

    // jeden plus dla wszystkich typów: kaskada typ → obiekt, bez sierot; brak plusów przy grupach
    expect(wrapper.findAll('.af-group__head button')).toHaveLength(0)
    await wrapper.find('button[aria-label="Dodaj do planu"]').trigger('click')
    expect(wrapper.find('.af-menu__items').exists()).toBe(false)
    const typeButton = wrapper.findAll('.af-menu__types button').find(button => button.text().includes('Cele i rezultaty'))!
    await typeButton.trigger('mouseenter')
    const titles = wrapper.findAll('.af-menu__items button').map(button => button.find('span').text())
    expect(titles.length).toBeGreaterThan(0)
    expect(titles).not.toContain('Rezultat bez aktywnego celu')
    expect(titles).not.toContain('Cel zarchiwizowany w trakcie')
    const candidate = wrapper.find('.af-menu__items button')
    const title = candidate.find('span').text()
    await candidate.trigger('click')
    expect(wrapper.findAll('.ac-row').some(row => row.text().includes(title))).toBe(true)
    expect(wrapper.find('.af-menu').exists()).toBe(false)
    await wrapper.findAll('.af-toast button')[0].trigger('click')
    expect(wrapper.findAll('.ac-row')).toHaveLength(rowCount)
  })

  it('wariant 19: wykres sceny zgadza się z kontrolką wiersza, toast wygasa, Ukryte gasi Cofnij', async () => {
    // setup.ts fałszuje tylko Date — tu potrzebny też setTimeout, więc reinstalujemy zegar z tą samą kotwicą
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date('2026-07-23T12:00:00.000Z'))
    try {
      const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-inline-v1' })
      const row = wrapper.findAll('.ac-row').find(candidate => candidate.text().includes('Cztery sesje deep work'))!
      await row.trigger('click')
      const todayIndex = (new Date().getDay() + 6) % 7
      const todayDot = () => row.findAll('.ac-ochart__dots i')[todayIndex].classes()
      expect(todayDot()).toContain('assigned')
      await row.find('.ac-stamp').trigger('click')
      expect(todayDot()).toContain('done')
      await row.find('.ac-stamp').trigger('click')
      expect(todayDot()).not.toContain('done')

      // komunikat Cofnij znika sam po chwili
      await wrapper.find('.ac-row.staged .af-expansion__actions button').trigger('click')
      expect(wrapper.find('.af-toast').exists()).toBe(true)
      vi.advanceTimersByTime(7500)
      await nextTick()
      expect(wrapper.find('.af-toast').exists()).toBe(false)

      // przywrócenie ukrytych nie zostawia nieaktualnego „Ukryto … Cofnij”
      await wrapper.find('.ac-row.staged .af-expansion__actions button:nth-child(3)').trigger('click')
      expect(wrapper.find('.af-toast').text()).toContain('Ukryto')
      await wrapper.findAll('.af-hidden').find(button => button.text().includes('Ukryte'))!.trigger('click')
      expect(wrapper.find('.af-toast').exists()).toBe(false)
    } finally {
      vi.useRealTimers()
      vi.useFakeTimers({ toFake: ['Date'] })
      vi.setSystemTime(new Date('2026-07-23T12:00:00.000Z'))
    }
  })

  it('kompas Today nie używa mięty ani bursztynu (mapa tonów na róż/czerwień)', () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-inline-v1' })
    const css = wrapper.html()
    expect(wrapper.find('.ac-tile--tone-mint').exists()).toBe(true) // fixture ma priorytet w tonie mint…
    expect(css).not.toMatch(/mint-200|amber-200/) // …ale żaden kafel nie maluje się zielenią/bursztynem inline
  })

  it('wariant 19: przenosi na kolejny dzień, zachowuje wpisy i cofa przeniesienie', async () => {
    const wrapper = mountReplica(TodayReplica, { presetId: 'current', variantId: 'action3-stage-inline-v1' })
    const heading = wrapper.find('.ac-cal__date h2').text()
    const title = 'Cztery sesje deep work w tygodniu'
    const rows = () => wrapper.findAll('.ac-row')
    await wrapper.find('.ac-row.staged .af-expansion__actions button').trigger('click')
    expect(rows().some(row => row.text().includes(title))).toBe(false)
    await wrapper.find('[aria-label="Następny dzień"]').trigger('click')
    expect(wrapper.find('.ac-cal__date h2').text()).not.toBe(heading)
    const moved = rows().find(row => row.text().includes(title))!
    expect(moved).toBeDefined()
    await moved.find('.ac-stamp').trigger('click')
    await wrapper.find('[aria-label="Poprzedni dzień"]').trigger('click')
    expect(wrapper.find('.ac-cal__date h2').text()).toBe(heading)
    expect(rows().some(row => row.text().includes(title))).toBe(false)
    await wrapper.find('[aria-label="Następny dzień"]').trigger('click')
    expect(rows().find(row => row.text().includes(title))!.find('.ac-stamp').attributes('aria-pressed')).toBe('true')
    await wrapper.findAll('.af-toast button')[0].trigger('click')
    expect(wrapper.find('.ac-cal__date h2').text()).toBe(heading)
    expect(rows().some(row => row.text().includes(title))).toBe(true)
  })

})
