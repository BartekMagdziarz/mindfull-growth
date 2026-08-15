<template>
  <FocusBoardReplica v-if="props.variantId === 'focus-board-v1'" :preset-id="props.presetId" initial-scale="day" />
  <TodaySketchbookReplica v-else-if="props.variantId === 'sketchbook-v1'" />
  <div v-else class="product-replica today-lab" :class="`today-lab--${activeVariant}`">
    <header class="today-lab__toolbar">
      <div class="today-lab__date">
        <span class="replica-eyebrow">Dzisiaj</span>
        <h2>{{ formattedDate }}</h2>
      </div>
      <div class="replica-toolbar__actions">
        <button type="button" class="round-control" aria-label="Poprzedni dzień"><AppIcon name="chevron_left" /></button>
        <button type="button" class="round-control" aria-label="Wybierz dzień"><AppIcon name="calendar_today" /></button>
        <button type="button" class="round-control" aria-label="Następny dzień"><AppIcon name="chevron_right" /></button>
      </div>
    </header>

    <section class="focus-ribbon" aria-label="Priorytet i obiekty fokusu">
      <button
        v-for="context in focusContexts"
        :key="context.period"
        type="button"
        :class="[`focus-ribbon__item--${context.period}`, { active: selectedFocusPeriod === context.period }]"
        :aria-pressed="selectedFocusPeriod === context.period"
        @click="selectFocus(context.period)"
      >
        <span class="focus-ribbon__icon"><AppIcon :name="context.icon" /></span>
        <span class="focus-ribbon__copy">
          <small>{{ context.label }}</small>
          <strong>{{ context.title }}</strong>
          <em>{{ context.meta }}</em>
        </span>
        <AppIcon name="chevron_right" class="focus-ribbon__chevron" />
      </button>
    </section>

    <div class="today-lab__workspace">
      <aside class="today-lab__day-column">
        <section class="wellness-dock" aria-label="Szybkie wpisy">
          <article class="wellness-card">
            <span>Dziennik</span>
            <button
              type="button"
              class="wellness-visual wellness-visual--journal"
              :class="{ done: journalDone }"
              :aria-label="journalDone ? 'Dzisiejszy wpis jest zapisany' : 'Utwórz wpis do dziennika'"
              @click="journalDone = !journalDone"
            >
              <AppIcon :name="journalDone ? 'check' : 'edit_note'" />
            </button>
          </article>

          <article class="wellness-card">
            <span>Emocje</span>
            <button
              type="button"
              class="wellness-visual wellness-visual--emotion"
              :style="{ background: emotionDonutBackground }"
              :aria-label="`Zalogowane emocje: ${emotionLogs} z 3`"
              @click="emotionLogs = emotionLogs === 3 ? 0 : emotionLogs + 1"
            >
              <strong>{{ emotionLogs }}/3</strong>
            </button>
          </article>

          <article class="wellness-card">
            <span>Ćwiczenia</span>
            <button
              type="button"
              class="wellness-visual wellness-visual--exercise"
              :class="{ done: exerciseDone }"
              :aria-label="exerciseDone ? 'Dzisiejsze ćwiczenie wykonane' : 'Rozpocznij ćwiczenie'"
              @click="exerciseDone = !exerciseDone"
            >
              <AppIcon :name="exerciseDone ? 'check' : 'self_improvement'" />
            </button>
          </article>
        </section>

        <section class="day-list-card neo-card">
          <header class="day-list-card__head">
            <strong>Na dziś</strong>
            <span>{{ completedCount }}/{{ visibleTodayObjects.length }}</span>
          </header>

          <div class="day-list">
            <article
              v-for="item in visibleTodayObjects"
              :key="item.key"
              class="day-row"
              :class="{ done: hasTodayEntry(item) }"
            >
              <button
                v-if="item.entryMode === 'completion'"
                type="button"
                class="day-row__completion"
                :aria-label="hasTodayEntry(item) ? `Cofnij: ${item.title}` : `Zapisz: ${item.title}`"
                @click="toggleDone(item.key)"
              >
                <AppIcon :name="hasTodayEntry(item) ? 'check_circle' : 'radio_button_unchecked'" />
              </button>
              <AppIcon v-else :name="familyIcon(item.family)" class="day-row__family-icon" />

              <button type="button" class="day-row__title" :title="item.contribution || item.title">
                {{ item.title }}
              </button>

              <div v-if="item.entryMode !== 'completion'" class="day-value" @click.stop>
                <button type="button" :aria-label="`Zmniejsz: ${item.title}`" @click="stepValue(item, -1)"><AppIcon name="remove" /></button>
                <strong>{{ numericValue(item) }}</strong>
                <button type="button" :aria-label="`Zwiększ: ${item.title}`" @click="stepValue(item, 1)"><AppIcon name="add" /></button>
              </div>
              <span v-else class="day-row__target">{{ item.targetLabel }}</span>
            </article>
          </div>
        </section>
      </aside>

      <main class="progress-card neo-card">
        <header class="progress-card__head">
          <div class="progress-card__heading">
            <span class="replica-eyebrow">{{ variantMeta.kicker }}</span>
            <h3>{{ variantMeta.title }}</h3>
            <p class="progress-context__label">{{ activeContextLabel }} · {{ activePeriodLabel }}</p>
          </div>

          <label class="priority-picker">
            <span>Priorytet roku</span>
            <span class="priority-picker__control">
              <select v-model="selectedPriority" aria-label="Wybierz priorytet roku" @change="handlePriorityChange">
                <option v-for="priority in priorities" :key="priority.key" :value="priority.key">
                  {{ priority.title }}
                </option>
              </select>
              <AppIcon name="expand_more" />
            </span>
          </label>
        </header>

        <section v-if="activeVariant === 'shared-axis-v1'" class="shared-axis experiment-surface">
          <article class="object-hero">
            <span :class="`context-orb context-orb--${selectedFocusPeriod}`"><AppIcon :name="activeContextIcon" /></span>
            <div class="object-hero__copy">
              <small>{{ activeContextLabel }}</small>
              <h4>{{ activeContextTitle }}</h4>
              <p v-if="selectedFocusPeriod === 'year'">{{ activePriority.desiredDirection }}</p>
              <p v-else>{{ activeMetricObject?.targetLabel }}</p>
            </div>
            <div v-if="activeMetricObject" class="object-hero__metric">
              <strong>{{ currentValueLabel(activeMetricObject) }}</strong>
              <small>{{ activePeriodLabel }}</small>
            </div>
          </article>

          <div v-if="activeMetricObject && activeHistoryObject" class="history-panel">
            <header>
              <span>{{ activeMetricObject.family === 'goal' ? `Miernik celu · ${activeHistoryObject.title}` : historyScopeLabel(activeHistoryObject) }}</span>
              <strong>{{ targetCaption(activeHistoryObject) }}</strong>
            </header>
            <div class="history-chart" :aria-label="`Historia: ${activeHistoryObject.title}`">
              <div v-for="point in historyPoints(activeHistoryObject)" :key="point.periodRef" class="history-chart__column">
                <span>{{ compactPointValue(point, activeHistoryObject) }}</span>
                <i :class="metricTone(point)" :style="historyBarStyle(point, activeHistoryObject)" />
                <small>{{ pointPeriodLabel(point, activeHistoryObject) }}</small>
              </div>
            </div>
          </div>

          <div v-else class="priority-support-pair">
            <button type="button" @click="selectFocus('month')">
              <small>Fokus miesiąca · {{ monthLabel }}</small>
              <strong>{{ focusMonthObject?.title }}</strong>
              <span>{{ focusMonthObject ? currentValueLabel(focusMonthObject) : '—' }}</span>
            </button>
            <button type="button" @click="selectFocus('week')">
              <small>Fokus tygodnia · {{ weekLabel }}</small>
              <strong>{{ focusWeekObject?.title }}</strong>
              <span>{{ focusWeekObject ? currentValueLabel(focusWeekObject) : '—' }}</span>
            </button>
          </div>

          <button type="button" class="details-toggle" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">
            {{ detailsOpen ? 'Ukryj szczegóły' : 'Pokaż szczegóły' }}
            <AppIcon :name="detailsOpen ? 'expand_less' : 'expand_more'" />
          </button>
          <article v-if="detailsOpen" class="detail-disclosure">
            <p>{{ activeMetricObject?.contribution || activePriority.whyNow }}</p>
            <span v-if="activeMetricObject">{{ familyLabel(activeMetricObject.family) }} · {{ cadenceLabel(activeMetricObject) }}</span>
          </article>
        </section>

        <section v-else-if="activeVariant === 'family-lanes-v1'" class="family-lanes experiment-surface">
          <div class="focus-ladder">
            <button
              v-for="context in focusContexts"
              :key="context.period"
              type="button"
              :class="[{ active: selectedFocusPeriod === context.period }, `focus-ladder__item--${context.period}`]"
              @click="selectFocus(context.period)"
            >
              <span><AppIcon :name="context.icon" /></span>
              <small>{{ context.label }}</small>
              <strong>{{ context.title }}</strong>
              <em>{{ context.meta }}</em>
            </button>
          </div>

          <article class="ladder-detail">
            <header>
              <div>
                <small>{{ activeContextLabel }} · {{ activePeriodLabel }}</small>
                <h4>{{ activeContextTitle }}</h4>
              </div>
              <strong v-if="activeMetricObject">{{ currentValueLabel(activeMetricObject) }}</strong>
            </header>
            <span v-if="activeMetricObject?.family === 'goal' && activeHistoryObject" class="metric-source">Miernik celu · {{ activeHistoryObject.title }}</span>
            <div v-if="activeMetricObject && activeHistoryObject" class="mini-history">
              <div v-for="point in historyPoints(activeHistoryObject, 4)" :key="point.periodRef">
                <small>{{ pointPeriodLabel(point, activeHistoryObject) }}</small>
                <span><i :class="metricTone(point)" :style="historyWidthStyle(point, activeHistoryObject)" /></span>
                <strong>{{ compactPointValue(point, activeHistoryObject) }}</strong>
              </div>
            </div>
            <p v-else>{{ activePriority.desiredDirection }}</p>
          </article>
        </section>

        <section v-else-if="activeVariant === 'evidence-stream-v1'" class="evidence-stream experiment-surface">
          <div class="now-grid">
            <button
              v-for="item in focusNowObjects"
              :key="item.key"
              type="button"
              :class="{ active: selectedDetailObject?.key === item.key }"
              @click="selectDetail(item)"
            >
              <span><AppIcon :name="familyIcon(item.family)" /></span>
              <small>{{ focusRoleLabel(item) }}</small>
              <strong>{{ item.title }}</strong>
              <em>{{ currentValueLabel(item) }} · {{ item.cadence === 'monthly' ? monthLabel : weekLabel }}</em>
            </button>
          </div>

          <article v-if="selectedDetailObject" class="now-detail">
            <header>
              <div>
                <small>{{ historyScopeLabel(selectedDetailObject) }}</small>
                <h4>{{ selectedDetailObject.title }}</h4>
              </div>
              <strong>{{ currentValueLabel(selectedDetailObject) }}</strong>
            </header>
            <span v-if="detailHistoryObject?.key !== selectedDetailObject.key" class="metric-source">Miernik celu · {{ detailHistoryObject?.title }}</span>
            <div v-if="detailHistoryObject" class="history-dots">
              <span v-for="point in historyPoints(detailHistoryObject)" :key="point.periodRef">
                <i :class="metricTone(point)" />
                <small>{{ pointPeriodLabel(point, detailHistoryObject) }}</small>
                <em>{{ compactPointValue(point, detailHistoryObject) }}</em>
              </span>
            </div>
          </article>
        </section>

        <section v-else-if="activeVariant === 'priority-compass-v1'" class="priority-compass experiment-surface">
          <article class="priority-summary">
            <span class="context-orb context-orb--year"><AppIcon name="north_star" /></span>
            <div>
              <small>Priorytet roku · {{ yearLabel }}</small>
              <h4>{{ activePriority.title }}</h4>
              <p>{{ activePriority.desiredDirection }}</p>
            </div>
          </article>

          <div class="support-browser">
            <div class="support-browser__list">
              <span class="support-browser__label">Obiekty wspierające</span>
              <button
                v-for="item in supportingObjects.slice(0, 6)"
                :key="item.key"
                type="button"
                :class="{ active: selectedDetailObject?.key === item.key }"
                @click="selectDetail(item)"
              >
                <AppIcon :name="familyIcon(item.family)" />
                <span><strong>{{ item.title }}</strong><small>{{ cadenceLabel(item) }}</small></span>
                <em>{{ currentValueLabel(item) }}</em>
                <AppIcon name="chevron_right" />
              </button>
            </div>

            <article v-if="selectedDetailObject" class="support-browser__detail">
              <small>{{ focusRoleLabel(selectedDetailObject) }} · {{ selectedDetailObject.cadence === 'monthly' ? monthLabel : weekLabel }}</small>
              <h4>{{ selectedDetailObject.title }}</h4>
              <strong>{{ currentValueLabel(selectedDetailObject) }}</strong>
              <span>{{ targetCaption(selectedDetailObject) }}</span>
              <span v-if="detailHistoryObject?.key !== selectedDetailObject.key" class="metric-source">Miernik · {{ detailHistoryObject?.title }}</span>
              <div v-if="detailHistoryObject" class="micro-bars">
                <i
                  v-for="point in historyPoints(detailHistoryObject, 5)"
                  :key="point.periodRef"
                  :class="metricTone(point)"
                  :style="historyBarStyle(point, detailHistoryObject)"
                  :title="`${pointPeriodLabel(point, detailHistoryObject)}: ${compactPointValue(point, detailHistoryObject)}`"
                />
              </div>
              <p v-if="detailsOpen">{{ selectedDetailObject.contribution }}</p>
              <button type="button" class="details-toggle" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">
                {{ detailsOpen ? 'Mniej' : 'Dlaczego wspiera?' }}
                <AppIcon :name="detailsOpen ? 'expand_less' : 'expand_more'" />
              </button>
            </article>
          </div>
        </section>

        <section v-else class="quiet-pulse experiment-surface">
          <article class="quiet-focus">
            <small>{{ activeContextLabel }} · {{ activePeriodLabel }}</small>
            <h4>{{ activeContextTitle }}</h4>
            <p v-if="selectedFocusPeriod === 'year'">{{ activePriority.desiredDirection }}</p>
            <div v-if="quietMetricObject" class="quiet-focus__metric">
              <strong>{{ currentValueLabel(quietMetricObject) }}</strong>
              <span>{{ targetCaption(quietMetricObject) }}</span>
            </div>
            <span v-if="quietHistoryObject?.key !== quietMetricObject?.key" class="metric-source quiet-history__caption">Miernik celu · {{ quietHistoryObject?.title }}</span>
            <div v-if="quietHistoryObject" class="quiet-history">
              <span v-for="point in historyPoints(quietHistoryObject)" :key="point.periodRef">
                <i :class="metricTone(point)" :style="historyBarStyle(point, quietHistoryObject)" />
                <small>{{ pointPeriodLabel(point, quietHistoryObject) }}</small>
              </span>
            </div>
          </article>

          <button type="button" class="details-toggle quiet-focus__toggle" :aria-expanded="detailsOpen" @click="detailsOpen = !detailsOpen">
            {{ detailsOpen ? 'Zamknij' : 'Obiekty wspierające' }}
            <AppIcon :name="detailsOpen ? 'close' : 'arrow_forward'" />
          </button>
          <div v-if="detailsOpen" class="quiet-supports">
            <button v-for="item in supportingObjects.slice(0, 4)" :key="item.key" type="button" @click="selectDetail(item)">
              <span>{{ item.title }}</span><strong>{{ currentValueLabel(item) }}</strong>
            </button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabChartPoint, LabFixtureObject } from '@product/dev/richVerificationScenario'
import FocusBoardReplica from '~lab/experiments/FocusBoardReplica.vue'
import TodaySketchbookReplica from '~lab/experiments/TodaySketchbookReplica.vue'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ presetId: string; variantId?: string }>(), {
  variantId: 'shared-axis-v1',
})

type Family = LabFixtureObject['family']
type FocusPeriod = 'year' | 'month' | 'week'

const labStore = useLabStore()
const priorities = computed(() => labStore.fixture.priorities)
const selectedPriority = ref(labStore.fixture.priorities[0]?.key ?? '')
const selectedFocusPeriod = ref<FocusPeriod>('month')
const selectedDetailKey = ref<string | null>(null)
const detailsOpen = ref(false)
const journalDone = ref(true)
const emotionLogs = ref(1)
const exerciseDone = ref(false)
const completionOverrides = ref(new Set<string>())
const valueOverrides = ref<Record<string, number>>({})

const variantMetaById: Record<string, { kicker: string; title: string }> = {
  'shared-axis-v1': { kicker: 'Eksperyment 01', title: 'Jeden fokus' },
  'family-lanes-v1': { kicker: 'Eksperyment 02', title: 'Drabina fokusu' },
  'evidence-stream-v1': { kicker: 'Eksperyment 03', title: 'Najważniejsze teraz' },
  'priority-compass-v1': { kicker: 'Eksperyment 04', title: 'Obiekty wspierające' },
  'quiet-pulse-v1': { kicker: 'Eksperyment 05', title: 'Minimalny przegląd' },
}

const activeVariant = computed(() => variantMetaById[props.variantId] ? props.variantId : 'shared-axis-v1')
const variantMeta = computed(() => variantMetaById[activeVariant.value])
const activePriority = computed(() => priorities.value.find(priority => priority.key === selectedPriority.value) ?? priorities.value[0])
const openObjects = computed(() => labStore.fixture.objects.filter(item => !['retired', 'orphan'].includes(item.status ?? '')))
const actionable = computed(() => openObjects.value.filter(item => item.family !== 'goal').slice(0, 12))
const visibleTodayObjects = computed(() => actionable.value.slice(0, 8))
const supportingObjects = computed(() => openObjects.value.filter(item => item.priorityKeys.includes(activePriority.value.key) && item.family !== 'intention'))

const focusMonthObject = computed(() => supportingObjects.value.find(item => item.family === 'goal')
  ?? supportingObjects.value.find(item => item.cadence === 'monthly')
  ?? supportingObjects.value[0])
const focusWeekObject = computed(() => supportingObjects.value.find(item => item.cadence === 'weekly' && item.family === 'keyResult')
  ?? supportingObjects.value.find(item => item.cadence === 'weekly')
  ?? supportingObjects.value[0])

const formattedDate = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(`${labStore.fixture.refs.today}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})
const yearLabel = computed(() => labStore.fixture.refs.today.slice(0, 4))
const monthLabel = computed(() => new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' })
  .format(new Date(`${labStore.fixture.refs.currentMonth}-01T12:00:00`)))
const weekLabel = computed(() => {
  const label = labStore.fixture.weeks.find(week => week.weekRef === labStore.fixture.refs.currentWeek)?.rangeLabel
    ?? labStore.fixture.refs.currentWeek.replace('-W', ' · tydz. ')
  const genitiveMonths: Record<string, string> = {
    styczeń: 'stycznia', luty: 'lutego', marzec: 'marca', kwiecień: 'kwietnia', maj: 'maja', czerwiec: 'czerwca',
    lipiec: 'lipca', sierpień: 'sierpnia', wrzesień: 'września', październik: 'października', listopad: 'listopada', grudzień: 'grudnia',
  }
  return Object.entries(genitiveMonths).reduce((result, [month, genitive]) => result.replace(new RegExp(`${month}$`), genitive), label)
})

const activeMetricObject = computed(() => selectedFocusPeriod.value === 'month'
  ? focusMonthObject.value
  : selectedFocusPeriod.value === 'week'
    ? focusWeekObject.value
    : undefined)
const activeContextTitle = computed(() => activeMetricObject.value?.title ?? activePriority.value.title)
const activeContextLabel = computed(() => selectedFocusPeriod.value === 'year'
  ? 'Priorytet roku'
  : selectedFocusPeriod.value === 'month'
    ? 'Fokus miesiąca'
    : 'Fokus tygodnia')
const activePeriodLabel = computed(() => selectedFocusPeriod.value === 'year'
  ? yearLabel.value
  : selectedFocusPeriod.value === 'month'
    ? monthLabel.value
    : weekLabel.value)
const activeContextIcon = computed(() => selectedFocusPeriod.value === 'year' ? 'north_star' : selectedFocusPeriod.value === 'month' ? 'calendar_month' : 'view_week')

const focusContexts = computed(() => [
  { period: 'year' as const, label: 'Priorytet roku', title: activePriority.value.title, meta: yearLabel.value, icon: 'north_star' },
  { period: 'month' as const, label: 'Fokus miesiąca', title: focusMonthObject.value?.title ?? 'Nie wybrano', meta: focusMonthObject.value ? `${currentValueLabel(focusMonthObject.value)} · ${monthLabel.value}` : monthLabel.value, icon: 'calendar_month' },
  { period: 'week' as const, label: 'Fokus tygodnia', title: focusWeekObject.value?.title ?? 'Nie wybrano', meta: focusWeekObject.value ? `${currentValueLabel(focusWeekObject.value)} · ${weekLabel.value}` : weekLabel.value, icon: 'view_week' },
])

const focusNowObjects = computed(() => {
  const objects = [focusMonthObject.value, focusWeekObject.value, ...supportingObjects.value]
    .filter((item): item is LabFixtureObject => Boolean(item))
  return [...new Map(objects.map(item => [item.key, item])).values()].slice(0, 3)
})
const selectedDetailObject = computed(() => openObjects.value.find(item => item.key === selectedDetailKey.value)
  ?? activeMetricObject.value
  ?? focusMonthObject.value)
const quietMetricObject = computed(() => activeMetricObject.value ?? focusMonthObject.value)
const goalHistoryObject = computed(() => supportingObjects.value.find(item => item.family === 'keyResult' && item.cadence === 'weekly' && lastPoint(item).value !== undefined)
  ?? focusWeekObject.value)
const activeHistoryObject = computed(() => activeMetricObject.value?.family === 'goal' ? goalHistoryObject.value : activeMetricObject.value)
const detailHistoryObject = computed(() => selectedDetailObject.value?.family === 'goal' ? goalHistoryObject.value : selectedDetailObject.value)
const quietHistoryObject = computed(() => quietMetricObject.value?.family === 'goal' ? goalHistoryObject.value : quietMetricObject.value)

function selectFocus(period: FocusPeriod) {
  selectedFocusPeriod.value = period
  selectedDetailKey.value = period === 'month' ? focusMonthObject.value?.key ?? null : period === 'week' ? focusWeekObject.value?.key ?? null : null
  detailsOpen.value = false
}

function handlePriorityChange() {
  selectedFocusPeriod.value = 'year'
  selectedDetailKey.value = null
  detailsOpen.value = false
}

function selectDetail(item: LabFixtureObject) {
  selectedDetailKey.value = item.key
  detailsOpen.value = false
}

const emotionDonutBackground = computed(() => {
  const degrees = emotionLogs.value * 120
  return `conic-gradient(rgb(var(--color-quadrant-high-energy-high-pleasantness-bottom)) 0deg ${degrees}deg, rgb(var(--neo-border) / .18) ${degrees}deg 360deg)`
})

function isDone(key: string): boolean {
  const initial = Boolean(labStore.fixture.objects.find(item => item.key === key)?.todayDone)
  return completionOverrides.value.has(key) ? !initial : initial
}

function numericValue(item: LabFixtureObject): number {
  return valueOverrides.value[item.key] ?? item.todayValue ?? 0
}

function hasTodayEntry(item: LabFixtureObject): boolean {
  return item.entryMode === 'completion' ? isDone(item.key) : numericValue(item) > 0
}

const completedCount = computed(() => visibleTodayObjects.value.filter(hasTodayEntry).length)

function toggleDone(key: string) {
  const next = new Set(completionOverrides.value)
  next.has(key) ? next.delete(key) : next.add(key)
  completionOverrides.value = next
}

function stepValue(item: LabFixtureObject, delta: number) {
  const max = item.entryMode === 'rating' ? (item.family === 'tracker' ? 10 : 5) : Number.POSITIVE_INFINITY
  valueOverrides.value = { ...valueOverrides.value, [item.key]: Math.max(0, Math.min(max, numericValue(item) + delta)) }
}

const familyIcons: Record<Family, string> = {
  goal: 'target',
  keyResult: 'flag',
  habit: 'loop',
  tracker: 'monitoring',
  intention: 'gps_fixed',
}
const familyIcon = (family: Family) => familyIcons[family]

const familyLabels: Record<Family, string> = {
  goal: 'Cel',
  keyResult: 'Rezultat',
  habit: 'Nawyk',
  tracker: 'Tracker',
  intention: 'Intencja',
}
const familyLabel = (family: Family) => familyLabels[family]
const cadenceLabel = (item: LabFixtureObject) => item.cadence === 'monthly' ? 'Pomiar miesięczny' : 'Pomiar tygodniowy'
const lastPoint = (item: LabFixtureObject): LabChartPoint => item.chart[item.chart.length - 1]

function currentValueLabel(item: LabFixtureObject): string {
  const point = lastPoint(item)
  if (point.value === undefined) return 'Brak danych'
  if (item.family === 'goal' && item.entryMode === 'completion') return 'W toku'
  if (point.target !== undefined) return `${formatNumber(point.value)} / ${formatNumber(point.target)}`
  return formatNumber(point.value)
}

function compactPointValue(point: LabChartPoint, item: LabFixtureObject): string {
  if (point.value === undefined) return '—'
  if (item.family === 'goal' && item.entryMode === 'completion') return '—'
  if (point.target !== undefined) return `${formatNumber(point.value)}/${formatNumber(point.target)}`
  return formatNumber(point.value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value)
}

function targetCaption(item: LabFixtureObject): string {
  return item.targetLabel ? `Cel: ${item.targetLabel}` : item.entryMode === 'rating' ? 'Skala 1–5' : 'Bez ustalonego celu'
}

function historyPoints(item: LabFixtureObject, count = 6): LabChartPoint[] {
  return item.chart.slice(-count)
}

function historyScopeLabel(item: LabFixtureObject): string {
  return item.cadence === 'monthly' ? 'Ostatnie 6 miesięcy' : 'Ostatnie 6 tygodni'
}

function pointPeriodLabel(point: LabChartPoint, item: LabFixtureObject): string {
  return item.cadence === 'weekly' ? `T${point.label}` : point.label
}

function metricTone(point: LabChartPoint): string {
  if (point.status === 'no-data') return 'metric-neutral'
  if (point.status === 'missed') return 'metric-rose'
  if (point.status === 'no-target') return 'metric-lavender'
  return 'metric-blue'
}

function pointRatio(point: LabChartPoint, item: LabFixtureObject): number {
  if (point.value === undefined) return .08
  const points = historyPoints(item)
  const max = Math.max(1, ...points.flatMap(entry => [entry.value ?? 0, entry.target ?? 0]))
  return Math.max(.12, Math.min(1, point.value / max))
}

function historyBarStyle(point: LabChartPoint, item: LabFixtureObject) {
  return { height: `${Math.round(pointRatio(point, item) * 100)}%` }
}

function historyWidthStyle(point: LabChartPoint, item: LabFixtureObject) {
  return { width: `${Math.round(pointRatio(point, item) * 100)}%` }
}

function focusRoleLabel(item: LabFixtureObject): string {
  if (item.key === focusMonthObject.value?.key) return 'Fokus miesiąca'
  if (item.key === focusWeekObject.value?.key) return 'Fokus tygodnia'
  return familyLabel(item.family)
}
</script>

<style scoped>
.today-lab {
  --today-accent: rgb(var(--color-primary));
  --today-accent-strong: rgb(var(--color-primary-strong));
  min-height: 100%;
}

button,
select {
  font: inherit;
}

button {
  transition: box-shadow .22s ease, transform .16s ease, color .2s ease, background .2s ease, border-color .2s ease;
}

button:active {
  transform: scale(.985);
}

.today-lab__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 12px;
}

.today-lab__date h2 {
  margin: 3px 0 0;
  font-size: 22px;
}

.focus-ribbon {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
  margin-bottom: 15px;
  padding: 7px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 21px;
  background: rgb(var(--neo-surface-base));
  box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .72), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .22);
}

.focus-ribbon > button {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 18px;
  gap: 9px;
  align-items: center;
  min-width: 0;
  min-height: 72px;
  padding: 10px 11px;
  border: 1px solid transparent;
  border-radius: 16px;
  color: rgb(var(--neo-muted));
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.focus-ribbon > button.active {
  color: rgb(var(--neo-text));
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .8), 4px 4px 9px rgb(var(--neo-shadow-dark) / .24);
}

.focus-ribbon__item--year.active { border-color: rgb(var(--color-primary) / .2); }
.focus-ribbon__item--month.active { border-color: rgb(176 143 196 / .25); }
.focus-ribbon__item--week.active { border-color: rgb(var(--rose-400) / .25); }

.focus-ribbon__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: rgb(var(--color-primary-soft) / .65);
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .7), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .16);
}

.focus-ribbon__item--month .focus-ribbon__icon { color: #76548a; background: #f3ecf6; }
.focus-ribbon__item--week .focus-ribbon__icon { color: rgb(var(--rose-600)); background: rgb(var(--rose-100) / .72); }
.focus-ribbon__item--year .focus-ribbon__icon { color: var(--today-accent-strong); }

.focus-ribbon__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.focus-ribbon small,
.focus-ribbon em {
  overflow: hidden;
  font-size: 7px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-ribbon small {
  color: var(--today-accent-strong);
  font-weight: 850;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.focus-ribbon__item--month small { color: #76548a; }
.focus-ribbon__item--week small { color: rgb(var(--rose-600)); }

.focus-ribbon strong {
  overflow: hidden;
  color: rgb(var(--neo-text));
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.focus-ribbon em { color: rgb(var(--neo-muted)); }
.focus-ribbon__chevron { color: rgb(var(--neo-outline)); font-size: 17px; }
.focus-ribbon > button.active .focus-ribbon__chevron { color: var(--today-accent-strong); }

.today-lab__workspace {
  display: grid;
  grid-template-columns: minmax(276px, .72fr) minmax(0, 1.55fr);
  gap: 14px;
  align-items: start;
}

.today-lab__day-column { display: grid; gap: 13px; }
.wellness-dock { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }

.wellness-card {
  display: grid;
  justify-items: center;
  gap: 9px;
  padding: 11px 7px 13px;
  border: 1px solid rgb(var(--neo-border) / .1);
  border-radius: 18px;
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow: -5px -5px 11px rgb(var(--neo-shadow-light) / .78), 5px 5px 11px rgb(var(--neo-shadow-dark) / .26);
}

.wellness-card > span {
  color: rgb(var(--neo-muted));
  font-size: 7px;
  font-weight: 800;
  letter-spacing: .09em;
  text-transform: uppercase;
}

.wellness-visual {
  position: relative;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--today-accent-strong);
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .82), 4px 4px 9px rgb(var(--neo-shadow-dark) / .28);
  cursor: pointer;
}

.wellness-visual:hover { transform: translateY(-1px); box-shadow: -6px -6px 12px rgb(var(--neo-shadow-light) / .86), 6px 6px 12px rgb(var(--neo-shadow-dark) / .3); }
.wellness-visual.done { color: white; background: linear-gradient(145deg, rgb(var(--neo-accent-start)), rgb(var(--neo-accent-end))); }

.wellness-visual--emotion::after {
  position: absolute;
  inset: 7px;
  border-radius: 50%;
  background: rgb(var(--neo-surface-base));
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .72), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .22);
  content: '';
}

.wellness-visual--emotion strong { position: relative; z-index: 1; color: rgb(var(--neo-text)); font-size: 12px; }
.day-list-card, .progress-card { overflow: hidden; border-radius: 22px; }
.day-list-card__head, .progress-card__head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 15px; border-bottom: 1px solid rgb(var(--neo-border) / .2); }
.day-list-card__head strong { font-size: 11px; }
.day-list-card__head span { color: var(--today-accent-strong); font-size: 10px; font-weight: 850; }
.day-list { display: grid; }

.day-row {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 48px;
  padding: 7px 11px;
  border-bottom: 1px solid rgb(var(--neo-border) / .14);
}

.day-row:last-child { border-bottom: 0; }
.day-row.done .day-row__title { color: rgb(var(--neo-muted)); text-decoration: line-through; }
.day-row__completion, .day-row__title, .day-value button { padding: 0; border: 0; background: transparent; cursor: pointer; }
.day-row__completion, .day-row__family-icon { color: var(--today-accent-strong); font-size: 18px; }
.day-row__title { overflow: hidden; color: rgb(var(--neo-text)); font-size: 9px; font-weight: 650; text-align: left; text-overflow: ellipsis; white-space: nowrap; }
.day-row__target { max-width: 74px; overflow: hidden; color: rgb(var(--neo-muted)); font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }

.day-value {
  display: grid;
  grid-template-columns: 20px 27px 20px;
  align-items: center;
  min-height: 29px;
  border-radius: 999px;
  background: rgb(var(--neo-surface-base));
  box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .72), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .22);
}

.day-value button { display: grid; place-items: center; color: var(--today-accent-strong); }
.day-value button .material-symbols-outlined { font-size: 13px; }
.day-value strong { text-align: center; font-size: 9px; font-variant-numeric: tabular-nums; }
.progress-card { min-width: 0; }
.progress-card__head { align-items: center; }
.progress-card__heading { min-width: 0; }
.progress-card__head h3 { margin: 2px 0 0; font-size: 17px; }
.progress-context__label { margin: 4px 0 0; color: rgb(var(--neo-muted)); font-size: 8px; }

.priority-picker { display: grid; gap: 4px; min-width: 205px; }
.priority-picker > span:first-child { padding-left: 8px; color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.priority-picker__control { position: relative; display: flex; align-items: center; min-height: 35px; border-radius: 12px; background: rgb(var(--neo-surface-base)); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .72), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .2); }
.priority-picker select { width: 100%; padding: 8px 30px 8px 10px; border: 0; outline: 0; color: rgb(var(--neo-text)); background: transparent; font-size: 8px; font-weight: 700; appearance: none; cursor: pointer; }
.priority-picker .material-symbols-outlined { position: absolute; right: 9px; color: var(--today-accent-strong); pointer-events: none; }

.experiment-surface { min-height: 390px; padding: 18px; }
.object-hero { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 14px; align-items: center; padding: 14px; border-radius: 18px; background: rgb(var(--color-surface) / .4); }
.context-orb { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 17px; box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .7), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .16); }
.context-orb--year { color: var(--today-accent-strong); background: rgb(var(--color-primary-soft) / .72); }
.context-orb--month { color: #76548a; background: #f3ecf6; }
.context-orb--week { color: rgb(var(--rose-600)); background: rgb(var(--rose-100) / .75); }
.object-hero__copy { min-width: 0; }
.object-hero__copy small, .ladder-detail small, .now-detail small, .priority-summary small, .support-browser__detail > small, .quiet-focus > small { color: var(--today-accent-strong); font-size: 7px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
.object-hero h4, .ladder-detail h4, .now-detail h4, .priority-summary h4, .support-browser__detail h4, .quiet-focus h4 { margin: 3px 0 0; font-size: 14px; }
.object-hero p, .ladder-detail p, .priority-summary p, .support-browser__detail p, .quiet-focus p { margin: 4px 0 0; color: rgb(var(--neo-muted)); font-size: 8px; line-height: 1.45; }
.object-hero__metric { display: grid; justify-items: end; gap: 3px; padding-left: 14px; border-left: 1px solid rgb(var(--neo-border) / .25); }
.object-hero__metric strong { color: var(--today-accent-strong); font-size: 20px; font-variant-numeric: tabular-nums; }
.object-hero__metric small { color: rgb(var(--neo-muted)); font-size: 7px; }

.history-panel { margin-top: 16px; padding: 14px 14px 10px; border-radius: 17px; background: rgb(var(--neo-surface-base)); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .7), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .2); }
.history-panel > header { display: flex; justify-content: space-between; gap: 12px; color: rgb(var(--neo-muted)); font-size: 7px; }
.history-panel > header strong { color: rgb(var(--neo-text)); font-size: 7px; }
.history-chart { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; align-items: end; height: 168px; padding: 26px 12px 2px; }
.history-chart__column { display: grid; grid-template-rows: 17px 1fr 17px; justify-items: center; gap: 4px; align-items: end; height: 100%; }
.history-chart__column > span { color: rgb(var(--neo-text)); font-size: 7px; font-weight: 750; }
.history-chart__column > i { width: min(26px, 66%); min-height: 7px; border-radius: 999px 999px 5px 5px; box-shadow: inset 1px 1px 2px rgb(255 255 255 / .3); }
.history-chart__column > small { color: rgb(var(--neo-muted)); font-size: 6.5px; }
.metric-blue { background: linear-gradient(180deg, rgb(var(--sky-300)), rgb(var(--sky-500))); }
.metric-lavender { background: linear-gradient(180deg, #dccbe6, #b08fc4); }
.metric-rose { background: linear-gradient(180deg, rgb(var(--rose-200)), rgb(var(--rose-500))); }
.metric-neutral { background: rgb(var(--neo-border) / .48); }

.priority-support-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 16px; }
.priority-support-pair button { display: grid; gap: 5px; min-width: 0; padding: 16px; border: 1px solid rgb(var(--neo-border) / .15); border-radius: 17px; color: rgb(var(--neo-text)); background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom))); text-align: left; cursor: pointer; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .72), 4px 4px 9px rgb(var(--neo-shadow-dark) / .2); }
.priority-support-pair small { color: rgb(var(--neo-muted)); font-size: 7px; }
.priority-support-pair strong { overflow: hidden; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.priority-support-pair span { color: var(--today-accent-strong); font-size: 9px; font-weight: 800; }
.details-toggle { display: flex; align-items: center; justify-content: center; gap: 5px; margin: 13px auto 0; padding: 7px 10px; border: 0; color: var(--today-accent-strong); background: transparent; font-size: 7.5px; font-weight: 800; cursor: pointer; }
.details-toggle .material-symbols-outlined { font-size: 16px; }
.detail-disclosure { margin-top: 4px; padding: 12px 14px; border-radius: 14px; background: rgb(var(--color-primary-soft) / .42); }
.detail-disclosure p { margin: 0; font-size: 8px; line-height: 1.5; }
.detail-disclosure span { display: block; margin-top: 5px; color: rgb(var(--neo-muted)); font-size: 7px; }

.focus-ladder { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 23px; padding: 4px 4px 22px; }
.focus-ladder::before { position: absolute; top: 39px; right: 10%; left: 10%; height: 2px; background: linear-gradient(90deg, rgb(var(--sky-300)), #cdb4db, rgb(var(--rose-300))); content: ''; opacity: .55; }
.focus-ladder button { position: relative; z-index: 1; display: grid; justify-items: center; gap: 4px; min-width: 0; padding: 8px 8px 12px; border: 0; border-radius: 15px; color: rgb(var(--neo-muted)); background: transparent; text-align: center; cursor: pointer; }
.focus-ladder button.active { color: rgb(var(--neo-text)); background: rgb(var(--color-surface) / .5); box-shadow: inset -2px -2px 5px rgb(var(--neo-inset-light) / .7), inset 2px 2px 5px rgb(var(--neo-inset-dark) / .17); }
.focus-ladder button > span { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 5px; border: 6px solid rgb(var(--neo-surface-base)); border-radius: 50%; color: var(--today-accent-strong); background: rgb(var(--sky-100)); box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .76), 3px 3px 7px rgb(var(--neo-shadow-dark) / .24); }
.focus-ladder__item--month > span { color: #76548a !important; background: #f3ecf6 !important; }
.focus-ladder__item--week > span { color: rgb(var(--rose-600)) !important; background: rgb(var(--rose-100)) !important; }
.focus-ladder small { color: inherit; font-size: 6.5px; font-weight: 800; text-transform: uppercase; }
.focus-ladder strong { max-width: 100%; overflow: hidden; color: rgb(var(--neo-text)); font-size: 8.5px; text-overflow: ellipsis; white-space: nowrap; }
.focus-ladder em { color: rgb(var(--neo-muted)); font-size: 6.5px; font-style: normal; }
.ladder-detail { padding: 16px; border-radius: 18px; background: rgb(var(--color-surface) / .42); }
.ladder-detail > header, .now-detail > header { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.ladder-detail > header > strong, .now-detail > header > strong { color: var(--today-accent-strong); font-size: 18px; }
.mini-history { display: grid; gap: 9px; margin-top: 16px; }
.metric-source { display: block; margin-top: 12px; color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 750; letter-spacing: .04em; }
.mini-history > div { display: grid; grid-template-columns: 30px minmax(0, 1fr) 40px; gap: 9px; align-items: center; }
.mini-history small { color: rgb(var(--neo-muted)); font-size: 6.5px; text-transform: none; }
.mini-history span { height: 9px; padding: 2px; border-radius: 999px; background: rgb(var(--neo-surface-base)); box-shadow: inset -1px -1px 3px rgb(var(--neo-inset-light) / .7), inset 1px 1px 3px rgb(var(--neo-inset-dark) / .2); }
.mini-history span i { display: block; height: 100%; min-width: 5px; border-radius: inherit; }
.mini-history strong { font-size: 7px; text-align: right; }

.now-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.now-grid button { display: grid; justify-items: start; min-width: 0; padding: 13px; border: 1px solid transparent; border-radius: 17px; color: rgb(var(--neo-text)); background: rgb(var(--color-surface) / .38); text-align: left; cursor: pointer; }
.now-grid button.active { border-color: rgb(var(--color-primary) / .22); background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom))); box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .72), 4px 4px 9px rgb(var(--neo-shadow-dark) / .2); }
.now-grid button > span { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 10px; border-radius: 11px; color: var(--today-accent-strong); background: rgb(var(--color-primary-soft) / .65); }
.now-grid small { color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 800; text-transform: uppercase; }
.now-grid strong { width: 100%; overflow: hidden; margin-top: 3px; font-size: 8.5px; text-overflow: ellipsis; white-space: nowrap; }
.now-grid em { margin-top: 9px; color: var(--today-accent-strong); font-size: 7px; font-style: normal; font-weight: 750; }
.now-detail { margin-top: 15px; padding: 16px; border-radius: 18px; background: rgb(var(--neo-surface-base)); box-shadow: inset -3px -3px 7px rgb(var(--neo-inset-light) / .7), inset 3px 3px 7px rgb(var(--neo-inset-dark) / .2); }
.history-dots { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 25px; }
.history-dots > span { position: relative; display: grid; justify-items: center; gap: 5px; }
.history-dots > span::before { position: absolute; top: 6px; left: -50%; width: 100%; height: 2px; background: rgb(var(--neo-border) / .4); content: ''; }
.history-dots > span:first-child::before { display: none; }
.history-dots i { z-index: 1; width: 13px; height: 13px; border: 3px solid rgb(var(--neo-surface-base)); border-radius: 50%; box-shadow: 0 0 0 1px rgb(var(--neo-border) / .28); }
.history-dots small { color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 500; text-transform: none; }
.history-dots em { color: rgb(var(--neo-text)); font-size: 6.5px; font-style: normal; }

.priority-summary { display: flex; align-items: center; gap: 14px; padding: 2px 2px 16px; }
.priority-summary h4 { font-size: 15px; }
.support-browser { display: grid; grid-template-columns: minmax(230px, .95fr) minmax(210px, 1.05fr); gap: 13px; }
.support-browser__list { display: grid; align-content: start; gap: 5px; }
.support-browser__label { padding: 0 7px 5px; color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 800; text-transform: uppercase; }
.support-browser__list button { display: grid; grid-template-columns: 24px minmax(0, 1fr) auto 16px; gap: 7px; align-items: center; min-width: 0; padding: 9px; border: 1px solid transparent; border-radius: 12px; color: rgb(var(--neo-text)); background: transparent; text-align: left; cursor: pointer; }
.support-browser__list button.active { border-color: rgb(var(--color-primary) / .18); background: rgb(var(--color-primary-soft) / .46); box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .66), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .14); }
.support-browser__list button > .material-symbols-outlined:first-child { color: var(--today-accent-strong); font-size: 17px; }
.support-browser__list button > .material-symbols-outlined:last-child { color: rgb(var(--neo-muted)); font-size: 15px; }
.support-browser__list button span { display: grid; min-width: 0; }
.support-browser__list strong { overflow: hidden; font-size: 7.5px; text-overflow: ellipsis; white-space: nowrap; }
.support-browser__list small { color: rgb(var(--neo-muted)); font-size: 6px; }
.support-browser__list em { color: var(--today-accent-strong); font-size: 7px; font-style: normal; font-weight: 800; }
.support-browser__detail { display: grid; align-content: start; min-height: 235px; padding: 18px; border-radius: 18px; background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom))); box-shadow: -5px -5px 11px rgb(var(--neo-shadow-light) / .72), 5px 5px 11px rgb(var(--neo-shadow-dark) / .22); }
.support-browser__detail > strong { margin-top: 15px; color: var(--today-accent-strong); font-size: 25px; }
.support-browser__detail > span { margin-top: 2px; color: rgb(var(--neo-muted)); font-size: 7px; }
.micro-bars { display: flex; align-items: end; gap: 7px; height: 62px; margin-top: 18px; }
.micro-bars i { flex: 1; min-height: 6px; border-radius: 999px 999px 3px 3px; opacity: .86; }
.support-browser__detail .details-toggle { margin-top: 7px; }

.quiet-pulse { display: grid; align-content: start; justify-items: center; padding-top: 34px; }
.quiet-focus { width: min(570px, 100%); text-align: center; }
.quiet-focus h4 { margin-top: 5px; font-size: 18px; }
.quiet-focus p { max-width: 430px; margin: 7px auto 0; }
.quiet-focus__metric { display: grid; justify-items: center; gap: 3px; margin-top: 22px; }
.quiet-focus__metric strong { color: var(--today-accent-strong); font-size: 34px; font-variant-numeric: tabular-nums; }
.quiet-focus__metric span { color: rgb(var(--neo-muted)); font-size: 7px; }
.quiet-history { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; align-items: end; height: 105px; margin: 19px auto 0; padding: 8px 20px 0; border-bottom: 1px solid rgb(var(--neo-border) / .3); }
.quiet-history__caption { margin-top: 16px; }
.quiet-history > span { display: grid; grid-template-rows: 1fr 18px; justify-items: center; align-items: end; height: 100%; }
.quiet-history i { width: 9px; min-height: 5px; border-radius: 999px; opacity: .74; }
.quiet-history small { color: rgb(var(--neo-muted)); font-size: 6px; }
.quiet-focus__toggle { margin-top: 18px; }
.quiet-supports { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; width: min(560px, 100%); margin-top: 8px; }
.quiet-supports button { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-width: 0; padding: 9px 11px; border: 0; border-radius: 11px; color: rgb(var(--neo-text)); background: rgb(var(--color-surface) / .4); cursor: pointer; }
.quiet-supports span { overflow: hidden; font-size: 7px; text-overflow: ellipsis; white-space: nowrap; }
.quiet-supports strong { flex: 0 0 auto; color: var(--today-accent-strong); font-size: 7px; }
</style>
