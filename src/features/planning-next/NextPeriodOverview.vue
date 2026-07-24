<template>
  <div class="next-overview">
    <DsState
      v-if="empty"
      class="next-overview__empty"
      icon="calendar_add_on"
      title="Ten okres jest jeszcze pusty"
      body="Możesz rozpocząć rytuał albo wrócić do wcześniejszego okresu."
      :action-label="ritualAction === 'plan' ? 'Rozpocznij planowanie' : 'Otwórz refleksję'"
      @action="$emit('open-ritual', ritualAction)"
    />

    <template v-else-if="selectedCategory">
      <nav class="next-overview__tabs" aria-label="Obszary okresu">
        <button v-for="category in categories" :key="category.id" type="button" :class="{ active: category.id === selectedCategory.id }" @click="openCategory(category)">
          <span><AppIcon :name="category.icon" /></span><strong>{{ category.label }}</strong>
        </button>
        <button type="button" aria-label="Zamknij szczegóły" @click="selectedCategoryId = null"><AppIcon name="close_fullscreen" /></button>
      </nav>

      <section class="next-overview__details">
        <header>
          <span>{{ selectedCategory.label }} · {{ detailAxisLabel }}</span>
          <div class="next-overview__density" role="group" aria-label="Liczba kart w rzędzie">
            <small>Naraz</small><button v-for="value in [1, 2, 3] as const" :key="value" type="button" :aria-pressed="density === value" @click="density = value">{{ value }}</button>
          </div>
        </header>
        <div class="next-overview__object-grid" :class="`next-overview__object-grid--${density}`">
          <button v-for="item in filteredItems" :key="item.key" type="button" @click="openObject(item)">
            <NextObjectChartCard
              :icon="objectIcon(item)"
              :title="item.subject.title"
              :summary="measurementLabel(item)"
              :entry-mode="item.subject.entryMode"
              :cadence="item.subject.cadence"
              :scale="scale === 'year' ? 'month' : scale"
              :points="periodChartPoints(item)"
              :actual-value="item.measurement.actualValue"
              :target-value="item.measurement.target?.value"
              :aggregate-status="item.measurement.evaluationStatus"
            />
          </button>
        </div>
        <DsState v-if="!filteredItems.length" title="Brak obiektów" body="W tym obszarze nie ma obiektów dla wybranego okresu." />
      </section>

      <nav class="next-overview__shortcuts" aria-label="Pozostałe obszary">
        <button v-for="category in categories" :key="category.id" type="button" :class="{ active: category.id === selectedCategory.id }" @click="openCategory(category)"><span><AppIcon :name="category.icon" /></span>{{ category.label }}</button>
        <button type="button" aria-label="Wróć do przeglądu" @click="selectedCategoryId = null"><span><AppIcon name="arrow_left_alt" /></span></button>
      </nav>
    </template>

    <template v-else>
      <section class="next-overview__row next-overview__row--priorities" :aria-label="priorityRowLabel">
        <button v-for="(priority, index) in priorityTiles" :key="priority.key" type="button" @click="openPriority(priority)">
          <span class="next-overview__visual">
            <AppIcon :name="priority.icon" />
            <span v-if="priority.metric" class="next-overview__metric">{{ priority.metric }}</span>
            <i :class="`tone-${priority.tone ?? toneForIndex(index)}`" />
          </span>
          <strong>{{ priority.label }}</strong>
        </button>
      </section>

      <section v-for="row in categoryRows" :key="row.id" class="next-overview__row" :aria-label="row.label">
        <button v-for="category in row.items" :key="category.id" type="button" @click="openCategory(category)">
          <span class="next-overview__visual"><AppIcon :name="category.icon" /><span v-if="category.count !== null" class="next-overview__metric">{{ category.count }}</span></span>
          <strong>{{ category.label }}</strong>
        </button>
      </section>

      <p class="next-overview__hint"><AppIcon name="touch_app" />Wybierz obszar, aby zobaczyć {{ detailAxisLabel }}. Szczegóły liczb pojawiają się dopiero w kartach.</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { PlanningScale } from '@/design-system/contracts'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { Priority } from '@/domain/planning'
import type { MonthObjectItem, WeekObjectItem } from '@/services/reflectionDataQueries'
import { getPeriodRefsForDate } from '@/utils/periods'
import { buildMonthWeeklyChartPoints, buildWeekDailyChartPoints } from '@/services/calendarChartData'
import { DsState } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { PlanningPeriodData } from './usePlanningPeriodData'
import NextObjectChartCard from './NextObjectChartCard.vue'
import type { NextObjectChartPoint } from './nextObjectChart'

type ObjectItem = MonthObjectItem | WeekObjectItem
type CategoryId = 'goals' | 'habits' | 'trackers' | 'intentions' | 'journal' | 'emotions' | 'reflections'
interface Category { id: CategoryId; label: string; icon: string; count: number | null; route?: string }
interface PriorityTile { key: string; label: string; icon: string; metric?: string; tone?: 'blue' | 'lavender' | 'mint'; item?: ObjectItem; priority?: Priority }

const props = defineProps<{ scale: Exclude<PlanningScale, 'day'>; periodRef: string; data: PlanningPeriodData; empty: boolean }>()
const emit = defineEmits<{
  'open-period': [scale: PlanningScale, periodRef: string]
  'open-ritual': [action: 'plan' | 'reflect']
}>()

const route = useRoute()
const router = useRouter()
const density = ref<1 | 2 | 3>(2)
const selectedCategoryId = ref<CategoryId | null>(null)
watch(() => [props.scale, props.periodRef], () => { selectedCategoryId.value = null })

const currentRefs = getPeriodRefsForDate(new Date())
const ritualAction = computed<'plan' | 'reflect'>(() => {
  if (props.scale === 'year') return 'plan'
  if (props.scale === 'month') return props.periodRef < currentRefs.month ? 'reflect' : 'plan'
  return props.periodRef < currentRefs.week ? 'reflect' : 'plan'
})
const items = computed<ObjectItem[]>(() => props.data.scale === 'month' || props.data.scale === 'week' ? props.data.items : [])
const intentionCount = computed(() => props.data.scale === 'week' || props.data.scale === 'month' ? props.data.intentions.length : props.data.summary.totals.activeInitiativeCount)
const baseCategories = computed<Category[]>(() => [
  { id: 'goals', label: 'Cele', icon: 'mountain_flag', count: props.data.scale === 'year' ? props.data.summary.totals.activeGoalCount : items.value.filter(item => item.subjectType === 'keyResult').length },
  { id: 'habits', label: 'Nawyki', icon: 'change_circle', count: props.data.scale === 'year' ? props.data.summary.totals.activeCadencedCount : items.value.filter(item => item.subjectType === 'habit').length },
  { id: 'trackers', label: 'Trackery', icon: 'show_chart', count: props.data.scale === 'year' ? props.data.summary.totals.activeTrackerCount : items.value.filter(item => item.subjectType === 'tracker').length },
])
const categories = computed<Category[]>(() => props.scale === 'year'
  ? [...baseCategories.value, { id: 'reflections', label: 'Refleksje', icon: 'rate_review', count: props.data.scale === 'year' ? props.data.summary.months.filter(month => month.hasReflection).length : 0 }, { id: 'journal', label: 'Dziennik', icon: 'history_edu', count: null, route: '/journal' }, { id: 'emotions', label: 'Emocje', icon: 'cognition', count: null, route: '/emotions' }]
  : [...baseCategories.value, { id: 'intentions', label: 'Intencje', icon: 'gps_fixed', count: intentionCount.value }, { id: 'journal', label: 'Dziennik', icon: 'history_edu', count: null, route: '/journal' }, { id: 'emotions', label: 'Emocje', icon: 'cognition', count: null, route: '/emotions' }])
const categoryRows = computed(() => [
  { id: 'execution', label: `Wykonanie ${scaleGenitive.value}`, items: categories.value.slice(0, 3) },
  { id: 'context', label: `Kontekst ${scaleGenitive.value}`, items: categories.value.slice(3, 6) },
])
const selectedCategory = computed(() => categories.value.find(category => category.id === selectedCategoryId.value) ?? null)
const filteredItems = computed(() => {
  if (selectedCategoryId.value === 'goals') return items.value.filter(item => item.subjectType === 'keyResult')
  if (selectedCategoryId.value === 'habits') return items.value.filter(item => item.subjectType === 'habit')
  if (selectedCategoryId.value === 'trackers') return items.value.filter(item => item.subjectType === 'tracker')
  return []
})
const scaleGenitive = computed(() => props.scale === 'week' ? 'tygodnia' : props.scale === 'month' ? 'miesiąca' : 'roku')
const detailAxisLabel = computed(() => props.scale === 'week' ? 'siedem dni' : props.scale === 'month' ? 'tygodnie miesiąca' : 'miesiące roku')
const priorityRowLabel = computed(() => props.scale === 'week' ? 'Najważniejsze zobowiązania tygodnia' : props.scale === 'month' ? 'Kierunki miesiąca' : 'Kierunki roku')

const weekFocusItems = computed<ObjectItem[]>(() => {
  if (props.data.scale !== 'week') return []
  const refs = props.data.planning.weekPlan?.topPriorities ?? []
  const selected = refs.map(ref => props.data.scale === 'week' ? props.data.items.find(item => item.subjectType === ref.subjectType && item.subject.id === ref.subjectId) : undefined).filter((item): item is ObjectItem => Boolean(item))
  return selected.length ? selected.slice(0, 3) : props.data.items.slice(0, 3)
})
const monthPriorities = computed<Priority[]>(() => {
  if (props.data.scale !== 'month') return []
  const selectedIds = props.data.planning.monthPlan?.topPriorityIds ?? []
  const selected = selectedIds.map(id => props.data.scale === 'month' ? props.data.priorities.find(priority => priority.id === id) : undefined).filter((priority): priority is Priority => Boolean(priority))
  const fallbacks = props.data.priorities.filter(priority => priority.status === 'active' && !selectedIds.includes(priority.id))
  return [...selected, ...fallbacks].slice(0, 3)
})
const yearPriorities = computed<Priority[]>(() => {
  const data = props.data
  if (data.scale !== 'year') return []
  return data.priorities.filter(priority => priority.status === 'active' && priority.years.includes(data.summary.yearRef)).slice(0, 3)
})
const priorityTiles = computed<PriorityTile[]>(() => {
  const raw: PriorityTile[] = props.data.scale === 'week'
    ? weekFocusItems.value.map(item => ({ key: item.key, label: item.subject.title, icon: objectIcon(item), item }))
    : props.data.scale === 'month'
      ? monthPriorities.value.map((priority, index) => ({ key: priority.id, label: priority.title, icon: priority.icon || priorityFallbackIcon(index), metric: monthPriorityEffort(priority), priority }))
      : yearPriorities.value.map((priority, index) => ({ key: priority.id, label: priority.title, icon: priority.icon || priorityFallbackIcon(index), metric: yearPriorityMetric(priority), priority }))
  while (raw.length < 3) raw.push({ key: `empty-${raw.length}`, label: props.scale === 'week' ? 'Miejsce na fokus' : 'Miejsce na kierunek', icon: 'add_circle' })
  return raw.slice(0, 3).map((tile, index) => ({ ...tile, tone: toneForIndex(index) }))
})

function toneForIndex(index: number): 'blue' | 'lavender' | 'mint' { return index === 1 ? 'lavender' : index === 2 ? 'mint' : 'blue' }
function priorityFallbackIcon(index: number): string { return index === 0 ? 'directions_run' : index === 1 ? 'rocket_launch' : 'favorite' }
function monthPriorityEffort(priority: Priority): string {
  const data = props.data
  if (data.scale !== 'month') return '—/5'
  const reflection = data.reflection.objectReflections.find(item => item.subjectType === 'priority' && item.subjectId === priority.id)
  return `${reflection?.effort ?? '—'}/5`
}
function yearPriorityMetric(priority: Priority): string {
  if (props.data.scale !== 'year') return '—'
  return String(props.data.months.filter(month => month.priorities.some(item => item.key === priority.id)).length)
}
function openPriority(tile: PriorityTile) {
  if (tile.item) { openObject(tile.item); return }
  if (tile.priority) {
    void router.push({ name: 'objects-family', params: { family: 'priorities' }, query: { expandedType: 'priority', expandedId: tile.priority.id } })
    return
  }
  emit('open-ritual', 'plan')
}
function openCategory(category: Category) {
  if (category.route) { void router.push(category.route); return }
  if (category.id === 'reflections') { emit('open-ritual', 'reflect'); return }
  if (props.scale === 'year' && ['goals', 'habits', 'trackers'].includes(category.id)) {
    const family = category.id === 'goals' ? 'goals' : category.id
    void router.push({ name: 'objects-family', params: { family } })
    return
  }
  if (category.id === 'intentions') {
    void router.push({ name: 'calendar-week', params: { weekRef: props.data.scale === 'month' ? props.data.weeks.find(week => week.isCurrent)?.weekRef ?? props.data.weeks[0]?.weekRef : props.periodRef }, query: { ...(route.query.ui ? { ui: route.query.ui } : {}) } })
    return
  }
  selectedCategoryId.value = category.id
}
function openObject(item: ObjectItem) {
  const family = item.subjectType === 'habit' ? 'habits' : item.subjectType === 'tracker' ? 'trackers' : 'goals'
  void router.push({ name: 'objects-family', params: { family }, query: { expandedType: item.subjectType, expandedId: item.subject.id } })
}
function periodChartPoints(item: ObjectItem): NextObjectChartPoint[] {
  const data = props.data
  if (data.scale === 'week') {
    return buildWeekDailyChartPoints(
      item.subject,
      item.subjectType,
      data.planning.rawEntries,
      data.planning.weekRef,
      item.subject.cadence === 'monthly' ? item.measurement.evaluationStatus : undefined,
    ).map(point => ({
      key: point.periodRef,
      label: new Intl.DateTimeFormat('pl-PL', { weekday: 'short' }).format(new Date(`${point.periodRef}T12:00:00`)).replace('.', ''),
      value: point.actualValue,
      target: point.targetValue,
      status: point.status,
      future: point.periodRef > currentRefs.day,
      current: point.periodRef === currentRefs.day,
      assigned: data.assignments.some(assignment => assignment.dayRef === point.periodRef && assignment.subjectType === item.subjectType && assignment.subjectId === item.subject.id),
    }))
  }
  if (data.scale === 'month') {
    return buildMonthWeeklyChartPoints(
      item.subject,
      data.planning.rawEntries,
      data.planning.monthRef,
      item.subject.cadence === 'monthly' ? item.measurement.evaluationStatus : undefined,
    ).map(point => ({
      key: point.periodRef,
      label: `T${point.periodRef.slice(-2)}`,
      value: point.actualValue,
      target: point.targetValue,
      status: point.status,
      future: point.periodRef > currentRefs.week,
      current: point.periodRef === currentRefs.week,
    }))
  }
  return []
}
function objectIcon(item: ObjectItem): string {
  const subject = item.subject as { icon?: string }
  return subject.icon || item.parentGoalIcon || iconForSubject(item.subjectType)
}
function iconForSubject(subjectType: MeasurementSubjectType): string { return subjectType === 'keyResult' ? 'mountain_flag' : subjectType === 'habit' ? 'change_circle' : subjectType === 'tracker' ? 'show_chart' : 'gps_fixed' }
function measurementLabel(item: ObjectItem): string {
  const actual = item.measurement.actualValue
  const target = item.measurement.target?.value
  if (actual === undefined && target === undefined) return 'Brak wartości dla tego okresu'
  if (target === undefined) return `Wartość: ${actual ?? '—'}`
  return `${actual ?? '—'} / ${target}`
}
</script>
