import { computed } from 'vue'
import type { MeasurementEntryMode } from '@/domain/planning'
import type { MonthRef, PeriodRef } from '@/domain/period'
import type { ObjectsLibraryPanelType } from '@/services/objectsLibraryQueries'
import {
  formatMonthShort as formatMonthShortLocalized,
  formatPeriodLabel,
} from '@/utils/periodLabels'
import { getPeriodType } from '@/utils/periods'
import type { LibraryContext } from './libraryContext'

type Option = { value: string; label: string }

/** Labels, option lists and empty-state copy of the library (P-5: out of the view). */
export function useLibraryOptions(ctx: Pick<LibraryContext, 'store' | 't' | 'locale'>) {
  const { store, t, locale } = ctx

  const familyOptions = computed(() => [
    { family: 'priorities' as const, label: t('planning.objects.families.priorities') },
    { family: 'goals' as const, label: t('planning.objects.families.goals') },
    { family: 'habits' as const, label: t('planning.objects.families.habits') },
    { family: 'trackers' as const, label: t('planning.objects.families.trackers') },
    { family: 'intentions' as const, label: t('planning.objects.families.intentions') },
  ])

  const activeFamilyTitle = computed(() => {
    const active = familyOptions.value.find(item => item.family === store.query.family)
    return active?.label ?? t('planning.objects.title')
  })

  function describePeriod(period: PeriodRef): string {
    const type = getPeriodType(period)
    if (type === 'year') return period
    if (type === 'month') return formatMonthShortLocalized(period as MonthRef, locale.value)
    return formatPeriodLabel(period, locale.value, t('planning.periodPicker.week'))
  }

  // Names what is narrowing the list so the user knows which chip to loosen.
  const filteredEmptyBody = computed(() => {
    const parts: string[] = []
    const query = store.query
    if (query.q.trim()) parts.push(`${t('planning.objects.filters.search')}: „${query.q.trim()}”`)
    if (query.period)
      parts.push(`${t('planning.objects.filters.period')}: ${describePeriod(query.period)}`)
    const areas = store.filterOptions.lifeAreas.filter(option =>
      query.lifeAreaIds.includes(option.id)
    )
    if (areas.length > 0)
      parts.push(
        `${t('planning.objects.filters.lifeAreas')}: ${areas.map(a => a.label).join(', ')}`
      )
    const priorities = store.filterOptions.priorities.filter(option =>
      query.priorityIds.includes(option.id)
    )
    if (priorities.length > 0)
      parts.push(
        `${t('planning.objects.filters.priorities')}: ${priorities.map(p => p.label).join(', ')}`
      )
    if (parts.length === 0) return t('planning.objects.empty.filteredBody')
    return t('planning.objects.empty.filteredNarrowedBy', { list: parts.join(' · ') })
  })

  const createButtonLabel = computed(() => {
    switch (store.query.family) {
      case 'goals':
        return t('planning.objects.actions.addGoal')
      case 'priorities':
        return t('planning.objects.actions.addPriority')
      case 'habits':
        return t('planning.objects.actions.addHabit')
      case 'trackers':
        return t('planning.objects.actions.addTracker')
      case 'intentions':
        return t('planning.weekPlanning.intentions.add')
      default:
        return ''
    }
  })

  const familyEmptyTitle = computed(() =>
    store.query.family === 'intentions'
      ? t('planning.objects.empty.intentionsTitle')
      : t('planning.objects.empty.familyTitle')
  )

  const isFamilyEmptyState = computed(() =>
    Boolean(store.bundle && store.bundle.familyTotalCount === 0)
  )

  const cadenceOptions = computed(() => [
    { value: 'weekly' as const, label: t('planning.objects.badges.cadence.weekly') },
    { value: 'monthly' as const, label: t('planning.objects.badges.cadence.monthly') },
  ])

  const entryModeOptions = computed(() => [
    { value: 'completion' as const, label: t('planning.objects.badges.entryMode.completion') },
    {
      value: 'multi-completion' as const,
      label: t('planning.objects.badges.entryMode.multi-completion'),
    },
    { value: 'counter' as const, label: t('planning.objects.badges.entryMode.counter') },
    { value: 'value' as const, label: t('planning.objects.badges.entryMode.value') },
    { value: 'rating' as const, label: t('planning.objects.badges.entryMode.rating') },
  ])

  function statusOptionsForType(panelType: ObjectsLibraryPanelType): Option[] {
    if (panelType === 'priority') {
      return [
        { value: 'draft', label: t('planning.objects.badges.status.draft') },
        { value: 'active', label: t('planning.objects.badges.status.active') },
        { value: 'paused', label: t('planning.objects.badges.status.paused') },
        { value: 'closed', label: t('planning.objects.badges.status.closed') },
      ]
    }
    if (panelType === 'habit' || panelType === 'tracker') {
      return [
        { value: 'open', label: t('planning.objects.badges.status.open') },
        { value: 'retired', label: t('planning.objects.badges.status.retired') },
        { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
      ]
    }
    return [
      { value: 'open', label: t('planning.objects.badges.status.open') },
      { value: 'completed', label: t('planning.objects.badges.status.completed') },
      { value: 'dropped', label: t('planning.objects.badges.status.dropped') },
    ]
  }

  function krTargetOperatorOptions(entryMode: MeasurementEntryMode): Option[] {
    if (entryMode === 'completion' || entryMode === 'counter') {
      return [
        { value: 'min', label: t('planning.objects.targetOperators.min') },
        { value: 'max', label: t('planning.objects.targetOperators.max') },
      ]
    }
    return [
      { value: 'gte', label: t('planning.objects.targetOperators.gte') },
      { value: 'lte', label: t('planning.objects.targetOperators.lte') },
    ]
  }

  function krTargetAggregationOptions(entryMode: MeasurementEntryMode): Option[] {
    if (entryMode === 'rating') {
      return [{ value: 'average', label: t('planning.objects.targetAggregations.average') }]
    }
    return [
      { value: 'sum', label: t('planning.objects.targetAggregations.sum') },
      { value: 'average', label: t('planning.objects.targetAggregations.average') },
      { value: 'last', label: t('planning.objects.targetAggregations.last') },
    ]
  }

  function krShowTargetAggregation(entryMode: MeasurementEntryMode): boolean {
    return entryMode === 'value' || entryMode === 'rating'
  }

  return {
    familyOptions,
    activeFamilyTitle,
    filteredEmptyBody,
    createButtonLabel,
    familyEmptyTitle,
    isFamilyEmptyState,
    cadenceOptions,
    entryModeOptions,
    statusOptionsForType,
    krTargetOperatorOptions,
    krTargetAggregationOptions,
    krShowTargetAggregation,
  }
}
