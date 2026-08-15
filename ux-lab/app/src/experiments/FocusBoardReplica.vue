<template>
  <div class="product-replica focus-board" :class="{ 'focus-board--nested': scale === 'year' }">
    <YearSketchbookReplica v-if="scale === 'year'" preset-id="current" @scale="value => { scale = value }" />

    <div v-else class="focus-board__sheet">
      <!-- ===================== LEWA KOLUMNA ===================== -->
      <aside class="fb-rail">
        <section class="fb-nav-card fb-surface" aria-label="Nawigacja okresu">
          <header class="fb-nav-card__header">
            <button type="button" class="fb-nav" :disabled="!canGoPrev" aria-label="Poprzedni okres" @click="goPrev"><AppIcon name="chevron_left" /></button>
            <h2>{{ periodTitle }}</h2>
            <button type="button" class="fb-nav" :disabled="!canGoNext" aria-label="Następny okres" @click="goNext"><AppIcon name="chevron_right" /></button>
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

        <!-- Dzień: plan dnia z intencjami tygodnia -->
        <section v-if="scale === 'day'" class="fb-day-list fb-surface" aria-label="Plan dnia">
          <section v-for="group in dayGroups" :key="group.key" class="fb-day-group">
            <h2>{{ group.label }}</h2>
            <article v-for="item in group.items" :key="item.key" class="fb-day-row">
              <AppIcon :name="familyIcon[item.family]" class="fb-day-row__icon" />
              <strong :title="item.contribution || item.title">{{ item.title }}</strong>
              <button
                type="button"
                class="fb-stamp"
                :class="{
                  'fb-stamp--data': item.entryMode !== 'completion',
                  done: item.entryMode === 'completion' && isDoneToday(item),
                }"
                :aria-label="dayControlLabel(item)"
                :aria-pressed="item.entryMode === 'completion' ? isDoneToday(item) : undefined"
                @click="activateDayItem(item)"
              >
                <span v-if="item.entryMode === 'completion' && isDoneToday(item)" class="fb-stamp__dot" aria-hidden="true" />
                <strong v-else-if="item.entryMode !== 'completion'">{{ formatNumber(todayValueFor(item)) }}</strong>
              </button>
            </article>
          </section>
        </section>

        <!-- Tydzień: oceny + siedem dni -->
        <template v-else-if="scale === 'week'">
          <section class="week-ratings fb-surface" aria-label="Oceny tygodnia" tabindex="0">
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
            </div>
          </section>

          <section class="fb-week-days fb-surface" aria-label="Dni tygodnia">
            <header class="fb-rail__heading"><span>Dni</span></header>
            <div class="fb-week-day-list">
              <button
                v-for="day in activeWeek.days"
                :key="day.dayRef"
                type="button"
                class="week-day-row"
                :class="{ active: selectedDay === day.dayRef, today: day.isToday, future: isFutureDay(day.dayRef) }"
                :aria-pressed="selectedDay === day.dayRef"
                @click="selectedDay = day.dayRef"
              >
                <span class="week-day-row__date"><small>{{ day.shortLabel }}</small><strong>{{ day.dayNumber }}</strong></span>
                <em v-if="day.isToday">dziś</em>
              </button>
            </div>
          </section>
        </template>

        <!-- Miesiąc: kompas ocen + tygodnie -->
        <section v-else class="fb-month-rail fb-surface" aria-label="Kompas i tygodnie miesiąca">
          <section class="month-ratings" aria-label="Oceny miesiąca">
            <h2>Oceny miesiąca</h2>
            <svg class="ratings-chart" viewBox="0 0 470 132" role="img" aria-label="Oceny pięciu wymiarów miesiąca">
              <defs>
                <linearGradient id="fb-ratings-column" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#fb-ratings-column)"
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
            <button
              v-for="week in monthWeekCards"
              :key="week.weekRef"
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
              <span class="week-dual-chart" role="img" :aria-label="`${week.shortLabel}: wysiłek i stan czterech obszarów`">
                <svg viewBox="0 0 180 42" aria-hidden="true">
                  <template v-if="week.state !== 'future'">
                    <path class="week-axis-echo week-axis-echo--effort" :d="smoothPath(weekCombinedAxisPoints(week.effort), 1.5)" />
                    <path class="week-axis-echo week-axis-echo--state" :d="smoothPath(weekCombinedAxisPoints(week.stateValues), 1.5)" />
                    <path class="week-axis-line week-axis-line--effort" :d="smoothPath(weekCombinedAxisPoints(week.effort))" />
                    <path class="week-axis-line week-axis-line--state" :d="smoothPath(weekCombinedAxisPoints(week.stateValues))" />
                  </template>
                  <path v-else class="week-axis-ghost" d="M 10 31 L 170 31" />
                </svg>
              </span>
            </button>
          </section>
        </section>
      </aside>

      <!-- ===================== PRAWA STRONA: 3 STREFY ===================== -->
      <main class="fb-main" :class="{ 'fb-main--entry': entryOpen }">
        <!-- Strefa 1: akcje okresu -->
        <section class="fb-actions fb-surface" :aria-label="`Akcje okresu`">
          <button
            v-for="action in actions"
            :key="action.key"
            type="button"
            class="fb-action"
            :class="{ active: action.active }"
            :aria-pressed="action.active"
            @click="action.onClick"
          >
            <span class="fb-action__icon"><AppIcon :name="action.icon" /></span>
            <span class="fb-action__copy"><strong>{{ action.label }}</strong></span>
          </button>
        </section>

        <!-- Prowadzony wpis okresu (tydzień/miesiąc) -->
        <section v-if="entryOpen" class="fb-entry fb-surface" aria-label="Prowadzony wpis okresu">
          <header class="fb-entry__head">
            <div>
              <h2>{{ scale === 'week' ? 'Wpis tygodnia' : 'Wpis miesiąca' }}</h2>
              <p>Trzy pytania zamiast pustej kartki. Odpowiedz na tyle, na ile chcesz.</p>
            </div>
            <div class="fb-entry__source" role="group" aria-label="Źródło pytań">
              <button type="button" :class="{ active: entrySource === 'fixed' }" :aria-pressed="entrySource === 'fixed'" @click="entrySource = 'fixed'">Stałe pytania</button>
              <button type="button" :class="{ active: entrySource === 'ai' }" :aria-pressed="entrySource === 'ai'" @click="entrySource = 'ai'">Pytania od AI</button>
            </div>
            <button type="button" class="fb-entry__close" aria-label="Zamknij wpis" @click="entryOpen = false"><AppIcon name="close_fullscreen" /></button>
          </header>

          <p v-if="entrySource === 'ai'" class="fb-entry__ai-note">
            <AppIcon name="auto_awesome" />
            <span>Pytania powstały z wpisów i wyników tego okresu. AI działa tu tylko na Twoje żądanie.</span>
          </p>

          <div class="fb-entry__questions">
            <label v-for="(question, index) in entryQuestions" :key="`${entrySource}-${index}`" class="fb-entry__question">
              <span>{{ question }}</span>
              <textarea v-model="entryAnswers[entryScaleKey][index]" rows="2" :placeholder="'Napisz jedno–dwa zdania…'" />
            </label>
          </div>

          <footer class="fb-entry__foot">
            <small>Wpis trafi do dziennika z etykietą okresu.</small>
            <button type="button" class="fb-entry__save" @click="saveEntry">
              <AppIcon name="check" />
              {{ entrySaved[entryScaleKey] ? 'Zapisano' : 'Zapisz wpis' }}
            </button>
          </footer>
        </section>

        <template v-else>
          <!-- Strefa 2: fokus okresu -->
          <section class="fb-focus fb-surface" :aria-label="focusZoneLabel">
            <header class="fb-focus__head">
              <h2>{{ focusZoneLabel }}</h2>
            </header>

            <!-- Dzień: słowny fokus -->
            <div v-if="scale === 'day'" class="fb-day-focus">
              <form v-if="editingDayFocus" class="fb-day-focus__form" @submit.prevent="commitDayFocus">
                <input v-model="dayFocusDraft" type="text" placeholder="Np. Dziś domykam decyzję o budżecie i nie otwieram nic nowego." aria-label="Fokus dnia" />
                <button type="submit"><AppIcon name="check" /></button>
              </form>
              <div v-else-if="dayFocus" class="fb-day-focus__quote">
                <AppIcon name="format_quote" />
                <p>{{ dayFocus }}</p>
                <button type="button" aria-label="Zmień fokus dnia" @click="startDayFocusEdit"><AppIcon name="edit" /></button>
              </div>
              <button v-else type="button" class="fb-day-focus__empty" @click="startDayFocusEdit">
                <AppIcon name="edit_note" />
                <span><strong>Ustal fokus dnia</strong></span>
              </button>
            </div>

            <!-- Tydzień: obiekty fokusowe -->
            <div v-else-if="scale === 'week'" class="fb-focus-row">
              <button
                v-for="item in weekFocusObjects"
                :key="item.key"
                type="button"
                class="fb-focus-tile"
                :class="{ active: filter === 'focus' && selectedCardKey === item.key }"
                :aria-pressed="filter === 'focus' && selectedCardKey === item.key"
                @click="openFocusObject(item)"
              >
                <span class="fb-focus-tile__status" :class="`status-${statusFor(item)}`"><i /></span>
                <span class="fb-focus-tile__copy">
                  <strong>{{ item.title }}</strong>
                </span>
                <AppIcon :name="familyIcon[item.family]" class="fb-focus-tile__icon" />
              </button>
            </div>

            <!-- Miesiąc: trzy priorytety -->
            <div v-else class="fb-focus-row">
              <button
                v-for="priority in monthPriorities"
                :key="priority.key"
                type="button"
                class="fb-focus-tile fb-focus-tile--priority"
                :class="{ active: filter === `priority:${priority.key}` }"
                :aria-pressed="filter === `priority:${priority.key}`"
                @click="toggleFilter(`priority:${priority.key}`)"
              >
                <i class="fb-tone" :class="`tone-${priority.tone}`" />
                <span class="fb-focus-tile__copy">
                  <strong>{{ priority.title }}</strong>
                </span>
                <span class="fb-effort" :aria-label="`Wysiłek ${priority.effort} z 5`">
                  <i v-for="dot in 5" :key="dot" :class="{ filled: dot <= priority.effort }" />
                </span>
              </button>
            </div>
          </section>

          <!-- Strefa 3: przeglądarka kart -->
          <section class="fb-browser fb-surface" aria-label="Karty obiektów">
            <header class="fb-browser__head">
              <label class="fb-filter">
                <span class="fb-filter__icon"><AppIcon name="filter_list" /></span>
                <select v-model="filter" aria-label="Filtr kart" @change="selectedCardKey = null">
                  <option value="focus">Fokus</option>
                  <optgroup label="Typ obiektu">
                    <option v-for="category in filterCategories" :key="category.key" :value="category.key">{{ category.label }}</option>
                  </optgroup>
                  <optgroup label="Priorytet">
                    <option v-for="priority in filterPriorities" :key="priority.key" :value="`priority:${priority.key}`">{{ priority.title }}</option>
                  </optgroup>
                </select>
                <AppIcon name="expand_more" class="fb-filter__chevron" />
              </label>
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

            <div v-if="cards.length" class="detail-grid" :style="{ gridTemplateColumns: `repeat(${density}, minmax(0, 1fr))` }">
              <button
                v-for="card in cards"
                :key="card.key"
                type="button"
                class="sketch-detail-card"
                :class="[{ active: selectedCardKey === card.key }, `sketch-detail-card--${card.kind}`]"
                :aria-describedby="`fb-card-summary-${card.key}`"
                :aria-pressed="selectedCardKey === card.key"
                @click="selectedCardKey = selectedCardKey === card.key ? null : card.key"
              >
                <header>
                  <span><AppIcon :name="card.icon" /><strong>{{ card.title }}</strong></span>
                  <em :id="`fb-card-summary-${card.key}`" class="sketch-detail-card__summary">{{ card.summary }}</em>
                </header>

                <div v-if="card.kind === 'dots'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-dots" :style="axisColumnsStyle"><i v-for="(cell, index) in card.cells" :key="index" :class="cell" /></div>
                  <div class="detail-weekdays" :style="axisColumnsStyle"><span v-for="label in axisLabels" :key="label">{{ label }}</span></div>
                </div>

                <div v-else-if="card.kind === 'bars'" class="detail-week-chart" aria-hidden="true">
                  <div class="detail-bars">
                    <i
                      v-for="(bar, index) in card.bars"
                      :key="index"
                      :style="{ height: bar.empty ? '2px' : `${bar.height}%`, transform: `rotate(${index % 2 ? '-1.2deg' : '.8deg'})` }"
                      :class="{ current: bar.current, empty: bar.empty }"
                    />
                  </div>
                  <div class="detail-weekdays" :style="axisColumnsStyle"><span v-for="label in axisLabels" :key="label">{{ label }}</span></div>
                </div>

                <div v-else-if="card.kind === 'line'" class="detail-week-chart">
                  <svg class="detail-line" viewBox="0 0 500 115" role="img" :aria-label="`Przebieg: ${card.title}`" preserveAspectRatio="none">
                    <line v-if="card.targetY !== null" x1="0" :y1="card.targetY" x2="500" :y2="card.targetY" class="target-line" />
                    <path v-if="card.line.length > 1" class="pencil-echo" :d="smoothPath(card.line, 3)" />
                    <path v-if="card.line.length > 1" :d="smoothPath(card.line)" />
                    <circle v-if="card.line.length" :cx="card.line.at(-1)!.x" :cy="card.line.at(-1)!.y" r="5" />
                  </svg>
                  <div class="detail-weekdays" aria-hidden="true" :style="axisColumnsStyle"><span v-for="label in axisLabels" :key="label">{{ label }}</span></div>
                </div>

                <div v-else class="detail-week-chart" aria-hidden="true">
                  <div class="detail-span">
                    <span class="detail-span__track"><i :class="`detail-span__fill--${card.span.status}`" :style="{ width: `${card.span.fillPct}%` }" /></span>
                    <small>cały miesiąc</small>
                  </div>
                </div>
              </button>
            </div>

            <div v-else class="fb-empty">
              <AppIcon name="link_off" />
              <strong>Nic nie jest jeszcze podpięte pod ten priorytet.</strong>
              <p>Podepnij cele, nawyki albo trackery w hubie priorytetu, a ich karty pojawią się tutaj.</p>
            </div>
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
import YearSketchbookReplica from '~lab/experiments/YearSketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

type ViewScale = 'day' | 'week' | 'month' | 'year'
type BoardScale = 'day' | 'week' | 'month'
type CategoryKey = 'goals' | 'habits' | 'trackers' | 'intentions'
type Point = { x: number; y: number }

const props = withDefaults(defineProps<{ presetId: string; initialScale?: BoardScale }>(), { initialScale: 'day' })
const labStore = useLabStore()

const scale = ref<ViewScale>(props.initialScale)
const scaleOptions: Array<{ key: ViewScale; label: string }> = [
  { key: 'day', label: 'Dzień' },
  { key: 'week', label: 'Tydzień' },
  { key: 'month', label: 'Miesiąc' },
  { key: 'year', label: 'Rok' },
]

function setScale(value: ViewScale) {
  scale.value = value
}

// --- fixture pools ------------------------------------------------------------
const refs = computed(() => labStore.fixture.refs)
const objects = computed(() => labStore.fixture.objects.filter(item => item.status !== 'retired'))
const weeklyObjects = computed(() => objects.value.filter(item => item.cadence === 'weekly'))

const categoryList: Array<{ key: CategoryKey; label: string; families: LabFixtureObject['family'][] }> = [
  { key: 'goals', label: 'Cele', families: ['goal', 'keyResult'] },
  { key: 'habits', label: 'Nawyki', families: ['habit'] },
  { key: 'trackers', label: 'Trackery', families: ['tracker'] },
  { key: 'intentions', label: 'Intencje', families: ['intention'] },
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
const MONTH_FOCUS_KEYS = ['goal-10k', 'goal-mvp', 'habit-monthly-move']

// --- nawigacja okresów ---------------------------------------------------------
const availableWeeks = computed(() => [...labStore.fixture.weeks].sort((left, right) => left.weekRef.localeCompare(right.weekRef)))
const sortedMonths = computed(() => [...labStore.fixture.months].sort((left, right) => left.monthRef.localeCompare(right.monthRef)))

const weekPreset = computed(() => labStore.fixture.presets['calendar-week'].find(item => item.id === props.presetId))
const monthPreset = computed(() => labStore.fixture.presets['calendar-month'].find(item => item.id === props.presetId))

const activeWeekRef = ref(props.initialScale === 'week' ? String(weekPreset.value?.periodRef ?? labStore.fixture.refs.currentWeek) : labStore.fixture.refs.currentWeek)
const activeMonthRef = ref(props.initialScale === 'month' ? String(monthPreset.value?.periodRef ?? labStore.fixture.refs.currentMonth) : labStore.fixture.refs.currentMonth)

const weekIndex = computed(() => availableWeeks.value.findIndex(item => item.weekRef === activeWeekRef.value))
const activeWeek = computed(() => availableWeeks.value.find(item => item.weekRef === activeWeekRef.value) ?? availableWeeks.value.at(-1)!)
const monthIndex = computed(() => sortedMonths.value.findIndex(item => item.monthRef === activeMonthRef.value))
const activeMonth = computed(() => sortedMonths.value.find(item => item.monthRef === activeMonthRef.value) ?? sortedMonths.value.at(-1)!)
const currentWeek = computed(() => availableWeeks.value.find(item => item.weekRef === refs.value.currentWeek) ?? availableWeeks.value.at(-1)!)

const selectedDay = ref(currentWeek.value.days.find(day => day.isToday)?.dayRef ?? currentWeek.value.days[0].dayRef)
const selectedWeek = ref<string | null>(null)

const canGoPrev = computed(() => (scale.value === 'week' ? weekIndex.value > 0 : scale.value === 'month' ? monthIndex.value > 0 : false))
const canGoNext = computed(() => (scale.value === 'week' ? weekIndex.value < availableWeeks.value.length - 1 : scale.value === 'month' ? monthIndex.value < sortedMonths.value.length - 1 : false))

function goPrev() {
  if (scale.value === 'week') activeWeekRef.value = availableWeeks.value[weekIndex.value - 1]?.weekRef ?? activeWeekRef.value
  else if (scale.value === 'month') activeMonthRef.value = sortedMonths.value[monthIndex.value - 1]?.monthRef ?? activeMonthRef.value
}
function goNext() {
  if (scale.value === 'week') activeWeekRef.value = availableWeeks.value[weekIndex.value + 1]?.weekRef ?? activeWeekRef.value
  else if (scale.value === 'month') activeMonthRef.value = sortedMonths.value[monthIndex.value + 1]?.monthRef ?? activeMonthRef.value
}

const periodTitle = computed(() => {
  if (scale.value === 'day') {
    const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${refs.value.today}T12:00:00`))
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
  }
  if (scale.value === 'week') return activeWeek.value.rangeLabel
  return activeMonth.value.label.charAt(0).toUpperCase() + activeMonth.value.label.slice(1)
})

function isFutureDay(dayRef: string) {
  return dayRef > refs.value.today
}

// --- lewa kolumna: plan dnia ----------------------------------------------------
const dayGroups = computed(() => categoryList
  .map(category => ({
    key: category.key,
    label: category.key === 'intentions' ? 'Intencje tygodnia' : category.label,
    items: weeklyObjects.value.filter(item => category.families.includes(item.family) && (item.todayDone !== undefined || item.todayValue !== undefined)),
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

// --- lewa kolumna: oceny tygodnia -----------------------------------------------
const weeklyRatingAreas = [
  { label: 'Ciało' },
  { label: 'Emocje' },
  { label: 'Działanie' },
  { label: 'Relacje' },
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

// --- lewa kolumna: kompas i tygodnie miesiąca ------------------------------------
const dimensionLabels = ['Balans', 'Sens', 'Rozwój', 'Spójność', 'Sprawczość']
const ratingColumns = computed(() => dimensionLabels.map((label, index) => {
  const value = labStore.fixture.ritual.monthlyRatings[index] ?? null
  return { label, value, x: 51 + index * 92, y: value === null ? 67 : 106 - (value / 5) * 74 }
}))
const ratingLinePoints = computed<Point[]>(() => ratingColumns.value.filter(column => column.value !== null).map(column => ({ x: column.x, y: column.y })))

const monthWeekCards = computed(() => activeMonth.value.weeks.map(week => {
  const state = week.weekRef === refs.value.currentWeek ? 'current' : week.weekRef > refs.value.currentWeek ? 'future' : 'closed'
  return {
    weekRef: week.weekRef,
    shortLabel: `T${week.weekRef.split('-W')[1]}`,
    rangeLabel: week.rangeLabel,
    state,
    effort: [0, 1, 2, 3].map(area => week.dimensions[area * 3 + 1] ?? 3),
    stateValues: [0, 1, 2, 3].map(area => week.dimensions[area * 3 + 2] ?? 3),
  }
}))
function weekCombinedAxisPoints(values: number[]): Point[] {
  return values.map((value, index) => ({ x: 15 + index * 50, y: Math.round(34 - (value / 5) * 26) }))
}

// --- strefa 1: akcje okresu ------------------------------------------------------
const selectedDayAction = ref<string | null>(null)
const entryOpen = ref(false)
const entrySource = ref<'fixed' | 'ai'>('fixed')
const entryAnswers = ref<Record<'week' | 'month', string[]>>({ week: ['', '', ''], month: ['', '', ''] })
const entrySaved = ref<Record<'week' | 'month', boolean>>({ week: false, month: false })
const entryScaleKey = computed<'week' | 'month'>(() => (scale.value === 'month' ? 'month' : 'week'))

interface PeriodAction {
  key: string
  label: string
  icon: string
  active: boolean
  onClick: () => void
}

const actions = computed<PeriodAction[]>(() => {
  if (scale.value === 'day') {
    return [
      { key: 'journal', label: 'Dziennik', icon: 'history_edu', active: selectedDayAction.value === 'journal', onClick: () => { selectedDayAction.value = selectedDayAction.value === 'journal' ? null : 'journal' } },
      { key: 'emotions', label: 'Emocje', icon: 'cognition', active: selectedDayAction.value === 'emotions', onClick: () => { selectedDayAction.value = selectedDayAction.value === 'emotions' ? null : 'emotions' } },
      { key: 'exercises', label: 'Ćwiczenia', icon: 'psychology', active: selectedDayAction.value === 'exercises', onClick: () => { selectedDayAction.value = selectedDayAction.value === 'exercises' ? null : 'exercises' } },
    ]
  }
  if (scale.value === 'week') {
    return [
      { key: 'plan', label: 'Plan tygodnia', icon: 'edit_calendar', active: false, onClick: () => window.location.assign('/preview/ritual-week/sketchbook-v1/plan') },
      { key: 'reflect', label: 'Refleksja', icon: 'auto_awesome', active: false, onClick: () => window.location.assign('/preview/ritual-week/sketchbook-v1/reflect') },
      { key: 'entry', label: 'Wpis tygodnia', icon: 'history_edu', active: entryOpen.value, onClick: () => { entryOpen.value = !entryOpen.value } },
    ]
  }
  return [
    { key: 'plan', label: 'Plan miesiąca', icon: 'edit_calendar', active: false, onClick: () => window.location.assign('/preview/ritual-month/sketchbook-v1/plan') },
    { key: 'reflect', label: 'Refleksja', icon: 'auto_awesome', active: false, onClick: () => window.location.assign('/preview/ritual-month/sketchbook-v1/reflect') },
    { key: 'entry', label: 'Wpis miesiąca', icon: 'history_edu', active: entryOpen.value, onClick: () => { entryOpen.value = !entryOpen.value } },
  ]
})

const ENTRY_QUESTIONS: Record<'week' | 'month', Record<'fixed' | 'ai', string[]>> = {
  week: {
    fixed: [
      'Co w tym tygodniu było najważniejsze?',
      'Co Cię zaskoczyło?',
      'Co zmieniasz w kolejnym tygodniu?',
    ],
    ai: [
      'Biegi wróciły do rytmu — co konkretnie pomogło?',
      'Budżet projektu Strumień wciąż czeka — co blokuje decyzję?',
      'We wpisach wraca zmęczenie wieczorami — skąd się bierze?',
    ],
  },
  month: {
    fixed: [
      'Jaki był motyw tego miesiąca?',
      'Co realnie posunęło priorytety do przodu?',
      'Czego było za dużo, a czego za mało?',
    ],
    ai: [
      'Sen poprawiał się w tygodniach z ruchem — widzisz ten związek?',
      'MVP czeka na dwie funkcje — co odkładasz i dlaczego?',
      'Wspólne kolacje wypadały co drugi tydzień — co je wypierało?',
    ],
  },
}
const entryQuestions = computed(() => ENTRY_QUESTIONS[entryScaleKey.value][entrySource.value])

function saveEntry() {
  entrySaved.value = { ...entrySaved.value, [entryScaleKey.value]: true }
  entryOpen.value = false
}

// --- strefa 2: fokus okresu ------------------------------------------------------
const dayFocus = ref('')
const dayFocusDraft = ref('')
const editingDayFocus = ref(false)

function startDayFocusEdit() {
  dayFocusDraft.value = dayFocus.value
  editingDayFocus.value = true
}
function commitDayFocus() {
  dayFocus.value = dayFocusDraft.value.trim()
  editingDayFocus.value = false
}

const focusZoneLabel = computed(() => (scale.value === 'day' ? 'Fokus dnia' : scale.value === 'week' ? 'Fokus tygodnia' : 'Priorytety miesiąca'))

const weekFocusObjects = computed(() => WEEK_FOCUS_KEYS
  .map(key => weeklyObjects.value.find(item => item.key === key))
  .filter((item): item is LabFixtureObject => Boolean(item)))

const monthPriorities = computed(() => labStore.fixture.priorities.slice(0, 3).map((priority, index) => ({
  ...priority,
  effort: activeMonth.value.priorityEffort[index] ?? 3,
})))

function openFocusObject(item: LabFixtureObject) {
  filter.value = 'focus'
  selectedCardKey.value = selectedCardKey.value === item.key ? null : item.key
}

// --- strefa 3: filtry i karty ----------------------------------------------------
const filter = ref<string>('focus')
const selectedCardKey = ref<string | null>(null)
const density = ref<1 | 2 | 3>(2)

watch(scale, () => {
  filter.value = 'focus'
  selectedCardKey.value = null
  entryOpen.value = false
})

function toggleFilter(key: string) {
  filter.value = filter.value === key ? 'focus' : key
  selectedCardKey.value = null
}

const filterCategories = computed(() => categoryList.filter(category => !(scale.value === 'day' && category.key === 'intentions')))
const filterPriorities = computed(() => labStore.fixture.priorities.slice(0, 3))

const cardPool = computed<LabFixtureObject[]>(() => {
  const pool = scale.value === 'month' ? objects.value : weeklyObjects.value
  if (filter.value === 'focus') {
    const keys = scale.value === 'month' ? MONTH_FOCUS_KEYS : WEEK_FOCUS_KEYS
    return keys.map(key => objects.value.find(item => item.key === key)).filter((item): item is LabFixtureObject => Boolean(item))
  }
  if (filter.value.startsWith('priority:')) {
    const key = filter.value.slice('priority:'.length)
    return pool.filter(item => item.priorityKeys.includes(key))
  }
  const families = categoryList.find(category => category.key === filter.value)?.families ?? []
  return pool.filter(item => families.includes(item.family))
})

// wykresy: dni tygodnia (dzień/tydzień) albo tygodnie miesiąca (miesiąc)
const cardsWeek = computed(() => (scale.value === 'week' ? activeWeek.value : currentWeek.value))
const axisLabels = computed(() => (scale.value === 'month'
  ? monthWeekCards.value.map(week => week.shortLabel)
  : cardsWeek.value.days.map(day => day.shortLabel)))
const axisColumnsStyle = computed(() => ({ gridTemplateColumns: `repeat(${axisLabels.value.length}, minmax(0, 1fr))` }))

interface FocusCard {
  key: string
  icon: string
  title: string
  summary: string
  kind: 'dots' | 'bars' | 'line' | 'span'
  cells: string[]
  bars: Array<{ height: number; current: boolean; empty: boolean }>
  line: Point[]
  targetY: number | null
  span: { status: string; fillPct: number }
}

function statusLabelFor(point?: LabChartPoint): string {
  return point?.status === 'met' ? 'na celu' : point?.status === 'missed' ? 'do uwagi' : point?.status === 'no-target' ? 'obserwacja' : 'bez danych'
}
function currentWeekPoint(item: LabFixtureObject): LabChartPoint | undefined {
  return item.chart.find(point => point.periodRef === cardsWeek.value.weekRef)
}
function statusFor(item: LabFixtureObject): LabChartPoint['status'] {
  return currentWeekPoint(item)?.status ?? 'no-data'
}

function weekScaleCard(item: LabFixtureObject): FocusCard {
  const week = cardsWeek.value
  const point = currentWeekPoint(item)
  const value = Math.max(0, Math.round(point?.value ?? 0))
  const kind = item.entryMode === 'completion' || item.entryMode === 'multi-completion' ? 'dots' : item.entryMode === 'value' || item.entryMode === 'rating' ? 'line' : 'bars'
  const assigned = Math.min(7, Math.max(value, Math.round(point?.target ?? 0)))
  const cells = week.days.map((day, index) => (isFutureDay(day.dayRef) ? 'assigned' : index < value ? 'done' : index < assigned ? 'missed' : 'unassigned'))
  const total = Math.max(1, value)
  const bars = week.days.map((day, index) => ({
    height: Math.max(8, Math.min(92, (((index + 2) % 4) + 1) * (82 / total))),
    current: day.isToday,
    empty: isFutureDay(day.dayRef),
  }))
  const sampleCount = Math.max(1, week.days.filter(day => !isFutureDay(day.dayRef)).length)
  const center = point?.value ?? item.todayValue ?? 0
  const target = point?.target
  const max = Math.max(1, center + 1, target ?? 0)
  const line = Array.from({ length: sampleCount }, (_, index) => ({
    x: sampleCount === 1 ? 250 : 5 + index * (490 / (sampleCount - 1)),
    y: 88 - (Math.max(0, center + ((index % 3) - 1) * 0.35) / max) * 68,
  }))
  const targetY = target === undefined ? null : 88 - (target / max) * 68
  return {
    key: item.key,
    icon: familyIcon[item.family],
    title: item.title,
    summary: `${statusLabelFor(point)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`,
    kind,
    cells,
    bars,
    line,
    targetY,
    span: { status: 'empty', fillPct: 0 },
  }
}

function monthPoints(item: LabFixtureObject): LabChartPoint[] {
  if (item.cadence === 'monthly') return item.chart.filter(point => point.periodRef === activeMonth.value.monthRef)
  const weekRefs = new Set<string>(activeMonth.value.weeks.map(week => week.weekRef))
  return item.chart.filter(point => weekRefs.has(point.periodRef))
}

function monthScaleCard(item: LabFixtureObject): FocusCard {
  const points = monthPoints(item)
  const kind = item.cadence === 'monthly' ? 'span' : item.entryMode === 'completion' || item.entryMode === 'multi-completion' ? 'dots' : item.entryMode === 'value' || item.entryMode === 'rating' ? 'line' : 'bars'
  const target = points.find(point => point.target !== undefined)?.target
  const scaleMax = Math.max(1, ...points.map(point => point.value ?? 0), target ?? 0)
  const pointByWeek = new Map(points.map(point => [point.periodRef, point]))

  const cells = monthWeekCards.value.map(week => {
    const point = pointByWeek.get(week.weekRef)
    const hasData = point !== undefined && point.status !== 'no-data'
    if (hasData) return point.status === 'missed' ? 'missed' : 'done'
    return week.state === 'closed' ? 'unassigned' : 'assigned'
  })
  const bars = monthWeekCards.value.map(week => {
    const point = pointByWeek.get(week.weekRef)
    const hasData = point !== undefined && point.status !== 'no-data' && point.value !== undefined
    return {
      height: hasData ? Math.max(9, Math.min(96, ((point.value ?? 0) / scaleMax) * 92)) : 4,
      current: week.state === 'current' && hasData,
      empty: !hasData,
    }
  })

  let line: Point[] = []
  let targetY: number | null = null
  if (kind === 'line') {
    const entries = monthWeekCards.value
      .map((week, index) => ({ index, point: pointByWeek.get(week.weekRef) }))
      .filter(entry => entry.point?.value !== undefined)
    const values = entries.map(entry => entry.point!.value!)
    const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY)
    const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY)
    const range = Math.max(1, max - min)
    const yFor = (value: number) => 18 + ((max - value) / range) * 68
    const count = monthWeekCards.value.length
    line = entries.map(entry => ({
      x: count === 1 ? 250 : Math.round(5 + entry.index * (490 / (count - 1))),
      y: Math.round(yFor(entry.point!.value!)),
    }))
    targetY = target === undefined ? null : Math.round(yFor(target))
  }

  const monthPoint = points[0]
  const span = {
    status: monthPoint && monthPoint.status !== 'no-data' ? monthPoint.status : 'empty',
    fillPct: monthPoint?.value === undefined ? 4 : Math.max(6, Math.min(100, (monthPoint.value / Math.max(1, monthPoint.target ?? monthPoint.value)) * 100)),
  }

  const withData = points.filter(point => point.status !== 'no-data')
  const met = withData.filter(point => point.status === 'met').length
  const summary = item.cadence === 'monthly'
    ? `${statusLabelFor(monthPoint)}${item.targetLabel ? ` · ${item.targetLabel}` : ''}`
    : `${met}/${withData.length} tyg.${item.targetLabel ? ` · ${item.targetLabel}` : ' na celu'}`

  return { key: item.key, icon: familyIcon[item.family], title: item.title, summary, kind, cells, bars, line, targetY, span }
}

const cards = computed<FocusCard[]>(() => cardPool.value.map(item => (scale.value === 'month' ? monthScaleCard(item) : weekScaleCard(item))))

// --- utils -----------------------------------------------------------------------
function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)
}
function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',')
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
.focus-board {
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
.focus-board--nested { padding: 0; }
.focus-board *, .focus-board *::before, .focus-board *::after { box-sizing: border-box; }
.focus-board button { font: inherit; transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease, border-color .2s ease; }
.focus-board button:active { transform: scale(.985); }

.focus-board__sheet {
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

.fb-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: var(--sketch-surface);
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.fb-surface::after {
  position: absolute;
  inset: 3px 2px 2px 3px;
  border: 1px solid rgb(var(--neo-border) / .07);
  border-radius: inherit;
  pointer-events: none;
  content: '';
  transform: rotate(.08deg);
}

/* ---------- lewa kolumna ---------- */
.fb-rail { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }
.fb-rail:has(.week-ratings) { grid-template-rows: auto 142px minmax(0, 1fr); }

.fb-nav-card { display: grid; gap: 8px; padding: 10px 13px 11px; border-radius: 24px 20px 25px 21px; }
.fb-nav-card__header { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 0 2px; }
.fb-nav-card__header h2 { margin: 0; overflow: hidden; font-size: 14px; font-weight: 800; letter-spacing: .01em; text-overflow: ellipsis; white-space: nowrap; }

.fb-nav {
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
.fb-nav:last-of-type { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.fb-nav:disabled { opacity: .35; cursor: default; }
.fb-nav .material-symbols-outlined { font-size: 17px; }

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
.scale-switch button { min-height: 26px; padding: 3px 4px; border: 0; border-radius: 11px 14px 10px 13px; color: var(--sketch-muted); background: transparent; font-size: 9px; font-weight: 800; cursor: pointer; }
.scale-switch button.active { color: var(--sketch-blue-strong); background: rgb(var(--color-surface-container) / .92); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }

/* dzień: plan dnia */
.fb-day-list { min-width: 0; padding: 11px 16px; overflow: hidden auto; border-radius: 25px 30px 24px 28px; scrollbar-width: thin; }
.fb-day-group h2 { margin: 0; padding: 3px 3px; color: var(--sketch-blue-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.fb-day-group + .fb-day-group { margin-top: 6px; }
.fb-day-row {
  display: grid;
  grid-template-columns: 27px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 34px;
  padding: 0 2px;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
}
.fb-day-row:nth-of-type(even) { transform: rotate(-.035deg); }
.fb-day-row:last-child { border-bottom-color: transparent; }
.fb-day-row > strong { overflow: hidden; font-size: 11px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.fb-day-row__icon { color: var(--sketch-blue-strong); font-size: 19px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 70, 'opsz' 24; }

.fb-stamp {
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
.fb-day-row:nth-of-type(even) .fb-stamp { border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%; }
.fb-stamp:hover { background: rgb(var(--sky-200) / .88); }
.fb-stamp__dot {
  width: 22px;
  height: 22px;
  border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%;
  background: rgb(var(--sky-700));
  box-shadow: inset -1px -1px 3px rgb(var(--sky-500) / .16), inset 1px 1px 3px rgb(var(--sky-800) / .16);
  transform: rotate(-2deg);
}
.fb-stamp--data { color: rgb(var(--sky-800)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .4), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .1); }
.fb-stamp--data strong { font-size: 10px; font-weight: 800; letter-spacing: -.02em; }

/* tydzień: oceny + dni */
.week-ratings { min-height: 0; padding: 7px 16px 2px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.week-ratings__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.week-ratings h2 { margin: 0; padding: 0 2px; color: var(--sketch-blue-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.week-ratings__legend { display: flex; gap: 9px; color: var(--sketch-muted); font-size: 7px; font-weight: 800; }
.week-ratings__legend span { display: flex; align-items: center; gap: 4px; }
.week-ratings__legend i { width: 12px; border-top: 2px solid rgb(var(--sky-600)); }
.week-ratings__legend .effort i { border-color: rgb(var(--rose-400)); }
.week-ratings__chart-wrap { position: relative; z-index: 1; }
.week-ratings__chart { position: relative; z-index: 1; width: 100%; height: 118px; overflow: visible; }
.week-ratings__label { fill: var(--sketch-muted); font-family: 'Nunito', sans-serif; font-size: 10px; font-weight: 750; }
.week-ratings__effort-echo, .week-ratings__state-echo { fill: none; stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
.week-ratings__effort-echo { stroke: rgb(var(--rose-200) / .52); }
.week-ratings__state-echo { stroke: rgb(var(--sky-300) / .42); }
.week-ratings__line { fill: none; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.week-ratings__line--effort { stroke: rgb(var(--rose-400)); }
.week-ratings__line--state { stroke: var(--sketch-blue); }
.week-ratings__bubble { filter: drop-shadow(1px 2px 2.5px rgb(var(--neo-shadow-dark) / .28)); }
.week-ratings__bubble--effort { fill: rgb(var(--rose-400)); }
.week-ratings__bubble--state { fill: rgb(var(--sky-600)); }
.week-ratings__value { fill: rgb(var(--sky-50)); font-family: 'Nunito', sans-serif; font-size: 7px; font-weight: 850; }

.fb-week-days { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 7px; min-height: 0; padding: 10px 16px 11px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.fb-rail__heading { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; padding: 3px 2px 0; }
.fb-rail__heading span { color: var(--sketch-blue-strong); font-size: 8.5px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
.fb-week-day-list { position: relative; z-index: 1; display: grid; align-content: start; min-height: 0; overflow: auto; scrollbar-width: thin; }

.week-day-row {
  position: relative;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 9px;
  min-height: 39px;
  padding: 3px 9px;
  border: 0;
  border-bottom: 1px solid rgb(var(--neo-border) / .12);
  color: var(--sketch-ink);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.week-day-row:hover, .week-day-row.active { border-radius: 16px 13px 17px 14px; background: rgb(var(--color-primary-soft) / .45); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .11); }
.week-day-row.future { opacity: .62; }
.week-day-row.today::before { position: absolute; left: 0; width: 3px; height: 26px; border-radius: 999px; background: var(--sketch-blue); content: ''; }
.week-day-row__date { display: flex; align-items: baseline; gap: 5px; }
.week-day-row__date small { color: var(--sketch-blue-strong); font-size: 9px; font-weight: 900; }
.week-day-row__date strong { font-size: 13px; }
.week-day-row em { justify-self: end; color: rgb(var(--sky-600)); font-size: 7px; font-style: normal; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }

/* miesiąc: kompas + tygodnie */
.fb-month-rail { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 7px; min-width: 0; padding: 12px 16px 11px; overflow: hidden; border-radius: 25px 30px 24px 28px; }
.month-ratings { position: relative; z-index: 1; }
.month-ratings h2, .month-weeks-list h2 { margin: 0; padding: 1px 3px 4px; color: var(--sketch-blue-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.ratings-chart { width: 100%; height: auto; overflow: visible; }
.ratings-chart__label { fill: var(--sketch-muted); font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 750; }
.ratings-chart__line { fill: none; stroke: var(--sketch-blue); stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.ratings-chart .pencil-echo { fill: none; stroke: rgb(var(--sky-300) / .42); stroke-width: 5.5; stroke-linecap: round; stroke-linejoin: round; }
.ratings-chart__bubble { fill: rgb(var(--sky-600)); filter: drop-shadow(1px 2px 2.5px rgb(var(--neo-shadow-dark) / .35)); }
.ratings-chart__bubble--empty { fill: transparent; stroke: rgb(var(--sky-400) / .65); stroke-width: 1.5; stroke-dasharray: 4 4; }
.ratings-chart__value { fill: rgb(var(--sky-50)); font-family: 'Nunito', sans-serif; font-size: 11px; font-weight: 800; }
.ratings-chart__value.empty { fill: rgb(var(--sky-500)); }

.month-weeks-list { position: relative; z-index: 1; min-height: 0; overflow: hidden auto; scrollbar-width: thin; }
.month-weeks-list__head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-right: 4px; }
.week-axis-key { display: flex; align-items: center; gap: 9px; color: var(--sketch-muted); font-size: 7px; font-weight: 800; }
.week-axis-key span { display: flex; align-items: center; gap: 4px; }
.week-axis-key i { width: 11px; border-top: 2px solid rgb(var(--sky-600)); }
.week-axis-key .effort i { border-color: rgb(var(--rose-400)); }

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
.month-week-row:hover, .month-week-row.active { border-bottom-color: transparent; background: rgb(var(--color-primary-soft) / .48); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
.month-week-row__copy { display: grid; gap: 1px; min-width: 0; }
.month-week-row__copy strong { color: var(--sketch-blue-strong); font-size: 12px; font-weight: 800; letter-spacing: .03em; }
.month-week-row.current .month-week-row__copy strong { width: fit-content; padding: 0 8px; border-radius: 999px; background: rgb(var(--sky-200) / .85); box-shadow: inset -1px -1px 3px rgb(var(--neo-inset-light) / .5), inset 1px 1px 3px rgb(var(--neo-inset-dark) / .12); }
.month-week-row__copy small { color: var(--sketch-muted); font-size: 8px; }
.month-week-row__copy em { color: rgb(var(--sky-600)); font-size: 7px; font-style: normal; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.month-week-row.future { opacity: .68; }

.week-dual-chart { position: relative; display: grid; place-items: center; width: 180px; min-height: 47px; padding: 3px 5px; overflow: hidden; border-radius: 11px 9px 12px 10px; background: rgb(var(--sky-50) / .38); }
.week-dual-chart > svg { width: 100%; height: 42px; overflow: visible; fill: none; stroke-linecap: round; stroke-linejoin: round; }
.week-axis-line { stroke-width: 2.2; }
.week-axis-echo { stroke-width: 4.6; }
.week-axis-line--effort { stroke: rgb(var(--rose-400)); }
.week-axis-echo--effort { stroke: rgb(var(--rose-200) / .52); }
.week-axis-line--state { stroke: rgb(var(--sky-600)); }
.week-axis-echo--state { stroke: rgb(var(--sky-300) / .45); }
.week-axis-ghost { stroke: rgb(var(--sky-400) / .5); stroke-width: 1.2; stroke-dasharray: 3 4; }

/* ---------- prawa strona ---------- */
.fb-main { display: grid; grid-template-rows: auto auto minmax(0, 1fr); gap: 15px; min-width: 0; min-height: 0; }
.fb-main--entry { grid-template-rows: auto minmax(0, 1fr); }

/* strefa 1: akcje */
.fb-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); min-height: 62px; overflow: hidden; border-radius: 24px 29px 25px 27px; }
.fb-action {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
  padding: 9px 12px;
  border: 0;
  border-right: 1px solid rgb(var(--neo-border) / .18);
  color: rgb(var(--sky-600));
  background: transparent;
  cursor: pointer;
}
.fb-action:last-child { border-right: 0; }
.fb-action:hover, .fb-action.active { color: var(--sketch-blue-strong); background: rgb(var(--color-primary-soft) / .48); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .68), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
.fb-action__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%;
  color: var(--sketch-blue-strong);
  background: rgb(var(--sky-200) / .74);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .3), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08);
}
.fb-action:nth-child(2) .fb-action__icon { border-radius: 46% 54% 52% 48% / 54% 46% 51% 49%; transform: rotate(-1deg); }
.fb-action:nth-child(3) .fb-action__icon { border-radius: 54% 46% 49% 51% / 46% 54% 52% 48%; transform: rotate(1deg); }
.fb-action__icon .material-symbols-outlined { font-size: 20px; }
.fb-action__copy { display: grid; min-width: 0; text-align: left; }
.fb-action__copy strong { overflow: hidden; color: var(--sketch-blue-strong); font-size: 12px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }

/* prowadzony wpis */
.fb-entry { display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; gap: 12px; min-height: 0; padding: 15px 17px; overflow: auto; border-radius: 27px 23px 28px 24px; scrollbar-width: thin; }
.fb-entry__head { position: relative; z-index: 1; display: grid; grid-template-columns: minmax(0, 1fr) auto 34px; gap: 12px; align-items: start; }
.fb-entry__head h2 { margin: 0; color: var(--sketch-blue-strong); font-size: 14px; font-weight: 800; }
.fb-entry__head p { margin: 3px 0 0; color: var(--sketch-muted); font-size: 9px; }
.fb-entry__source { display: flex; gap: 3px; padding: 3px; border: 1px solid rgb(var(--neo-border) / .18); border-radius: 12px 15px 11px 14px; background: rgb(var(--sky-100) / .55); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .6), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14); }
.fb-entry__source button { min-height: 24px; padding: 3px 9px; border: 0; border-radius: 9px 12px 8px 11px; color: var(--sketch-muted); background: transparent; font-size: 8.5px; font-weight: 800; cursor: pointer; }
.fb-entry__source button.active { color: var(--sketch-blue-strong); background: rgb(var(--color-surface-container) / .92); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .6), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.fb-entry__close { display: grid; place-items: center; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .6); cursor: pointer; }
.fb-entry__ai-note { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; margin: 0; padding: 8px 11px; border: 1px dashed rgb(var(--neo-border) / .4); border-radius: 13px 16px 12px 15px; color: var(--sketch-muted); font-size: 8.5px; }
.fb-entry__ai-note .material-symbols-outlined { flex: 0 0 auto; color: var(--sketch-blue-strong); font-size: 14px; }
.fb-entry__questions { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; }
.fb-entry__question { display: grid; gap: 5px; }
.fb-entry__question > span { color: var(--sketch-blue-strong); font-size: 10.5px; font-weight: 800; }
.fb-entry__question textarea {
  padding: 9px 11px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 14px 17px 13px 16px;
  color: var(--sketch-ink);
  background: rgb(var(--color-surface-container) / .7);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .5), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12);
  font: inherit;
  font-size: 10px;
  resize: vertical;
}
.fb-entry__question textarea:focus { outline: 2px solid rgb(var(--color-primary) / .45); outline-offset: 1px; }
.fb-entry__foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.fb-entry__foot small { color: var(--sketch-muted); font-size: 8px; }
.fb-entry__save { display: flex; align-items: center; gap: 6px; min-height: 30px; padding: 5px 14px; border: 1px solid rgb(var(--color-primary) / .12); border-radius: 16px 20px 15px 19px; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .55); font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .65), 3px 3px 7px rgb(var(--neo-shadow-dark) / .16); }
.fb-entry__save .material-symbols-outlined { font-size: 15px; }

/* strefa 2: fokus */
.fb-focus { display: grid; gap: 8px; padding: 10px 15px 12px; border-radius: 28px 22px 29px 24px; }
.fb-focus__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.fb-focus__head h2 { margin: 0; padding: 1px 2px 0; color: var(--sketch-blue-strong); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.fb-focus__head small { color: var(--sketch-muted); font-size: 7.5px; font-weight: 750; }

.fb-day-focus { position: relative; z-index: 1; min-height: 46px; }
.fb-day-focus__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 46px;
  padding: 8px 12px;
  border: 1px dashed rgb(var(--neo-border) / .45);
  border-radius: 16px 20px 15px 19px;
  color: var(--sketch-muted);
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.fb-day-focus__empty:hover { color: var(--sketch-blue-strong); border-color: rgb(var(--color-primary) / .35); background: rgb(var(--color-primary-soft) / .3); }
.fb-day-focus__empty .material-symbols-outlined { flex: 0 0 auto; color: var(--sketch-blue-strong); font-size: 19px; }
.fb-day-focus__empty span { display: grid; min-width: 0; }
.fb-day-focus__empty strong { font-size: 11px; font-weight: 800; }
.fb-day-focus__form { display: flex; gap: 8px; }
.fb-day-focus__form input {
  flex: 1;
  min-height: 42px;
  padding: 8px 12px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 16px 20px 15px 19px;
  color: var(--sketch-ink);
  background: rgb(var(--color-surface-container) / .7);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .5), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .12);
  font: inherit;
  font-size: 11px;
}
.fb-day-focus__form input:focus { outline: 2px solid rgb(var(--color-primary) / .45); outline-offset: 1px; }
.fb-day-focus__form button { display: grid; flex: 0 0 auto; place-items: center; width: 42px; height: 42px; padding: 0; border: 1px solid rgb(var(--color-primary) / .1); border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .72); cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); }
.fb-day-focus__quote { display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 6px 10px; }
.fb-day-focus__quote > .material-symbols-outlined { flex: 0 0 auto; color: rgb(var(--sky-400)); font-size: 21px; }
.fb-day-focus__quote p { flex: 1; margin: 0; font-size: 12.5px; font-weight: 700; line-height: 1.35; }
.fb-day-focus__quote button { display: grid; flex: 0 0 auto; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .55); cursor: pointer; }
.fb-day-focus__quote button .material-symbols-outlined { font-size: 14px; }

.fb-focus-row { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.fb-focus-tile {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-width: 0;
  min-height: 50px;
  padding: 7px 11px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 16px 20px 15px 19px;
  color: var(--sketch-ink);
  background: rgb(var(--color-surface-container) / .55);
  text-align: left;
  cursor: pointer;
  box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .6), 4px 4px 9px rgb(var(--neo-shadow-dark) / .15);
}
.fb-focus-tile:nth-child(2) { border-radius: 20px 15px 19px 16px; transform: rotate(-.06deg); }
.fb-focus-tile:hover { background: rgb(var(--color-primary-soft) / .4); }
.fb-focus-tile.active { border-color: rgb(var(--color-primary) / .3); background: rgb(var(--color-primary-soft) / .52); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .66), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .16); }
.fb-focus-tile__copy { display: grid; min-width: 0; }
.fb-focus-tile__copy strong { overflow: hidden; font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.fb-focus-tile__icon { color: var(--sketch-blue-strong); font-size: 17px; }
.fb-focus-tile__status { display: grid; place-items: center; width: 14px; }
.fb-focus-tile__status i { width: 9px; height: 9px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--neo-border) / .5); }
.fb-focus-tile__status.status-met i { background: rgb(var(--sky-600)); }
.fb-focus-tile__status.status-missed i { background: rgb(var(--rose-400)); }
.fb-focus-tile__status.status-no-target i { background: rgb(155 110 195 / .8); }

.fb-effort { display: flex; flex: 0 0 auto; gap: 3px; }
.fb-effort i { width: 6px; height: 6px; border-radius: 50%; background: rgb(var(--neo-border) / .45); }
.fb-effort i.filled { background: rgb(var(--sky-600)); }

/* Tony priorytetów zostają w palecie szkicownika (bez zieleni/bursztynu):
   mint → róż, amber → czerwień. */
.fb-tone { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; background: rgb(var(--sky-500)); transform: rotate(-2deg); }
.fb-tone.tone-mint { background: rgb(var(--rose-400)); }
.fb-tone.tone-lavender { background: rgb(155 110 195); }
.fb-tone.tone-amber { background: rgb(var(--color-error) / .85); }

/* strefa 3: przeglądarka kart */
.fb-browser { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 10px; min-height: 0; padding: 13px 15px 15px; border-radius: 27px 23px 28px 24px; }
.fb-browser__head { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 14px; }

.fb-filter {
  position: relative;
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 200px;
  max-width: 280px;
  min-height: 32px;
  padding: 0 26px 0 8px;
  border: 1px solid rgb(var(--neo-border) / .18);
  border-radius: 13px 16px 12px 15px;
  background: rgb(var(--sky-100) / .55);
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .6), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .14);
}
.fb-filter__icon { display: grid; flex: 0 0 auto; place-items: center; width: 21px; height: 21px; border-radius: 51% 49% 46% 54% / 47% 53% 48% 52%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .74); }
.fb-filter__icon .material-symbols-outlined { font-size: 13px; }
.fb-filter select {
  flex: 1;
  min-width: 0;
  padding: 6px 0;
  border: 0;
  outline: 0;
  color: var(--sketch-blue-strong);
  background: transparent;
  font: inherit;
  font-size: 10px;
  font-weight: 800;
  appearance: none;
  cursor: pointer;
}
.fb-filter:focus-within { outline: 2px solid rgb(var(--color-primary) / .4); outline-offset: 1px; }
.fb-filter__chevron { position: absolute; right: 8px; color: var(--sketch-blue-strong); font-size: 15px; pointer-events: none; }

.density-switch { display: flex; flex: 0 0 auto; align-items: center; gap: 4px; }
.density-switch small { margin-right: 5px; color: var(--sketch-muted); font-size: 7.5px; font-weight: 750; letter-spacing: .14em; text-transform: uppercase; }
.density-switch button { width: 26px; height: 26px; padding: 0; border: 0; border-radius: 10px 12px 9px 11px; color: var(--sketch-muted); background: rgb(var(--sky-200) / .38); font-size: 9px; font-weight: 800; cursor: pointer; }
.density-switch button.active { color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .8); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .56), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17); }

.detail-grid { position: relative; z-index: 1; display: grid; gap: 10px; align-content: start; min-width: 0; min-height: 0; overflow: hidden auto; padding-bottom: 3px; scrollbar-width: thin; }

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

.detail-week-chart { display: flex; min-width: 0; flex-direction: column; justify-content: flex-end; }
.detail-dots { display: grid; gap: 8px; align-items: center; min-height: 49px; padding: 9px 6px 2px; }
.detail-dots i { position: relative; display: grid; aspect-ratio: 1; max-height: 25px; place-items: center; border-radius: 47% 53% 45% 55% / 55% 44% 56% 45%; background: rgb(var(--neo-border) / .22); }
.detail-dots i:nth-child(even) { border-radius: 53% 47% 52% 48% / 46% 54% 49% 51%; }
.detail-dots i.assigned, .detail-dots i.done { background: rgb(var(--sky-200) / .78); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .34), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .08); }
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
.detail-weekdays { display: grid; padding: 0 4px; color: rgb(var(--neo-muted) / .72); font-size: 7px; font-weight: 700; letter-spacing: .02em; line-height: 1; text-align: center; text-transform: lowercase; }
.detail-span { display: grid; gap: 5px; padding: 22px 6px 2px; }
.detail-span__track { display: block; height: 12px; overflow: hidden; border-radius: 999px; background: rgb(var(--neo-border) / .22); box-shadow: inset 1px 1px 3px rgb(var(--neo-inset-dark) / .12); }
.detail-span__track i { display: block; height: 100%; border-radius: inherit; }
.detail-span__fill--met { background: linear-gradient(90deg, rgb(var(--sky-300)), rgb(var(--sky-500))); }
.detail-span__fill--missed { background: linear-gradient(90deg, rgb(var(--rose-200)), rgb(var(--rose-400))); }
.detail-span__fill--no-target { background: linear-gradient(90deg, #dccbe6, #b08fc4); }
.detail-span__fill--empty { background: rgb(var(--neo-border) / .35); }
.detail-span small { color: var(--sketch-muted); font-size: 7px; text-align: right; }

.fb-empty {
  position: relative;
  z-index: 1;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  min-height: 160px;
  padding: 20px;
  border: 1px dashed rgb(var(--neo-border) / .4);
  border-radius: 20px 24px 19px 23px;
  text-align: center;
}
.fb-empty .material-symbols-outlined { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 22% 17% 20% 16% / 18% 24% 16% 22%; color: var(--sketch-blue-strong); background: rgb(var(--sky-200) / .6); font-size: 22px; transform: rotate(.6deg); }
.fb-empty strong { color: var(--sketch-blue-strong); font-size: 11px; font-weight: 800; }
.fb-empty p { max-width: 340px; margin: 0; color: var(--sketch-muted); font-size: 9px; line-height: 1.5; }

@media (prefers-reduced-motion: reduce) {
  .sketch-detail-card__summary { transition: none; }
}
</style>
