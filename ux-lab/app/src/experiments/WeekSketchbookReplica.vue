<template>
  <div class="product-replica sketch-week">
    <div class="sketch-week__sheet">
      <aside class="week-rail-stack">
        <section class="week-nav-card week-surface" aria-label="Nawigacja tygodnia">
          <header class="week-nav-card__header">
            <button type="button" class="week-round-button" aria-label="Poprzedni tydzień" :disabled="weekIndex <= 0" @click="changeWeek(-1)"><AppIcon name="chevron_left" /></button>
            <h2>{{ week.rangeLabel }}</h2>
            <button type="button" class="week-round-button" aria-label="Następny tydzień" :disabled="weekIndex >= availableWeeks.length - 1" @click="changeWeek(1)"><AppIcon name="chevron_right" /></button>
          </header>
          <div class="week-scale-switch" role="group" aria-label="Skala widoku">
            <button v-for="option in scaleOptions" :key="option.key" type="button" :class="{ active: option.key === 'week' }" @click="emit('scale', option.key)">{{ option.label }}</button>
          </div>
        </section>

        <section class="week-ratings week-surface" aria-label="Oceny tygodnia" tabindex="0">
          <header class="week-ratings__head">
            <h2>Oceny tygodnia</h2>
            <div class="week-ratings__legend" aria-hidden="true"><span class="effort"><i />Wysiłek</span><span class="state"><i />Stan</span></div>
          </header>
          <div class="week-ratings__chart-wrap">
            <svg class="week-ratings__chart" viewBox="0 0 420 126" role="img" :aria-label="weeklyRatingsAria">
              <template v-for="rating in weeklyRatingColumns" :key="rating.label">
                <text :x="rating.x" y="119" class="week-ratings__label" text-anchor="middle">{{ rating.label }}</text>
              </template>
              <path class="week-ratings__effort-echo" :d="smoothPath(weeklyEffortLine, 2.5)" />
              <path class="week-ratings__state-echo" :d="smoothPath(weeklyStateLine, 2.5)" />
              <path class="week-ratings__line week-ratings__line--effort" :d="smoothPath(weeklyEffortLine)" />
              <path class="week-ratings__line week-ratings__line--state" :d="smoothPath(weeklyStateLine)" />
              <template v-for="rating in weeklyRatingColumns" :key="`bubble-${rating.label}`">
                <circle :cx="rating.effortX" :cy="rating.effortY" r="10" class="week-ratings__bubble week-ratings__bubble--effort" />
                <text :x="rating.effortX" :y="rating.effortY + 3" class="week-ratings__value" text-anchor="middle">{{ formatRating(rating.effort) }}</text>
                <circle :cx="rating.stateX" :cy="rating.stateY" r="10" class="week-ratings__bubble week-ratings__bubble--state" />
                <text :x="rating.stateX" :y="rating.stateY + 3" class="week-ratings__value" text-anchor="middle">{{ formatRating(rating.state) }}</text>
              </template>
            </svg>
            <div class="week-ratings__areas" aria-hidden="true">
              <span v-for="area in weeklyRatingAreas" :key="area.label" :title="area.label"><AppIcon :name="area.icon" /></span>
            </div>
          </div>
        </section>

        <section class="week-rail week-surface" aria-label="Dni tygodnia">
          <header class="week-rail__heading">
            <span>{{ dayContextTitle }}</span>
            <small v-if="activeContext">kontekst z wybranego obszaru</small>
          </header>
          <div class="week-day-list">
            <button
              v-for="(day, index) in week.days"
              :key="day.dayRef"
              type="button"
              class="week-day-row"
              :class="{ active: selectedDay === day.dayRef, today: day.isToday, future: isFutureDay(day.dayRef) }"
              :aria-pressed="selectedDay === day.dayRef"
              @click="selectedDay = day.dayRef"
            >
              <span class="week-day-row__date"><small>{{ day.shortLabel }}</small><strong>{{ day.dayNumber }}</strong></span>
              <span v-if="activeContext" class="week-day-row__context" :class="dayContext(day, index).tone">
                <i />{{ dayContext(day, index).label }}
              </span>
              <em v-if="day.isToday">dziś</em>
              <span class="sr-only">{{ index + 1 }}. dzień tygodnia{{ activeContext ? `, ${dayContext(day, index).label}` : '' }}</span>
            </button>
          </div>

          <button type="button" class="week-ritual" :class="{ done: week.reflectionComplete }" @click="openRitual">
            <AppIcon :name="week.reflectionComplete ? 'task_alt' : 'auto_awesome'" />
            <span>{{ week.reflectionComplete ? 'Refleksja zamknięta' : 'Zaplanuj tydzień' }}</span>
          </button>
        </section>
      </aside>

      <main class="week-main" :class="{ 'week-main--detail': activeCategory !== null }">
        <template v-if="activeCategory === null">
          <section v-for="row in boardRows" :key="row" class="week-board__row week-surface" :aria-label="rowLabel(row)">
            <button
              v-for="tile in boardTiles.filter(item => item.row === row)"
              :key="tile.key"
              type="button"
              class="week-board__cell"
              :class="{ active: tile.active, 'week-board__cell--focus': tile.kind === 'focus' }"
              :aria-pressed="tile.active"
              @click="tile.onClick"
            >
              <span class="week-board__visual">
                <AppIcon :name="tile.icon" />
                <span v-if="tile.metric" class="week-board__metric">{{ tile.metric }}</span>
                <span v-if="tile.kind === 'focus'" class="week-board__status" :class="`status-${tile.status}`"><i /></span>
              </span>
              <span class="week-board__copy"><strong>{{ tile.label }}</strong></span>
            </button>
          </section>
          <p class="week-board-hint"><AppIcon name="touch_app" /> Wybierz obszar, aby zobaczyć siedem dni. Szczegóły liczb pojawiają się dopiero w kartach.</p>
        </template>

        <template v-else>
          <nav class="week-tabs sketch-tabs week-surface" aria-label="Obszary tygodnia">
            <button v-for="category in categoryList" :key="category.key" type="button" :class="{ active: activeCategory === category.key }" :aria-pressed="activeCategory === category.key" @click="openCategory(category.key)">
              <span class="sketch-tabs__icon-field"><AppIcon :name="category.icon" /></span><strong>{{ category.label }}</strong>
            </button>
            <button type="button" class="week-tabs__close" aria-label="Zamknij szczegóły" @click="clearContext"><AppIcon name="close_fullscreen" /></button>
          </nav>

          <section class="week-details sketch-details week-surface">
            <header class="week-details__header sketch-details__header">
              <span>{{ activeCategoryMeta.label }} · dzień po dniu</span>
              <div class="week-density density-switch" role="group" aria-label="Liczba kart w rzędzie"><small>Naraz</small><button v-for="option in [1, 2, 3] as const" :key="option" type="button" :class="{ active: density === option }" @click="density = option">{{ option }}</button></div>
            </header>
            <div class="week-detail-grid detail-grid" :style="{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }">
              <button v-for="card in objectCards" :key="card.key" type="button" class="week-detail-card sketch-detail-card" :class="[{ active: selectedObject === card.key }, `sketch-detail-card--${card.kind}`]" :aria-describedby="`week-card-summary-${card.key}`" :aria-pressed="selectedObject === card.key" @click="selectedObject = selectedObject === card.key ? null : card.key">
                <header><span><AppIcon :name="card.icon" /><strong>{{ card.title }}</strong></span><em :id="`week-card-summary-${card.key}`" class="sketch-detail-card__summary">{{ card.summary }}</em></header>
                <div v-if="card.kind === 'dots'" class="detail-week-chart" aria-hidden="true"><div class="week-detail-dots detail-dots"><i v-for="(cell, index) in card.cells" :key="index" :class="cell" /></div><div class="detail-weekdays"><span v-for="day in week.days" :key="day.dayRef">{{ day.shortLabel }}</span></div></div>
                <div v-else-if="card.kind === 'bars'" class="detail-week-chart" aria-hidden="true"><div class="week-detail-bars detail-bars"><i v-for="(height, index) in card.bars" :key="index" :class="{ future: isFutureDay(week.days[index].dayRef) }" :style="{ height: `${height}%` }" /></div><div class="detail-weekdays"><span v-for="day in week.days" :key="day.dayRef">{{ day.shortLabel }}</span></div></div>
                <div v-else class="detail-week-chart">
                  <svg class="week-detail-line detail-line" viewBox="0 0 500 115" preserveAspectRatio="none" role="img" :aria-label="`Przebieg tygodnia: ${card.title}`">
                    <line v-if="card.targetY !== null" x1="0" :y1="card.targetY" x2="500" :y2="card.targetY" class="week-target-line target-line" />
                    <path class="week-pencil-echo pencil-echo" :d="smoothPath(card.line, 3)" /><path :d="smoothPath(card.line)" />
                    <circle v-if="card.line.length" :cx="card.line.at(-1)!.x" :cy="card.line.at(-1)!.y" r="5" />
                  </svg>
                  <div class="detail-weekdays" aria-hidden="true"><span v-for="day in week.days" :key="day.dayRef">{{ day.shortLabel }}</span></div>
                </div>
              </button>
            </div>
          </section>

          <section class="week-shortcuts week-surface" aria-label="Pozostałe obszary tygodnia">
            <button v-for="category in categoryList" :key="category.key" type="button" :class="{ active: activeCategory === category.key }" @click="openCategory(category.key)"><span><AppIcon :name="category.icon" /></span>{{ category.label }}</button>
            <button type="button" :class="{ active: activeContext === 'journal' }" @click="openContext('journal')"><span><AppIcon name="history_edu" /></span>Dziennik</button>
            <button type="button" :class="{ active: activeContext === 'emotions' }" @click="openContext('emotions')"><span><AppIcon name="cognition" /></span>Emocje</button>
            <button type="button" aria-label="Wróć do przeglądu" @click="clearContext"><span><AppIcon name="arrow_left_alt" /></span></button>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabChartPoint, LabFixtureObject, LabWeekDay } from '@product/dev/richVerificationScenario'
import { useLabStore } from '~lab/stores/lab.store'

type ViewScale = 'day' | 'week' | 'month' | 'year'
type CategoryKey = 'goals' | 'habits' | 'trackers' | 'intentions'
type ContextKey = CategoryKey | 'journal' | 'emotions'
type BoardRow = 'focus' | 'execution' | 'context'
type Point = { x: number; y: number }

const props = defineProps<{ presetId: string }>()
const emit = defineEmits<{ scale: [value: ViewScale] }>()
const labStore = useLabStore()
const preset = computed(() => labStore.fixture.presets['calendar-week'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['calendar-week'][0])
const availableWeeks = computed(() => [...labStore.fixture.weeks].sort((left, right) => left.weekRef.localeCompare(right.weekRef)))
const activeWeekRef = ref(String(preset.value.periodRef))
const weekIndex = computed(() => availableWeeks.value.findIndex(item => item.weekRef === activeWeekRef.value))
const week = computed(() => availableWeeks.value.find(item => item.weekRef === activeWeekRef.value) ?? availableWeeks.value.at(-1)!)
const selectedDay = ref(week.value.days.find(day => day.isToday)?.dayRef ?? week.value.days[0].dayRef)
watch(preset, value => { activeWeekRef.value = String(value.periodRef) })
watch(week, value => { selectedDay.value = value.days.find(day => day.isToday)?.dayRef ?? value.days[0].dayRef })
const activeCategory = ref<CategoryKey | null>(null)
const activeContext = ref<ContextKey | null>(null)
const selectedObject = ref<string | null>(null)
const density = ref<1 | 2 | 3>(2)
const boardRows: BoardRow[] = ['focus', 'execution', 'context']
const scaleOptions: Array<{ key: ViewScale; label: string }> = [{ key: 'day', label: 'Dzień' }, { key: 'week', label: 'Tydzień' }, { key: 'month', label: 'Miesiąc' }, { key: 'year', label: 'Rok' }]
const categoryList: Array<{ key: CategoryKey; label: string; icon: string; families: LabFixtureObject['family'][] }> = [
  { key: 'goals', label: 'Cele', icon: 'mountain_flag', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', icon: 'change_circle', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', icon: 'show_chart', families: ['tracker'] },
  { key: 'intentions', label: 'Intencje', icon: 'gps_fixed', families: ['intention'] },
]
const familyIcon: Record<LabFixtureObject['family'], string> = { goal: 'outlined_flag', keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed' }
const objects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired'))
const weeklyObjects = computed(() => objects.value.filter(item => item.cadence === 'weekly'))
const focusKeys = ['kr-runs', 'kr-deep-work', 'habit-stretch']
const focusObjects = computed(() => focusKeys.map(key => objects.value.find(item => item.key === key)).filter((item): item is LabFixtureObject => Boolean(item)))
const currentPoint = (item: LabFixtureObject) => item.chart.find(point => point.periodRef === week.value.weekRef)
const objectsFor = (category: CategoryKey) => {
  const families = categoryList.find(item => item.key === category)!.families
  return weeklyObjects.value.filter(item => families.includes(item.family))
}
const activeCategoryMeta = computed(() => categoryList.find(item => item.key === activeCategory.value) ?? categoryList[0])
const contextLabels: Record<ContextKey, string> = { goals: 'Cele', habits: 'Nawyki', trackers: 'Trackery', intentions: 'Intencje', journal: 'Dziennik', emotions: 'Emocje' }
const dayContextTitle = computed(() => activeContext.value ? `${contextLabels[activeContext.value]} · aktywności w dniach` : 'Dni')
const weeklyRatingAreas = [
  { label: 'Ciało', icon: 'accessibility_new' },
  { label: 'Emocje', icon: 'cognition' },
  { label: 'Działanie', icon: 'directions_run' },
  { label: 'Relacje', icon: 'diversity_1' },
]
const weeklyRatingColumns = computed(() => weeklyRatingAreas.map((area, index) => {
  const values = labStore.fixture.ritual.weeklyRatings.slice(index * 3, index * 3 + 3)
  const effort = values[1] ?? 3
  const state = values[2] ?? 3
  const x = 58 + index * 101
  return { label: area.label, effort, state, x, effortX: x - 4, stateX: x + 4, effortY: 99 - (effort / 5) * 70, stateY: 99 - (state / 5) * 70 }
}))
const weeklyEffortLine = computed<Point[]>(() => weeklyRatingColumns.value.map(rating => ({ x: rating.effortX, y: rating.effortY })))
const weeklyStateLine = computed<Point[]>(() => weeklyRatingColumns.value.map(rating => ({ x: rating.stateX, y: rating.stateY })))
const weeklyRatingsAria = computed(() => `Oceny tygodnia: ${weeklyRatingColumns.value.map(rating => `${rating.label}: wysiłek ${formatRating(rating.effort)} z 5, stan ${formatRating(rating.state)} z 5`).join('; ')}`)
const statusLabel = (point?: LabChartPoint) => point?.status === 'met' ? 'na celu' : point?.status === 'missed' ? 'do uwagi' : point?.status === 'no-target' ? 'obserwacja' : 'bez danych'
const statusFor = (item: LabFixtureObject) => currentPoint(item)?.status ?? 'no-data'
const categoryRatio = (category: CategoryKey) => {
  const points = objectsFor(category).map(currentPoint).filter((point): point is LabChartPoint => Boolean(point && point.target !== undefined && point.status !== 'no-data'))
  if (!points.length) return '—'
  return `${points.filter(point => point.status === 'met').length}/${points.length}`
}
const journalCount = computed(() => week.value.days.reduce((sum, day) => sum + day.journalCount, 0))
const emotionCount = computed(() => week.value.days.reduce((sum, day) => sum + day.emotionCount, 0))
const trackerSignals = computed(() => objectsFor('trackers').filter(item => currentPoint(item)?.status !== 'no-data').length)

interface BoardTile { key: string; row: BoardRow; kind: 'focus' | 'category' | 'context'; icon: string; label: string; hint: string; metric?: string; status?: LabChartPoint['status']; active: boolean; onClick: () => void }
const boardTiles = computed<BoardTile[]>(() => [
  ...focusObjects.value.map(item => ({ key: item.key, row: 'focus' as const, kind: 'focus' as const, icon: familyIcon[item.family], label: item.title, hint: item.targetLabel ?? 'Obserwacja', status: statusFor(item), active: selectedObject.value === item.key, onClick: () => openFocus(item) })),
  { key: 'goals', row: 'execution', kind: 'category', icon: 'mountain_flag', label: 'Cele', hint: 'rezultaty tygodnia', metric: categoryRatio('goals'), active: activeContext.value === 'goals', onClick: () => openCategory('goals') },
  { key: 'habits', row: 'execution', kind: 'category', icon: 'change_circle', label: 'Nawyki', hint: 'dni w rytmie', metric: categoryRatio('habits'), active: activeContext.value === 'habits', onClick: () => openCategory('habits') },
  { key: 'trackers', row: 'execution', kind: 'category', icon: 'show_chart', label: 'Trackery', hint: 'z danymi', metric: `${trackerSignals.value}`, active: activeContext.value === 'trackers', onClick: () => openCategory('trackers') },
  { key: 'intentions', row: 'context', kind: 'category', icon: 'gps_fixed', label: 'Intencje', hint: 'domknięte', metric: categoryRatio('intentions'), active: activeContext.value === 'intentions', onClick: () => openCategory('intentions') },
  { key: 'journal', row: 'context', kind: 'context', icon: 'history_edu', label: 'Dziennik', hint: 'wpisy w tygodniu', metric: `${journalCount.value}`, active: activeContext.value === 'journal', onClick: () => openContext('journal') },
  { key: 'emotions', row: 'context', kind: 'context', icon: 'cognition', label: 'Emocje', hint: 'zapisane sygnały', metric: `${emotionCount.value}`, active: activeContext.value === 'emotions', onClick: () => openContext('emotions') },
])

const objectCards = computed(() => activeCategory.value === null ? [] : objectsFor(activeCategory.value).map(item => {
  const point = currentPoint(item)
  const value = Math.max(0, Math.round(point?.value ?? 0))
  const kind = item.entryMode === 'completion' || item.entryMode === 'multi-completion' ? 'dots' : item.entryMode === 'value' || item.entryMode === 'rating' ? 'line' : 'bars'
  const assigned = Math.min(7, Math.max(value, Math.round(point?.target ?? 0)))
  const cells = week.value.days.map((day, index) => isFutureDay(day.dayRef) ? 'pending' : index < value ? 'done' : index < assigned ? 'missed' : 'off')
  const total = Math.max(1, value)
  const bars = week.value.days.map((day, index) => isFutureDay(day.dayRef) ? 5 : Math.max(8, Math.min(92, (((index + 2) % 4) + 1) * (82 / total))))
  const sampleCount = Math.max(1, week.value.days.filter(day => !isFutureDay(day.dayRef)).length)
  const center = point?.value ?? item.todayValue ?? 0
  const target = point?.target
  const max = Math.max(1, center + 1, target ?? 0)
  const line = Array.from({ length: sampleCount }, (_, index) => ({ x: sampleCount === 1 ? 250 : 5 + index * (490 / (sampleCount - 1)), y: 88 - ((Math.max(0, center + ((index % 3) - 1) * .35)) / max) * 68 }))
  const targetY = target === undefined ? null : 88 - (target / max) * 68
  return { key: item.key, icon: familyIcon[item.family], title: item.title, summary: `${statusLabel(point)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`, kind, cells, bars, line, targetY }
}))

function openCategory(category: CategoryKey) {
  if (activeCategory.value === category) return clearContext()
  activeCategory.value = category
  activeContext.value = category
  selectedObject.value = null
}
function openFocus(item: LabFixtureObject) {
  const category = categoryFor(item.family)
  activeCategory.value = category
  activeContext.value = category
  selectedObject.value = item.key
}
function openContext(context: 'journal' | 'emotions') {
  if (activeContext.value === context) return clearContext()
  activeContext.value = context
  activeCategory.value = null
  selectedObject.value = null
}
function clearContext() { activeCategory.value = null; activeContext.value = null; selectedObject.value = null }
function categoryFor(family: LabFixtureObject['family']): CategoryKey { return family === 'habit' ? 'habits' : family === 'tracker' ? 'trackers' : family === 'intention' ? 'intentions' : 'goals' }
function rowLabel(row: BoardRow) { return row === 'focus' ? 'Najważniejsze zobowiązania tygodnia' : row === 'execution' ? 'Wykonanie tygodnia' : 'Kontekst tygodnia' }
function changeWeek(direction: -1 | 1) { const next = availableWeeks.value[weekIndex.value + direction]; if (next) activeWeekRef.value = next.weekRef }
function openRitual() { window.location.assign(`/preview/ritual-week/sketchbook-v1/${week.value.reflectionComplete ? 'reflect' : 'plan'}`) }
function isFutureDay(dayRef: string) { return dayRef > labStore.fixture.refs.today }
function dayContext(day: LabWeekDay, index: number) {
  if (isFutureDay(day.dayRef)) return { label: 'jeszcze bez danych', tone: 'pending' }
  if (activeContext.value === 'journal') return day.journalCount ? { label: `${day.journalCount} ${day.journalCount === 1 ? 'wpis' : 'wpisy'}`, tone: 'met' } : { label: 'bez wpisu', tone: 'quiet' }
  if (activeContext.value === 'emotions') return day.emotionCount ? { label: `${day.emotionCount} ${day.emotionCount === 1 ? 'sygnał' : 'sygnały'}`, tone: 'met' } : { label: 'bez zapisu', tone: 'quiet' }
  if (!activeCategory.value) return { label: '', tone: 'quiet' }
  const cards = objectCards.value
  const done = cards.filter(card => card.kind === 'dots' && card.cells[index] === 'done').length
  const missed = cards.filter(card => card.kind === 'dots' && card.cells[index] === 'missed').length
  const measured = cards.filter(card => card.kind !== 'dots' && currentPoint(objects.value.find(item => item.key === card.key)!)?.status !== 'no-data').length
  if (activeCategory.value === 'trackers') return measured ? { label: `${measured} ${measured === 1 ? 'pomiar' : 'pomiary'}`, tone: 'met' } : { label: 'brak pomiaru', tone: 'quiet' }
  if (done) return { label: `${done} ${done === 1 ? 'wykonane' : 'wykonane'}`, tone: 'met' }
  if (missed) return { label: `${missed} ${missed === 1 ? 'pominięte' : 'pominięte'}`, tone: 'missed' }
  if (measured) return { label: `${measured} ${measured === 1 ? 'zapis' : 'zapisy'}`, tone: 'met' }
  return { label: 'brak aktywności', tone: 'quiet' }
}
function formatRating(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',') }
function smoothPath(points: Point[], offset = 0) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y + offset}`
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${(point.y + offset).toFixed(1)}`).join(' ')
}
</script>

<style scoped>
.sketch-week { --week-base: rgb(var(--color-background)); --week-surface: rgb(var(--neo-surface-base)); --week-paper: rgb(var(--color-surface-container)); --week-ink: rgb(var(--color-on-surface)); --week-muted: rgb(var(--neo-muted)); --week-blue: rgb(var(--color-primary)); --week-strong: rgb(var(--color-primary-strong)); min-height: 100vh; padding: 20px; color: var(--week-ink); background: var(--week-base); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.sketch-week *, .sketch-week *::before, .sketch-week *::after { box-sizing: border-box; }
.sketch-week button { font: inherit; transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease; }
.sketch-week button:active { transform: scale(.985); }
.sketch-week__sheet { display: grid; grid-template-columns: minmax(330px, .44fr) minmax(0, 1fr); gap: 20px; height: calc(100vh - 40px); padding: 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: var(--week-base); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }
.week-surface { position: relative; border: 1px solid rgb(var(--neo-border) / .14); background: var(--week-surface); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }
.week-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.week-rail-stack { display: grid; grid-template-rows: auto 142px minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }
.week-nav-card { display: grid; gap: 8px; padding: 10px 13px 11px; border-radius: 24px 20px 25px 21px; }
.week-nav-card__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; text-align: center; }
.week-nav-card__header h2 { margin: 0; font-size: 16px; font-weight: 850; }
.week-round-button { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid rgb(var(--color-primary) / .1); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--week-strong); background: rgb(var(--sky-200) / .72); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); cursor: pointer; }
.week-round-button:last-child { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.week-round-button .material-symbols-outlined { font-size: 17px; }
.week-round-button:disabled { opacity: .35; cursor: default; }
.week-scale-switch { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; padding: 3px; border: 1px solid rgb(var(--neo-border) / .18); border-radius: 14px 17px 13px 16px; background: rgb(var(--sky-100) / .55); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .6), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14); }
.week-scale-switch button { min-height: 26px; padding: 3px 4px; border: 0; border-radius: 11px 14px 10px 13px; color: var(--week-muted); background: transparent; font-size: 9px; font-weight: 800; cursor: pointer; }
.week-scale-switch button.active { color: var(--week-strong); background: rgb(var(--color-surface-container) / .92); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.week-ratings { min-height: 0; padding: 7px 16px 2px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.week-ratings__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.week-ratings h2 { margin: 0; padding: 0 2px; color: var(--week-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.week-ratings__legend { display: flex; gap: 9px; color: var(--week-muted); font-size: 7px; font-weight: 800; opacity: 0; transform: translateY(-2px); transition: opacity .18s ease, transform .18s ease; }
.week-ratings__legend span { display: flex; align-items: center; gap: 4px; }
.week-ratings__legend i { width: 12px; border-top: 2px solid rgb(var(--sky-600)); }
.week-ratings__legend .effort i { border-color: rgb(var(--rose-400)); }
.week-ratings__chart-wrap { position: relative; z-index: 1; }
.week-ratings__chart { position: relative; z-index: 1; width: 100%; height: 118px; overflow: visible; }
.week-ratings__label { fill: var(--week-muted); font-family: 'Nunito', sans-serif; font-size: 10px; font-weight: 750; transition: opacity .18s ease; }
.week-ratings__effort-echo, .week-ratings__state-echo { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
.week-ratings__effort-echo { stroke: rgb(var(--rose-200) / .52); }
.week-ratings__state-echo { stroke: rgb(var(--sky-300) / .42); }
.week-ratings__line { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.week-ratings__line--effort { stroke: rgb(var(--rose-400)); }
.week-ratings__line--state { stroke: var(--week-blue); }
.week-ratings__bubble { filter: drop-shadow(1px 2px 2.5px rgb(var(--neo-shadow-dark) / .28)); }
.week-ratings__bubble--effort { fill: rgb(var(--rose-400)); }
.week-ratings__bubble--state { fill: rgb(var(--sky-600)); }
.week-ratings__value { fill: rgb(var(--sky-50)); font-family: 'Nunito', sans-serif; font-size: 7px; font-weight: 850; }
.week-ratings__areas { position: absolute; right: 10px; bottom: 4px; left: 10px; z-index: 2; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); place-items: center; opacity: 0; pointer-events: none; transform: translateY(3px); transition: opacity .18s ease, transform .18s ease; }
.week-ratings__areas span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--week-strong); background: rgb(var(--sky-200) / .78); box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .28), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .08); }
.week-ratings__areas .material-symbols-outlined { font-size: 16px; font-variation-settings: 'FILL' 1, 'wght' 450, 'GRAD' 60, 'opsz' 20; }
.week-ratings:hover .week-ratings__legend, .week-ratings:focus-within .week-ratings__legend { opacity: 1; transform: none; }
.week-ratings:hover .week-ratings__areas, .week-ratings:focus-within .week-ratings__areas { opacity: 1; transform: none; }
.week-ratings:hover .week-ratings__label, .week-ratings:focus-within .week-ratings__label { opacity: 0; }
.week-rail { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 7px; min-height: 0; padding: 10px 16px 11px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.week-ritual { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 31px; border: 1px solid rgb(var(--color-primary) / .12); border-radius: 18px 15px 20px 16px; color: var(--week-strong); background: rgb(var(--sky-200) / .58); font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .45), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.week-ritual.done { opacity: .78; }
.week-ritual .material-symbols-outlined { font-size: 16px; }
.week-rail__heading { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 3px 2px 0; }
.week-rail__heading span { overflow: hidden; color: var(--week-strong); font-size: 8.5px; font-weight: 900; letter-spacing: .12em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
.week-rail__heading small { color: var(--week-muted); font-size: 8px; }
.week-day-list { position: relative; z-index: 1; display: grid; align-content: start; min-height: 0; overflow: auto; scrollbar-width: thin; }
.week-day-row { position: relative; display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 9px; min-height: 39px; padding: 3px 9px; border: 0; border-bottom: 1px solid rgb(var(--neo-border) / .12); color: var(--week-ink); background: transparent; text-align: left; cursor: pointer; }
.week-day-row:hover, .week-day-row.active { border-radius: 16px 13px 17px 14px; background: rgb(var(--color-primary-soft) / .45); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .11); }
.week-day-row.future { opacity: .62; }
.week-day-row.today::before { position: absolute; left: 0; width: 3px; height: 26px; border-radius: 999px; background: var(--week-blue); content: ''; }
.week-day-row__date { display: flex; align-items: baseline; gap: 5px; }
.week-day-row__date small { color: var(--week-strong); font-size: 9px; font-weight: 900; }
.week-day-row__date strong { font-size: 13px; }
.week-day-row__context { display: flex; align-items: center; justify-self: end; gap: 6px; min-width: 0; padding: 4px 8px; border-radius: 999px; color: var(--week-muted); background: rgb(var(--sky-100) / .46); font-size: 8px; font-weight: 750; }
.week-day-row__context i { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--neo-muted) / .42); }
.week-day-row__context.met { color: var(--week-strong); background: rgb(var(--sky-200) / .68); }
.week-day-row__context.met i { background: rgb(var(--sky-700)); }
.week-day-row__context.missed { color: rgb(var(--rose-700)); background: rgb(var(--rose-100) / .7); }
.week-day-row__context.missed i { background: rgb(var(--rose-400)); }
.week-day-row__context.pending { border: 1px dashed rgb(var(--sky-300) / .65); background: transparent; }
.week-day-row em { position: absolute; top: 3px; right: 9px; color: var(--week-blue); font-size: 6px; font-style: normal; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.week-main { display: grid; grid-template-rows: repeat(3, minmax(0, calc((100vh - 116px) / 4))) auto; gap: 16px; min-width: 0; min-height: 0; }
.week-main--detail { grid-template-rows: 52px minmax(0, 1fr) 58px; gap: 15px; }
.week-board__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: hidden; border-radius: 24px 29px 25px 27px; }
.week-board__row:nth-child(2) { border-radius: 28px 22px 29px 24px; }.week-board__row:nth-child(3) { border-radius: 23px 28px 22px 30px; }
.week-board__cell { position: relative; z-index: 1; display: grid; grid-template-rows: minmax(0, 1fr) auto; place-items: center; gap: 5px; min-width: 0; padding: 9px 13px; border: 0; border-right: 1px solid rgb(var(--neo-border) / .18); color: rgb(var(--sky-600)); background: transparent; cursor: pointer; }
.week-board__cell:last-child { border-right: 0; }.week-board__cell:hover, .week-board__cell.active { color: var(--week-strong); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
.week-board__visual { position: relative; display: grid; place-items: center; width: min(62%, 155px); aspect-ratio: 1.48; max-height: 98px; border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%; color: var(--week-strong); background: rgb(var(--sky-200) / .72); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .32), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .08); transform: rotate(.35deg); }
.week-board__cell:nth-child(2) .week-board__visual { border-radius: 17% 22% 16% 20% / 24% 18% 22% 16%; transform: rotate(-.4deg); }.week-board__cell:nth-child(3) .week-board__visual { transform: rotate(.2deg); }
.week-board__visual > .material-symbols-outlined, .week-board__cell--focus .week-board__visual > .material-symbols-outlined { font-size: 52px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 80, 'opsz' 48; }
.week-board__metric { position: absolute; top: -7px; right: -10px; display: grid; place-items: center; min-width: 28px; height: 27px; padding: 0 5px; border: 1px solid rgb(var(--sky-300) / .8); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: rgb(var(--sky-800)); background: rgb(var(--sky-50) / .97); font-size: 8px; font-weight: 900; box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .7), 2px 2px 5px rgb(var(--neo-shadow-dark) / .2); }
.week-board__status { position: absolute; right: 8px; bottom: 7px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; background: rgb(var(--sky-100)); }.week-board__status i { width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--sky-500)); }.week-board__status.status-missed i { background: rgb(var(--rose-400)); }.week-board__status.status-no-data { border: 1px dashed rgb(var(--sky-400)); background: transparent; }.week-board__status.status-no-data i { display: none; }
.week-board__copy { display: grid; justify-items: center; min-width: 0; max-width: 100%; text-align: center; }.week-board__copy strong { overflow: hidden; max-width: 100%; color: var(--week-strong); font-size: 13.25px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }
.week-board-hint { display: flex; align-items: center; justify-self: end; gap: 5px; margin: 0 5px 0 0; color: var(--week-muted); font-size: 8px; }.week-board-hint .material-symbols-outlined { color: var(--week-blue); font-size: 13px; }
.week-tabs { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)) 42px; gap: 4px; min-height: 52px; padding: 6px; overflow: hidden; border-radius: 22px 28px 24px 20px; }
.week-tabs button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; border: 1px solid transparent; border-radius: 15px 19px 14px 18px; color: rgb(var(--sky-600) / .72); background: transparent; cursor: pointer; }
.week-tabs .sketch-tabs__icon-field { display: grid; flex: 0 0 auto; place-items: center; width: 32px; height: 32px; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--week-strong); background: rgb(var(--sky-200) / .74); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .3), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08); }
.week-tabs button:nth-child(2) .sketch-tabs__icon-field { border-radius: 46% 54% 52% 48% / 54% 46% 51% 49%; transform: rotate(-1deg); }.week-tabs button:nth-child(3) .sketch-tabs__icon-field { border-radius: 54% 46% 49% 51% / 46% 54% 52% 48%; transform: rotate(1deg); }
.week-tabs button.active { border-color: rgb(var(--color-primary) / .18); color: var(--week-ink); background: rgb(var(--color-primary-soft) / .58); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .7), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .17); }.week-tabs strong { overflow: hidden; font-size: 12px; font-weight: 800; letter-spacing: .012em; text-overflow: ellipsis; white-space: nowrap; }.week-tabs .material-symbols-outlined { font-size: 20px; }.week-tabs__close { color: var(--week-strong) !important; }
.week-details { min-height: 0; padding: 14px 15px 15px; overflow: auto; scrollbar-width: thin; border-radius: 27px 23px 28px 24px; }.week-details__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 10px; }.week-details__header > span { color: var(--week-strong); font-size: 9px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.week-density { display: flex; align-items: center; gap: 4px; }.week-density small { margin-right: 5px; color: var(--week-muted); font-size: 7.5px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }.week-density button { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 10px 12px 9px 11px; color: var(--week-muted); background: rgb(var(--sky-200) / .38); font-size: 9px; font-weight: 800; cursor: pointer; }.week-density button.active { color: var(--week-strong); background: rgb(var(--sky-200) / .8); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .56), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17); }
.week-detail-grid { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; min-width: 0; }
.week-detail-card { min-width: 0; min-height: 110px; padding: 11px 12px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 18px 22px 17px 21px; color: var(--week-ink); background: var(--week-paper); text-align: left; cursor: pointer; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .62), 4px 4px 9px rgb(var(--neo-shadow-dark) / .16); }
.week-detail-card:nth-child(even) { border-radius: 22px 17px 21px 18px; transform: rotate(-.035deg); }.week-detail-card.active { border-color: rgb(var(--color-primary) / .3); background: rgb(var(--color-primary-soft) / .42); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .66), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
.week-detail-card > header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }.week-detail-card > header > span { display: flex; align-items: center; min-width: 0; gap: 7px; }.week-detail-card > header .material-symbols-outlined { flex: 0 0 auto; color: var(--week-strong); font-size: 19px; }.week-detail-card > header strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.week-detail-card .sketch-detail-card__summary { flex: 0 0 auto; color: rgb(var(--sky-600)); font-size: 8px; font-style: normal; font-weight: 750; opacity: 0; pointer-events: none; transform: translateY(-2px); transition: opacity .18s ease, transform .18s ease; }.week-detail-card:hover .sketch-detail-card__summary, .week-detail-card:focus-visible .sketch-detail-card__summary { opacity: 1; transform: none; }.week-detail-card:focus-visible { outline: 2px solid rgb(var(--color-primary) / .52); outline-offset: 3px; }
.detail-week-chart { display: flex; min-width: 0; flex-direction: column; justify-content: flex-end; }.week-detail-dots { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; align-items: center; min-height: 49px; padding: 9px 6px 2px; }.week-detail-dots i { position: relative; display: grid; width: 100%; max-width: 54px; aspect-ratio: 1; place-items: center; justify-self: center; border-radius: 47% 53% 45% 55% / 55% 44% 56% 45%; background: rgb(var(--neo-border) / .22); }.week-detail-dots i:nth-child(even) { border-radius: 53% 47% 52% 48% / 46% 54% 49% 51%; }.week-detail-dots i.done { background: rgb(var(--sky-200) / .78); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .34), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08); }.week-detail-dots i.done::after { width: 70%; aspect-ratio: 1; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-700)); content: ''; transform: rotate(-2deg); }.week-detail-dots i.missed { background: rgb(var(--rose-200)); }.week-detail-dots i.pending { border: 1px dashed rgb(var(--sky-400) / .7); background: transparent; }.week-detail-dots i.off { background: rgb(var(--neo-border) / .22); }
.week-detail-bars { display: flex; align-items: end; gap: 10px; height: 56px; padding: 8px 6px 2px; }.week-detail-bars i { flex: 1; min-width: 4px; border-radius: 40% 51% 43% 55% / 13% 16% 8% 10%; background: rgb(var(--sky-200)); }.week-detail-bars i:nth-child(even) { background: rgb(var(--sky-300)); transform: rotate(-1deg); }.week-detail-bars i.future { height: 2px !important; flex-basis: auto; align-self: end; border: 1px dashed rgb(var(--sky-400)); border-radius: 999px; background: transparent; }
.week-detail-line { width: 100%; height: 59px; margin-top: 2px; overflow: visible; fill: none; stroke: var(--week-blue); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }.week-pencil-echo { stroke: rgb(var(--sky-200) / .55); stroke-width: 7; }.week-detail-line circle { fill: var(--week-blue); stroke: none; }.week-target-line { stroke: rgb(var(--color-primary) / .38); stroke-width: 1; stroke-dasharray: 7 7; }.detail-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 0 4px; color: rgb(var(--neo-muted) / .72); font-size: 7px; font-weight: 700; letter-spacing: .02em; line-height: 1; text-align: center; }
.week-shortcuts { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)) 48px; overflow: hidden; border-radius: 24px 28px 22px 27px; }.week-shortcuts button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; border: 0; border-right: 1px solid rgb(var(--neo-border) / .18); color: rgb(var(--sky-600)); background: transparent; font-size: 8.5px; cursor: pointer; }.week-shortcuts button > span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; color: var(--week-strong); background: rgb(var(--sky-200) / .72); }.week-shortcuts button.active, .week-shortcuts button:hover { background: rgb(var(--color-primary-soft) / .48); }.week-shortcuts .material-symbols-outlined { font-size: 16px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .sketch-week button,
  .week-ratings__legend,
  .week-ratings__areas,
  .week-ratings__label,
  .week-detail-card .sketch-detail-card__summary { transition: none; }
}
</style>
