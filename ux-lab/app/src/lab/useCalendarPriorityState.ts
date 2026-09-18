import { computed, inject, reactive, ref, watch } from 'vue'
import { routeLocationKey, routerKey, type LocationQueryRaw } from 'vue-router'
import type { DayRef, PeriodRef } from '@product/domain/period'
import { getPeriodBounds, getPeriodType } from '@product/utils/periods'
import {
  isValidRef,
  refForScale,
  shiftRef,
  unitsFor,
  type Scale,
  type Grain,
} from '~lab/lab/calendarPriorityData'
import {
  buildPriorityScenario,
  isSampleId,
  type PriorityScenario,
  type SampleId,
} from '~lab/lab/calendarPriorityScenario'
import { resolveView } from '~lab/lab/calendarPriorityRows'

function parseFine(raw: string | undefined): string[] { return raw ? raw.split(',').filter(Boolean) : [] }

/**
 * Stan eksperymentu „Rytm kierunków”: URL jako stan (scale/ref/view/fine/summary/sample),
 * jedna kotwica czasu, jedno spojrzenie tabeli. Klik w podokres to zoom (zmiana skali), nie panel.
 * Przejścia do rytuałów i do Dzisiaj są w Labie symulowane toastem.
 */
export function useCalendarPriorityState(presetId: string) {
  const router = inject(routerKey, null)
  const route = inject(routeLocationKey, null)
  const query = () => (route?.query ?? {}) as Record<string, unknown>
  const q = (key: string): string | undefined => {
    const value = query()[key]
    return typeof value === 'string' ? value : undefined
  }

  // Domyślnie próbka `history` (16 miesięcy ciągłych danych, luty 2027 jawny) — presety Labu (current/closed) nie zawężają danych;
  // wąskie podwarianty wybiera się jawnie przez `?sample=`.
  void presetId
  const initialSample: SampleId = isSampleId(q('sample')) ? (q('sample') as SampleId) : 'history'
  const sample = ref<SampleId>(initialSample)
  const scenario = reactive(buildPriorityScenario(initialSample)) as PriorityScenario

  const initialScale = (['year', 'month', 'week'] as Scale[]).includes(q('scale') as Scale) ? (q('scale') as Scale) : scenario.initial.scale
  const scale = ref<Scale>(initialScale)
  const initialRef = isValidRef(initialScale, q('ref')) ? q('ref')! : initialScale === scenario.initial.scale ? scenario.initial.ref : refForScale(scenario.clock, initialScale)
  const focusRef = ref<string>(initialRef)

  /** Spojrzenie tabeli wybrane jawnie (URL `view`, dawniej `open`); null = domyślne dla okresu. */
  const requestedView = ref<string | null>(q('view') ?? q('open') ?? null)
  /** Serie pokazywane w drobniejszej granulacji (dni w miesiącu, tygodnie w roku) — per wykres, URL `fine=a,b`. */
  const fineKeys = ref<string[]>(parseFine(q('fine')))
  const summaryOpen = ref(q('summary') === '1')
  const moreSeries = ref<string | null>(null)

  const today = computed(() => scenario.clock)
  const units = computed(() => unitsFor(scale.value, focusRef.value, scenario.clock))
  const isTodayFocused = computed(() => focusRef.value === refForScale(scenario.clock, scale.value))
  /** Spojrzenie efektywne: żądane, jeśli ma sens w okresie; inaczej pierwsze z listy. */
  const view = computed(() => resolveView(scenario, scale.value, focusRef.value, units.value, requestedView.value))
  const focusState = computed(() => {
    const b = getPeriodBounds(focusRef.value as PeriodRef)
    return b.end < scenario.clock ? 'past' : b.start > scenario.clock ? 'future' : 'current'
  })

  /* ------------------------------------------------------------ URL */

  let syncing = false
  function writeQuery(push = false) {
    if (!router || !route) return
    const next: LocationQueryRaw = { ...route.query }
    const set = (key: string, value: string | null | undefined) => {
      if (value === null || value === undefined) delete next[key]
      else next[key] = value
    }
    set('sample', sample.value)
    set('fine', fineKeys.value.length ? fineKeys.value.join(',') : null)
    set('grain', null)
    set('summary', summaryOpen.value ? '1' : null)
    set('scale', scale.value)
    set('ref', focusRef.value)
    set('view', requestedView.value)
    set('open', null)
    set('cell', null)
    set('filter', null)
    syncing = true
    void (push ? router.push({ query: next }) : router.replace({ query: next })).finally(() => { syncing = false })
  }

  if (route) {
    // Wstecz przeglądarki: odtwórz skalę, zakres, spojrzenie i rozwinięcia z query.
    watch(() => route.query, () => {
      if (syncing) return
      // brak parametrów = adres startowy → stan początkowy scenariusza
      const s = (['year', 'month', 'week'] as Scale[]).includes(q('scale') as Scale) ? (q('scale') as Scale) : scenario.initial.scale
      if (s !== scale.value) scale.value = s
      const r = isValidRef(scale.value, q('ref')) ? q('ref')! : scale.value === scenario.initial.scale ? scenario.initial.ref : refForScale(scenario.clock, scale.value)
      if (r !== focusRef.value) focusRef.value = r
      requestedView.value = q('view') ?? q('open') ?? null
      fineKeys.value = parseFine(q('fine'))
      summaryOpen.value = q('summary') === '1'
    }, { deep: true })
  }

  /* ------------------------------------------------------------ nawigacja */

  /** Ostatnia kotwica zoomu — dzięki niej luty → rok → miesiąc wraca do lutego, a nie do miesiąca zegara. */
  const lastAnchor = ref<DayRef | null>(null)

  /** Kotwica: poprzednia kotwica (jeśli w okresie) → dziś (jeśli w okresie) → początek okresu. */
  function anchorDay(): DayRef {
    const bounds = getPeriodBounds(focusRef.value as PeriodRef)
    const inside = (d: DayRef) => d >= bounds.start && d <= bounds.end
    if (lastAnchor.value && inside(lastAnchor.value)) return lastAnchor.value
    if (inside(scenario.clock)) return scenario.clock
    return bounds.start
  }

  function setScale(next: Scale) {
    if (next === scale.value) return
    const anchor = anchorDay()
    lastAnchor.value = anchor
    // spojrzenie (kierunek / rodzina) przechodzi między skalami
    scale.value = next
    focusRef.value = refForScale(anchor, next)
    writeQuery(true)
  }

  function shift(direction: -1 | 1) {
    focusRef.value = shiftRef(focusRef.value, direction)
    lastAnchor.value = null
    writeQuery(true)
  }

  function goToday() {
    focusRef.value = refForScale(scenario.clock, scale.value)
    lastAnchor.value = scenario.clock
    writeQuery(true)
  }

  /** Zoom w podokres: tydzień/miesiąc staje się fokusem swojej skali (spojrzenie zostaje); dzień otwiera Dzisiaj. */
  function openUnit(unitRef: string) {
    const type = getPeriodType(unitRef as PeriodRef)
    if (type === 'day') {
      note(`→ Dzisiaj · ${unitRef}`)
      return
    }
    if (type === 'year') return
    scale.value = type
    focusRef.value = unitRef
    lastAnchor.value = getPeriodBounds(unitRef as PeriodRef).start
    writeQuery(true)
  }

  /* ------------------------------------------------------------ spojrzenie tabeli */

  function toggleFine(objectKey: string) {
    fineKeys.value = fineKeys.value.includes(objectKey) ? fineKeys.value.filter(k => k !== objectKey) : [...fineKeys.value, objectKey]
    writeQuery()
  }
  /** Granulacja jednej serii: drobna tylko poza tygodniem (dzień nie ma podjednostek). */
  function grainOf(objectKey: string): Grain { return scale.value !== 'week' && fineKeys.value.includes(objectKey) ? 'fine' : 'unit' }
  function toggleSummary() { summaryOpen.value = !summaryOpen.value; writeQuery() }

  /** Zmiana spojrzenia zwija „pozostałe”. */
  function setView(id: string) {
    requestedView.value = id
    moreSeries.value = null
    writeQuery()
  }

  /* ------------------------------------------------------------ symulowane przejścia */

  const toast = ref<string | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  const actionNote = ref<string | null>(null)
  function note(message: string) {
    actionNote.value = message
    toast.value = `Symulacja · ${message}`
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => { toast.value = null }, 7000)
  }

  return {
    scenario, sample, scale, focusRef, units, today, isTodayFocused, focusState,
    fineKeys, toggleFine, grainOf, summaryOpen, toggleSummary,
    view, setView, moreSeries,
    toast, actionNote,
    setScale, shift, goToday, openUnit, note,
  }
}
