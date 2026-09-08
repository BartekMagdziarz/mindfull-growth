import { computed, ref, shallowRef, watch, type Ref } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type { DayRef, PeriodRef } from '@/domain/period'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { resolveView } from './rhythmRows'
import { emptyRhythmScenario, type RhythmScenario } from './rhythmScenario'
import { buildRhythmScenario } from './rhythmScenarioLoader'
import { unitsFor, type Grain, type Scale } from './rhythmProjections'

/**
 * State of the rhythm calendar. The URL is the state: `view` (which single
 * lens the table shows), `fine` (which series are drawn at a finer grain) and
 * `summary` (whether the period summary is expanded) all survive reload and
 * the browser's back button. The period itself stays in the route params, so
 * it keeps working with the rest of the calendar.
 */
export function useRhythmCalendar(scale: Ref<Scale>, periodRef: Ref<string>) {
  const route = useRoute()
  const router = useRouter()

  const scenario = shallowRef<RhythmScenario>(emptyRhythmScenario(getPeriodRefsForDate(new Date()).day))
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  const query = (key: string): string | undefined => {
    const value = route.query[key]
    return typeof value === 'string' ? value : undefined
  }

  const requestedView = ref<string | null>(query('view') ?? null)
  const fineKeys = ref<string[]>(parseList(query('fine')))
  const summaryOpen = ref(query('summary') === '1')
  const moreSeries = ref<string | null>(null)

  const clock = computed(() => scenario.value.clock)
  const units = computed(() => unitsFor(scale.value, periodRef.value, clock.value))
  const view = computed(() => resolveView(scenario.value, scale.value, periodRef.value, units.value, requestedView.value))
  const periodState = computed<'past' | 'current' | 'future'>(() => {
    const bounds = getPeriodBounds(periodRef.value as PeriodRef)
    if (bounds.end < clock.value) return 'past'
    if (bounds.start > clock.value) return 'future'
    return 'current'
  })
  const isTodayFocused = computed(() => {
    const bounds = getPeriodBounds(periodRef.value as PeriodRef)
    return clock.value >= bounds.start && clock.value <= bounds.end
  })

  watch(
    [scale, periodRef],
    () => {
      void load()
    },
    { immediate: true },
  )

  // Back/forward: the lens and the reveals come from the URL, never from memory.
  watch(
    () => [route.query.view, route.query.fine, route.query.summary],
    () => {
      requestedView.value = query('view') ?? null
      fineKeys.value = parseList(query('fine'))
      summaryOpen.value = query('summary') === '1'
    },
  )

  async function load(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      const today = getPeriodRefsForDate(new Date()).day as DayRef
      scenario.value = await buildRhythmScenario(scale.value, periodRef.value, today)
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : String(reason)
    } finally {
      isLoading.value = false
    }
  }

  function writeQuery(): void {
    const next: LocationQueryRaw = { ...route.query }
    setQueryValue(next, 'view', requestedView.value)
    setQueryValue(next, 'fine', fineKeys.value.length ? fineKeys.value.join(',') : null)
    setQueryValue(next, 'summary', summaryOpen.value ? '1' : null)
    void router.replace({ query: next })
  }

  /** Changing the lens collapses "the rest" of the previous one. */
  function setView(id: string): void {
    requestedView.value = id
    moreSeries.value = null
    writeQuery()
  }

  function toggleFine(objectKey: string): void {
    fineKeys.value = fineKeys.value.includes(objectKey)
      ? fineKeys.value.filter(key => key !== objectKey)
      : [...fineKeys.value, objectKey]
    writeQuery()
  }

  /** Finer grain only outside the week scale — a day has no sub-units. */
  function grainOf(objectKey: string): Grain {
    return scale.value !== 'week' && fineKeys.value.includes(objectKey) ? 'fine' : 'unit'
  }

  function toggleSummary(): void {
    summaryOpen.value = !summaryOpen.value
    writeQuery()
  }

  function toggleMore(rowId: string): void {
    const parent = rowId.replace(/:more$/, '')
    moreSeries.value = moreSeries.value === parent ? null : parent
  }

  return {
    scenario,
    isLoading,
    error,
    load,
    units,
    clock,
    periodState,
    isTodayFocused,
    view,
    setView,
    fineKeys,
    toggleFine,
    grainOf,
    summaryOpen,
    toggleSummary,
    moreSeries,
    toggleMore,
  }
}

function parseList(raw: string | undefined): string[] {
  return raw ? raw.split(',').filter(Boolean) : []
}

function setQueryValue(query: LocationQueryRaw, key: string, value: string | null): void {
  if (value === null) delete query[key]
  else query[key] = value
}
