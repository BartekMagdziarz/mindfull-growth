<template>
  <div class="product-replica action-board" :class="`ab--${layout}`">
    <div class="ab-sheet">
      <!-- ============ NAGŁÓWEK ============ -->
      <header class="ab-head ab-surface">
        <div class="ab-head__date">
          <span class="ab-eyebrow">Widok działania</span>
          <h2>{{ periodTitle }}</h2>
        </div>
        <div class="ab-head__pulse" role="img" :aria-label="`Wykonanie dnia: ${doneCount} z ${todayItems.length}`">
          <svg viewBox="0 0 36 36" aria-hidden="true">
            <circle cx="18" cy="18" r="14.5" class="ab-pulse-track" />
            <circle
              cx="18" cy="18" r="14.5"
              class="ab-pulse-fill"
              :stroke-dasharray="`${dayPulsePct * 0.911} 100`"
            />
          </svg>
          <strong>{{ doneCount }}/{{ todayItems.length }}</strong>
        </div>
      </header>

      <!-- ============ STREFA 1: KOMPAS (priorytety + fokus tygodnia) ============ -->
      <section class="ab-kompas ab-surface" aria-label="Priorytety miesiąca i fokus tygodnia" @mouseleave="hoverKey = null">
        <div class="ab-kompas__group ab-kompas__group--month">
          <h3>Kierunki miesiąca</h3>
          <div class="ab-kompas__tiles">
            <button
              v-for="priority in monthPriorities"
              :key="priority.key"
              type="button"
              class="ab-priority"
              :title="priority.desiredDirection"
              @mouseenter="hoverKey = `priority:${priority.key}`"
              @focus="hoverKey = `priority:${priority.key}`"
              @blur="hoverKey = null"
            >
              <i class="ab-tone" :class="`tone-${priority.tone}`" />
              <strong>{{ priority.title }}</strong>
              <span class="ab-effort" :aria-label="`Wysiłek ${priority.effort} z 5`">
                <i v-for="dot in 5" :key="dot" :class="{ filled: dot <= priority.effort }" />
              </span>
            </button>
          </div>
        </div>
        <div class="ab-kompas__group ab-kompas__group--week">
          <h3>Fokus tygodnia</h3>
          <div class="ab-kompas__tiles">
            <button
              v-for="item in weekFocusObjects"
              :key="item.key"
              type="button"
              class="ab-focus"
              :title="item.contribution || item.title"
              @mouseenter="hoverKey = `object:${item.key}`"
              @focus="hoverKey = `object:${item.key}`"
              @blur="hoverKey = null"
            >
              <span class="ab-focus__status" :class="`status-${statusFor(item)}`"><i /></span>
              <strong>{{ item.title }}</strong>
              <AppIcon :name="familyIcon[item.family]" class="ab-focus__icon" />
            </button>
          </div>
        </div>
      </section>

      <!-- ============ STREFA 2: LISTA DNIA ============ -->
      <section class="ab-day-list ab-surface" aria-label="Plan dnia">
        <section v-for="group in dayGroups" :key="group.key" class="ab-day-group">
          <h3>{{ group.label }}</h3>
          <article
            v-for="item in group.items"
            :key="item.key"
            class="ab-row"
            :class="{ lit: isLit(item), dim: isDim(item), moving: movingOccurrence?.key === item.key }"
          >
            <AppIcon :name="familyIcon[item.family]" class="ab-row__icon" />
            <div class="ab-row__body">
              <strong :title="item.contribution || item.title">{{ item.title }}</strong>
              <span class="ab-micro" aria-hidden="true">
                <i v-for="(cell, index) in microCells(item)" :key="index" :class="cell" />
                <em v-if="item.targetLabel">{{ item.targetLabel }}</em>
              </span>
            </div>
            <button
              type="button"
              class="ab-move"
              :class="{ active: movingOccurrence?.key === item.key }"
              :aria-label="`Przenieś: ${item.title}`"
              title="Przenieś na inny dzień"
              @click="startMove(item.key, todayRef)"
            >
              <AppIcon name="event_upcoming" />
            </button>
            <button
              type="button"
              class="ab-stamp"
              :class="{ 'ab-stamp--data': item.entryMode !== 'completion', done: item.entryMode === 'completion' && isDoneToday(item) }"
              :aria-label="dayControlLabel(item)"
              :aria-pressed="item.entryMode === 'completion' ? isDoneToday(item) : undefined"
              @click="activateDayItem(item)"
            >
              <span v-if="item.entryMode === 'completion' && isDoneToday(item)" class="ab-stamp__dot" aria-hidden="true" />
              <strong v-else-if="item.entryMode !== 'completion'">{{ formatNumber(todayValueFor(item)) }}</strong>
            </button>
          </article>
        </section>
        <p v-if="!todayItems.length" class="ab-empty-day">Nic na dziś</p>
      </section>

      <!-- ============ STREFA 4: SYGNAŁY ============ -->
      <section class="ab-signals ab-surface" aria-label="Sygnały progresu">
        <h3>Sygnały</h3>
        <div class="ab-signals__grid">
          <article v-for="signal in signals" :key="signal.key" class="ab-signal">
            <header>
              <AppIcon :name="signal.icon" />
              <strong>{{ signal.title }}</strong>
              <em>{{ signal.summary }}</em>
            </header>
            <div v-if="signal.kind === 'dots'" class="ab-signal__dots" aria-hidden="true">
              <i v-for="(cell, index) in signal.cells" :key="index" :class="cell" />
            </div>
            <svg v-else class="ab-signal__line" viewBox="0 0 220 64" preserveAspectRatio="none" role="img" :aria-label="`Przebieg: ${signal.title}`">
              <line v-if="signal.targetY !== null" x1="0" :y1="signal.targetY" x2="220" :y2="signal.targetY" class="ab-target-line" />
              <path v-if="signal.line.length > 1" class="ab-pencil-echo" :d="smoothPath(signal.line, 2)" />
              <path v-if="signal.line.length > 1" :d="smoothPath(signal.line)" />
              <circle v-if="signal.line.length" :cx="signal.line.at(-1)!.x" :cy="signal.line.at(-1)!.y" r="3.5" />
            </svg>
          </article>
        </div>
      </section>

      <!-- ============ STREFA 3: HORYZONT ============ -->
      <section class="ab-horizon ab-surface" :class="{ targeting: movingOccurrence !== null }" aria-label="Horyzont: najbliższe dni">
        <header class="ab-horizon__head">
          <h3>Horyzont</h3>
          <span v-if="movingOccurrence" class="ab-horizon__hint">
            <AppIcon name="event_upcoming" />
            Wybierz dzień
            <button type="button" aria-label="Anuluj przenoszenie" @click="cancelMove"><AppIcon name="close" /></button>
          </span>
          <span v-else-if="moveNote" class="ab-horizon__note">{{ moveNote }}</span>
        </header>

        <div class="ab-horizon__days">
          <div
            v-for="day in horizonDays"
            :key="day.dayRef"
            class="ab-hday"
            :class="{ today: day.isToday, boundary: day.isWeekStart, peeked: peekDayRef === day.dayRef }"
          >
            <button
              type="button"
              class="ab-hday__cell"
              :aria-label="horizonDayAria(day)"
              @click="onHorizonDayClick(day)"
            >
              <span class="ab-hday__date"><small>{{ day.shortLabel }}</small><strong>{{ day.dayNumber }}</strong></span>
              <span v-if="day.isToday" class="ab-hday__today-mark">dziś</span>
              <span v-else class="ab-hday__load" aria-hidden="true">
                <i v-for="dot in Math.min(day.count, 4)" :key="dot" />
                <em v-if="day.count > 4">+{{ day.count - 4 }}</em>
                <em v-else-if="day.count === 0" class="zero">·</em>
              </span>
            </button>
            <span class="ab-hday__chips">
              <button
                v-for="chip in day.chips"
                :key="chip.key"
                type="button"
                class="ab-chip"
                :class="`ab-chip--${chip.kind}`"
                :title="chip.title"
                :aria-label="chip.title"
              >
                <AppIcon :name="chip.icon" />
                <span>{{ chip.label }}</span>
              </button>
            </span>
          </div>
        </div>

        <div v-if="peekDay" class="ab-peek">
          <header>
            <strong>{{ peekDay.shortLabel }} {{ peekDay.dayNumber }}</strong>
            <button type="button" aria-label="Zamknij podgląd dnia" @click="peekDayRef = null"><AppIcon name="close" /></button>
          </header>
          <article v-for="item in peekItems" :key="item.key" class="ab-peek__row">
            <AppIcon :name="familyIcon[item.family]" />
            <span>{{ item.title }}</span>
            <button
              type="button"
              class="ab-move"
              :aria-label="`Przenieś: ${item.title}`"
              title="Przenieś na inny dzień"
              @click="startMove(item.key, peekDay.dayRef)"
            >
              <AppIcon name="event_upcoming" />
            </button>
          </article>
          <p v-if="!peekItems.length" class="ab-peek__empty">Nic zaplanowanego</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabChartPoint, LabFixtureObject } from '@product/dev/richVerificationScenario'
import { useLabStore } from '~lab/stores/lab.store'

type Point = { x: number; y: number }
type CategoryKey = 'goals' | 'habits' | 'trackers' | 'intentions'

const props = defineProps<{ presetId: string; variantId: string }>()
const labStore = useLabStore()

const LAYOUTS: Record<string, string> = {
  'action-cockpit-v1': 'cockpit',
  'action-rhythm-v1': 'rhythm',
  'action-context-rail-v1': 'rail',
  'action-stream-v1': 'stream',
}
const layout = computed(() => LAYOUTS[props.variantId] ?? 'cockpit')

// --- fixture pools ---------------------------------------------------------
const refs = computed(() => labStore.fixture.refs)
const todayRef = computed(() => refs.value.today)
const objects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired'))
const weeklyObjects = computed(() => objects.value.filter(item => item.cadence === 'weekly'))

const categoryList: Array<{ key: CategoryKey; label: string; families: LabFixtureObject['family'][] }> = [
  { key: 'intentions', label: 'Intencje tygodnia', families: ['intention'] },
  { key: 'goals', label: 'Cele i rezultaty', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', families: ['tracker'] },
]

const familyIcon: Record<LabFixtureObject['family'], string> = {
  goal: 'outlined_flag',
  keyResult: 'flag',
  habit: 'routine',
  tracker: 'monitoring',
  intention: 'gps_fixed',
}

// Fokus okresu: w produkcie pochodziłby z planu tygodnia / miesiąca.
const WEEK_FOCUS_KEYS = ['kr-runs', 'kr-deep-work', 'habit-stretch']
const SIGNAL_KEYS = ['kr-distance', 'habit-stretch', 'tracker-sleep']

const activeMonth = computed(() => labStore.fixture.months.find(month => month.monthRef === refs.value.currentMonth) ?? labStore.fixture.months.at(-1)!)
const currentWeek = computed(() => labStore.fixture.weeks.find(week => week.weekRef === refs.value.currentWeek) ?? labStore.fixture.weeks.at(-1)!)

const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

// --- strefa 1: kompas -------------------------------------------------------
const hoverKey = ref<string | null>(null)

const monthPriorities = computed(() => labStore.fixture.priorities.slice(0, 3).map((priority, index) => ({
  ...priority,
  effort: activeMonth.value.priorityEffort[index] ?? 3,
})))

const weekFocusObjects = computed(() => WEEK_FOCUS_KEYS
  .map(key => weeklyObjects.value.find(item => item.key === key))
  .filter((item): item is LabFixtureObject => Boolean(item)))

function isLit(item: LabFixtureObject): boolean {
  if (!hoverKey.value) return false
  if (hoverKey.value.startsWith('priority:')) return item.priorityKeys.includes(hoverKey.value.slice('priority:'.length))
  return item.key === hoverKey.value.slice('object:'.length)
}
function isDim(item: LabFixtureObject): boolean {
  return hoverKey.value !== null && !isLit(item)
}

// --- strefa 2: lista dnia ----------------------------------------------------
const baseDayItems = computed(() => weeklyObjects.value.filter(item => item.todayDone !== undefined || item.todayValue !== undefined))

interface OccurrenceMove {
  key: string
  from: string
  to: string
}
const moves = ref<OccurrenceMove[]>([])

function isPlannedOn(item: LabFixtureObject, dayRef: string): boolean {
  const movedAway = moves.value.some(move => move.key === item.key && move.from === dayRef)
  const movedHere = moves.value.some(move => move.key === item.key && move.to === dayRef)
  if (movedHere) return true
  if (movedAway) return false
  if (dayRef === todayRef.value) return baseDayItems.value.some(base => base.key === item.key)
  return syntheticPlanned(item, dayRef)
}

const todayItems = computed(() => baseDayItems.value.filter(item => isPlannedOn(item, todayRef.value)))

const dayGroups = computed(() => categoryList
  .map(category => ({
    key: category.key,
    label: category.label,
    items: todayItems.value.filter(item => category.families.includes(item.family)),
  }))
  .filter(group => group.items.length > 0))

const completionOverrides = ref(new Set<string>())
const valueOverrides = ref<Record<string, number>>({})

function isDoneToday(item: LabFixtureObject): boolean {
  const initial = Boolean(item.todayDone)
  return completionOverrides.value.has(item.key) ? !initial : initial
}
function todayValueFor(item: LabFixtureObject): number {
  return valueOverrides.value[item.key] ?? item.todayValue ?? 0
}
function activateDayItem(item: LabFixtureObject) {
  if (item.entryMode === 'completion') {
    const next = new Set(completionOverrides.value)
    next.has(item.key) ? next.delete(item.key) : next.add(item.key)
    completionOverrides.value = next
    return
  }
  const max = item.entryMode === 'rating' ? (item.family === 'tracker' ? 10 : 5) : 30
  const next = todayValueFor(item) + 1
  valueOverrides.value = { ...valueOverrides.value, [item.key]: next > max ? 0 : next }
}
function dayControlLabel(item: LabFixtureObject): string {
  if (item.entryMode === 'completion') return isDoneToday(item) ? `Cofnij: ${item.title}` : `Zapisz: ${item.title}`
  return `Zwiększ: ${item.title}. Obecnie ${formatNumber(todayValueFor(item))}`
}

const doneCount = computed(() => todayItems.value.filter(item => (item.entryMode === 'completion' ? isDoneToday(item) : todayValueFor(item) > 0)).length)
const dayPulsePct = computed(() => (todayItems.value.length ? Math.round((doneCount.value / todayItems.value.length) * 100) : 0))

// mikro-progres: tydzień obiektu jako siedem komórek (jak w karcie tygodnia planszy fokusu)
function currentWeekPoint(item: LabFixtureObject): LabChartPoint | undefined {
  return item.chart.find(point => point.periodRef === currentWeek.value.weekRef)
}
function statusFor(item: LabFixtureObject): LabChartPoint['status'] {
  return currentWeekPoint(item)?.status ?? 'no-data'
}
function microCells(item: LabFixtureObject): string[] {
  const point = currentWeekPoint(item)
  const value = Math.max(0, Math.round(point?.value ?? 0))
  const assigned = Math.min(7, Math.max(value, Math.round(point?.target ?? 0)))
  return currentWeek.value.days.map((day, index) => (day.dayRef > todayRef.value ? 'assigned' : index < value ? 'done' : index < assigned ? 'missed' : 'unassigned'))
}

// --- strefa 3: horyzont ------------------------------------------------------
const WEEKDAY_SHORT = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So']

function addDays(dayRef: string, amount: number): string {
  const date = new Date(`${dayRef}T12:00:00`)
  date.setDate(date.getDate() + amount)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
function weekdayIndex(dayRef: string): number {
  // 0 = poniedziałek … 6 = niedziela
  return (new Date(`${dayRef}T12:00:00`).getDay() + 6) % 7
}

// deterministyczne rozłożenie wystąpień na dni (w produkcie: przypisania z planu tygodnia)
function syntheticPlanned(item: LabFixtureObject, dayRef: string): boolean {
  const point = currentWeekPoint(item)
  const target = Math.min(7, Math.max(1, Math.round(point?.target ?? 3)))
  const step = Math.max(1, Math.round(7 / target))
  const seed = weeklyObjects.value.findIndex(candidate => candidate.key === item.key)
  return (weekdayIndex(dayRef) + Math.max(0, seed)) % step === 0
}

// terminy: w produkcie z Goal.targetDate — tu spreparowane, aby chipy były widoczne
const deadlines = computed<Record<string, string>>(() => ({
  'goal-mvp': addDays(todayRef.value, 4),
  'intention-budget': addDays(todayRef.value, 6),
}))

interface HorizonChip {
  key: string
  kind: 'deadline' | 'ritual'
  icon: string
  label: string
  title: string
}

interface HorizonDay {
  dayRef: string
  shortLabel: string
  dayNumber: string
  isToday: boolean
  isWeekStart: boolean
  count: number
  chips: HorizonChip[]
}

const horizonDays = computed<HorizonDay[]>(() => Array.from({ length: 7 }, (_, offset) => {
  const dayRef = addDays(todayRef.value, offset)
  const date = new Date(`${dayRef}T12:00:00`)
  const isWeekStart = weekdayIndex(dayRef) === 0 && offset > 0
  const plannedItems = weeklyObjects.value.filter(item => isPlannedOn(item, dayRef))
  const chips: HorizonChip[] = []
  for (const [objectKey, deadlineRef] of Object.entries(deadlines.value)) {
    if (deadlineRef !== dayRef) continue
    const object = objects.value.find(item => item.key === objectKey)
    if (!object) continue
    chips.push({
      key: `deadline-${objectKey}`,
      kind: 'deadline',
      icon: familyIcon[object.family],
      label: offset === 0 ? 'dziś' : `${offset} d`,
      title: `Termin: ${object.title}`,
    })
  }
  if (isWeekStart) {
    const weekNumber = getWeekNumber(dayRef)
    chips.push({ key: 'ritual-week', kind: 'ritual', icon: 'edit_calendar', label: `T${weekNumber}`, title: `Zaplanuj tydzień T${weekNumber}` })
  }
  if (dayRef.endsWith('-01')) {
    const monthLabel = new Intl.DateTimeFormat('pl-PL', { month: 'short' }).format(date).replace('.', '')
    chips.push({ key: 'ritual-month', kind: 'ritual', icon: 'date_range', label: monthLabel, title: `Zaplanuj miesiąc (${monthLabel})` })
  }
  return {
    dayRef,
    shortLabel: WEEKDAY_SHORT[date.getDay()],
    dayNumber: dayRef.slice(-2),
    isToday: offset === 0,
    isWeekStart,
    count: offset === 0 ? todayItems.value.length : plannedItems.length,
    chips,
  }
}))

function getWeekNumber(dayRef: string): number {
  const [year, month, day] = dayRef.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday)
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1)
  return Math.ceil(((date.getTime() - yearStart) / 86400000 + 1) / 7)
}

function horizonDayAria(day: HorizonDay): string {
  if (movingOccurrence.value) return `Przenieś na: ${day.shortLabel} ${day.dayNumber}`
  return `${day.shortLabel} ${day.dayNumber}: ${day.count} zaplanowanych`
}

// podgląd dnia
const peekDayRef = ref<string | null>(null)
const peekDay = computed(() => horizonDays.value.find(day => day.dayRef === peekDayRef.value) ?? null)
const peekItems = computed(() => (peekDay.value ? weeklyObjects.value.filter(item => isPlannedOn(item, peekDay.value!.dayRef)) : []))

// przenoszenie wystąpień
const movingOccurrence = ref<{ key: string; from: string } | null>(null)
const moveNote = ref('')

function startMove(key: string, from: string) {
  movingOccurrence.value = movingOccurrence.value?.key === key && movingOccurrence.value.from === from ? null : { key, from }
  moveNote.value = ''
}
function cancelMove() {
  movingOccurrence.value = null
}
function onHorizonDayClick(day: HorizonDay) {
  if (movingOccurrence.value) {
    const { key, from } = movingOccurrence.value
    if (day.dayRef !== from) {
      moves.value = [...moves.value.filter(move => !(move.key === key && move.from === from)), { key, from, to: day.dayRef }]
      const title = objects.value.find(item => item.key === key)?.title ?? ''
      moveNote.value = `${title.length > 26 ? `${title.slice(0, 25)}…` : title} → ${day.shortLabel} ${day.dayNumber}`
    }
    movingOccurrence.value = null
    return
  }
  if (day.isToday) return
  peekDayRef.value = peekDayRef.value === day.dayRef ? null : day.dayRef
}

// --- strefa 4: sygnały -------------------------------------------------------
interface SignalCard {
  key: string
  icon: string
  title: string
  summary: string
  kind: 'dots' | 'line'
  cells: string[]
  line: Point[]
  targetY: number | null
}

function statusLabelFor(point?: LabChartPoint): string {
  return point?.status === 'met' ? 'na celu' : point?.status === 'missed' ? 'do uwagi' : point?.status === 'no-target' ? 'obserwacja' : 'bez danych'
}

const signals = computed<SignalCard[]>(() => SIGNAL_KEYS
  .map(key => weeklyObjects.value.find(item => item.key === key))
  .filter((item): item is LabFixtureObject => Boolean(item))
  .map(item => {
    const point = currentWeekPoint(item)
    const summary = `${statusLabelFor(point)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`
    if (item.entryMode === 'completion' || item.entryMode === 'multi-completion') {
      return { key: item.key, icon: familyIcon[item.family], title: item.title, summary, kind: 'dots' as const, cells: microCells(item), line: [], targetY: null }
    }
    const points = item.chart.slice(-8).filter(entry => entry.value !== undefined)
    const target = point?.target
    const values = points.map(entry => entry.value!)
    const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY)
    const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY)
    const range = Math.max(1, max - min)
    const yFor = (value: number) => 10 + ((max - value) / range) * 44
    const line = points.map((entry, index) => ({
      x: points.length === 1 ? 110 : 6 + index * (208 / (points.length - 1)),
      y: Math.round(yFor(entry.value!)),
    }))
    return {
      key: item.key,
      icon: familyIcon[item.family],
      title: item.title,
      summary,
      kind: 'line' as const,
      cells: [],
      line,
      targetY: target === undefined ? null : Math.round(yFor(target)),
    }
  }))

// --- utils --------------------------------------------------------------------
function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)
}
function smoothPath(points: Point[], offset = 0): string {
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
.action-board {
  --sketch-base: rgb(var(--color-background));
  --sketch-surface: rgb(var(--neo-surface-base));
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
.action-board *, .action-board *::before, .action-board *::after { box-sizing: border-box; }
.action-board button { font: inherit; transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease, border-color .2s ease, opacity .2s ease; }
.action-board button:active { transform: scale(.985); }
.action-board h3 { margin: 0; padding: 0 2px; color: var(--sketch-blue-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.ab-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: var(--sketch-surface);
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.ab-surface::after {
  position: absolute;
  inset: 3px 2px 2px 3px;
  border: 1px solid rgb(var(--neo-border) / .07);
  border-radius: inherit;
  pointer-events: none;
  content: '';
  transform: rotate(.08deg);
}

/* ---------- układy wariantów ---------- */
.ab-sheet {
  display: grid;
  gap: 16px;
  min-height: calc(100vh - 40px);
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: var(--sketch-base);
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
}

/* 08 · Kokpit: kompas u góry, lista + sygnały, horyzont jako dolna listwa */
.ab--cockpit .ab-sheet {
  grid-template-areas: 'head head' 'kompas kompas' 'list signals' 'horizon horizon';
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

/* 09 · Rytm: horyzont nad wszystkim */
.ab--rhythm .ab-sheet {
  grid-template-areas: 'head head' 'horizon horizon' 'list kompas' 'list signals';
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
  grid-template-rows: auto auto auto minmax(0, 1fr);
}

/* 10 · Kolumna kontekstu: lista dominuje, reszta w prawej kolumnie */
.ab--rail .ab-sheet {
  grid-template-areas: 'head head' 'list kompas' 'list horizon' 'list signals';
  grid-template-columns: minmax(0, 1.8fr) minmax(300px, 1fr);
  grid-template-rows: auto auto minmax(0, 1fr) auto;
}

/* 11 · Jeden strumień: spokojna pojedyncza kolumna */
.ab--stream .ab-sheet {
  grid-template-areas: 'head' 'kompas' 'list' 'signals' 'horizon';
  grid-template-columns: minmax(0, 1fr);
  max-width: 780px;
  margin: 0 auto;
}

.ab-head { grid-area: head; }
.ab-kompas { grid-area: kompas; }
.ab-day-list { grid-area: list; }
.ab-signals { grid-area: signals; }
.ab-horizon { grid-area: horizon; }

/* ---------- nagłówek ---------- */
.ab-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 16px;
  border-radius: 24px 20px 25px 21px;
}
.ab-eyebrow { display: block; color: var(--sketch-muted); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.ab-head__date h2 { margin: 0; font-size: 15px; font-weight: 800; }
.ab-head__pulse { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; }
.ab-head__pulse svg { width: 34px; height: 34px; transform: rotate(-90deg); }
.ab-head__pulse strong { font-size: 11px; font-weight: 800; }
.ab-pulse-track { fill: none; stroke: rgb(var(--neo-border) / .22); stroke-width: 4.5; }
.ab-pulse-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4.5; stroke-linecap: round; }

/* ---------- kompas ---------- */
.ab-kompas { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 18px; padding: 10px 16px 12px; border-radius: 25px 30px 24px 28px; }
.ab--rhythm .ab-kompas, .ab--rail .ab-kompas { grid-template-columns: 1fr; }
.ab-kompas__group { position: relative; z-index: 1; display: grid; gap: 6px; align-content: start; }
.ab-kompas__tiles { display: grid; gap: 5px; }
.ab--stream .ab-kompas { grid-template-columns: 1fr 1fr; padding-bottom: 10px; }

.ab-priority,
.ab-focus {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 30px;
  padding: 3px 9px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 13px 16px 12px 15px;
  color: inherit;
  background: rgb(var(--color-surface-container) / .55);
  cursor: pointer;
  text-align: left;
}
.ab-priority:hover, .ab-focus:hover { background: rgb(var(--sky-100) / .75); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .6), 3px 3px 7px rgb(var(--neo-shadow-dark) / .16); }
.ab-priority strong, .ab-focus strong { overflow: hidden; font-size: 10.5px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }

.ab-tone { width: 11px; height: 11px; border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.tone-blue { background: rgb(var(--sky-500)); }
.tone-mint { background: rgb(var(--mint-500, 110 200 165)); }
.tone-lavender { background: rgb(var(--lavender-500, 160 145 220)); }
.tone-amber { background: rgb(var(--amber-500, 235 180 90)); }

.ab-effort { display: inline-flex; gap: 2.5px; }
.ab-effort i { width: 5px; height: 5px; border-radius: 50%; background: rgb(var(--neo-border) / .35); }
.ab-effort i.filled { background: rgb(var(--sky-600)); }

.ab-focus__status i { display: block; width: 9px; height: 9px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; }
.status-met i { background: rgb(var(--sky-600)); }
.status-missed i { background: rgb(var(--rose-400)); }
.status-no-target i, .status-no-data i { background: rgb(var(--neo-border) / .45); }
.ab-focus__icon { color: var(--sketch-blue-strong); font-size: 15px; }

/* ---------- lista dnia ---------- */
.ab-day-list { min-width: 0; min-height: 0; padding: 11px 16px; overflow: hidden auto; border-radius: 25px 30px 24px 28px; scrollbar-width: thin; }
.ab-day-group + .ab-day-group { margin-top: 8px; }
.ab-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  min-height: 42px;
  padding: 3px 2px;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
  transition: opacity .18s ease, background .18s ease;
}
.ab-row:nth-of-type(even) { transform: rotate(-.035deg); }
.ab-row:last-child { border-bottom-color: transparent; }
.ab-row.dim { opacity: .32; }
.ab-row.lit { border-radius: 12px; background: rgb(var(--sky-100) / .6); }
.ab-row.moving { border-radius: 12px; background: rgb(var(--sky-100) / .85); }
.ab-row__icon { color: var(--sketch-blue-strong); font-size: 18px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 70, 'opsz' 24; }
.ab-row__body { display: grid; gap: 3px; min-width: 0; }
.ab-row__body > strong { overflow: hidden; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }

.ab-micro { display: inline-flex; gap: 3px; align-items: center; }
.ab-micro i { width: 6px; height: 6px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; }
.ab-micro i.done { background: rgb(var(--sky-600)); }
.ab-micro i.missed { background: rgb(var(--rose-400) / .8); }
.ab-micro i.assigned { border: 1px solid rgb(var(--sky-500) / .7); background: transparent; }
.ab-micro i.unassigned { background: rgb(var(--neo-border) / .3); }
.ab-micro em { margin-left: 5px; color: var(--sketch-muted); font-size: 8px; font-style: normal; font-weight: 750; white-space: nowrap; }

.ab-move {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%;
  color: var(--sketch-muted);
  background: transparent;
  cursor: pointer;
  opacity: 0;
}
.ab-row:hover .ab-move, .ab-move:focus-visible, .ab-move.active { opacity: 1; }
.ab-move:hover, .ab-move.active { color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .72); }
.ab-move .material-symbols-outlined { font-size: 15px; }

.ab-stamp {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgb(var(--color-primary) / .1);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}
.ab-row:nth-of-type(even) .ab-stamp { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.ab-stamp:hover { background: rgb(var(--sky-200) / .88); }
.ab-stamp__dot {
  width: 22px;
  height: 22px;
  border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%;
  background: rgb(var(--sky-700));
  box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16);
  transform: rotate(-2deg);
}
.ab-stamp--data { color: rgb(var(--sky-800)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .4), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.ab-stamp--data strong { font-size: 10px; font-weight: 800; letter-spacing: -.02em; }

.ab-empty-day { position: relative; z-index: 1; margin: 8px 0; color: var(--sketch-muted); font-size: 11px; text-align: center; }

/* ---------- sygnały ---------- */
.ab-signals { display: grid; gap: 8px; align-content: start; padding: 10px 16px 12px; border-radius: 25px 30px 24px 28px; }
.ab-signals__grid { position: relative; z-index: 1; display: grid; gap: 8px; }
.ab--cockpit .ab-signals__grid, .ab--rhythm .ab-signals__grid, .ab--rail .ab-signals__grid { grid-template-columns: 1fr; }
.ab--stream .ab-signals__grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }

.ab-signal { display: grid; gap: 6px; padding: 8px 10px; border: 1px solid rgb(var(--neo-border) / .16); border-radius: 16px 19px 15px 18px; background: rgb(var(--color-surface-container) / .5); }
.ab-signal header { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 3px 7px; align-items: center; }
.ab-signal header .material-symbols-outlined { grid-row: span 2; color: var(--sketch-blue-strong); font-size: 16px; }
.ab-signal header strong { overflow: hidden; font-size: 10px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.ab-signal header em { color: var(--sketch-muted); font-size: 8px; font-style: normal; font-weight: 700; }
.ab-signal__dots { display: flex; gap: 6px; padding: 6px 2px 2px; }
.ab-signal__dots i { width: 10px; height: 10px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; }
.ab-signal__dots i.done { background: rgb(var(--sky-600)); }
.ab-signal__dots i.missed { background: rgb(var(--rose-400) / .8); }
.ab-signal__dots i.assigned { border: 1px solid rgb(var(--sky-500) / .7); background: transparent; }
.ab-signal__dots i.unassigned { background: rgb(var(--neo-border) / .3); }
.ab-signal__line { width: 100%; height: 46px; }
.ab-signal__line path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 2.4; stroke-linecap: round; }
.ab-signal__line path.ab-pencil-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 3.2; }
.ab-signal__line circle { fill: rgb(var(--sky-700)); }
.ab-target-line { stroke: rgb(var(--neo-border) / .5); stroke-width: 1; stroke-dasharray: 4 4; }

/* ---------- horyzont ---------- */
.ab-horizon { display: grid; gap: 7px; align-content: start; padding: 9px 16px 11px; border-radius: 25px 30px 24px 28px; }
.ab-horizon.targeting { outline: 2px dashed rgb(var(--sky-500) / .55); outline-offset: -6px; }
.ab-horizon__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 18px; }
.ab-horizon__hint { display: inline-flex; gap: 5px; align-items: center; color: var(--sketch-blue-strong); font-size: 9px; font-weight: 800; }
.ab-horizon__hint .material-symbols-outlined { font-size: 13px; }
.ab-horizon__hint button { display: grid; place-items: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; color: var(--sketch-muted); background: rgb(var(--neo-border) / .18); cursor: pointer; }
.ab-horizon__hint button .material-symbols-outlined { font-size: 11px; }
.ab-horizon__note { color: var(--sketch-muted); font-size: 9px; font-weight: 750; }

.ab-horizon__days { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 6px; }
.ab--rail .ab-horizon__days { grid-template-columns: 1fr; }

.ab-hday { display: grid; gap: 3px; min-width: 0; }
.ab-hday__cell {
  display: grid;
  gap: 4px;
  justify-items: center;
  min-height: 52px;
  padding: 6px 4px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 15px 18px 14px 17px;
  color: inherit;
  background: rgb(var(--color-surface-container) / .5);
  cursor: pointer;
}
.ab--rail .ab-hday__cell { grid-template-columns: auto 1fr; justify-items: start; align-items: center; min-height: 38px; padding: 4px 10px; }
.ab-hday__cell:hover { background: rgb(var(--sky-100) / .8); }
.targeting .ab-hday__cell { border-color: rgb(var(--sky-500) / .55); background: rgb(var(--sky-100) / .55); }
.ab-hday.today .ab-hday__cell { border-color: rgb(var(--sky-600) / .55); background: rgb(var(--sky-100) / .8); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .5), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12); }
.ab-hday.boundary { position: relative; }
.ab-hday.boundary::before { position: absolute; top: 4px; bottom: 4px; left: -4px; border-left: 2px dashed rgb(var(--neo-border) / .4); content: ''; }
.ab--rail .ab-hday.boundary::before { top: -4px; right: 4px; bottom: auto; left: 4px; border-top: 2px dashed rgb(var(--neo-border) / .4); border-left: 0; }

.ab-hday__date { display: inline-flex; gap: 5px; align-items: baseline; }
.ab-hday__date small { color: var(--sketch-muted); font-size: 8px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.ab-hday__date strong { font-size: 12px; font-weight: 800; }
.ab-hday__today-mark { color: var(--sketch-blue-strong); font-size: 8px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; }

.ab-hday__load { display: inline-flex; gap: 3px; align-items: center; min-height: 10px; }
.ab-hday__load i { width: 6.5px; height: 6.5px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-500) / .8); }
.ab-hday__load em { color: var(--sketch-muted); font-size: 8px; font-style: normal; font-weight: 800; }
.ab-hday__load em.zero { font-size: 10px; }

.ab-hday__chips { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; min-height: 16px; }
.ab--rail .ab-hday__chips { justify-content: flex-start; padding-left: 6px; }
.ab-chip {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  padding: 1px 7px 1px 5px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 9px 11px 8px 10px;
  font-size: 8px;
  font-weight: 800;
  cursor: pointer;
}
.ab-chip .material-symbols-outlined { font-size: 11px; }
.ab-chip--deadline { color: rgb(var(--rose-500, 214 96 109)); border-color: rgb(var(--rose-400) / .5); background: rgb(var(--rose-400) / .1); }
.ab-chip--ritual { color: var(--sketch-blue-strong); border-color: rgb(var(--sky-500) / .4); background: rgb(var(--sky-100) / .7); }

/* podgląd dnia */
.ab-peek { position: relative; z-index: 1; display: grid; gap: 4px; padding: 8px 10px; border: 1px solid rgb(var(--neo-border) / .18); border-radius: 15px 18px 14px 17px; background: rgb(var(--color-surface-container) / .65); }
.ab-peek header { display: flex; align-items: center; justify-content: space-between; }
.ab-peek header strong { font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.ab-peek header button { display: grid; place-items: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; color: var(--sketch-muted); background: rgb(var(--neo-border) / .18); cursor: pointer; }
.ab-peek header button .material-symbols-outlined { font-size: 11px; }
.ab-peek__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 7px; align-items: center; min-height: 26px; }
.ab-peek__row .material-symbols-outlined { color: var(--sketch-blue-strong); font-size: 14px; }
.ab-peek__row span { overflow: hidden; font-size: 10px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.ab-peek__row .ab-move { opacity: 1; }
.ab-peek__empty { margin: 2px 0; color: var(--sketch-muted); font-size: 10px; }
</style>
