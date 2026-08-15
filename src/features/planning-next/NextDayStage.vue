<template>
  <div class="next-day-stage">
    <DsState v-if="store.isLoading && !store.bundle" title="Ładuję dzień" body="Zbieram wykonanie, skróty i kontekst." />
    <DsState
      v-else-if="store.error && !store.bundle"
      icon="error"
      title="Nie udało się wczytać dnia"
      :body="store.error"
    />
    <template v-else-if="store.bundle">
      <section v-if="selectedCategory" class="next-day-stage__details">
        <header>
          <div><span><AppIcon :name="selectedCategory.icon" /></span><div><small>DZIEŃ · SZCZEGÓŁY</small><h2>{{ selectedCategory.label }}</h2></div></div>
          <div v-if="selectedObjectItems.length" class="next-overview__density">
            <button v-for="value in [1, 2, 3] as const" :key="value" type="button" :aria-pressed="density === value" @click="density = value">{{ value }}</button>
          </div>
          <DsButton icon-only variant="quiet" aria-label="Zamknij szczegóły" @click="selectedCategoryId = null"><AppIcon name="close" /></DsButton>
        </header>

        <div v-if="selectedObjectItems.length" class="next-day-stage__object-grid" :class="`next-day-stage__object-grid--${density}`">
          <button v-for="item in selectedObjectItems" :key="item.key" type="button" @click="openObject(item)">
            <NextObjectChartCard
              v-if="item.kind === 'measurement'"
              :icon="objectIcon(item)"
              :title="item.subject.title"
              :summary="objectSummary(item)"
              :entry-mode="item.subject.entryMode"
              :cadence="item.subject.cadence"
              scale="day"
              :points="dayChartPoints(item)"
              :actual-value="item.measurement.actualValue"
              :target-value="item.measurement.target?.value"
              :aggregate-status="item.measurement.evaluationStatus"
            />
          </button>
        </div>

        <div v-else-if="selectedCategory.id === 'journal'" class="next-day-stage__wellness-single"><JournalCard :state="journalState" /></div>
        <div v-else-if="selectedCategory.id === 'emotions'" class="next-day-stage__wellness-single"><EmotionCard :target="DAILY_EMOTION_TARGET" :logs="todayEmotionLogs" /></div>
        <div v-else-if="selectedCategory.id === 'exercises'" class="next-day-stage__wellness-single"><ExerciseCard :day-ref="dayRef" :is-today="isToday" :completions="exerciseCompletionsStore.completions" :day-count="exerciseDayCompletions.length" /></div>
        <div v-else-if="selectedCategory.id === 'programs'" class="next-day-stage__wellness-stack">
          <PlannedExercisesCard v-if="isToday && duePlanItems.length" :items="duePlanItems" :today-ref="dayRef" />
          <ProgramCard v-if="isToday && activeEnrollments.length" :enrollments="activeEnrollments" :today-ref="dayRef" />
          <DsState v-if="!isToday || (!duePlanItems.length && !activeEnrollments.length)" title="Brak planów programów" body="Programy i zaległe ćwiczenia są akcjami bieżącego dnia." />
        </div>
        <DsState v-else title="Brak elementów" body="W tym obszarze nie ma jeszcze danych dla wybranego dnia." />

        <footer class="next-day-stage__shortcuts">
          <button v-for="category in categories" :key="category.id" type="button" :aria-pressed="category.id === selectedCategoryId" @click="openCategory(category)"><span><AppIcon :name="category.icon" /></span><small>{{ category.label }}</small></button>
        </footer>
      </section>

      <section v-else class="next-day-stage__board" aria-label="Skróty i obszary dnia">
        <div v-for="row in dayBoardRows" :key="row.id" class="next-day-stage__board-row">
          <button v-for="category in row.items" :key="category.id" type="button" @click="openCategory(category)">
            <span><AppIcon :name="category.icon" /></span><strong>{{ category.label }}</strong>
          </button>
        </div>

        <div class="next-day-stage__board-row next-day-stage__board-row--priorities" aria-label="Kierunki dnia">
          <button v-for="(priority, index) in dayPriorities" :key="priority.id" type="button" @click="openPriority(priority)">
            <span><AppIcon :name="priority.icon || priorityFallbackIcon(index)" /><i :class="`tone-${priorityTone(index)}`" /></span><strong>{{ priority.title }}</strong>
          </button>
        </div>

        <div class="next-day-stage__board-row next-day-stage__board-row--charts" aria-label="Sygnały tygodnia">
          <button v-for="card in featuredCards" :key="card.item.key" type="button" @click="openObject(card.item)">
            <span v-if="card.kind === 'dots'" class="next-day-stage__dot-chart" aria-hidden="true"><i v-for="(point, index) in featuredDots(card.values)" :key="index" :class="{ active: point > 0, missed: point === 0 }" /></span>
            <svg v-else viewBox="0 0 180 48" role="img" :aria-label="`Trend: ${card.item.subject.title}`">
              <path class="chart-echo chart-state" :d="featurePath(card.values, 2)" />
              <path class="chart-line chart-state" :d="featurePath(card.values)" />
              <circle :cx="featureLastPoint(card.values).x" :cy="featureLastPoint(card.values).y" r="4" />
            </svg>
            <strong>{{ card.item.subject.title }}</strong>
          </button>
          <button v-if="featuredCards.length < 3" v-for="placeholder in 3 - featuredCards.length" :key="`empty-chart-${placeholder}`" type="button" @click="openCategory(categories[placeholder - 1])">
            <span class="next-day-stage__empty-chart"><AppIcon name="monitoring" /></span><strong>{{ categories[placeholder - 1]?.label }}</strong>
          </button>
        </div>

        <nav class="next-day-stage__utility" aria-label="Pozostałe skróty dnia">
          <button v-for="category in utilityCategories" :key="category.id" type="button" @click="openCategory(category)"><AppIcon :name="category.icon" />{{ category.label }}</button>
          <span><AppIcon :name="isToday ? 'wb_sunny' : 'history'" />{{ isToday ? 'Bieżący dzień' : 'Dzień historyczny' }}</span>
        </nav>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import type { Quadrant } from '@/domain/emotion'
import type { TodayItem } from '@/services/todayViewQueries'
import type { Priority } from '@/domain/planning'
import type { EmotionDonutLog } from '@/components/today/EmotionCard.vue'
import { getQuadrant } from '@/domain/emotion'
import { getObjectsLibraryFamilyForPanelType } from '@/services/objectsLibraryQueries'
import { toLocalDateKey } from '@/utils/streaks'
import { getPeriodRefsForDate } from '@/utils/periods'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import { buildWeekDailyChartPoints } from '@/services/calendarChartData'
import { useTodayStore } from '@/stores/today.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useExercisePlanStore } from '@/stores/exercisePlan.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'
import { DsButton, DsState } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import JournalCard from '@/components/today/JournalCard.vue'
import EmotionCard from '@/components/today/EmotionCard.vue'
import ExerciseCard from '@/components/today/ExerciseCard.vue'
import PlannedExercisesCard from '@/components/today/PlannedExercisesCard.vue'
import ProgramCard from '@/components/today/ProgramCard.vue'
import NextObjectChartCard from './NextObjectChartCard.vue'
import { formatPlanningNumber } from './viewModels'
import type { NextObjectChartPoint } from './nextObjectChart'

type CategoryId = 'goals' | 'habits' | 'trackers' | 'intentions' | 'journal' | 'emotions' | 'exercises' | 'programs' | 'history'
interface Category { id: CategoryId; label: string; icon: string; caption: string; route?: string }
const DAILY_EMOTION_TARGET = 3

const props = defineProps<{ dayRef: DayRef }>()
const router = useRouter()
const store = useTodayStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const exerciseCompletionsStore = useExerciseCompletionsStore()
const exercisePlanStore = useExercisePlanStore()
const programEnrollmentStore = useProgramEnrollmentStore()
const selectedCategoryId = ref<CategoryId | null>(null)
const density = ref<1 | 2 | 3>(2)
const activePriorities = ref<Priority[]>([])

watch(() => props.dayRef, () => { selectedCategoryId.value = null })
onMounted(() => {
  void Promise.all([
    journalStore.loadEntries(),
    emotionLogStore.loadLogs(),
    emotionStore.loadEmotions(),
    exerciseCompletionsStore.ensureLoaded(),
    exercisePlanStore.ensureLoaded(),
    programEnrollmentStore.ensureLoaded(),
    loadPriorities(),
  ]).then(() => programEnrollmentStore.runScheduler())
})
watch(() => props.dayRef, () => void loadPriorities())

const goalItems = computed<TodayItem[]>(() => store.goalGroupedKrItems.flatMap(group => group.items))
const objectItemsByCategory = computed<Record<'goals' | 'habits' | 'trackers' | 'intentions', TodayItem[]>>(() => ({
  goals: goalItems.value,
  habits: store.habitItems,
  trackers: store.trackerItems,
  intentions: store.intentionItems,
}))
const categories = computed<Category[]>(() => [
  { id: 'goals', label: 'Cele', icon: 'mountain_flag', caption: `${goalItems.value.length} elementów` },
  { id: 'habits', label: 'Nawyki', icon: 'change_circle', caption: `${store.habitItems.length} elementów` },
  { id: 'trackers', label: 'Trackery', icon: 'show_chart', caption: `${store.trackerItems.length} elementów` },
  { id: 'journal', label: 'Dziennik', icon: 'history_edu', caption: journalState.value === 'done' ? 'Wpis zapisany' : 'Bez wpisu' },
  { id: 'emotions', label: 'Emocje', icon: 'cognition', caption: `${todayEmotionLogs.value.length}/${DAILY_EMOTION_TARGET} wpisów` },
  { id: 'exercises', label: 'Ćwiczenia', icon: 'psychology', caption: `${exerciseDayCompletions.value.length} wykonanych` },
  { id: 'programs', label: 'Programy', icon: 'pregnant_woman', caption: `${duePlanItems.value.length + activeEnrollments.value.length} aktywnych` },
  { id: 'history', label: 'Historia', icon: 'health_and_safety', caption: 'Otwórz historię', route: '/history' },
  { id: 'intentions', label: 'Intencje', icon: 'stress_management', caption: `${store.intentionItems.length} elementów` },
])
const dayBoardRows = computed(() => [
  { id: 'objects', items: categories.value.slice(0, 3) },
  { id: 'wellbeing', items: categories.value.slice(3, 6) },
])
const utilityCategories = computed(() => categories.value.slice(6, 9))
const dayPriorities = computed<Priority[]>(() => {
  const result = activePriorities.value.slice(0, 3)
  while (result.length < 3) {
    result.push({ id: `empty-${result.length}`, title: 'Miejsce na kierunek', years: [], status: 'draft', lifeAreaIds: [], progressSignals: [], riskSignals: [], createdAt: '', updatedAt: '' })
  }
  return result
})
const measurementItems = computed(() => [...goalItems.value, ...store.habitItems, ...store.trackerItems].filter((item): item is Extract<TodayItem, { kind: 'measurement' }> => item.kind === 'measurement'))
const featuredCards = computed(() => measurementItems.value.slice(0, 3).map(item => {
  const entries = store.rawEntries
    .filter(entry => entry.subjectType === item.subjectType && entry.subjectId === item.subject.id && entry.dayRef <= props.dayRef)
    .sort((left, right) => left.dayRef.localeCompare(right.dayRef))
    .slice(-7)
  const values = entries.map(entry => entry.value ?? (entry.checkedItemIds?.length ?? 0))
  return { item, values: values.length ? values : [item.todayEntry?.value ?? (item.todayEntry?.checkedItemIds?.length ?? 0)], kind: item.subject.entryMode === 'completion' || item.subject.entryMode === 'multi-completion' ? 'dots' as const : 'line' as const }
}))
const selectedCategory = computed(() => categories.value.find(category => category.id === selectedCategoryId.value) ?? null)
const selectedObjectItems = computed<TodayItem[]>(() => selectedCategoryId.value && selectedCategoryId.value in objectItemsByCategory.value
  ? objectItemsByCategory.value[selectedCategoryId.value as keyof typeof objectItemsByCategory.value]
  : [])
const isToday = computed(() => props.dayRef === getPeriodRefsForDate(new Date()).day)
const referenceDate = computed(() => new Date(`${props.dayRef}T12:00:00`))
const journalState = computed<'empty' | 'done'>(() => journalStore.entries.some(entry => entry.createdAt.slice(0, 10) === toLocalDateKey(referenceDate.value)) ? 'done' : 'empty')
const exerciseDayCompletions = computed(() => exerciseCompletionsStore.completionsForDay(props.dayRef))
const duePlanItems = computed(() => isToday.value ? exercisePlanStore.dueItems(props.dayRef) : [])
const activeEnrollments = computed(() => isToday.value ? programEnrollmentStore.activeEnrollments : [])
const todayEmotionLogs = computed<EmotionDonutLog[]>(() => emotionLogStore.logs
  .filter(log => log.createdAt.slice(0, 10) === props.dayRef)
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  .map(log => {
    const counts: Record<Quadrant, number> = {
      'high-energy-high-pleasantness': 0,
      'high-energy-low-pleasantness': 0,
      'low-energy-high-pleasantness': 0,
      'low-energy-low-pleasantness': 0,
    }
    for (const emotionId of log.emotionIds) {
      const emotion = emotionStore.getEmotionById(emotionId)
      if (emotion) counts[getQuadrant(emotion)] += 1
    }
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)
    return total ? { quadrants: Object.fromEntries(Object.entries(counts).map(([key, count]) => [key, count / total])) as EmotionDonutLog['quadrants'] } : { quadrants: {} }
  }))

function openCategory(category: Category) {
  if (category.route) { void router.push(category.route); return }
  selectedCategoryId.value = category.id
}

async function loadPriorities() {
  const monthRef = getPeriodRefsForDate(new Date(`${props.dayRef}T12:00:00`)).month
  activePriorities.value = await getActivePrioritiesForMonth(monthRef)
}

function openPriority(priority: Priority) {
  if (priority.id.startsWith('empty-')) {
    void router.push({ name: 'objects-family', params: { family: 'priorities' } })
    return
  }
  void router.push({ name: 'objects-family', params: { family: 'priorities' }, query: { expandedType: 'priority', expandedId: priority.id } })
}

function priorityFallbackIcon(index: number) { return index === 0 ? 'directions_run' : index === 1 ? 'health_and_safety' : 'stress_management' }
function priorityTone(index: number) { return index === 1 ? 'lavender' : index === 2 ? 'mint' : 'blue' }
function dayChartPoints(item: Extract<TodayItem, { kind: 'measurement' }>): NextObjectChartPoint[] {
  const weekRef = getPeriodRefsForDate(referenceDate.value).week
  return buildWeekDailyChartPoints(item.subject, item.subjectType, store.rawEntries, weekRef).map(point => ({
    key: point.periodRef,
    label: new Intl.DateTimeFormat('pl-PL', { weekday: 'short' }).format(new Date(`${point.periodRef}T12:00:00`)).replace('.', ''),
    value: point.actualValue,
    target: point.targetValue,
    status: point.status,
    future: point.periodRef > props.dayRef,
    current: point.periodRef === props.dayRef,
    assigned: store.allDayAssignments.some(assignment => assignment.dayRef === point.periodRef && assignment.subjectType === item.subjectType && assignment.subjectId === item.subject.id),
  }))
}
function objectIcon(item: Extract<TodayItem, { kind: 'measurement' }>): string {
  const subject = item.subject as { icon?: string }
  return subject.icon || item.goalIcon || iconForSubject(item.subjectType)
}
function iconForSubject(subjectType: Extract<TodayItem, { kind: 'measurement' }>['subjectType']): string {
  return subjectType === 'keyResult' ? 'mountain_flag' : subjectType === 'habit' ? 'change_circle' : subjectType === 'tracker' ? 'show_chart' : 'gps_fixed'
}
function objectSummary(item: Extract<TodayItem, { kind: 'measurement' }>): string {
  const actual = item.measurement.actualValue
  const target = item.measurement.target?.value
  if (actual === undefined) return 'Brak danych'
  return target === undefined ? `${formatNumber(actual)} zapisano` : `${formatNumber(actual)}/${formatNumber(target)} w tym okresie`
}
const formatNumber = formatPlanningNumber
function featuredDots(values: number[]): number[] { return values.slice(-3) }
function featureLastPoint(values: number[]): { x: number; y: number } {
  const max = Math.max(1, ...values)
  const index = Math.max(0, values.length - 1)
  return { x: 8 + index * (164 / Math.max(1, values.length - 1)), y: 40 - ((values[index] ?? 0) / max) * 30 }
}
function featurePath(values: number[], offset = 0): string {
  if (!values.length) return ''
  const max = Math.max(1, ...values)
  return values.map((value, index) => `${index ? 'L' : 'M'} ${(8 + index * (164 / Math.max(1, values.length - 1))).toFixed(1)} ${(40 - (value / max) * 30 + offset).toFixed(1)}`).join(' ')
}

function openObject(item: TodayItem) {
  if (item.kind === 'initiative' || item.panelType === 'weeklyIntention') return
  void router.push({ name: 'objects-family', params: { family: getObjectsLibraryFamilyForPanelType(item.panelType) }, query: { expandedType: item.panelType, expandedId: item.subject.id } })
}
</script>
