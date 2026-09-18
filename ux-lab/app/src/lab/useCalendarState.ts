import { computed, ref } from 'vue'
import type { PeriodRef } from '@product/domain/period'
import { getPeriodBounds, getPeriodType } from '@product/utils/periods'
import { useLabStore } from '~lab/stores/lab.store'
import {
  metricsFor,
  periodTitle,
  refForScale,
  shiftPeriod,
  todayRefs,
  unitsFor,
  type CalendarScale,
  type LensId,
} from '~lab/lab/calendarConceptData'

/**
 * Wspólny stan koncepcji kalendarza: skala, okres w fokusie, zaznaczona jednostka
 * i soczewka. Zmiana skali ZACHOWUJE okres (zoom wokół dnia kotwicy), nie resetuje go.
 */
export function useCalendarState(presetId: string, initialScale: CalendarScale = 'month') {
  const labStore = useLabStore()
  const fixture = computed(() => labStore.fixture)
  const preset = fixture.value.presets.calendar.find(item => item.id === presetId) ?? fixture.value.presets.calendar[0]

  const scale = ref<CalendarScale>(initialScale)
  const focusRef = ref<string>(refForScale(preset.periodRef, initialScale))
  const selectedRef = ref<string | null>(null)
  const lens = ref<LensId>('rytm')

  const today = computed(() => todayRefs(fixture.value))
  const title = computed(() => (scale.value === 'year' ? focusRef.value : periodTitle(focusRef.value)))
  const isTodayFocused = computed(() => focusRef.value === refForScale(today.value.day, scale.value))
  const units = computed(() => unitsFor(fixture.value, scale.value, focusRef.value))

  /** Dzień kotwicy do zoomu: dziś, jeśli mieści się w fokusie; inaczej początek zaznaczenia lub fokusu. */
  function anchorDay(): string {
    const bounds = getPeriodBounds(focusRef.value as PeriodRef)
    if (today.value.day >= bounds.start && today.value.day <= bounds.end) return today.value.day
    return selectedRef.value ? getPeriodBounds(selectedRef.value as PeriodRef).start : bounds.start
  }

  const panelRef = computed(() => {
    if (selectedRef.value) return selectedRef.value
    if (scale.value === 'year') {
      return today.value.day.slice(0, 4) === focusRef.value ? today.value.month : `${focusRef.value}-12`
    }
    return focusRef.value
  })
  const panelMetrics = computed(() => metricsFor(fixture.value, panelRef.value))

  function shift(direction: -1 | 1) {
    focusRef.value = shiftPeriod(focusRef.value, direction)
    selectedRef.value = null
  }

  function goToday() {
    focusRef.value = refForScale(today.value.day, scale.value)
    selectedRef.value = null
  }

  function setScale(next: CalendarScale) {
    if (next === scale.value) return
    const anchor = anchorDay()
    scale.value = next
    focusRef.value = refForScale(anchor, next)
    selectedRef.value = null
  }

  function select(ref: string | null) {
    selectedRef.value = ref
  }

  /** Wejście w jednostkę: miesiąc/tydzień stają się fokusem swojej skali; dzień tylko się zaznacza. */
  function drill(ref: string) {
    const type = getPeriodType(ref as PeriodRef)
    if (type === 'day' || type === 'year') {
      selectedRef.value = ref
      return
    }
    scale.value = type
    focusRef.value = ref
    selectedRef.value = null
  }

  /** Wyjście do skali nadrzędnej z zachowaniem kontekstu. */
  function zoomOut() {
    if (scale.value === 'week') setScale('month')
    else if (scale.value === 'month') setScale('year')
  }

  /** Lab nie ma widoku Dzisiaj ani rytuałów — odnotowujemy zamiar nawigacji. */
  const actionNote = ref('')
  function openDay(dayRef: string) {
    actionNote.value = `→ Dzisiaj · ${dayRef}`
  }
  function openRitual(ref: string) {
    actionNote.value = `→ Rytuał · ${ref}`
  }

  return {
    actionNote,
    openDay,
    openRitual,
    fixture,
    scale,
    focusRef,
    selectedRef,
    lens,
    today,
    title,
    isTodayFocused,
    units,
    panelRef,
    panelMetrics,
    shift,
    goToday,
    setScale,
    select,
    drill,
    zoomOut,
  }
}
