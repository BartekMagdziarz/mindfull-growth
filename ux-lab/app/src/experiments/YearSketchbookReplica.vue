<template>
  <div class="product-replica sketch-year">
    <div class="sketch-year__sheet">
      <aside class="year-rail-stack">
        <section class="year-nav-card year-surface" aria-label="Nawigacja roku">
          <header class="year-nav-card__header">
            <button type="button" class="year-round-button" aria-label="Poprzedni rok" disabled><AppIcon name="chevron_left" /></button>
            <h2>{{ yearRef }}</h2>
            <button type="button" class="year-round-button" aria-label="Następny rok" disabled><AppIcon name="chevron_right" /></button>
          </header>
          <div class="year-scale-switch" role="group" aria-label="Skala widoku">
            <button v-for="option in scaleOptions" :key="option.key" type="button" :class="{ active: option.key === 'year' }" @click="emit('scale', option.key)">{{ option.label }}</button>
          </div>
        </section>

        <section class="year-rail year-surface" aria-label="Miesiące roku">
          <div class="year-ritual"><AppIcon name="calendar_view_month" /><span>12 miesięcy · jedna oś</span></div>
          <header class="year-rail__heading">
            <span>{{ monthContextTitle }}</span>
            <small v-if="activeContext">kontekst z wybranego obszaru</small>
          </header>
          <div class="year-month-list">
            <button
              v-for="month in monthCards"
              :key="month.monthRef"
              type="button"
              class="year-month-row"
              :class="{ active: selectedMonthRef === month.monthRef, current: month.state === 'current', future: month.state === 'future' }"
              :aria-pressed="selectedMonthRef === month.monthRef"
              @click="selectedMonthRef = month.monthRef"
            >
              <span class="year-month-row__copy"><strong>{{ month.label }}</strong><em v-if="month.state === 'current'">teraz</em></span>
              <span v-if="activeContext" class="year-month-row__context" :class="monthContext(month).tone"><i />{{ monthContext(month).label }}</span>
            </button>
          </div>
        </section>
      </aside>

      <main class="year-main" :class="{ 'year-main--detail': activeCategory !== null }">
        <template v-if="activeCategory === null">
          <section v-for="row in boardRows" :key="row" class="year-board__row year-surface" :aria-label="rowLabel(row)">
            <button
              v-for="tile in boardTiles.filter(item => item.row === row)"
              :key="tile.key"
              type="button"
              class="year-board__cell"
              :class="{ active: tile.active, 'year-board__cell--priority': tile.kind === 'priority' }"
              :aria-pressed="tile.active"
              @click="tile.onClick"
            >
              <span class="year-board__visual">
                <AppIcon :name="tile.icon" />
                <span v-if="tile.metric" class="year-board__metric">{{ tile.metric }}</span>
                <span v-if="tile.tone" class="year-board__tone" :class="`tone-${tile.tone}`" />
              </span>
              <span class="year-board__copy"><strong>{{ tile.label }}</strong></span>
            </button>
          </section>
          <p class="year-board-caption"><strong>{{ selectedMonthLabel }}</strong><span>{{ selectedMonthCaption }}</span></p>
        </template>

        <template v-else>
          <nav class="year-tabs year-surface" aria-label="Obszary roku">
            <button v-for="category in categoryList" :key="category.key" type="button" :class="{ active: activeCategory === category.key }" :aria-pressed="activeCategory === category.key" @click="openCategory(category.key)"><span><AppIcon :name="category.icon" /></span><strong>{{ category.label }}</strong></button>
            <button type="button" class="year-tabs__close" aria-label="Zamknij szczegóły" @click="clearContext"><AppIcon name="close_fullscreen" /></button>
          </nav>

          <section class="year-details year-surface">
            <header class="year-details__header">
              <span>{{ activeCategoryMeta.label }} · miesiące roku</span>
              <div class="year-density" role="group" aria-label="Liczba kart w rzędzie"><small>Naraz</small><button v-for="option in [1, 2, 3] as const" :key="option" type="button" :class="{ active: density === option }" @click="density = option">{{ option }}</button></div>
            </header>
            <div class="year-detail-grid" :style="{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }">
              <button v-for="card in objectCards" :key="card.key" type="button" class="year-detail-card" :class="[{ active: selectedObject === card.key }, `year-detail-card--${card.kind}`]" :aria-pressed="selectedObject === card.key" @click="selectedObject = selectedObject === card.key ? null : card.key">
                <header><span><AppIcon :name="card.icon" /><strong>{{ card.title }}</strong></span><em>{{ card.summary }}</em></header>
                <div v-if="card.kind === 'dots'" class="year-detail-dots" aria-hidden="true"><i v-for="(cell, index) in card.cells" :key="index" :class="cell" /></div>
                <div v-else-if="card.kind === 'bars'" class="year-detail-bars" aria-hidden="true"><i v-for="(height, index) in card.bars" :key="index" :class="{ selected: monthRefs[index] === selectedMonthRef, future: monthRefs[index] > currentMonthRef }" :style="{ height: `${height}%` }" /></div>
                <svg v-else class="year-detail-line" viewBox="0 0 500 92" preserveAspectRatio="none" role="img" :aria-label="`Przebieg roku: ${card.title}`"><line v-if="card.targetY !== null" x1="5" :y1="card.targetY" x2="495" :y2="card.targetY" class="year-target-line" /><path class="year-pencil-echo" :d="smoothPath(card.line, 3)" /><path :d="smoothPath(card.line)" /><circle v-if="card.line.length" :cx="card.line.at(-1)!.x" :cy="card.line.at(-1)!.y" r="4" /></svg>
                <footer><span v-for="label in monthShortLabels" :key="label">{{ label }}</span></footer>
              </button>
            </div>
          </section>

          <section class="year-shortcuts year-surface" aria-label="Pozostałe obszary roku">
            <button v-for="category in categoryList" :key="category.key" type="button" :class="{ active: activeCategory === category.key }" @click="openCategory(category.key)"><span><AppIcon :name="category.icon" /></span>{{ category.label }}</button>
            <button type="button" :class="{ active: activeContext === 'journal' }" @click="openContext('journal')"><span><AppIcon name="history_edu" /></span>Dziennik</button><button type="button" :class="{ active: activeContext === 'emotions' }" @click="openContext('emotions')"><span><AppIcon name="cognition" /></span>Emocje</button>
            <button type="button" aria-label="Wróć do przeglądu" @click="clearContext"><span><AppIcon name="arrow_left_alt" /></span></button>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabChartPoint, LabFixtureObject, LabMonthSnapshot } from '@product/dev/richVerificationScenario'
import type { MonthRef, YearRef } from '@product/domain/period'
import { getChildPeriods } from '@product/utils/periods'
import { useLabStore } from '~lab/stores/lab.store'

type ViewScale = 'day' | 'week' | 'month' | 'year'
type CategoryKey = 'goals' | 'habits' | 'trackers'
type ContextKey = CategoryKey | 'reflections' | 'journal' | 'emotions' | string
type BoardRow = 'priorities' | 'execution' | 'context'
type Point = { x: number; y: number }

const props = defineProps<{ presetId: string }>()
const emit = defineEmits<{ scale: [value: ViewScale] }>()
const labStore = useLabStore()
const preset = computed(() => labStore.fixture.presets['calendar-year'].find(item => item.id === props.presetId) ?? labStore.fixture.presets['calendar-year'][0])
const yearRef = computed(() => preset.value.periodRef as YearRef)
const currentMonthRef = computed(() => labStore.fixture.refs.currentMonth)
const monthRefs = computed(() => getChildPeriods(yearRef.value) as MonthRef[])
const monthShortLabels = computed(() => monthRefs.value.map(monthRef => new Intl.DateTimeFormat('pl-PL', { month: 'narrow' }).format(new Date(`${monthRef}-01T12:00:00`))))
const monthByRef = computed(() => new Map(labStore.fixture.months.map(month => [month.monthRef, month])))
const selectedMonthRef = ref<MonthRef>(labStore.fixture.refs.currentMonth)
const selectedMonth = computed(() => monthByRef.value.get(selectedMonthRef.value))
const selectedMonthLabel = computed(() => new Intl.DateTimeFormat('pl-PL', { month: 'long' }).format(new Date(`${selectedMonthRef.value}-01T12:00:00`)).replace(/^./, letter => letter.toUpperCase()))
const selectedMonthGenitive = computed(() => new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long' }).format(new Date(`${selectedMonthRef.value}-01T12:00:00`)).replace(/^\d+\s*/, ''))
const selectedMonthCaption = computed(() => selectedMonth.value ? `${selectedMonth.value.completion}% wykonania · ${selectedMonth.value.reflectionComplete ? 'refleksja zamknięta' : 'miesiąc w toku'}` : 'Jeszcze bez danych — szczegóły pozostają spokojnie puste.')
const closedMonthCount = computed(() => labStore.fixture.months.filter(month => month.monthRef.startsWith(String(yearRef.value)) && month.reflectionComplete).length)
const activeCategory = ref<CategoryKey | null>(null)
const activeContext = ref<ContextKey | null>(null)
const selectedObject = ref<string | null>(null)
const density = ref<1 | 2 | 3>(2)
const selectedPriority = ref<string | null>(null)
const boardRows: BoardRow[] = ['priorities', 'execution', 'context']
const scaleOptions: Array<{ key: ViewScale; label: string }> = [{ key: 'day', label: 'Dzień' }, { key: 'week', label: 'Tydzień' }, { key: 'month', label: 'Miesiąc' }, { key: 'year', label: 'Rok' }]
const categoryList: Array<{ key: CategoryKey; label: string; icon: string; families: LabFixtureObject['family'][] }> = [
  { key: 'goals', label: 'Cele', icon: 'mountain_flag', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', icon: 'change_circle', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', icon: 'show_chart', families: ['tracker'] },
]
const familyIcon: Record<LabFixtureObject['family'], string> = { goal: 'outlined_flag', keyResult: 'flag', habit: 'routine', tracker: 'monitoring', intention: 'gps_fixed' }
const priorityIcon: Record<string, string> = { movement: 'directions_run', stream: 'rocket_launch', relationships: 'favorite', learning: 'school' }
const objects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired' && item.family !== 'intention'))
const priorities = computed(() => labStore.fixture.priorities.slice(0, 3))
const activeCategoryMeta = computed(() => categoryList.find(item => item.key === activeCategory.value) ?? categoryList[0])
const objectsFor = (category: CategoryKey) => { const families = categoryList.find(item => item.key === category)!.families; return objects.value.filter(item => families.includes(item.family)) }
const monthContextTitle = computed(() => {
  if (!activeContext.value) return 'Miesiące'
  const category = categoryList.find(item => item.key === activeContext.value)
  const priority = priorities.value.find(item => item.key === activeContext.value)
  const label = category?.label ?? priority?.title ?? ({ reflections: 'Refleksje', journal: 'Dziennik', emotions: 'Emocje' } as Record<string, string>)[activeContext.value] ?? 'Miesiące'
  return `${label} · sygnały w miesiącach`
})

const monthCards = computed(() => monthRefs.value.map(monthRef => {
  const snapshot = monthByRef.value.get(monthRef)
  const state = monthRef < currentMonthRef.value ? 'past' : monthRef === currentMonthRef.value ? 'current' : 'future'
  return { monthRef, label: new Intl.DateTimeFormat('pl-PL', { month: 'long' }).format(new Date(`${monthRef}-01T12:00:00`)).replace(/^./, letter => letter.toUpperCase()), score: snapshot?.completion ?? null, effort: snapshot?.priorityEffort ?? [], reflectionDone: snapshot?.reflectionComplete ?? false, reflectionPartial: snapshot?.reflectionPartial ?? false, state }
}))

function pointsForMonth(item: LabFixtureObject, monthRef: MonthRef) {
  const snapshot = monthByRef.value.get(monthRef)
  if (!snapshot) return []
  if (item.cadence === 'monthly') return item.chart.filter(point => point.periodRef === monthRef)
  const refs = new Set<string>(snapshot.weeks.map(week => week.weekRef))
  return item.chart.filter(point => refs.has(point.periodRef))
}
function aggregateMonth(item: LabFixtureObject, monthRef: MonthRef) {
  const points = pointsForMonth(item, monthRef).filter(point => point.status !== 'no-data')
  if (!points.length) return { status: 'no-data' as LabChartPoint['status'], value: undefined as number | undefined, target: undefined as number | undefined }
  const valueList = points.map(point => point.value).filter((value): value is number => value !== undefined)
  const value = valueList.length ? (item.entryMode === 'completion' || item.entryMode === 'counter' ? valueList.reduce((sum, current) => sum + current, 0) : valueList.reduce((sum, current) => sum + current, 0) / valueList.length) : undefined
  const target = points.find(point => point.target !== undefined)?.target
  const met = points.filter(point => point.status === 'met').length
  const missed = points.filter(point => point.status === 'missed').length
  const status: LabChartPoint['status'] = target === undefined ? 'no-target' : met >= missed ? 'met' : 'missed'
  return { status, value, target }
}
function annualRatio(category: CategoryKey) {
  const throughMonth = selectedMonthRef.value < currentMonthRef.value ? selectedMonthRef.value : currentMonthRef.value
  const statuses = objectsFor(category).flatMap(item => monthRefs.value.filter(monthRef => monthRef <= throughMonth).map(monthRef => aggregateMonth(item, monthRef).status)).filter(status => status === 'met' || status === 'missed')
  if (!statuses.length) return '—'
  return `${Math.round((statuses.filter(status => status === 'met').length / statuses.length) * 100)}%`
}
const uniqueDays = computed(() => {
  const days = labStore.fixture.months.flatMap(month => month.weeks.flatMap(week => week.days)).filter(day => day.dayRef.startsWith(String(yearRef.value)) && day.dayRef <= labStore.fixture.refs.today)
  return [...new Map(days.map(day => [day.dayRef, day])).values()]
})
const journalCount = computed(() => uniqueDays.value.reduce((sum, day) => sum + day.journalCount, 0))
const emotionCount = computed(() => uniqueDays.value.reduce((sum, day) => sum + day.emotionCount, 0))

interface BoardTile { key: string; row: BoardRow; kind: 'priority' | 'category' | 'context'; icon: string; label: string; hint: string; metric?: string; tone?: string; active: boolean; onClick: () => void }
const boardTiles = computed<BoardTile[]>(() => [
  ...priorities.value.map((priority, index) => ({ key: priority.key, row: 'priorities' as const, kind: 'priority' as const, icon: priorityIcon[priority.key] ?? 'north_star', label: priority.title, hint: `${selectedMonthLabel.value.toLowerCase()} · wysiłek`, metric: selectedMonth.value ? `${selectedMonth.value.priorityEffort[index] ?? '—'}/5` : '—', tone: priority.tone, active: activeContext.value === priority.key, onClick: () => openPriority(priority.key) })),
  { key: 'goals', row: 'execution', kind: 'category', icon: 'mountain_flag', label: 'Cele', hint: `sygnały na celu · do ${selectedMonthGenitive.value}`, metric: annualRatio('goals'), active: activeContext.value === 'goals', onClick: () => openCategory('goals') },
  { key: 'habits', row: 'execution', kind: 'category', icon: 'change_circle', label: 'Nawyki', hint: `sygnały na celu · do ${selectedMonthGenitive.value}`, metric: annualRatio('habits'), active: activeContext.value === 'habits', onClick: () => openCategory('habits') },
  { key: 'trackers', row: 'execution', kind: 'category', icon: 'show_chart', label: 'Trackery', hint: 'trendy i punkty zwrotne', metric: `${objectsFor('trackers').length}`, active: activeContext.value === 'trackers', onClick: () => openCategory('trackers') },
  { key: 'reflections', row: 'context', kind: 'context', icon: 'anchor', label: 'Refleksje', hint: 'zamknięte miesiące', metric: `${closedMonthCount.value}`, active: activeContext.value === 'reflections', onClick: () => openContext('reflections') },
  { key: 'journal', row: 'context', kind: 'context', icon: 'history_edu', label: 'Dziennik', hint: 'wpisy w roku', metric: `${journalCount.value}`, active: activeContext.value === 'journal', onClick: () => openContext('journal') },
  { key: 'emotions', row: 'context', kind: 'context', icon: 'cognition', label: 'Emocje', hint: 'zapisane sygnały', metric: `${emotionCount.value}`, active: activeContext.value === 'emotions', onClick: () => openContext('emotions') },
])

const objectCards = computed(() => activeCategory.value === null ? [] : objectsFor(activeCategory.value).map(item => {
  const aggregates = monthRefs.value.map(monthRef => aggregateMonth(item, monthRef))
  const kind = item.entryMode === 'completion' || item.entryMode === 'multi-completion' ? 'dots' : item.entryMode === 'value' || item.entryMode === 'rating' ? 'line' : 'bars'
  const cells = aggregates.map((aggregate, index) => monthRefs.value[index] > currentMonthRef.value ? 'future' : aggregate.status)
  const values = aggregates.map(aggregate => aggregate.value)
  const target = aggregates.find(aggregate => aggregate.target !== undefined)?.target
  const max = Math.max(1, target ?? 0, ...values.map(value => value ?? 0))
  const bars = values.map(value => value === undefined ? 4 : Math.max(8, Math.min(94, (value / max) * 88)))
  const line = values.map((value, index) => ({ value, index })).filter((entry): entry is { value: number; index: number } => entry.value !== undefined && monthRefs.value[entry.index] <= currentMonthRef.value).map(entry => ({ x: 10 + entry.index * (480 / 11), y: 76 - (entry.value / max) * 58 }))
  const targetY = target === undefined ? null : 76 - (target / max) * 58
  const assessed = aggregates.filter(aggregate => aggregate.status === 'met' || aggregate.status === 'missed')
  const met = assessed.filter(aggregate => aggregate.status === 'met').length
  return { key: item.key, icon: familyIcon[item.family], title: item.title, summary: assessed.length ? `${met}/${assessed.length} mies. na celu` : 'jeszcze bez danych', kind, cells, bars, line, targetY }
}))

function monthContext(month: { monthRef: MonthRef; state: string; effort: number[]; reflectionDone: boolean; reflectionPartial: boolean }) {
  if (month.state === 'future') return { label: 'jeszcze bez danych', tone: 'pending' }
  if (!activeContext.value) return { label: '', tone: 'quiet' }
  if (activeContext.value === 'reflections') {
    if (month.reflectionDone) return { label: 'zamknięta', tone: 'met' }
    if (month.reflectionPartial) return { label: 'w toku', tone: 'partial' }
    return { label: 'brak refleksji', tone: 'quiet' }
  }
  const days = uniqueDays.value.filter(day => day.dayRef.startsWith(month.monthRef))
  if (activeContext.value === 'journal') {
    const count = days.reduce((sum, day) => sum + day.journalCount, 0)
    return count ? { label: `${count} ${count === 1 ? 'wpis' : 'wpisów'}`, tone: 'met' } : { label: 'bez wpisu', tone: 'quiet' }
  }
  if (activeContext.value === 'emotions') {
    const count = days.reduce((sum, day) => sum + day.emotionCount, 0)
    return count ? { label: `${count} ${count === 1 ? 'sygnał' : 'sygnałów'}`, tone: 'met' } : { label: 'bez zapisu', tone: 'quiet' }
  }
  const priorityIndex = priorities.value.findIndex(priority => priority.key === activeContext.value)
  if (priorityIndex >= 0) {
    const effort = month.effort[priorityIndex]
    return effort ? { label: `${effort}/5 wysiłku`, tone: effort >= 4 ? 'met' : effort >= 2 ? 'partial' : 'quiet' } : { label: 'brak oceny', tone: 'quiet' }
  }
  const category = activeContext.value as CategoryKey
  const aggregates = objectsFor(category).map(item => aggregateMonth(item, month.monthRef))
  const assessed = aggregates.filter(aggregate => aggregate.status === 'met' || aggregate.status === 'missed')
  if (category === 'trackers') {
    const withData = aggregates.filter(aggregate => aggregate.status !== 'no-data').length
    return withData ? { label: `${withData} z danymi`, tone: 'met' } : { label: 'brak danych', tone: 'quiet' }
  }
  const met = assessed.filter(aggregate => aggregate.status === 'met').length
  const missed = assessed.filter(aggregate => aggregate.status === 'missed').length
  if (met) return { label: `${met} na celu`, tone: 'met' }
  if (missed) return { label: `${missed} do uwagi`, tone: 'missed' }
  return { label: 'brak danych', tone: 'quiet' }
}
function openCategory(category: CategoryKey) {
  if (activeCategory.value === category) return clearContext()
  activeCategory.value = category
  activeContext.value = category
  selectedPriority.value = null
  selectedObject.value = null
}
function openPriority(key: string) {
  if (activeContext.value === key) return clearContext()
  activeContext.value = key
  activeCategory.value = null
  selectedPriority.value = key
  selectedObject.value = null
}
function openContext(context: 'reflections' | 'journal' | 'emotions') {
  if (activeContext.value === context) return clearContext()
  activeContext.value = context
  activeCategory.value = null
  selectedPriority.value = null
  selectedObject.value = null
}
function clearContext() { activeCategory.value = null; activeContext.value = null; selectedPriority.value = null; selectedObject.value = null }
function rowLabel(row: BoardRow) { return row === 'priorities' ? 'Kierunki roku' : row === 'execution' ? 'Wykonanie roku' : 'Kontekst roku' }
function smoothPath(points: Point[], offset = 0) { if (!points.length) return ''; if (points.length === 1) return `M ${points[0].x} ${points[0].y + offset}`; return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${(point.y + offset).toFixed(1)}`).join(' ') }
</script>

<style scoped>
.sketch-year { --year-base: rgb(var(--color-background)); --year-surface: rgb(var(--neo-surface-base)); --year-paper: rgb(var(--color-surface-container)); --year-ink: rgb(var(--color-on-surface)); --year-muted: rgb(var(--neo-muted)); --year-blue: rgb(var(--color-primary)); --year-strong: rgb(var(--color-primary-strong)); min-height: 100vh; padding: 20px; color: var(--year-ink); background: var(--year-base); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.sketch-year *, .sketch-year *::before, .sketch-year *::after { box-sizing: border-box; }.sketch-year button { font: inherit; transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease; }.sketch-year button:active { transform: scale(.985); }
.sketch-year__sheet { display: grid; grid-template-columns: minmax(330px, .44fr) minmax(0, 1fr); gap: 20px; height: calc(100vh - 40px); padding: 14px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: var(--year-base); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }
.year-surface { position: relative; border: 1px solid rgb(var(--neo-border) / .14); background: var(--year-surface); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }.year-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.year-rail-stack { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }.year-nav-card { display: grid; gap: 8px; padding: 10px 13px 11px; border-radius: 24px 20px 25px 21px; }.year-nav-card__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; text-align: center; }.year-nav-card__header h2 { margin: 0; font-size: 18px; font-weight: 850; }
.year-round-button { display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 1px solid rgb(var(--color-primary) / .1); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--year-strong); background: rgb(var(--sky-200) / .72); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); cursor: pointer; }.year-round-button:last-child { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }.year-round-button .material-symbols-outlined { font-size: 17px; }
.year-scale-switch { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 3px; padding: 3px; border: 1px solid rgb(var(--neo-border) / .18); border-radius: 14px 17px 13px 16px; background: rgb(var(--sky-100) / .55); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .6), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14); }.year-scale-switch button { min-height: 26px; padding: 3px 4px; border: 0; border-radius: 11px 14px 10px 13px; color: var(--year-muted); background: transparent; font-size: 9px; font-weight: 800; cursor: pointer; }.year-scale-switch button.active { color: var(--year-strong); background: rgb(var(--color-surface-container) / .92); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.year-rail { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 7px; min-height: 0; padding: 12px 16px; overflow: hidden; border-radius: 25px 30px 24px 28px; }.year-ritual { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 7px; min-height: 31px; border: 1px solid rgb(var(--color-primary) / .12); border-radius: 18px 15px 20px 16px; color: var(--year-strong); background: rgb(var(--sky-200) / .58); font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .45), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }.year-ritual .material-symbols-outlined { font-size: 16px; }.year-rail__heading { position: relative; z-index: 1; display: flex; justify-content: space-between; gap: 8px; padding: 3px 2px 0; }.year-rail__heading span { overflow: hidden; color: var(--year-strong); font-size: 8.5px; font-weight: 900; letter-spacing: .12em; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }.year-rail__heading small { flex: 0 0 auto; color: var(--year-muted); font-size: 8px; }
.year-month-list { position: relative; z-index: 1; display: grid; align-content: start; min-height: 0; overflow: auto; scrollbar-width: thin; }.year-month-row { display: grid; grid-template-columns: 105px minmax(0, 1fr); align-items: center; gap: 7px; min-height: 35px; padding: 2px 9px; border: 0; border-bottom: 1px solid rgb(var(--neo-border) / .11); color: var(--year-ink); background: transparent; text-align: left; cursor: pointer; }.year-month-row:hover, .year-month-row.active { border-radius: 14px 11px 15px 12px; background: rgb(var(--color-primary-soft) / .45); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }.year-month-row.current { color: var(--year-strong); }.year-month-row.future { opacity: .55; }.year-month-row__copy { display: flex; align-items: center; gap: 5px; }.year-month-row__copy strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.year-month-row__copy em { color: var(--year-blue); font-size: 5.5px; font-style: normal; font-weight: 900; letter-spacing: .1em; text-transform: uppercase; }.year-month-row__context { display: flex; align-items: center; justify-self: end; gap: 6px; min-width: 0; padding: 4px 8px; border-radius: 999px; color: var(--year-muted); background: rgb(var(--sky-100) / .46); font-size: 8px; font-weight: 750; }.year-month-row__context i { flex: 0 0 auto; width: 7px; height: 7px; border-radius: 50%; background: rgb(var(--neo-muted) / .42); }.year-month-row__context.met { color: var(--year-strong); background: rgb(var(--sky-200) / .68); }.year-month-row__context.met i { background: rgb(var(--sky-700)); }.year-month-row__context.missed { color: rgb(var(--rose-700)); background: rgb(var(--rose-100) / .7); }.year-month-row__context.missed i { background: rgb(var(--rose-400)); }.year-month-row__context.partial { color: rgb(var(--sky-700)); background: rgb(var(--sky-100) / .72); }.year-month-row__context.partial i { background: rgb(var(--sky-400)); }.year-month-row__context.pending { border: 1px dashed rgb(var(--sky-300) / .65); background: transparent; }
.year-main { display: grid; grid-template-rows: repeat(3, minmax(0, calc((100vh - 116px) / 4))) auto; gap: 16px; min-width: 0; min-height: 0; }.year-main--detail { grid-template-rows: 52px minmax(0, 1fr) 58px; gap: 15px; }.year-board__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); overflow: hidden; border-radius: 24px 29px 25px 27px; }.year-board__row:nth-child(2) { border-radius: 28px 22px 29px 24px; }.year-board__row:nth-child(3) { border-radius: 23px 28px 22px 30px; }.year-board__cell { position: relative; z-index: 1; display: grid; grid-template-rows: minmax(0, 1fr) auto; place-items: center; gap: 5px; min-width: 0; padding: 9px 13px; border: 0; border-right: 1px solid rgb(var(--neo-border) / .18); color: rgb(var(--sky-600)); background: transparent; cursor: pointer; }.year-board__cell:last-child { border-right: 0; }.year-board__cell:hover, .year-board__cell.active { color: var(--year-strong); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }.year-board__visual { position: relative; display: grid; place-items: center; width: min(62%, 155px); aspect-ratio: 1.48; max-height: 98px; border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%; color: var(--year-strong); background: rgb(var(--sky-200) / .72); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .32), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .08); transform: rotate(.35deg); }.year-board__cell:nth-child(2) .year-board__visual { border-radius: 17% 22% 16% 20% / 24% 18% 22% 16%; transform: rotate(-.4deg); }.year-board__visual > .material-symbols-outlined, .year-board__cell--priority .year-board__visual > .material-symbols-outlined { font-size: 52px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 80, 'opsz' 48; }.year-board__metric { position: absolute; top: -7px; right: -10px; display: grid; place-items: center; min-width: 28px; height: 27px; padding: 0 5px; border: 1px solid rgb(var(--sky-300) / .8); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: rgb(var(--sky-800)); background: rgb(var(--sky-50) / .97); font-size: 8px; font-weight: 900; box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .7), 2px 2px 5px rgb(var(--neo-shadow-dark) / .2); }.year-board__tone { position: absolute; left: 9px; bottom: 7px; width: 8px; height: 8px; border-radius: 50%; background: rgb(var(--sky-500)); }.year-board__tone.tone-lavender { background: rgb(155 110 195); }.year-board__tone.tone-mint { background: rgb(var(--color-success)); }.year-board__copy { display: grid; justify-items: center; min-width: 0; max-width: 100%; text-align: center; }.year-board__copy strong { overflow: hidden; max-width: 100%; color: var(--year-strong); font-size: 13.25px; font-weight: 850; text-overflow: ellipsis; white-space: nowrap; }.year-board-caption { display: flex; align-items: center; justify-self: end; gap: 7px; margin: 0 5px 0 0; color: var(--year-muted); font-size: 8px; }.year-board-caption strong { color: var(--year-strong); }
.year-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) 42px; gap: 4px; min-height: 52px; padding: 6px; overflow: hidden; border-radius: 22px 28px 24px 20px; }.year-tabs button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 8px; min-width: 0; border: 1px solid transparent; border-radius: 15px 19px 14px 18px; color: rgb(var(--sky-600) / .72); background: transparent; cursor: pointer; }.year-tabs button > span { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--year-strong); background: rgb(var(--sky-200) / .74); }.year-tabs button.active { border-color: rgb(var(--color-primary) / .18); color: var(--year-ink); background: rgb(var(--color-primary-soft) / .58); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .7), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .17); }.year-tabs strong { font-size: 11px; }.year-tabs .material-symbols-outlined { font-size: 19px; }.year-tabs__close { color: var(--year-strong) !important; }
.year-details { min-height: 0; padding: 14px 15px; overflow: auto; scrollbar-width: thin; border-radius: 27px 23px 28px 24px; }.year-details__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }.year-details__header > span { color: var(--year-strong); font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }.year-density { display: flex; align-items: center; gap: 3px; }.year-density small { margin-right: 4px; color: var(--year-muted); font-size: 7px; text-transform: uppercase; }.year-density button { width: 27px; height: 27px; padding: 0; border: 0; border-radius: 9px 11px 8px 10px; color: var(--year-muted); background: rgb(var(--sky-200) / .4); font-size: 8px; font-weight: 900; cursor: pointer; }.year-density button.active { color: var(--year-strong); background: rgb(var(--sky-200) / .82); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14); }.year-detail-grid { position: relative; z-index: 1; display: grid; gap: 11px; }.year-detail-card { display: grid; grid-template-rows: auto minmax(58px, 1fr) auto; gap: 8px; min-width: 0; min-height: 120px; padding: 11px 12px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 19px 23px 18px 22px; color: var(--year-ink); background: var(--year-paper); text-align: left; cursor: pointer; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .56), 4px 4px 9px rgb(var(--neo-shadow-dark) / .14); }.year-detail-card.active { background: rgb(var(--color-primary-soft) / .55); box-shadow: inset 3px 3px 7px rgb(var(--neo-inset-dark) / .12); }.year-detail-card header { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }.year-detail-card header span { display: flex; align-items: center; gap: 6px; min-width: 0; }.year-detail-card header .material-symbols-outlined { color: var(--year-strong); font-size: 18px; }.year-detail-card header strong { overflow: hidden; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }.year-detail-card header em { opacity: 0; color: var(--year-muted); font-size: 7px; font-style: normal; transition: .18s ease; }.year-detail-card:hover header em, .year-detail-card:focus-visible header em, .year-detail-card.active header em { opacity: 1; }.year-detail-card footer { display: grid; grid-template-columns: repeat(12, 1fr); color: var(--year-muted); font-size: 6.5px; text-align: center; }.year-detail-dots { display: grid; grid-template-columns: repeat(12, 1fr); align-items: center; justify-items: center; }.year-detail-dots i { display: grid; place-items: center; width: 14px; height: 14px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; background: rgb(var(--sky-200) / .62); }.year-detail-dots i.met::after { width: 6px; height: 6px; border-radius: 50%; background: rgb(var(--sky-700)); content: ''; }.year-detail-dots i.missed { background: rgb(var(--rose-200) / .7); }.year-detail-dots i.missed::after { width: 5px; height: 5px; border-radius: 50%; background: rgb(var(--rose-400)); content: ''; }.year-detail-dots i.future { border: 1px dashed rgb(var(--sky-400) / .7); background: transparent; }.year-detail-dots i.no-data { background: rgb(var(--neo-border) / .25); }.year-detail-bars { display: grid; grid-template-columns: repeat(12, 1fr); align-items: end; gap: 5px; height: 62px; padding: 4px 7px; }.year-detail-bars i { min-height: 3px; border-radius: 7px 6px 2px 2px; background: rgb(var(--sky-400) / .72); }.year-detail-bars i:nth-child(even) { background: rgb(var(--sky-300) / .82); }.year-detail-bars i.selected { background: rgb(var(--sky-700)); }.year-detail-bars i.future { height: 3px !important; border: 1px dashed rgb(var(--sky-400)); background: transparent; }.year-detail-line { width: 100%; height: 64px; overflow: visible; fill: none; stroke: var(--year-blue); stroke-width: 3.2; stroke-linecap: round; stroke-linejoin: round; }.year-pencil-echo { stroke: rgb(var(--sky-200) / .75); stroke-width: 7; }.year-detail-line circle { fill: var(--year-blue); stroke: none; }.year-target-line { stroke: rgb(var(--sky-300) / .65); stroke-width: 1.4; stroke-dasharray: 5 8; }
.year-shortcuts { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)) 48px; overflow: hidden; border-radius: 24px 28px 22px 27px; }.year-shortcuts button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; border: 0; border-right: 1px solid rgb(var(--neo-border) / .18); color: rgb(var(--sky-600)); background: transparent; font-size: 8.5px; cursor: pointer; }.year-shortcuts button > span { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; color: var(--year-strong); background: rgb(var(--sky-200) / .72); }.year-shortcuts button.active, .year-shortcuts button:hover { background: rgb(var(--color-primary-soft) / .48); }.year-shortcuts .material-symbols-outlined { font-size: 16px; }
.year-board__tone.tone-mint { background: rgb(var(--rose-400)); }
.year-round-button:disabled { opacity: .35; cursor: default; }
.year-ritual { cursor: default; }
.year-rail { gap: 5px; padding: 10px 14px; }
.year-ritual { min-height: 28px; }
.year-month-row { min-height: 31px; }
@media (prefers-reduced-motion: reduce) { .sketch-year button { transition: none; } }
</style>
