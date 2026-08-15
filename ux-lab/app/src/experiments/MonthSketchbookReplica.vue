<template>
  <div class="product-replica sketch-month" :class="{ 'sketch-month--nested-scale': scale !== 'month' }">
    <TodaySketchbookReplica v-if="scale === 'day'" @scale="value => { if (value !== 'day') scale = value }" />

    <WeekSketchbookReplica
      v-else-if="scale === 'week'"
      :preset-id="props.presetId"
      @scale="value => { scale = value }"
    />

    <YearSketchbookReplica
      v-else-if="scale === 'year'"
      preset-id="current"
      @scale="value => { scale = value }"
    />

    <div v-else class="sketch-month__sheet">
      <aside class="month-rail-stack">
        <section class="month-nav-card sketch-surface" aria-label="Nawigacja okresu">
          <header class="month-rail__header">
            <button type="button" class="month-nav" :disabled="!previousMonthRef" :aria-label="`Poprzedni okres`" @click="showAdjacentMonth(-1)"><AppIcon name="chevron_left" /></button>
            <h2>{{ navTitle }}</h2>
            <button type="button" class="month-nav" :disabled="!nextMonthRef" :aria-label="`Następny okres`" @click="showAdjacentMonth(1)"><AppIcon name="chevron_right" /></button>
          </header>
          <div class="scale-switch" role="group" aria-label="Skala widoku">
            <button
              v-for="option in scaleOptions"
              :key="option.key"
              type="button"
              :class="{ active: scale === option.key }"
              :aria-pressed="scale === option.key"
              @click="scale = option.key"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <section v-if="scale === 'month'" class="month-rail sketch-surface" aria-label="Kompas i tygodnie miesiąca">
        <button type="button" class="month-ritual" :class="{ done: month.reflectionComplete && !month.reflectionPartial }" @click="openRitual">
          <AppIcon :name="ritualAction.icon" />
          <span>{{ ritualAction.label }}</span>
        </button>

        <section class="month-ratings" aria-label="Oceny miesiąca">
          <h2>Oceny miesiąca</h2>
          <svg class="ratings-chart" viewBox="0 0 470 132" role="img" aria-label="Oceny pięciu wymiarów miesiąca">
            <defs>
              <linearGradient id="ratings-column" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="rgb(var(--sky-300) / .78)" />
                <stop offset="100%" stop-color="rgb(var(--sky-200) / .05)" />
              </linearGradient>
            </defs>
            <template v-for="dimension in ratingColumns" :key="dimension.label">
              <rect
                v-if="dimension.value !== null"
                :x="dimension.x - 16"
                :y="dimension.y + 5"
                width="32"
                :height="Math.max(9, 106 - dimension.y)"
                rx="14"
                fill="url(#ratings-column)"
              />
              <text :x="dimension.x" y="126" class="ratings-chart__label" text-anchor="middle">{{ dimension.label }}</text>
            </template>
            <path v-if="ratingLinePoints.length > 1" class="pencil-echo" :d="smoothPath(ratingLinePoints, 2.5)" />
            <path v-if="ratingLinePoints.length > 1" class="ratings-chart__line" :d="smoothPath(ratingLinePoints)" />
            <template v-for="dimension in ratingColumns" :key="`bubble-${dimension.label}`">
              <circle v-if="dimension.value !== null" :cx="dimension.x" :cy="dimension.y" r="13" class="ratings-chart__bubble" />
              <circle v-else :cx="dimension.x" :cy="dimension.y" r="11" class="ratings-chart__bubble--empty" />
              <text :x="dimension.x" :y="dimension.y + 3.5" class="ratings-chart__value" :class="{ empty: dimension.value === null }" text-anchor="middle">
                {{ dimension.value === null ? '—' : formatNumber(dimension.value) }}
              </text>
            </template>
          </svg>
        </section>

        <section class="month-weeks-list" aria-label="Tygodnie miesiąca">
          <div class="month-weeks-list__head">
            <h2>Tygodnie</h2>
            <div class="week-axis-key" aria-hidden="true"><span class="effort"><i />Wysiłek</span><span class="state"><i />Stan</span></div>
          </div>

          <template v-for="week in weekCards" :key="week.weekRef">
            <button
              type="button"
              class="month-week-row"
              :class="{ active: selectedWeek === week.weekRef, current: week.state === 'current', future: week.state === 'future' }"
              :aria-pressed="selectedWeek === week.weekRef"
              @click="selectedWeek = selectedWeek === week.weekRef ? null : week.weekRef"
            >
              <span class="month-week-row__copy">
                <strong>{{ week.shortLabel }}</strong>
                <small>{{ week.rangeLabel }}</small>
                <em v-if="week.state === 'current'">bieżący</em>
                <em v-else-if="week.state === 'future'">nadchodzi</em>
              </span>

              <span class="week-dual-chart" role="img" :aria-label="weekAxesAria(week)">
                <svg viewBox="0 0 180 42" aria-hidden="true">
                  <template v-if="week.state !== 'future'">
                    <path class="week-axis-echo week-axis-echo--effort" :d="smoothPath(weekCombinedAxisPoints(week.effort), 1.5)" />
                    <path class="week-axis-echo week-axis-echo--state" :d="smoothPath(weekCombinedAxisPoints(week.stateValues), 1.5)" />
                    <path class="week-axis-line week-axis-line--effort" :d="smoothPath(weekCombinedAxisPoints(week.effort))" />
                    <path class="week-axis-line week-axis-line--state" :d="smoothPath(weekCombinedAxisPoints(week.stateValues))" />
                    <circle v-for="(point, index) in weekCombinedAxisPoints(week.effort)" :key="`effort-${index}`" :cx="point.x" :cy="point.y" r="3" class="week-axis-point week-axis-point--effort" />
                    <circle v-for="(point, index) in weekCombinedAxisPoints(week.stateValues)" :key="`state-${index}`" :cx="point.x" :cy="point.y" r="3" class="week-axis-point week-axis-point--state" />
                  </template>
                  <path v-else class="week-axis-ghost" d="M 10 31 L 170 31" />
                </svg>
                <span class="week-chart-area-icons" aria-hidden="true">
                  <span v-for="area in areas" :key="area.label" :title="area.label"><AppIcon :name="area.icon" /></span>
                </span>
              </span>
            </button>
            <p v-if="selectedWeek === week.weekRef && selectedWeekSnapshot" class="month-week-note">
              <AppIcon name="lightbulb" />
              <span>{{ selectedWeekSnapshot.note }}</span>
            </p>
          </template>
        </section>
        </section>
      </aside>

      <main class="month-main" :class="{ 'month-main--detail': activeCategory !== null }">
        <template v-if="activeCategory === null">
          <section
            v-for="rowName in boardRows"
            :key="rowName"
            class="month-board__row sketch-surface"
            :class="`month-board--${boardVariant}`"
            :aria-label="rowName === 'priorities' ? 'Kierunki miesiąca' : rowName === 'areas' ? 'Wykonanie miesiąca' : 'Kontekst miesiąca'"
          >
            <button
              v-for="tile in boardTiles.filter(tile => tile.row === rowName)"
              :key="tile.key"
              type="button"
              class="month-board__cell"
              :class="[{ active: tile.active, 'month-priority': tile.kind === 'priority' }]"
              :aria-pressed="tile.active"
              @click="tile.onClick()"
            >
              <span class="board-tile__icon-box">
                <AppIcon :name="tile.icon" />
                <span v-if="boardVariant === 'a' && tile.info" class="board-tile__badge">{{ tile.info }}</span>
              </span>
              <span class="board-tile__copy">
                <span class="board-tile__label">
                  <i v-if="tile.tone" class="board-tile__tone" :class="`tone-${tile.tone}`" />
                  <strong>{{ tile.label }}</strong>
                  <em v-if="boardVariant === 'b' && tile.info">{{ tile.info }}</em>
                </span>
                <span v-if="boardVariant === 'c'" class="board-tile__meta">
                  <span v-if="tile.effort !== undefined" class="board-tile__effort" :aria-label="`Wysiłek ${tile.effort} z 5`">
                    <i v-for="dot in 5" :key="dot" :class="{ filled: dot <= tile.effort }" />
                  </span>
                  <small v-else-if="tile.infoLong">{{ tile.infoLong }}</small>
                </span>
              </span>
            </button>
          </section>

          <div class="board-variant-switch" aria-label="Wariant kafli (Lab)">
            <small>Wariant</small>
            <button
              v-for="option in ['a', 'b', 'c'] as const"
              :key="option"
              type="button"
              :class="{ active: boardVariant === option }"
              :aria-pressed="boardVariant === option"
              @click="boardVariant = option"
            >
              {{ option.toUpperCase() }}
            </button>
          </div>
        </template>

        <template v-else>
          <nav class="sketch-tabs sketch-surface" aria-label="Obszary miesiąca">
            <button
              v-for="category in categoryList"
              :key="category.key"
              type="button"
              :class="{ active: activeCategory === category.key }"
              :aria-pressed="activeCategory === category.key"
              @click="openCategory(category.key)"
            >
              <span class="sketch-tabs__icon-field"><AppIcon :name="category.icon" /></span>
              <strong>{{ category.label }}</strong>
            </button>
            <button type="button" class="sketch-tabs__close" aria-label="Zamknij szczegóły" @click="activeCategory = null">
              <AppIcon name="close_fullscreen" />
            </button>
          </nav>

          <section class="sketch-details sketch-surface">
            <header class="sketch-details__header">
              <span>{{ activeCategoryMeta.label }} · tygodnie miesiąca</span>
              <div class="density-switch" aria-label="Liczba kart w rzędzie">
                <small>Naraz</small>
                <button
                  v-for="option in [1, 2, 3] as const"
                  :key="option"
                  type="button"
                  :class="{ active: density === option }"
                  :aria-pressed="density === option"
                  @click="density = option"
                >
                  {{ option }}
                </button>
              </div>
            </header>

            <div class="detail-grid" :style="{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }">
              <button
                v-for="card in objectCards"
                :key="card.key"
                type="button"
                class="sketch-detail-card"
                :class="[{ active: selectedDetailKey === card.key }, `sketch-detail-card--${card.kind}`]"
                :aria-describedby="`month-card-summary-${card.key}`"
                :aria-pressed="selectedDetailKey === card.key"
                @click="selectedDetailKey = selectedDetailKey === card.key ? null : card.key"
              >
                <header>
                  <span><AppIcon :name="card.icon" /><strong>{{ card.title }}</strong></span>
                  <em :id="`month-card-summary-${card.key}`" class="sketch-detail-card__summary">{{ card.aggregate }}</em>
                </header>

                <div v-if="card.kind === 'dots'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-dots" :style="weekColumnsStyle">
                    <i v-for="(cell, cellIndex) in card.cells" :key="cellIndex" :class="cell.dot" />
                  </div>
                  <div class="detail-weekdays" :style="weekColumnsStyle"><span v-for="week in weekCards" :key="week.weekRef">{{ week.shortLabel }}</span></div>
                </div>

                <div v-else-if="card.kind === 'bars'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-bars">
                    <i
                      v-for="(cell, cellIndex) in card.cells"
                      :key="cellIndex"
                      :style="{ height: cell.bar === 'empty' ? '2px' : `${cell.height}%`, transform: `rotate(${cellIndex % 2 ? '-1.2deg' : '.8deg'})` }"
                      :class="{ current: cell.bar === 'current', missed: cell.bar === 'missed', empty: cell.bar === 'empty' }"
                    />
                  </div>
                  <div class="detail-weekdays" :style="weekColumnsStyle"><span v-for="week in weekCards" :key="week.weekRef">{{ week.shortLabel }}</span></div>
                </div>

                <div v-else-if="card.kind === 'line'" class="detail-week-chart">
                  <svg class="detail-line" viewBox="0 0 500 115" role="img" :aria-label="`Przebieg: ${card.title}`" preserveAspectRatio="none">
                    <line v-if="card.lineTargetY !== null" x1="0" :y1="card.lineTargetY" x2="500" :y2="card.lineTargetY" class="target-line" />
                    <path v-if="card.linePoints.length > 1" class="pencil-echo" :d="smoothPath(card.linePoints, 3)" />
                    <path v-if="card.linePoints.length > 1" :d="smoothPath(card.linePoints)" />
                    <circle v-if="card.linePoints.length" :cx="card.linePoints.at(-1)!.x" :cy="card.linePoints.at(-1)!.y" r="5" />
                  </svg>
                  <div class="detail-weekdays" aria-hidden="true" :style="weekColumnsStyle"><span v-for="week in weekCards" :key="week.weekRef">{{ week.shortLabel }}</span></div>
                </div>

                <div v-else class="detail-week-chart" aria-hidden="true">
                  <div class="detail-span">
                    <span class="detail-span__track">
                      <i :class="`detail-span__fill--${card.span.status}`" :style="{ width: `${card.span.fillPct}%` }" />
                    </span>
                    <small>cały miesiąc</small>
                  </div>
                </div>
              </button>
            </div>
          </section>

          <section class="sketch-shortcuts sketch-surface" aria-label="Pozostałe obszary">
            <button
              v-for="category in categoryList"
              :key="category.key"
              type="button"
              :class="{ active: activeCategory === category.key }"
              :aria-pressed="activeCategory === category.key"
              @click="openCategory(category.key)"
            >
              <span class="sketch-shortcuts__icon-field"><AppIcon :name="category.icon" /></span>
              <span>{{ category.label }}</span>
            </button>
            <button type="button" :class="{ active: selectedShortcut === 'journal' }" @click="selectedShortcut = 'journal'">
              <span class="sketch-shortcuts__icon-field"><AppIcon name="history_edu" /></span>
              <span>Dziennik</span>
            </button>
            <button type="button" :class="{ active: selectedShortcut === 'emotions' }" @click="selectedShortcut = 'emotions'">
              <span class="sketch-shortcuts__icon-field"><AppIcon name="cognition" /></span>
              <span>Emocje</span>
            </button>
            <button type="button" class="month-shortcuts__back" aria-label="Wróć do przeglądu" @click="activeCategory = null">
              <span class="sketch-shortcuts__icon-field"><AppIcon name="arrow_left_alt" /></span>
            </button>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabChartPoint, LabFixtureObject } from '@product/dev/richVerificationScenario'
import TodaySketchbookReplica from '~lab/experiments/TodaySketchbookReplica.vue'
import WeekSketchbookReplica from '~lab/experiments/WeekSketchbookReplica.vue'
import YearSketchbookReplica from '~lab/experiments/YearSketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

type CategoryKey = 'goals' | 'habits' | 'trackers' | 'intentions'

interface ChartPoint {
  x: number
  y: number
}

interface WeekCell {
  future: boolean
  status: LabChartPoint['status'] | 'empty'
  height: number
  dot: 'done' | 'missed' | 'assigned' | 'unassigned'
  bar: 'base' | 'current' | 'missed' | 'empty'
}

const props = withDefaults(defineProps<{ presetId: string; initialScale?: ViewScale }>(), { initialScale: 'month' })
const labStore = useLabStore()

const preset = computed(() => labStore.fixture.presets['calendar-month'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['calendar-month'][0])
const activeMonthRef = ref(preset.value.periodRef)
const sortedMonths = computed(() => [...labStore.fixture.months].sort((left, right) => left.monthRef.localeCompare(right.monthRef)))
const activeMonthIndex = computed(() => sortedMonths.value.findIndex(item => item.monthRef === activeMonthRef.value))
const previousMonthRef = computed(() => sortedMonths.value[activeMonthIndex.value - 1]?.monthRef ?? null)
const nextMonthRef = computed(() => sortedMonths.value[activeMonthIndex.value + 1]?.monthRef ?? null)
const month = computed(() => sortedMonths.value.find(item => item.monthRef === activeMonthRef.value) ?? sortedMonths.value.at(-1)!)
const currentWeekRef = computed(() => labStore.fixture.refs.currentWeek)
const priorities = computed(() => labStore.fixture.priorities.slice(0, 3))
const monthTitle = computed(() => month.value.label.charAt(0).toUpperCase() + month.value.label.slice(1))
const isCurrentMonth = computed(() => month.value.monthRef === labStore.fixture.refs.currentMonth)

watch(() => preset.value.periodRef, periodRef => { activeMonthRef.value = periodRef })

const dayLabel = computed(() => new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  .format(new Date(`${labStore.fixture.refs.today}T12:00:00`)))

const navTitle = computed(() => {
  if (scale.value === 'week') return `Tydzień ${labStore.fixture.refs.currentWeek.split('-W')[1]}`
  if (scale.value === 'year') return month.value.monthRef.slice(0, 4)
  return monthTitle.value
})

type ViewScale = 'day' | 'week' | 'month' | 'year'

const scale = ref<ViewScale>(props.initialScale)
const scaleOptions: Array<{ key: ViewScale; label: string }> = [
  { key: 'day', label: 'Dzień' },
  { key: 'week', label: 'Tydzień' },
  { key: 'month', label: 'Miesiąc' },
  { key: 'year', label: 'Rok' },
]

const activeCategory = ref<CategoryKey | null>(null)
const selectedWeek = ref<string | null>(null)
const selectedPriority = ref<string | null>(null)
const selectedShortcut = ref<string | null>(null)
const selectedDetailKey = ref<string | null>(null)
const boardVariant = ref<'a' | 'b' | 'c'>('a')
const density = ref<1 | 2 | 3>(2)

const boardRows = ['priorities', 'areas', 'context'] as const

const categoryList: Array<{ key: CategoryKey; label: string; icon: string; families: Array<LabFixtureObject['family']> }> = [
  { key: 'goals', label: 'Cele', icon: 'mountain_flag', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', icon: 'change_circle', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', icon: 'show_chart', families: ['tracker'] },
  { key: 'intentions', label: 'Intencje', icon: 'gps_fixed', families: ['intention'] },
]

const familyIcon: Record<LabFixtureObject['family'], string> = {
  goal: 'outlined_flag',
  keyResult: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  intention: 'gps_fixed',
}

const priorityIcon: Record<string, string> = {
  movement: 'directions_run',
  stream: 'rocket_launch',
  relationships: 'favorite',
  learning: 'school',
}

const ritualAction = computed(() => {
  if (isCurrentMonth.value) return { icon: 'auto_awesome', label: 'Zaplanuj miesiąc' }
  if (month.value.reflectionPartial) return { icon: 'edit_note', label: 'Dokończ refleksję' }
  return { icon: 'task_alt', label: 'Zobacz refleksję' }
})

function showAdjacentMonth(offset: -1 | 1) {
  const next = sortedMonths.value[activeMonthIndex.value + offset]
  if (next) activeMonthRef.value = next.monthRef
}

function openRitual() {
  window.location.assign(`/preview/ritual-month/sketchbook-v1/${isCurrentMonth.value ? 'plan' : 'reflect'}`)
}

const dimensionLabels = ['Balans', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość']

const ratingColumns = computed(() => dimensionLabels.map((label, index) => {
  const value = labStore.fixture.ritual.monthlyRatings[index] ?? null
  return {
    label,
    value,
    x: 51 + index * 92,
    y: value === null ? 67 : 106 - (value / 5) * 74,
  }
}))

const ratingLinePoints = computed<ChartPoint[]>(() => ratingColumns.value
  .filter(column => column.value !== null)
  .map(column => ({ x: column.x, y: column.y })))

const areas = [
  { label: 'Ciało', icon: 'accessibility_new' },
  { label: 'Emocje', icon: 'cognition' },
  { label: 'Działanie', icon: 'directions_run' },
  { label: 'Relacje', icon: 'diversity_1' },
]

const weekCards = computed(() => month.value.weeks.map(week => {
  const state = week.weekRef === currentWeekRef.value ? 'current' : week.weekRef > currentWeekRef.value ? 'future' : 'closed'
  return {
    weekRef: week.weekRef,
    shortLabel: `T${week.weekRef.split('-W')[1]}`,
    rangeLabel: week.rangeLabel,
    state,
    effort: [0, 1, 2, 3].map(area => week.dimensions[area * 3 + 1] ?? 3),
    stateValues: [0, 1, 2, 3].map(area => week.dimensions[area * 3 + 2] ?? 3),
  }
}))

function weekCombinedAxisPoints(values: number[]): ChartPoint[] {
  return values.map((value, index) => ({
    x: 15 + index * 50,
    y: Math.round(34 - (value / 5) * 26),
  }))
}
function weekAxesAria(week: { shortLabel: string; state: string; effort: number[]; stateValues: number[] }) {
  if (week.state === 'future') return `${week.shortLabel}: wysiłek i stan jeszcze bez danych`
  return `${week.shortLabel}: ${areas.map((area, index) => `${area.label}, wysiłek ${week.effort[index]} z 5, stan ${week.stateValues[index]} z 5`).join('; ')}`
}

const selectedWeekSnapshot = computed(() => month.value.weeks.find(week => week.weekRef === selectedWeek.value))

const weekColumnsStyle = computed(() => ({ gridTemplateColumns: `repeat(${weekCards.value.length}, minmax(0, 1fr))` }))

const monthObjects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired'))

function objectsFor(category: CategoryKey): LabFixtureObject[] {
  const families = categoryList.find(item => item.key === category)!.families
  return monthObjects.value.filter(item => families.includes(item.family))
}

function monthPoints(item: LabFixtureObject): LabChartPoint[] {
  if (item.cadence === 'monthly') {
    return item.chart.filter(point => point.periodRef === month.value.monthRef)
  }
  const refs = new Set<string>(month.value.weeks.map(week => week.weekRef))
  return item.chart.filter(point => refs.has(point.periodRef))
}

function categoryPercent(category: CategoryKey): number | null {
  const points = objectsFor(category).flatMap(monthPoints).filter(point => point.target !== undefined)
  const met = points.filter(point => point.status === 'met').length
  const missed = points.filter(point => point.status === 'missed').length
  if (met + missed === 0) return null
  return Math.round((met / (met + missed)) * 100)
}

const pastDays = computed(() => month.value.weeks.flatMap(week => week.days).filter(day => day.completion > 0 || day.journalCount > 0 || day.emotionCount > 0))
const journalCount = computed(() => pastDays.value.reduce((sum, day) => sum + day.journalCount, 0))
const emotionCount = computed(() => pastDays.value.reduce((sum, day) => sum + day.emotionCount, 0))

const intentionSummary = computed(() => {
  const points = objectsFor('intentions').flatMap(monthPoints).filter(point => point.status !== 'no-data')
  const met = points.filter(point => point.status === 'met').length
  return `${met}/${points.length}`
})

const trackersSummary = computed(() => {
  const trackers = objectsFor('trackers')
  const withData = trackers.filter(item => monthPoints(item).some(point => point.status !== 'no-data')).length
  return { short: `${withData}/${trackers.length}`, long: `${withData}/${trackers.length} z danymi` }
})

interface BoardTile {
  key: string
  row: 'priorities' | 'areas' | 'context'
  kind: 'category' | 'action' | 'priority'
  icon: string
  label: string
  info: string | null
  infoLong?: string
  tone?: string
  effort?: number
  active: boolean
  onClick: () => void
}

const boardTiles = computed<BoardTile[]>(() => {
  const goalsPct = categoryPercent('goals')
  const habitsPct = categoryPercent('habits')
  const tiles: BoardTile[] = []
  priorities.value.forEach((priority, index) => {
    const effort = month.value.priorityEffort[index]
    tiles.push({
      key: priority.key,
      row: 'priorities',
      kind: 'priority',
      icon: priorityIcon[priority.key] ?? 'north_star',
      label: priority.title,
      info: `${effort}/5`,
      infoLong: `wysiłek ${effort}/5`,
      tone: priority.tone,
      effort,
      active: selectedPriority.value === priority.key,
      onClick: () => { selectedPriority.value = selectedPriority.value === priority.key ? null : priority.key },
    })
  })
  tiles.push(
    { key: 'goals', row: 'areas', kind: 'category', icon: 'mountain_flag', label: 'Cele', info: goalsPct === null ? null : `${goalsPct}%`, infoLong: goalsPct === null ? undefined : `${goalsPct}% na celu`, active: activeCategory.value === 'goals', onClick: () => openCategory('goals') },
    { key: 'habits', row: 'areas', kind: 'category', icon: 'change_circle', label: 'Nawyki', info: habitsPct === null ? null : `${habitsPct}%`, infoLong: habitsPct === null ? undefined : `${habitsPct}% na celu`, active: activeCategory.value === 'habits', onClick: () => openCategory('habits') },
    { key: 'trackers', row: 'areas', kind: 'category', icon: 'show_chart', label: 'Trackery', info: trackersSummary.value.short, infoLong: trackersSummary.value.long, active: activeCategory.value === 'trackers', onClick: () => openCategory('trackers') },
    { key: 'intentions', row: 'context', kind: 'category', icon: 'gps_fixed', label: 'Intencje', info: intentionSummary.value, infoLong: `${intentionSummary.value} domkniętych`, active: activeCategory.value === 'intentions', onClick: () => openCategory('intentions') },
    { key: 'journal', row: 'context', kind: 'action', icon: 'history_edu', label: 'Dziennik', info: `${journalCount.value}`, infoLong: `${journalCount.value} wpisów`, active: selectedShortcut.value === 'journal', onClick: () => { selectedShortcut.value = 'journal' } },
    { key: 'emotions', row: 'context', kind: 'action', icon: 'cognition', label: 'Emocje', info: `${emotionCount.value}`, infoLong: `${emotionCount.value} zapisów`, active: selectedShortcut.value === 'emotions', onClick: () => { selectedShortcut.value = 'emotions' } },
  )
  return tiles
})

const activeCategoryMeta = computed(() => categoryList.find(item => item.key === activeCategory.value) ?? categoryList[0])

const objectCards = computed(() => {
  if (activeCategory.value === null) return []
  return objectsFor(activeCategory.value).map(item => {
    const kind = item.cadence === 'monthly' ? 'span' : item.entryMode === 'completion' ? 'dots' : item.entryMode === 'value' ? 'line' : 'bars'
    const points = monthPoints(item)
    const target = points.find(point => point.target !== undefined)?.target
    const scaleMax = Math.max(1, ...points.map(point => point.value ?? 0), target ?? 0)
    const pointByWeek = new Map(points.map(point => [point.periodRef, point]))
    const cells: WeekCell[] = weekCards.value.map(week => {
      const point = pointByWeek.get(week.weekRef)
      const hasData = point !== undefined && point.status !== 'no-data'
      return {
        future: week.state === 'future' || !point,
        status: hasData ? point.status : 'empty',
        height: point?.value === undefined ? 4 : Math.max(9, Math.min(96, (point.value / scaleMax) * 92)),
        dot: hasData
          ? (point.status === 'missed' ? 'missed' : 'done')
          : week.state === 'closed' ? 'unassigned' : 'assigned',
        bar: !hasData || point.value === undefined
          ? 'empty'
          : week.state === 'current' ? 'current' : point.status === 'missed' ? 'missed' : 'base',
      }
    })

    let linePoints: ChartPoint[] = []
    let lineTargetY: number | null = null
    if (kind === 'line') {
      const entries = weekCards.value
        .map((week, index) => ({ index, point: pointByWeek.get(week.weekRef) }))
        .filter(entry => entry.point?.value !== undefined)
      const values = entries.map(entry => entry.point!.value!)
      const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY)
      const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY)
      const range = Math.max(1, max - min)
      const yFor = (value: number) => 18 + ((max - value) / range) * 68
      const count = weekCards.value.length
      linePoints = entries.map(entry => ({
        x: count === 1 ? 250 : Math.round(5 + entry.index * (490 / (count - 1))),
        y: Math.round(yFor(entry.point!.value!)),
      }))
      lineTargetY = target === undefined ? null : Math.round(yFor(target))
    }

    const monthPoint = points[0]
    const span = {
      status: monthPoint && monthPoint.status !== 'no-data' ? monthPoint.status : 'empty',
      fillPct: monthPoint?.value === undefined
        ? 4
        : Math.max(6, Math.min(100, (monthPoint.value / Math.max(1, monthPoint.target ?? monthPoint.value)) * 100)),
    }

    return {
      key: item.key,
      icon: familyIcon[item.family],
      title: item.title,
      aggregate: aggregateFor(item, points),
      kind,
      cells,
      linePoints,
      lineTargetY,
      span,
    }
  })
})

function aggregateFor(item: LabFixtureObject, points: LabChartPoint[]): string {
  if (item.cadence === 'monthly') {
    const point = points[0]
    const statusLabel = point?.status === 'met' ? 'na celu' : point?.status === 'missed' ? 'poniżej celu' : 'w trakcie'
    return item.targetLabel ? `${statusLabel} · ${item.targetLabel}` : statusLabel
  }
  const withData = points.filter(point => point.status !== 'no-data')
  if (item.entryMode === 'value') {
    const values = withData.map(point => point.value).filter((value): value is number => value !== undefined)
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    return item.targetLabel ? `śr. ${formatNumber(average)} · ${item.targetLabel}` : `śr. ${formatNumber(average)}`
  }
  if (points.some(point => point.target !== undefined)) {
    const met = withData.filter(point => point.status === 'met').length
    return item.targetLabel ? `${met}/${withData.length} tyg. · ${item.targetLabel}` : `${met}/${withData.length} tyg. na celu`
  }
  const values = withData.map(point => point.value).filter((value): value is number => value !== undefined)
  const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  return `śr. ${formatNumber(average)}/tydz. · bez celu`
}

function openCategory(category: CategoryKey) {
  activeCategory.value = activeCategory.value === category ? null : category
  selectedShortcut.value = null
  selectedDetailKey.value = null
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)
}

function smoothPath(points: ChartPoint[], offset = 0): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y + offset}`

  const shifted = points.map(point => ({ x: point.x, y: point.y + offset }))
  const commands = [`M ${shifted[0].x.toFixed(1)} ${shifted[0].y.toFixed(1)}`]

  for (let index = 0; index < shifted.length - 1; index += 1) {
    const previous = shifted[Math.max(0, index - 1)]
    const current = shifted[index]
    const next = shifted[index + 1]
    const following = shifted[Math.min(shifted.length - 1, index + 2)]
    const controlOne = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 }
    const controlTwo = { x: next.x - (following.x - current.x) / 6, y: next.y - (following.y - current.y) / 6 }
    commands.push(`C ${controlOne.x.toFixed(1)} ${controlOne.y.toFixed(1)}, ${controlTwo.x.toFixed(1)} ${controlTwo.y.toFixed(1)}, ${next.x.toFixed(1)} ${next.y.toFixed(1)}`)
  }

  return commands.join(' ')
}

</script>

<style scoped>
.sketch-month {
  --sketch-base: rgb(var(--color-background));
  --sketch-surface: rgb(var(--neo-surface-base));
  --sketch-paper: rgb(var(--color-surface-container));
  --sketch-ink: rgb(var(--color-on-surface));
  --sketch-muted: rgb(var(--neo-muted));
  --sketch-blue: rgb(var(--color-primary));
  --sketch-blue-strong: rgb(var(--color-primary-strong));
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: var(--sketch-ink);
  background: var(--sketch-base);
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}

.sketch-month *,
.sketch-month *::before,
.sketch-month *::after { box-sizing: border-box; }

.sketch-month button {
  font: inherit;
  transition: box-shadow .24s ease, transform .16s ease, color .2s ease, background .2s ease, border-color .2s ease;
}

.sketch-month button:active { transform: scale(.985); }
.sketch-month--nested-scale { padding: 0; }

.sketch-month__sheet {
  display: grid;
  grid-template-columns: minmax(330px, .44fr) minmax(0, 1fr);
  gap: 20px;
  height: calc(100vh - 40px);
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: var(--sketch-base);
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
}

.sketch-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: var(--sketch-surface);
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}

.sketch-surface::after {
  position: absolute;
  inset: 3px 2px 2px 3px;
  border: 1px solid rgb(var(--neo-border) / .07);
  border-radius: inherit;
  pointer-events: none;
  content: '';
  transform: rotate(.08deg);
}

/* Lewa kolumna: nawigacja + kompas + tygodnie */
.month-rail-stack {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 15px;
  min-width: 0;
  min-height: 0;
}

.month-nav-card {
  display: grid;
  gap: 8px;
  padding: 10px 13px 11px;
  border-radius: 24px 20px 25px 21px;
}

.scale-switch {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 3px;
  padding: 3px;
  border: 1px solid rgb(var(--neo-border) / .18);
  border-radius: 14px 17px 13px 16px;
  background: rgb(var(--sky-100) / .55);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .6), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14);
}
.scale-switch button {
  min-height: 26px;
  padding: 3px 4px;
  border: 0;
  border-radius: 11px 14px 10px 13px;
  color: var(--sketch-muted);
  background: transparent;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}
.scale-switch button.active {
  color: var(--sketch-blue-strong);
  background: rgb(var(--color-surface-container) / .92);
  box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16);
}

.month-main--scale-placeholder { grid-template-rows: minmax(0, 1fr); }
.scale-placeholder {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 8px;
  padding: 30px;
  border-radius: 27px 23px 28px 24px;
  text-align: center;
}
.scale-placeholder .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .32), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .08);
  font-size: 30px;
  transform: rotate(.6deg);
}
.scale-placeholder h3 { position: relative; z-index: 1; margin: 4px 0 0; color: var(--sketch-blue-strong); font-size: 14px; font-weight: 800; }
.scale-placeholder p { position: relative; z-index: 1; max-width: 380px; margin: 0; color: var(--sketch-muted); font-size: 10px; line-height: 1.55; }

.month-rail {
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 7px;
  min-width: 0;
  padding: 12px 16px 11px;
  overflow: hidden;
  border-radius: 25px 30px 24px 28px;
}

.month-rail__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px;
}
.month-rail__header h2 { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: .01em; }

.month-nav {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid rgb(var(--color-primary) / .1);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}
.month-nav:last-of-type { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.month-nav .material-symbols-outlined { font-size: 17px; }

.month-ritual {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 31px;
  margin: 0 1px;
  border: 1px solid rgb(var(--color-primary) / .12);
  border-radius: 16px 20px 15px 19px;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .55);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .02em;
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .65), 3px 3px 7px rgb(var(--neo-shadow-dark) / .16);
}
.month-ritual.done { color: rgb(var(--sky-600) / .82); background: rgb(var(--sky-100) / .6); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .5), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.month-ritual .material-symbols-outlined { font-size: 15px; }

.month-ratings { position: relative; z-index: 1; }
.month-ratings h2,
.month-weeks-list h2 {
  margin: 0;
  padding: 1px 3px 4px;
  color: var(--sketch-blue-strong);
  font-size: 7.5px;
  font-weight: 850;
  letter-spacing: .17em;
  text-transform: uppercase;
}

.ratings-chart { width: 100%; height: auto; overflow: visible; }
.ratings-chart__label { fill: var(--sketch-muted); font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 750; }
.ratings-chart__line { fill: none; stroke: var(--sketch-blue); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.ratings-chart .pencil-echo { fill: none; stroke: rgb(var(--sky-300) / .42); stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
.ratings-chart__bubble { fill: rgb(var(--sky-600)); filter: drop-shadow(1px 2px 2.5px rgb(var(--neo-shadow-dark) / .35)); }
.ratings-chart__bubble--empty { fill: transparent; stroke: rgb(var(--sky-400) / .65); stroke-width: 1.5; stroke-dasharray: 4 4; }
.ratings-chart__value { fill: rgb(var(--sky-50)); font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800; }
.ratings-chart__value.empty { fill: rgb(var(--sky-500)); }

.month-weeks-list { position: relative; z-index: 1; min-height: 0; overflow-x: hidden; overflow-y: auto; scrollbar-width: thin; }

.month-week-row {
  display: grid;
  grid-template-columns: minmax(88px, 1fr) 180px;
  gap: 10px;
  align-items: center;
  width: 100%;
  min-height: 56px;
  padding: 2px 6px;
  border: 0;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
  border-radius: 13px 16px 12px 15px;
  color: var(--sketch-ink);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.month-week-row:nth-of-type(even) { transform: rotate(-.04deg); }
.month-week-row:hover,
.month-week-row.active {
  border-bottom-color: transparent;
  background: rgb(var(--color-primary-soft) / .48);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16);
}
.month-week-row__copy { display: grid; gap: 1px; min-width: 0; }
.month-week-row__copy strong { color: var(--sketch-blue-strong); font-size: 12px; font-weight: 800; letter-spacing: .03em; }
.month-week-row.current .month-week-row__copy strong {
  width: fit-content;
  padding: 0 8px;
  border-radius: 999px;
  background: rgb(var(--sky-200) / .85);
  box-shadow: inset -1px -1px 3px rgb(var(--neo-inset-light) / .5), inset 1px 1px 3px rgb(var(--neo-inset-dark) / .12);
}
.month-week-row__copy small { color: var(--sketch-muted); font-size: 8px; }
.month-week-row__copy em { color: rgb(var(--sky-600)); font-size: 7px; font-style: normal; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.month-week-row.future { opacity: .68; }

.month-weeks-list__head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-right: 4px;
}
.week-axis-key { display: flex; align-items: center; gap: 9px; color: var(--sketch-muted); font-size: 7px; font-weight: 800; }
.week-axis-key span { display: flex; align-items: center; gap: 4px; }
.week-axis-key i { width: 11px; border-top: 2px solid rgb(var(--sky-600)); }
.week-axis-key .effort i { border-color: rgb(var(--rose-400)); }

.week-dual-chart { position: relative; display: grid; place-items: center; width: 180px; min-height: 47px; padding: 3px 5px; overflow: hidden; border-radius: 11px 9px 12px 10px; background: rgb(var(--sky-50) / .38); }
.week-dual-chart > svg { width: 100%; height: 42px; overflow: visible; fill: none; stroke-linecap: round; stroke-linejoin: round; transition: opacity .18s ease; }
.week-axis-line { stroke-width: 2.2; }.week-axis-echo { stroke-width: 4.6; }
.week-axis-line--effort { stroke: rgb(var(--rose-400)); }.week-axis-echo--effort { stroke: rgb(var(--rose-200) / .52); }
.week-axis-line--state { stroke: rgb(var(--sky-600)); }.week-axis-echo--state { stroke: rgb(var(--sky-300) / .45); }
.week-axis-point--effort { fill: rgb(var(--rose-400)); stroke: none; }.week-axis-point--state { fill: rgb(var(--sky-600)); stroke: none; }
.week-chart-area-icons { position: absolute; inset: 3px 5px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); place-items: center; border-radius: 9px; background: rgb(var(--neo-surface-base) / .94); opacity: 0; pointer-events: none; transform: translateY(3px); transition: opacity .18s ease, transform .18s ease; }
.week-chart-area-icons > span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .72); }
.week-chart-area-icons .material-symbols-outlined { font-size: 17px; font-variation-settings: 'FILL' 1, 'wght' 450, 'GRAD' 60, 'opsz' 20; }
.month-week-row:hover .week-dual-chart > svg, .month-week-row:focus-visible .week-dual-chart > svg { opacity: .12; }
.month-week-row:hover .week-chart-area-icons, .month-week-row:focus-visible .week-chart-area-icons { opacity: 1; transform: none; }
.week-axis-ghost { stroke: rgb(var(--sky-400) / .5); stroke-width: 1.2; stroke-dasharray: 3 4; }

.month-week-note {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 4px 2px 6px;
  padding: 7px 10px;
  border: 1px dashed rgb(var(--neo-border) / .4);
  border-radius: 13px 16px 12px 15px;
  color: var(--sketch-muted);
  font-size: 9px;
  line-height: 1.45;
}
.month-week-note .material-symbols-outlined { flex: 0 0 auto; color: var(--sketch-blue-strong); font-size: 14px; }

/* Prawa strona: board 3 rzędów (przegląd) — wysokość rzędu = 1/4 arkusza, jak w widoku Dzisiaj */
.month-main {
  display: grid;
  grid-template-rows: repeat(3, minmax(0, calc((100vh - 116px) / 4))) auto;
  gap: 16px;
  min-width: 0;
  min-height: 0;
}
.month-main--detail,
.month-main--scale-placeholder { gap: 15px; }
.month-main--detail { grid-template-rows: 52px minmax(0, 1fr) 58px; }

.month-board__row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  min-width: 0;
  overflow: hidden;
  border-radius: 24px 29px 25px 27px;
}
.month-board__row:nth-child(2) { border-radius: 28px 22px 29px 24px; }
.month-board__row:nth-child(3) { border-radius: 23px 28px 22px 30px; }

.month-board__cell {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: minmax(0, 1fr) 24px;
  place-items: center;
  align-content: stretch;
  gap: 4px;
  min-width: 0;
  padding: 8px 12px 9px;
  border: 0;
  border-right: 1px solid rgb(var(--neo-border) / .18);
  color: rgb(var(--sky-600));
  background: transparent;
  cursor: pointer;
}
.month-board__cell:last-of-type { border-right: 0; }
.month-board__cell:hover,
.month-board__cell.active {
  color: var(--sketch-blue-strong);
  background: rgb(var(--color-primary-soft) / .48);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16);
}

.board-tile__icon-box {
  position: relative;
  display: grid;
  place-items: center;
  align-self: center;
  width: min(62%, 155px);
  aspect-ratio: 1.48;
  max-height: 98px;
  border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .32), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .08);
  transform: rotate(.45deg);
}
.month-board__cell:nth-of-type(2) .board-tile__icon-box { border-radius: 17% 22% 16% 20% / 24% 18% 22% 16%; transform: rotate(-.45deg); }
.month-board__cell:nth-of-type(3) .board-tile__icon-box { transform: rotate(.25deg); }
.board-tile__icon-box .material-symbols-outlined { font-size: 52px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 80, 'opsz' 48; }

.board-tile__badge {
  position: absolute;
  top: -8px;
  right: -11px;
  display: grid;
  place-items: center;
  min-width: 26px;
  height: 26px;
  padding: 0 5px;
  border: 1px solid rgb(var(--sky-300) / .85);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--sky-800));
  background: rgb(var(--sky-50) / .97);
  font-size: 8.5px;
  font-weight: 800;
  letter-spacing: -.02em;
  box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .7), 2px 2px 5px rgb(var(--neo-shadow-dark) / .2);
  transform: rotate(2deg);
}
.month-board__cell:nth-of-type(even) .board-tile__badge { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; transform: rotate(-2deg); }

.board-tile__copy { display: grid; justify-items: center; gap: 2px; min-width: 0; max-width: 100%; }
.board-tile__label { display: flex; align-items: center; gap: 6px; min-width: 0; max-width: 100%; }
.board-tile__label strong {
  overflow: hidden;
  color: var(--sketch-blue-strong);
  font-size: 13.25px;
  font-weight: 800;
  letter-spacing: .012em;
  line-height: 1.15;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.board-tile__label em {
  flex: 0 0 auto;
  padding: 1px 7px;
  border-radius: 9px 12px 8px 11px;
  color: rgb(var(--sky-800));
  background: rgb(var(--sky-200) / .72);
  font-size: 8.5px;
  font-style: normal;
  font-weight: 800;
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .3), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .08);
}
.board-tile__tone { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-500)); transform: rotate(-2deg); }
.board-tile__tone.tone-mint { background: rgb(var(--color-success)); }
.board-tile__tone.tone-lavender { background: rgb(155 110 195); }
.board-tile__tone.tone-amber { background: rgb(var(--color-warning)); }

.board-tile__meta { display: flex; align-items: center; justify-content: center; min-height: 12px; }
.board-tile__meta small { color: rgb(var(--sky-600)); font-size: 8.5px; font-weight: 750; }
.board-tile__effort { display: flex; gap: 3px; }
.board-tile__effort i { width: 7px; height: 7px; border-radius: 47% 53% 45% 55% / 53% 44% 56% 47%; background: rgb(var(--neo-border) / .35); }
.board-tile__effort i.filled { background: rgb(var(--sky-500)); box-shadow: 0 1px 2px rgb(var(--neo-shadow-dark) / .2); }

/* Wariant C: pozioma wizytówka */
.month-board--c .month-board__cell {
  grid-template-rows: none;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: center;
  align-items: center;
  justify-items: start;
  gap: 12px;
  padding: 10px 16px;
  text-align: left;
}
.month-board--c .board-tile__icon-box { width: 62px; aspect-ratio: 1.4; max-height: 46px; }
.month-board--c .board-tile__icon-box .material-symbols-outlined { font-size: 27px; }
.month-board--c .board-tile__copy { justify-items: start; gap: 3px; }
.month-board--c .board-tile__meta { justify-content: flex-start; }

.board-variant-switch { display: flex; align-items: center; gap: 3px; justify-self: end; }
.board-variant-switch small {
  margin-right: 5px;
  color: var(--sketch-muted);
  font-size: 7.5px;
  font-weight: 750;
  letter-spacing: .14em;
  text-transform: uppercase;
}
.board-variant-switch button {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 8px 10px 7px 9px;
  color: var(--sketch-muted);
  background: rgb(var(--sky-200) / .38);
  font-size: 8px;
  font-weight: 800;
  cursor: pointer;
}
.board-variant-switch button.active {
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .8);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .56), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17);
}

/* Detal jak w widoku Dzisiaj: zakładki, karty obiektów, skróty */
.sketch-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)) 42px;
  gap: 4px;
  min-height: 52px;
  padding: 6px;
  overflow: hidden;
  border-radius: 22px 28px 24px 20px;
}
.sketch-tabs button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 15px 19px 14px 18px;
  color: rgb(var(--sky-600) / .72);
  background: transparent;
  cursor: pointer;
}
.sketch-tabs__icon-field {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .74);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .3), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08);
}
.sketch-tabs button:nth-child(2) .sketch-tabs__icon-field { border-radius: 46% 54% 52% 48% / 54% 46% 51% 49%; transform: rotate(-1deg); }
.sketch-tabs button:nth-child(3) .sketch-tabs__icon-field { border-radius: 54% 46% 49% 51% / 46% 54% 52% 48%; transform: rotate(1deg); }
.sketch-tabs button.active {
  border-color: rgb(var(--color-primary) / .18);
  color: var(--sketch-ink);
  background: rgb(var(--color-primary-soft) / .58);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .7), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .17);
}
.sketch-tabs strong { overflow: hidden; font-size: 12px; font-weight: 800; letter-spacing: .012em; text-overflow: ellipsis; white-space: nowrap; }
.sketch-tabs__icon-field .material-symbols-outlined { font-size: 20px; }
.sketch-tabs__close { color: var(--sketch-blue-strong) !important; }
.sketch-tabs__close .material-symbols-outlined { font-size: 20px; }

.sketch-details { min-height: 0; padding: 14px 15px 15px; overflow: auto; scrollbar-width: thin; border-radius: 27px 23px 28px 24px; }
.sketch-details__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}
.sketch-details__header > span {
  color: var(--sketch-blue-strong);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .17em;
  text-transform: uppercase;
}
.density-switch { display: flex; align-items: center; gap: 4px; }
.density-switch small { margin-right: 5px; color: var(--sketch-muted); font-size: 7.5px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
.density-switch button { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 10px 12px 9px 11px; color: var(--sketch-muted); background: rgb(var(--sky-200) / .38); font-size: 9px; font-weight: 800; cursor: pointer; }
.density-switch button.active { color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .8); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .56), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17); }

.detail-grid { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; min-width: 0; }

.sketch-detail-card {
  min-width: 0;
  min-height: 110px;
  padding: 11px 12px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 18px 22px 17px 21px;
  color: var(--sketch-ink);
  background: var(--sketch-paper);
  text-align: left;
  cursor: pointer;
  box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .62), 4px 4px 9px rgb(var(--neo-shadow-dark) / .16);
}
.sketch-detail-card:nth-child(even) { border-radius: 22px 17px 21px 18px; transform: rotate(-.035deg); }
.sketch-detail-card.active {
  border-color: rgb(var(--color-primary) / .3);
  background: rgb(var(--color-primary-soft) / .42);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .66), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16);
}
.sketch-detail-card > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sketch-detail-card > header > span { display: flex; align-items: center; min-width: 0; gap: 7px; }
.sketch-detail-card > header .material-symbols-outlined { flex: 0 0 auto; color: var(--sketch-blue-strong); font-size: 19px; }
.sketch-detail-card > header strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.sketch-detail-card__summary {
  flex: 0 0 auto;
  color: rgb(var(--sky-600));
  font-size: 8px;
  font-style: normal;
  font-weight: 750;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px);
  transition: opacity .18s ease, transform .18s ease;
}
.sketch-detail-card:hover .sketch-detail-card__summary,
.sketch-detail-card:focus-visible .sketch-detail-card__summary { opacity: 1; transform: translateY(0); }
.sketch-detail-card:focus-visible { outline: 2px solid rgb(var(--color-primary) / .52); outline-offset: 3px; }

.detail-week-chart { display: flex; min-width: 0; flex-direction: column; justify-content: flex-end; }
.detail-dots { display: grid; gap: 8px; align-items: center; min-height: 49px; padding: 9px 6px 2px; }
.detail-dots i { position: relative; display: grid; width: 100%; max-width: 54px; aspect-ratio: 1; place-items: center; justify-self: center; border-radius: 47% 53% 45% 55% / 55% 44% 56% 45%; background: rgb(var(--neo-border) / .22); }
.detail-dots i:nth-child(even) { border-radius: 53% 47% 52% 48% / 46% 54% 49% 51%; }
.detail-dots i.assigned,
.detail-dots i.done { background: rgb(var(--sky-200) / .78); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .34), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08); }
.detail-dots i.done::after { width: 70%; aspect-ratio: 1; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-700)); box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16); content: ''; transform: rotate(-2deg); }
.detail-dots i.missed { background: rgb(var(--rose-200)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .24), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .06); }
.detail-dots i.unassigned { background: rgb(var(--neo-border) / .22); }

.detail-bars { display: flex; align-items: end; gap: 10px; height: 56px; padding: 8px 6px 2px; }
.detail-bars i { flex: 1; min-width: 4px; border-radius: 40% 51% 43% 55% / 13% 16% 8% 10%; background: rgb(var(--sky-200)); }
.detail-bars i.current { background: rgb(var(--sky-400)); box-shadow: 1px 2px 5px rgb(var(--neo-shadow-dark) / .14); }
.detail-bars i.missed { background: rgb(var(--rose-200)); }
.detail-bars i.empty { flex-basis: auto; align-self: end; border-radius: 999px; background: rgb(var(--neo-border) / .2); }

.detail-line { width: 100%; height: 59px; margin-top: 2px; overflow: visible; fill: none; stroke: var(--sketch-blue); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.detail-line .pencil-echo { stroke: rgb(var(--sky-200) / .55); stroke-width: 7; }
.detail-line .target-line { stroke: rgb(var(--color-primary) / .38); stroke-width: 1; stroke-dasharray: 7 7; }
.detail-line circle { fill: var(--sketch-blue); stroke: none; }
.detail-weekdays { display: grid; padding: 0 4px; color: rgb(var(--neo-muted) / .72); font-size: 7px; font-weight: 700; letter-spacing: .02em; line-height: 1; text-align: center; }

@media (prefers-reduced-motion: reduce) {
  .sketch-detail-card__summary,
  .week-dual-chart > svg,
  .week-chart-area-icons { transition: none; }
}

.detail-span { display: flex; align-items: center; gap: 9px; min-height: 56px; padding-top: 10px; }
.detail-span__track {
  display: block;
  flex: 1;
  height: 11px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(var(--color-outline) / .16);
  box-shadow: inset 1px 1px 3px rgb(var(--neo-inset-dark) / .1);
}
.detail-span__track i { display: block; height: 100%; border-radius: 999px; }
.detail-span__track .detail-span__fill--met { background: linear-gradient(90deg, rgb(var(--neo-chart-primary-start)), rgb(var(--neo-chart-primary-end))); }
.detail-span__track .detail-span__fill--missed { background: rgb(var(--color-error) / .42); }
.detail-span__track .detail-span__fill--no-target { background: rgb(var(--color-primary) / .62); }
.detail-span__track .detail-span__fill--empty { background: rgb(var(--color-outline) / .28); }
.detail-span > small { flex: 0 0 auto; color: var(--sketch-muted); font-size: 7px; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; }

.sketch-shortcuts { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)) 52px; overflow: hidden; border-radius: 24px 28px 22px 27px; }
.sketch-shortcuts button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  padding: 5px 7px;
  border: 0;
  border-right: 1px solid rgb(var(--neo-border) / .19);
  color: rgb(var(--sky-600) / .82);
  background: transparent;
  font-size: 9.5px;
  text-align: center;
  cursor: pointer;
}
.sketch-shortcuts button:last-child { border-right: 0; }
.sketch-shortcuts button:hover,
.sketch-shortcuts button.active { color: var(--sketch-blue-strong); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12); }
.sketch-shortcuts__icon-field {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 52% 48% 45% 55% / 48% 52% 54% 46%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .26), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .07);
}
.sketch-shortcuts button:nth-child(even) .sketch-shortcuts__icon-field { border-radius: 46% 54% 51% 49% / 54% 46% 48% 52%; transform: rotate(-1deg); }
.sketch-shortcuts__icon-field .material-symbols-outlined { font-size: 17px; }
.sketch-shortcuts button > span:last-child { overflow: hidden; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
</style>
