<template>
  <div class="product-replica sketch-today">
    <div class="sketch-today__sheet">
      <div class="sketch-day-stack">
        <section class="day-nav-card sketch-surface" aria-label="Nawigacja dnia">
          <header class="day-nav-card__header">
            <button type="button" class="day-nav" aria-label="Poprzedni dzień"><AppIcon name="chevron_left" /></button>
            <div>
              <h2><time datetime="2026-06-18">Czwartek, 18 czerwca</time></h2>
            </div>
            <button type="button" class="day-nav" aria-label="Następny dzień"><AppIcon name="chevron_right" /></button>
          </header>
          <div class="scale-switch" role="group" aria-label="Skala widoku">
            <button
              v-for="option in scaleOptions"
              :key="option.key"
              type="button"
              :class="{ active: scale === option.key }"
              :aria-pressed="scale === option.key"
              @click="setScale(option.key)"
            >
              {{ option.label }}
            </button>
          </div>
        </section>

        <aside class="sketch-day sketch-surface" aria-label="Lista na dziś">
        <section v-for="category in categoryList" :key="category.key" class="sketch-day__group">
          <h2>{{ category.label }}</h2>
          <article v-for="item in items[category.key]" :key="item.key" class="sketch-day__row">
            <AppIcon :name="item.icon" class="sketch-day__item-icon" />
            <strong>{{ item.title }}</strong>

            <div v-if="item.key === 'morning-routine'" class="routine-steps" aria-label="Kroki porannej rutyny">
              <button
                v-for="step in routineSteps"
                :key="step.key"
                type="button"
                :class="{ active: step.done }"
                :aria-label="step.label"
                :aria-pressed="step.done"
                @click="step.done = !step.done"
              >
                <AppIcon :name="step.icon" />
              </button>
            </div>

            <button
              v-else
              type="button"
              class="sketch-value"
              :class="{
                'sketch-value--completion': item.kind === 'completion',
                'sketch-value--data': item.kind !== 'completion',
                active: item.kind === 'completion' && item.done,
                recorded: item.kind !== 'completion' && item.value !== undefined,
              }"
              :aria-label="controlLabel(item)"
              :aria-pressed="item.kind === 'completion' ? item.done : undefined"
              @click="activateItem(item)"
            >
              <span v-if="item.kind === 'completion' && item.done" class="sketch-value__dot" aria-hidden="true" />
              <template v-else-if="item.kind !== 'completion'">
                <strong>{{ formatValue(item) }}</strong><small v-if="item.max">/{{ item.max }}</small>
              </template>
            </button>
          </article>
        </section>
        </aside>
      </div>

      <main class="sketch-main">
        <template v-if="activeCategory === null">
          <section class="sketch-board" aria-label="Skróty widoku Dziś">
            <div class="sketch-board__row sketch-surface">
              <button
                v-for="category in categoryList"
                :key="category.key"
                type="button"
                class="sketch-board__cell sketch-board__category"
                :class="`tone-${category.key}`"
                @click="toggleCategory(category.key)"
              >
                <span class="sketch-icon-box"><AppIcon :name="category.icon" /></span>
                <strong>{{ category.label }}</strong>
              </button>
            </div>

            <div class="sketch-board__row sketch-surface">
              <button
                v-for="action in quickActions"
                :key="action.key"
                type="button"
                class="sketch-board__cell"
                :class="{ active: selectedShortcut === action.key }"
                :aria-pressed="selectedShortcut === action.key"
                @click="selectedShortcut = action.key"
              >
                <span class="sketch-icon-box"><AppIcon :name="action.icon" /></span>
                <strong>{{ action.label }}</strong>
              </button>
            </div>

            <div class="sketch-board__row sketch-surface">
              <button
                v-for="focus in focusAreas"
                :key="focus.key"
                type="button"
                class="sketch-board__cell"
                :class="{ active: selectedShortcut === focus.key }"
                :aria-pressed="selectedShortcut === focus.key"
                @click="selectedShortcut = focus.key"
              >
                <span class="sketch-icon-box"><AppIcon :name="focus.icon" /></span>
                <strong>{{ focus.label }}</strong>
              </button>
            </div>

            <div class="sketch-board__row sketch-board__row--charts sketch-surface">
              <button type="button" class="sketch-board__cell" @click="selectFeatured('strength')">
                <div class="sketch-preview-dots" aria-hidden="true"><i /><i class="rose" /><i /></div>
                <strong>Trening siłowy</strong>
              </button>
              <button type="button" class="sketch-board__cell" @click="selectFeatured('weight')">
                <svg class="sketch-preview-line" viewBox="0 0 160 50" role="img" aria-label="Trend wagi">
                  <path class="pencil-echo" :d="smoothPath(previewWeightLine, 2)" />
                  <path :d="smoothPath(previewWeightLine)" />
                  <circle cx="153" cy="29" r="4" />
                </svg>
                <strong>Waga</strong>
              </button>
              <button type="button" class="sketch-board__cell" @click="selectFeatured('deep-focus')">
                <svg class="sketch-preview-line" viewBox="0 0 160 50" role="img" aria-label="Trend deep focus">
                  <path class="pencil-echo" :d="smoothPath(previewFocusLine, 2)" />
                  <path :d="smoothPath(previewFocusLine)" />
                  <circle cx="153" cy="11" r="4" />
                </svg>
                <strong>Deep focus</strong>
              </button>
            </div>
          </section>
        </template>

        <template v-else>
          <nav class="sketch-tabs sketch-surface" aria-label="Typ obiektów">
            <button
              v-for="category in categoryList"
              :key="category.key"
              type="button"
              :class="[{ active: activeCategory === category.key }, `tone-${category.key}`]"
              :aria-pressed="activeCategory === category.key"
              @click="toggleCategory(category.key)"
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
              <span>{{ activeCategoryLabel }} · bieżący tydzień</span>
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
                v-for="(item, index) in activeItems"
                :key="item.key"
                type="button"
                class="sketch-detail-card"
                :class="[{ active: selectedDetailKey === item.key }, `sketch-detail-card--${chartKind(item)}`]"
                :aria-describedby="`sketch-summary-${item.key}`"
                :aria-pressed="selectedDetailKey === item.key"
                @click="selectedDetailKey = selectedDetailKey === item.key ? null : item.key"
              >
                <header>
                  <span><AppIcon :name="item.icon" /><strong>{{ item.title }}</strong></span>
                  <em :id="`sketch-summary-${item.key}`" class="sketch-detail-card__summary">{{ itemSummary(item) }}</em>
                </header>

                <div v-if="chartKind(item) === 'dots'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-dots">
                    <i
                      v-for="(state, dotIndex) in item.pattern"
                      :key="dotIndex"
                      :class="state"
                    />
                  </div>
                  <div class="detail-weekdays"><span v-for="day in weekDays" :key="day">{{ day }}</span></div>
                </div>

                <div v-else-if="chartKind(item) === 'bars'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-bars">
                    <i
                      v-for="(height, barIndex) in item.bars"
                      :key="barIndex"
                      :style="{ height: height === null ? '2px' : `${height}%`, transform: `rotate(${barIndex % 2 ? '-1.2deg' : '.8deg'})` }"
                      :class="{ current: barIndex === currentWeekdayIndex && height !== null, empty: height === null }"
                    />
                  </div>
                  <div class="detail-weekdays"><span v-for="day in weekDays" :key="day">{{ day }}</span></div>
                </div>

                <div v-else class="detail-week-chart">
                  <svg class="detail-line" viewBox="0 0 500 115" role="img" :aria-label="`Bieżący tydzień: ${item.title}`" preserveAspectRatio="none">
                    <line x1="0" y1="88" x2="500" y2="88" class="target-line" />
                    <path class="pencil-echo" :d="smoothPath(lineCoordinates(item), 3)" />
                    <path :d="smoothPath(lineCoordinates(item))" />
                    <circle :cx="lastLinePoint(item).x" :cy="lastLinePoint(item).y" r="5" />
                  </svg>
                  <div class="detail-weekdays" aria-hidden="true"><span v-for="day in weekDays" :key="day">{{ day }}</span></div>
                </div>

                <footer v-if="selectedDetailKey === item.key">
                  <span>{{ item.kind === 'completion' ? 'Kliknij wartość po lewej, aby zmienić dzisiejszy wpis' : 'Kliknij wartość po lewej, aby zaktualizować' }}</span>
                </footer>
              </button>
            </div>
          </section>

          <section class="sketch-shortcuts sketch-surface" aria-label="Pozostałe skróty">
            <button
              v-for="shortcut in footerShortcuts"
              :key="shortcut.key"
              type="button"
              :class="{ active: selectedShortcut === shortcut.key }"
              :aria-pressed="selectedShortcut === shortcut.key"
              @click="selectedShortcut = shortcut.key"
            >
              <span class="sketch-shortcuts__icon-field"><AppIcon :name="shortcut.icon" /></span>
              <span>{{ shortcut.label }}</span>
            </button>
          </section>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'

type ViewScale = 'day' | 'week' | 'month' | 'year'

const emit = defineEmits<{ (event: 'scale', value: ViewScale): void }>()

const scale = ref<ViewScale>('day')
const scaleOptions: Array<{ key: ViewScale; label: string }> = [
  { key: 'day', label: 'Dzień' },
  { key: 'week', label: 'Tydzień' },
  { key: 'month', label: 'Miesiąc' },
  { key: 'year', label: 'Rok' },
]

function setScale(value: ViewScale) {
  scale.value = value
  emit('scale', value)
}

type CategoryKey = 'goals' | 'habits' | 'trackers'
type ItemKind = 'completion' | 'counter' | 'value' | 'rating'
type CompletionDotState = 'assigned' | 'done' | 'missed' | 'unassigned'

interface SketchItem {
  key: string
  title: string
  icon: string
  kind: ItemKind
  value?: number
  max?: number
  unit?: string
  step?: number
  done?: boolean
  pattern?: CompletionDotState[]
  bars?: Array<number | null>
  line?: Array<number | null>
}

interface ChartPoint {
  x: number
  y: number
}

const previewWeightLine: ChartPoint[] = [
  { x: 5, y: 11 }, { x: 25, y: 7 }, { x: 43, y: 14 }, { x: 64, y: 12 },
  { x: 85, y: 20 }, { x: 107, y: 24 }, { x: 130, y: 21 }, { x: 153, y: 29 },
]

const previewFocusLine: ChartPoint[] = [
  { x: 5, y: 33 }, { x: 25, y: 26 }, { x: 45, y: 17 }, { x: 66, y: 23 },
  { x: 88, y: 8 }, { x: 108, y: 14 }, { x: 131, y: 4 }, { x: 153, y: 11 },
]

const weekDays = ['pn', 'wt', 'śr', 'cz', 'pt', 'so', 'nd']
const currentWeekdayIndex = 3

const categoryList: Array<{ key: CategoryKey; label: string; icon: string }> = [
  { key: 'goals', label: 'Cele', icon: 'mountain_flag' },
  { key: 'habits', label: 'Nawyki', icon: 'change_circle' },
  { key: 'trackers', label: 'Trackery', icon: 'show_chart' },
]

const items = ref<Record<CategoryKey, SketchItem[]>>({
  goals: [
    { key: 'strength', title: 'Trening siłowy', icon: 'fitness_center', kind: 'completion', done: false, pattern: ['done', 'missed', 'unassigned', 'done', 'assigned', 'unassigned', 'assigned'] },
    { key: 'medicine-free', title: 'Dzień bez leków', icon: 'block', kind: 'completion', done: false, pattern: ['done', 'unassigned', 'missed', 'assigned', 'unassigned', 'assigned', 'unassigned'] },
    { key: 'pullups', title: 'Sety pull-upów', icon: 'exercise', kind: 'counter', value: 6, max: 30, bars: [52, null, 66, 82, null, null, null] },
    { key: 'meds', title: 'Dawka leków (mg)', icon: 'medication', kind: 'value', value: 65, unit: 'mg', step: 5, line: [78, 78, 72, 65, null, null, null] },
    { key: 'weight', title: 'Waga (kg)', icon: 'monitor_weight', kind: 'value', value: 84.1, unit: 'kg', step: 0.1, line: [84.8, 84.4, 84.3, 84.1, null, null, null] },
  ],
  habits: [
    { key: 'morning-routine', title: 'Poranna rutyna', icon: 'wb_twilight', kind: 'rating', value: 4, max: 5, pattern: ['done', 'done', 'missed', 'done', 'assigned', 'assigned', 'unassigned'] },
    { key: 'meditation', title: 'Medytacja', icon: 'self_improvement', kind: 'completion', done: true, pattern: ['done', 'done', 'unassigned', 'done', 'assigned', 'unassigned', 'assigned'] },
    { key: 'work-ritual', title: 'Rytuał kończenia pracy', icon: 'work_history', kind: 'completion', done: false, bars: [62, 43, 70, 28, null, null, null] },
    { key: 'reading', title: 'Czytanie do snu', icon: 'menu_book', kind: 'completion', done: false, pattern: ['done', 'unassigned', 'done', 'assigned', 'assigned', 'unassigned', 'assigned'] },
    { key: 'date', title: 'Randka z Ninką', icon: 'favorite', kind: 'completion', done: false, line: [35, 43, 41, 49, null, null, null] },
  ],
  trackers: [
    { key: 'deep-focus', title: 'Deep focus (min)', icon: 'center_focus_strong', kind: 'counter', value: 60, unit: 'min', step: 10, bars: [38, 55, 28, 67, null, null, null] },
    { key: 'coffee', title: 'Kawa', icon: 'local_cafe', kind: 'counter', value: 2, step: 1, bars: [32, 65, 32, 48, null, null, null] },
    { key: 'mood', title: 'Nastrój', icon: 'mood', kind: 'rating', value: 7, max: 10, line: [5, 6, 6, 7, null, null, null] },
    { key: 'energy', title: 'Energia', icon: 'bolt', kind: 'rating', value: 3, max: 5, line: [4, 3, 2, 3, null, null, null] },
    { key: 'sleep', title: 'Sen (h)', icon: 'bedtime', kind: 'value', value: 6.8, unit: 'h', step: 0.1, line: [6.2, 7.1, 6.5, 6.8, null, null, null] },
  ],
})

const routineSteps = ref([
  { key: 'move', label: 'Krótki ruch', icon: 'accessibility_new', done: true },
  { key: 'shower', label: 'Prysznic', icon: 'shower', done: true },
  { key: 'plan', label: 'Plan dnia', icon: 'checklist', done: false },
])

const quickActions = [
  { key: 'journal', label: 'Dziennik', icon: 'history_edu' },
  { key: 'emotions', label: 'Emocje', icon: 'cognition' },
  { key: 'exercises', label: 'Ćwiczenia', icon: 'psychology' },
]

const focusAreas = [
  { key: 'pregnancy', label: 'Zajście w ciążę', icon: 'pregnant_woman' },
  { key: 'health', label: 'Zadbać o zdrowie', icon: 'health_and_safety' },
  { key: 'mind', label: 'Zadbać o głowę', icon: 'stress_management' },
]

const footerShortcuts = [
  ...quickActions,
  ...focusAreas,
  { key: 'strength', label: 'Trening siłowy', icon: 'fitness_center' },
  { key: 'weight', label: 'Waga', icon: 'monitor_weight' },
  { key: 'deep-focus', label: 'Deep focus', icon: 'center_focus_strong' },
]

const activeCategory = ref<CategoryKey | null>(null)
const density = ref<1 | 2 | 3>(2)
const selectedShortcut = ref<string | null>(null)
const selectedDetailKey = ref<string | null>(null)

const activeItems = computed(() => activeCategory.value ? items.value[activeCategory.value] : [])
const activeCategoryLabel = computed(() => categoryList.find(category => category.key === activeCategory.value)?.label ?? '')

function toggleCategory(category: CategoryKey) {
  activeCategory.value = activeCategory.value === category ? null : category
  selectedDetailKey.value = null
}

function activateItem(item: SketchItem) {
  if (item.kind === 'completion') {
    item.done = !item.done
    return
  }
  const step = item.step ?? 1
  const limit = item.max ?? (item.key === 'coffee' ? 8 : Number.POSITIVE_INFINITY)
  const next = Number(((item.value ?? 0) + step).toFixed(1))
  item.value = next > limit ? 0 : next
}

function controlLabel(item: SketchItem): string {
  if (item.kind === 'completion') return item.done ? `Cofnij: ${item.title}` : `Zapisz: ${item.title}`
  return `Zwiększ: ${item.title}. Obecnie ${formatValue(item)}${item.max ? ` z ${item.max}` : ''}`
}

function formatValue(item: SketchItem): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(item.value ?? 0)
}

function chartKind(item: SketchItem): 'dots' | 'bars' | 'line' {
  if (item.line) return 'line'
  if (item.bars) return 'bars'
  return 'dots'
}

function itemSummary(item: SketchItem): string {
  const value = formatValue(item)
  if (item.key === 'strength') return '2/3 w tym tyg.'
  if (item.key === 'medicine-free') return '1/2 w tym tyg.'
  if (item.key === 'pullups') return '24/30 w tym tyg.'
  if (item.key === 'meds') return `${value} mg → cel 50`
  if (item.key === 'weight') return `ø84,3 → ≤84 kg`
  if (item.kind === 'completion') return item.done ? 'Dziś zapisano' : 'Jeszcze nie dziś'
  if (item.max) return `${value}/${item.max}`
  return `${value}${item.unit ? ` ${item.unit}` : ''}`
}

function lineCoordinates(item: SketchItem): ChartPoint[] {
  const values = item.line ?? [0]
  const recordedValues = values.filter((value): value is number => value !== null)
  const min = Math.min(...recordedValues)
  const max = Math.max(...recordedValues)
  const range = Math.max(1, max - min)
  return values.flatMap((value, index) => value === null ? [] : [{
    x: values.length === 1 ? 250 : Math.round(index / (values.length - 1) * 490 + 5),
    y: Math.round(18 + (max - value) / range * 68),
  }])
}

function smoothPath(points: ChartPoint[], offset = 0): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y + offset}`

  const shifted = points.map(point => ({ x: point.x, y: point.y + offset }))
  const commands = [`M ${shifted[0].x} ${shifted[0].y}`]

  for (let index = 0; index < shifted.length - 1; index += 1) {
    const previous = shifted[Math.max(0, index - 1)]
    const current = shifted[index]
    const next = shifted[index + 1]
    const following = shifted[Math.min(shifted.length - 1, index + 2)]
    const controlOne = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    }
    const controlTwo = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    }
    commands.push(`C ${controlOne.x.toFixed(1)} ${controlOne.y.toFixed(1)}, ${controlTwo.x.toFixed(1)} ${controlTwo.y.toFixed(1)}, ${next.x} ${next.y}`)
  }

  return commands.join(' ')
}

function lastLinePoint(item: SketchItem): { x: number; y: number } {
  return lineCoordinates(item).at(-1) ?? { x: 495, y: 55 }
}

function selectFeatured(key: string) {
  selectedShortcut.value = key
  const category = categoryList.find(entry => items.value[entry.key].some(item => item.key === key))
  if (category) {
    activeCategory.value = category.key
    selectedDetailKey.value = key
  }
}
</script>

<style scoped>
.sketch-today {
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

.sketch-today *,
.sketch-today *::before,
.sketch-today *::after { box-sizing: border-box; }

.sketch-today button {
  font: inherit;
  transition: box-shadow .24s ease, transform .16s ease, color .2s ease, background .2s ease, border-color .2s ease;
}

.sketch-today button:active { transform: scale(.985); }

.sketch-today__sheet {
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

.sketch-day-stack {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 15px;
  min-width: 0;
  min-height: 0;
}

.day-nav-card {
  display: grid;
  gap: 8px;
  padding: 10px 13px 11px;
  border-radius: 24px 20px 25px 21px;
}

.day-nav-card__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 0 2px;
}
.day-nav-card__header > div { display: grid; justify-items: center; gap: 0; min-width: 0; }
.day-nav-card__header > div > span {
  color: var(--sketch-blue-strong);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .17em;
  text-transform: uppercase;
}
.day-nav-card__header h2 { margin: 0; font-size: 13.5px; font-weight: 800; letter-spacing: .01em; }

.day-nav {
  display: grid;
  flex: 0 0 auto;
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
.day-nav:last-of-type { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.day-nav .material-symbols-outlined { font-size: 17px; }

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

.sketch-day {
  min-width: 0;
  padding: 11px 16px 11px;
  overflow: hidden;
  border-radius: 25px 30px 24px 28px;
}

.sketch-day__group h2,
.sketch-details__header > span {
  color: var(--sketch-blue-strong);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .17em;
  text-transform: uppercase;
}
.sketch-day__group { margin-top: 2px; }
.sketch-day__group h2 { margin: 0; padding: 1px 3px 3px; font-size: 7.5px; }

.sketch-day__row {
  display: grid;
  grid-template-columns: 27px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 0 2px;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
}

.sketch-day__row:nth-of-type(even) { transform: rotate(-.035deg); }
.sketch-day__row:last-child { border-bottom-color: transparent; }
.sketch-day__row > strong { overflow: hidden; font-size: 11.4px; font-weight: 700; letter-spacing: .005em; text-overflow: ellipsis; white-space: nowrap; }
.sketch-day__item-icon { color: var(--sketch-blue-strong); font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 70, 'opsz' 24; }

.sketch-value,
.routine-steps button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgb(var(--color-primary) / .1);
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .72);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}

.sketch-value {
  width: 34px;
  height: 34px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
}

.sketch-day__row:nth-of-type(even) .sketch-value { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.sketch-value:hover { background: rgb(var(--sky-200) / .88); }
.sketch-value.active {
  border-color: rgb(var(--color-primary) / .16);
  background: rgb(var(--sky-200) / .72);
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}

.sketch-value__dot {
  width: 24px;
  height: 24px;
  border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%;
  background: rgb(var(--sky-700));
  box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16);
  transform: rotate(-2deg);
}

.sketch-value--data { gap: 0; color: rgb(var(--sky-800)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .4), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.sketch-value--data strong { font-size: 10px; font-weight: 800; letter-spacing: -.02em; }
.sketch-value--data small { font-size: 6.5px; font-weight: 750; }
.routine-steps { display: flex; gap: 4px; }
.routine-steps button { position: relative; width: 28px; height: 28px; border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; }
.routine-steps button:nth-child(2) { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.routine-steps button.active { border-color: rgb(var(--color-primary) / .1); color: rgb(var(--sky-100)); background: rgb(var(--sky-200) / .72); }
.routine-steps button.active::before { position: absolute; width: 21px; height: 21px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-700)); content: ''; transform: rotate(-2deg); }
.routine-steps .material-symbols-outlined { position: relative; z-index: 1; font-size: 15px; }

.sketch-main { display: grid; grid-template-rows: minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }
.sketch-board { display: grid; grid-template-rows: repeat(4, minmax(0, 1fr)); gap: 16px; min-height: 100%; }
.sketch-board__row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); min-width: 0; overflow: hidden; border-radius: 24px 29px 25px 27px; }
.sketch-board__row:nth-child(2) { border-radius: 28px 22px 29px 24px; }
.sketch-board__row:nth-child(3) { border-radius: 23px 28px 22px 30px; }
.sketch-board__row:nth-child(4) { border-radius: 29px 24px 28px 23px; }

.sketch-board__cell {
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

.sketch-board__cell:last-child { border-right: 0; }
.sketch-board__cell:hover,
.sketch-board__cell.active {
  color: var(--sketch-blue-strong);
  background: rgb(var(--color-primary-soft) / .48);
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16);
}

.sketch-board__cell > strong { display: flex; align-items: center; justify-content: center; align-self: center; width: 100%; min-height: 24px; overflow: hidden; color: var(--sketch-blue-strong); font-family: 'Nunito', sans-serif; font-size: 13.25px; font-weight: 800; letter-spacing: .012em; line-height: 1.15; text-align: center; text-overflow: ellipsis; white-space: nowrap; }
.sketch-icon-box { display: grid; place-items: center; align-self: center; width: min(62%, 155px); aspect-ratio: 1.48; max-height: 98px; border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .72); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .32), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .08); transform: rotate(.45deg); }
.sketch-board__cell:nth-child(2) .sketch-icon-box { transform: rotate(-.45deg); }
.sketch-board__cell:nth-child(3) .sketch-icon-box { transform: rotate(.25deg); }
.sketch-icon-box .material-symbols-outlined { font-size: 52px; font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 80, 'opsz' 48; }
.sketch-board__row--charts { min-height: 118px; }
.sketch-board__row--charts .sketch-board__cell { gap: 4px; }

.sketch-preview-dots { display: flex; align-self: center; align-items: center; gap: 10px; min-height: 62px; }
.sketch-preview-dots i { width: 25px; height: 25px; border-radius: 47% 53% 45% 55% / 53% 44% 56% 47%; background: rgb(var(--sky-300)); box-shadow: 1px 2px 4px rgb(var(--neo-shadow-dark) / .14); }
.sketch-preview-dots i.rose { background: rgb(var(--rose-200)); }
.sketch-preview-line { align-self: center; width: min(210px, 86%); height: 62px; overflow: visible; fill: none; stroke: var(--sketch-blue); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.sketch-preview-line .pencil-echo { stroke: rgb(var(--sky-300) / .42); stroke-width: 6; }
.sketch-preview-line circle { fill: var(--sketch-blue); stroke: none; }

.sketch-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) 42px;
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
  width: 34px;
  height: 34px;
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

.sketch-tabs strong { font-family: 'Nunito', sans-serif; font-size: 12.5px; font-weight: 800; letter-spacing: .012em; }
.sketch-tabs .material-symbols-outlined { font-size: 21px; }
.sketch-tabs__icon-field .material-symbols-outlined { font-size: 22px; }
.sketch-tabs__close { color: var(--sketch-blue-strong) !important; }

.sketch-main:has(.sketch-details) { grid-template-rows: 52px minmax(0, 1fr) 132px; }
.sketch-details { min-height: 0; padding: 14px 15px 15px; overflow: auto; border-radius: 27px 23px 28px 24px; }
.sketch-details__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 10px; }
.density-switch { display: flex; align-items: center; gap: 4px; }
.density-switch small { margin-right: 5px; color: var(--sketch-muted); font-size: 7.5px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
.density-switch button { width: 28px; height: 28px; padding: 0; border: 0; border-radius: 10px 12px 9px 11px; color: var(--sketch-muted); background: rgb(var(--sky-200) / .38); font-size: 9px; font-weight: 800; cursor: pointer; }
.density-switch button.active { color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .8); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .56), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17); }

.detail-grid { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; min-width: 0; }
.sketch-detail-card { min-width: 0; min-height: 110px; padding: 11px 12px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 18px 22px 17px 21px; color: var(--sketch-ink); background: var(--sketch-paper); text-align: left; cursor: pointer; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .62), 4px 4px 9px rgb(var(--neo-shadow-dark) / .16); }
.sketch-detail-card:nth-child(even) { border-radius: 22px 17px 21px 18px; transform: rotate(-.035deg); }
.sketch-detail-card.active { border-color: rgb(var(--color-primary) / .3); background: rgb(var(--color-primary-soft) / .42); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .66), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
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
.sketch-detail-card > footer { margin-top: 6px; color: var(--sketch-muted); font-size: 7px; }

.detail-week-chart { display: flex; min-width: 0; flex-direction: column; justify-content: flex-end; }
.detail-dots { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; align-items: center; min-height: 49px; padding: 9px 6px 2px; }
.detail-dots i { position: relative; display: grid; aspect-ratio: 1; place-items: center; border-radius: 47% 53% 45% 55% / 55% 44% 56% 45%; background: rgb(var(--neo-border) / .22); }
.detail-dots i:nth-child(even) { border-radius: 53% 47% 52% 48% / 46% 54% 49% 51%; }
.detail-dots i.assigned,
.detail-dots i.done { background: rgb(var(--sky-200) / .78); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .34), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08); }
.detail-dots i.done::after { width: 70%; aspect-ratio: 1; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-700)); box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16); content: ''; transform: rotate(-2deg); }
.detail-dots i.missed { background: rgb(var(--rose-200)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .24), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .06); }
.detail-dots i.unassigned { background: rgb(var(--neo-border) / .22); }
.detail-bars { display: flex; align-items: end; gap: 10px; height: 56px; padding: 8px 6px 2px; }
.detail-bars i { flex: 1; min-width: 4px; border-radius: 40% 51% 43% 55% / 13% 16% 8% 10%; background: rgb(var(--sky-200)); }
.detail-bars i.current { background: rgb(var(--sky-400)); box-shadow: 1px 2px 5px rgb(var(--neo-shadow-dark) / .14); }
.detail-bars i.empty { flex-basis: auto; align-self: end; border-radius: 999px; background: rgb(var(--neo-border) / .2); }
.detail-line { width: 100%; height: 59px; margin-top: 2px; overflow: visible; fill: none; stroke: var(--sketch-blue); stroke-width: 3.5; stroke-linecap: round; stroke-linejoin: round; }
.detail-line .pencil-echo { stroke: rgb(var(--sky-200) / .55); stroke-width: 7; }
.detail-line .target-line { stroke: rgb(var(--color-primary) / .38); stroke-width: 1; stroke-dasharray: 7 7; }
.detail-line circle { fill: var(--sketch-blue); stroke: none; }
.detail-weekdays { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); padding: 0 4px; color: rgb(var(--neo-muted) / .72); font-size: 7px; font-weight: 700; letter-spacing: .02em; line-height: 1; text-align: center; text-transform: lowercase; }

@media (prefers-reduced-motion: reduce) {
  .sketch-detail-card__summary { transition: none; }
}

.sketch-shortcuts { display: grid; grid-template-columns: repeat(3, 1fr); overflow: hidden; border-radius: 24px 28px 22px 27px; }
.sketch-shortcuts button { position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; gap: 7px; min-width: 0; padding: 5px 7px; border: 0; border-right: 1px solid rgb(var(--neo-border) / .19); border-bottom: 1px solid rgb(var(--neo-border) / .19); color: rgb(var(--sky-600) / .82); background: transparent; font-size: 9.5px; text-align: center; cursor: pointer; }
.sketch-shortcuts button:nth-child(3n) { border-right: 0; }
.sketch-shortcuts button:nth-last-child(-n + 3) { border-bottom: 0; }
.sketch-shortcuts button.active { color: var(--sketch-blue-strong); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12); }
.sketch-shortcuts__icon-field { display: grid; flex: 0 0 auto; place-items: center; width: 26px; height: 26px; overflow: visible !important; border-radius: 52% 48% 45% 55% / 48% 52% 54% 46%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .72); box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .26), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .07); }
.sketch-shortcuts button:nth-child(even) .sketch-shortcuts__icon-field { border-radius: 46% 54% 51% 49% / 54% 46% 48% 52%; transform: rotate(-1deg); }
.sketch-shortcuts__icon-field .material-symbols-outlined { font-size: 17px; }
.sketch-shortcuts button > span:last-child { overflow: hidden; font-family: 'Nunito', sans-serif; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
</style>
