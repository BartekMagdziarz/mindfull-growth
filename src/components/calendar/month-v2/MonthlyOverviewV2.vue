<template>
  <section
    class="month-v2"
    :class="{ 'month-v2--focused': activeFocus !== null }"
    :aria-label="t('planning.calendar.monthV2.overview')"
  >
    <PlanningStatePanel
      v-if="isLoading"
      :title="t('common.loading')"
      :body="t('planning.calendar.title')"
      :eyebrow="t('planning.calendar.monthV2.overview')"
      compact
    />

    <PlanningStatePanel
      v-else-if="loadError"
      :title="t('planning.calendar.loadError')"
      :body="loadError"
      :eyebrow="t('planning.calendar.monthV2.overview')"
      :action-label="t('common.buttons.tryAgain')"
      compact
      @action="void reload()"
    />

    <template v-else-if="viewModel">
      <div class="month-v2__stage" :class="{ 'month-v2__stage--focused': activeFocus }">
        <section class="month-v2__surface month-v2__time" data-testid="month-v2-time-panel">
          <div
            ref="timeGridElement"
            class="month-v2__time-grid"
            :style="{ '--week-chart-offset': `${weekChartOffset}px` }"
          >
            <section class="month-v2__month" :aria-label="monthTitle">
              <header class="month-v2__month-heading">
                <div>
                  <p class="month-v2__eyebrow">
                    {{ t('planning.reflection.monthly.title') }}
                  </p>
                  <h2>{{ monthName }}</h2>
                </div>
                <span class="month-v2__year">{{ monthYear }}</span>
              </header>

              <MonthDimensionChart
                :axes="viewModel.monthAxes"
                :ariaLabel="t('planning.calendar.monthV2.compass')"
                :emptyLabel="t('planning.calendar.monthV2.dashboard.noData')"
              />

              <button
                v-if="monthlyReflectionEmpty"
                type="button"
                class="month-v2__reflection-cta neo-focus"
                @click="emit('openReflection')"
              >
                <AppIcon name="auto_awesome" />
                {{ t('planning.calendar.monthV2.dashboard.fillMonthlyReflection') }}
              </button>
            </section>

            <section
              class="month-v2__weeks"
              :aria-label="t('planning.calendar.monthV2.dashboard.radarAxes')"
            >
              <div class="month-v2__week-scroll neo-scroll">
                <div
                  class="month-v2__week-grid"
                  :style="weekGridStyle"
                  data-testid="month-v2-week-grid"
                >
                  <article
                    v-for="week in viewModel.weeks"
                    :key="week.weekRef"
                    class="month-v2__week"
                    :class="{
                      'month-v2__week--current': week.phase === 'current',
                      'month-v2__week--future': week.phase === 'future',
                    }"
                  >
                    <button
                      type="button"
                      class="month-v2__week-button neo-focus"
                      :aria-label="
                        t('planning.calendar.monthV2.openWeek', {
                          number: weekNumber(week.weekRef),
                        })
                      "
                      @click="emit('openWeek', week.weekRef)"
                    >
                      <strong>T{{ weekNumber(week.weekRef) }}</strong>
                      <span>{{ weekRange(week) }}</span>
                      <i v-if="week.isBoundary" aria-hidden="true">◦</i>
                    </button>
                    <WeekRequirementsStateRadar
                      :radar="week.radar ?? null"
                      :ariaLabel="weekRadarLabel(week)"
                      :showLabels="false"
                    />
                  </article>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section class="month-v2__surface month-v2__lower" data-testid="month-v2-lower-panel">
          <Transition name="month-v2-content" mode="out-in">
            <div v-if="!activeFocus" key="overview" class="month-v2__overview-grid">
              <section class="month-v2__priorities" aria-labelledby="month-v2-priorities-title">
                <header>
                  <p id="month-v2-priorities-title">
                    {{ t('planning.calendar.monthV2.dashboard.priorities') }}
                  </p>
                </header>

                <div class="month-v2__priority-slots">
                  <div
                    v-for="(priority, index) in prioritySlots"
                    :key="priority?.id ?? `empty-${index}`"
                    class="month-v2__priority-slot"
                    :class="{ 'month-v2__priority-slot--empty': !priority }"
                  >
                    <template v-if="priority">
                      <EntityIcon v-if="priority.icon" :icon="priority.icon" size="lg" />
                      <span v-else class="month-v2__priority-star" aria-hidden="true">
                        <AppIcon name="star" />
                      </span>
                      <span>{{ priority.title }}</span>
                    </template>
                    <template v-else>
                      <span class="month-v2__priority-placeholder" aria-hidden="true">—</span>
                      <span class="sr-only">{{
                        t('planning.calendar.monthV2.dashboard.noPriorities')
                      }}</span>
                    </template>
                  </div>
                </div>
              </section>

              <nav
                class="month-v2__categories"
                :aria-label="t('planning.calendar.monthV2.dashboard.categoriesLabel')"
              >
                <button
                  v-for="category in categories"
                  :key="category.key"
                  type="button"
                  class="month-v2__category neo-focus"
                  :data-focus-key="category.key"
                  :aria-label="
                    t('planning.calendar.monthV2.dashboard.openCategory', {
                      category: categoryLabel(category),
                    })
                  "
                  @click="setFocus(category.key)"
                >
                  <span class="month-v2__category-title">
                    <strong>{{ categoryLabel(category) }}</strong>
                  </span>
                  <MonthProgressRing
                    v-if="category.key === 'goals' || category.key === 'habits'"
                    :percentage="category.percentage ?? null"
                    :ariaLabel="categoryAriaLabel(category)"
                    :size="72"
                  />
                </button>
              </nav>
            </div>

            <div v-else :key="activeFocus" class="month-v2__focus-layout">
              <aside class="month-v2__focus-summary">
                <div class="month-v2__focus-title">
                  <span class="month-v2__focus-icon" aria-hidden="true">
                    <AppIcon :name="activeCategory.icon" />
                  </span>
                  <div>
                    <p>{{ t('planning.calendar.monthV2.dashboard.monthResult') }}</p>
                    <h3>{{ categoryLabel(activeCategory) }}</h3>
                  </div>
                </div>

                <MonthProgressRing
                  v-if="activeCategory.percentage !== undefined"
                  :percentage="activeCategory.percentage"
                  :ariaLabel="categoryAriaLabel(activeCategory)"
                  :size="82"
                />
                <strong v-else class="month-v2__focus-total">
                  {{ aggregateText(activeCategory) }}
                </strong>

                <div v-if="focusPriorities.length > 0" class="month-v2__focus-priorities">
                  <p>{{ t('planning.calendar.monthV2.dashboard.priorities') }}</p>
                  <ul>
                    <li
                      v-for="priority in focusPriorities"
                      :key="priority.id"
                      :class="{
                        'month-v2__focus-priority--highlighted': highlightedPriorityIds.includes(
                          priority.id
                        ),
                        'month-v2__focus-priority--muted':
                          highlightedPriorityIds.length > 0 &&
                          !highlightedPriorityIds.includes(priority.id),
                      }"
                    >
                      <EntityIcon v-if="priority.icon" :icon="priority.icon" size="xs" />
                      <AppIcon v-else name="star" aria-hidden="true" />
                      <span>{{ priority.title }}</span>
                    </li>
                  </ul>
                </div>
              </aside>

              <section class="month-v2__focus-table" :aria-label="categoryLabel(activeCategory)">
                <p v-if="activeRows.length === 0" class="month-v2__focus-empty">
                  {{ t('planning.calendar.monthV2.noObjects') }}
                </p>

                <article
                  v-for="row in activeRows"
                  v-else
                  :key="row.key"
                  class="month-v2__focus-row"
                  :data-row-key="row.key"
                  @mouseenter="highlightPriorities(row)"
                  @mouseleave="clearPriorityHighlight"
                  @focusin="highlightPriorities(row)"
                  @focusout="clearPriorityHighlight"
                >
                  <button
                    v-if="row.subjectId && row.subjectType"
                    type="button"
                    class="month-v2__focus-row-month neo-focus"
                    @click="openRow(row)"
                  >
                    <span class="month-v2__focus-row-identity">
                      <EntityIcon :icon="row.icon" size="sm" />
                      <span>
                        <small v-if="row.parentGoal">
                          {{
                            t('planning.calendar.monthV2.dashboard.linkedGoal', {
                              goal: row.parentGoal.title,
                            })
                          }}
                        </small>
                        <strong>{{ rowTitle(row) }}</strong>
                      </span>
                    </span>
                    <span class="month-v2__focus-row-value">{{ rowMonthValue(row) }}</span>
                    <AppIcon name="arrow_outward" class="month-v2__row-open" />
                  </button>

                  <div v-else class="month-v2__focus-row-month month-v2__focus-row-month--static">
                    <span class="month-v2__focus-row-identity">
                      <span class="month-v2__focus-row-custom-icon" aria-hidden="true">
                        <AppIcon :name="row.icon ?? activeCategory.icon" />
                      </span>
                      <strong>{{ rowTitle(row) }}</strong>
                    </span>
                    <span class="month-v2__focus-row-value">{{ rowMonthValue(row) }}</span>
                  </div>

                  <div class="month-v2__focus-row-weeks">
                    <MonthSeriesChart
                      v-if="row.series"
                      :series="row.series"
                      :chart-mode="chartMode"
                      :density="density"
                      :ariaLabel="rowTitle(row)"
                    />
                    <MonthFocusSummarySeries
                      v-else-if="row.weeks"
                      :kind="activeFocus"
                      :columns="viewModel.weeks"
                      :weeks="row.weeks"
                      :ariaLabel="rowTitle(row)"
                      @open-week="emit('openWeek', $event)"
                    />
                    <span v-else class="month-v2__focus-row-no-data">
                      {{ t('planning.calendar.monthV2.dashboard.noData') }}
                    </span>
                  </div>
                </article>
              </section>
            </div>
          </Transition>
        </section>
      </div>

      <Transition name="month-v2-dock">
        <nav
          v-if="activeFocus"
          class="month-v2__dock"
          :aria-label="t('planning.calendar.monthV2.dashboard.categoriesLabel')"
        >
          <button
            v-for="category in dockCategories"
            :key="category.key"
            type="button"
            class="month-v2__dock-item neo-focus"
            @click="setFocus(category.key)"
          >
            <span>{{ categoryLabel(category) }}</span>
          </button>
          <button
            type="button"
            class="month-v2__dock-item month-v2__dock-back neo-focus"
            :aria-label="t('planning.calendar.monthV2.dashboard.back')"
            @click="setFocus(null)"
          >
            <AppIcon name="arrow_back" />
          </button>
        </nav>
      </Transition>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type {
  MonthV2CategoryAggregate,
  MonthV2FocusKey,
  MonthV2FocusRow,
  MonthV2OverviewViewModel,
  MonthV2Priority,
  MonthV2WeekColumn,
} from '@/services/monthV2Overview'
import { buildMonthV2OverviewViewModel, loadMonthV2OverviewData } from '@/services/monthV2Overview'
import { formatMonthName } from '@/utils/periodLabels'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import { useT } from '@/composables/useT'
import MonthDimensionChart from './MonthDimensionChart.vue'
import MonthFocusSummarySeries from './MonthFocusSummarySeries.vue'
import MonthProgressRing from './MonthProgressRing.vue'
import MonthSeriesChart from './MonthSeriesChart.vue'
import WeekRequirementsStateRadar from './WeekRequirementsStateRadar.vue'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

const props = withDefaults(
  defineProps<{
    monthRef: MonthRef
    chartMode?: MonthChartMode
    density?: MonthDensity
    focus?: MonthV2FocusKey | null
  }>(),
  { chartMode: 'hybrid', density: 'comfortable', focus: null }
)

const emit = defineEmits<{
  openWeek: [weekRef: WeekRef]
  openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }]
  openReflection: []
  focusChange: [focus: MonthV2FocusKey | null]
  experimentChange: [config: { chartMode: MonthChartMode; density: MonthDensity }]
  updated: []
}>()

const CATEGORY_ORDER: MonthV2FocusKey[] = [
  'goals',
  'habits',
  'trackers',
  'intentions',
  'emotions',
  'journal',
]

const { t, locale } = useT()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const viewModel = ref<MonthV2OverviewViewModel | null>(null)
const highlightedPriorityIds = ref<string[]>([])
const timeGridElement = ref<HTMLElement | null>(null)
const weekChartOffset = ref(0)
let chartResizeObserver: ResizeObserver | null = null

const activeFocus = computed(() => props.focus ?? null)
const monthName = computed(() => formatMonthName(props.monthRef, locale.value))
const monthYear = computed(() => props.monthRef.slice(0, 4))
const monthTitle = computed(() => `${monthName.value} ${monthYear.value}`)
const monthlyReflectionEmpty = computed(
  () => !viewModel.value?.monthAxes.some(axis => axis.value !== null)
)

const categories = computed(() =>
  viewModel.value ? CATEGORY_ORDER.map(key => viewModel.value!.categories[key]) : []
)

const activeCategory = computed<MonthV2CategoryAggregate>(() => {
  const key = activeFocus.value ?? 'goals'
  return viewModel.value!.categories[key]
})

const activeRows = computed<MonthV2FocusRow[]>(() =>
  activeFocus.value && viewModel.value ? viewModel.value.focusSections[activeFocus.value].rows : []
)

const prioritySlots = computed<Array<MonthV2Priority | null>>(() => {
  const slots: Array<MonthV2Priority | null> = [...(viewModel.value?.priorities ?? []).slice(0, 3)]
  while (slots.length < 3) slots.push(null)
  return slots
})

const focusPriorities = computed(() => {
  if (!viewModel.value) return []
  const relatedIds = new Set(activeRows.value.flatMap(row => row.priorityIds))
  return viewModel.value.priorities.filter(priority => relatedIds.has(priority.id))
})

const dockCategories = computed(() =>
  categories.value.filter(category => category.key !== activeFocus.value)
)

const weekGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${viewModel.value?.weeks.length ?? 1}, minmax(104px, 1fr))`,
}))

function alignWeekChartBaselines(): void {
  const grid = timeGridElement.value
  if (!grid) return

  const month = grid.querySelector<HTMLElement>('.month-v2__month')
  const weeks = grid.querySelector<HTMLElement>('.month-v2__weeks')
  const monthSvg = grid.querySelector<SVGSVGElement>('.month-dimension__svg')
  const weekPlot = grid.querySelector<HTMLElement>('.week-bars__plot')
  if (!month || !weeks || !monthSvg || !weekPlot) return

  const monthRect = month.getBoundingClientRect()
  const weeksRect = weeks.getBoundingClientRect()

  if (weeksRect.top > monthRect.top + 10) {
    weekChartOffset.value = 0
    return
  }

  const svgRect = monthSvg.getBoundingClientRect()
  const weekPlotRect = weekPlot.getBoundingClientRect()
  if (svgRect.height === 0 || weekPlotRect.height === 0) return

  const monthBaseline = svgRect.top + svgRect.height * (166 / 220)
  const difference = monthBaseline - weekPlotRect.bottom
  const nextOffset = Math.max(0, weekChartOffset.value + difference)

  if (Math.abs(nextOffset - weekChartOffset.value) > 0.5) {
    weekChartOffset.value = nextOffset
  }
}

function scheduleWeekChartAlignment(): void {
  void nextTick(() => alignWeekChartBaselines())
}

onMounted(() => {
  scheduleWeekChartAlignment()
  if (typeof ResizeObserver === 'undefined' || !timeGridElement.value) return
  chartResizeObserver = new ResizeObserver(scheduleWeekChartAlignment)
  chartResizeObserver.observe(timeGridElement.value)
})

onBeforeUnmount(() => chartResizeObserver?.disconnect())

watch(viewModel, scheduleWeekChartAlignment, { flush: 'post' })

async function reload(): Promise<void> {
  isLoading.value = true
  loadError.value = null
  try {
    const data = await loadMonthV2OverviewData(props.monthRef)
    viewModel.value = buildMonthV2OverviewViewModel(data)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.monthRef,
  () => {
    highlightedPriorityIds.value = []
    void reload()
  },
  { immediate: true }
)

function setFocus(focus: MonthV2FocusKey | null): void {
  highlightedPriorityIds.value = []
  emit('focusChange', focus)
}

function categoryLabel(category: MonthV2CategoryAggregate): string {
  return t(category.label)
}

function categoryAriaLabel(category: MonthV2CategoryAggregate): string {
  if (category.total === 0) {
    return `${categoryLabel(category)}: ${t('planning.calendar.monthV2.dashboard.noData')}`
  }
  return `${categoryLabel(category)}: ${t('planning.calendar.monthV2.dashboard.completed', {
    met: category.met,
    total: category.total,
  })}`
}

function aggregateText(category: MonthV2CategoryAggregate): string {
  const primaryRow = activeRows.value[0]

  if (category.key === 'intentions') {
    if (primaryRow?.targetValue === undefined || primaryRow.targetValue === 0) return '—'
    return `${formatNumber(primaryRow.monthValue ?? 0)}/${formatNumber(primaryRow.targetValue)}`
  }

  if (category.key === 'emotions' || category.key === 'journal') {
    const count = primaryRow?.monthValue ?? primaryRow?.entryCount ?? 0
    return count > 0 ? t('planning.calendar.monthV2.dashboard.entries', { count }) : '—'
  }

  if (category.total === 0) return '—'
  return `${category.met}/${category.total}`
}

function weekNumber(weekRef: WeekRef): number {
  return Number(weekRef.slice(-2))
}

function weekRange(week: MonthV2WeekColumn): string {
  const start = week.inMonthDayRefs[0] ?? week.weekStart
  const end = week.inMonthDayRefs.at(-1) ?? week.weekEnd
  const startDate = new Date(`${start}T12:00:00`)
  const endDate = new Date(`${end}T12:00:00`)
  const startText = new Intl.DateTimeFormat(locale.value, { day: 'numeric' }).format(startDate)
  const endText = new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
  }).format(endDate)
  return `${startText}–${endText}`
}

function radarValues(values: Array<{ value: number | null }>): string {
  return values.map(axis => axis.value ?? '—').join(', ')
}

function weekRadarLabel(week: MonthV2WeekColumn): string {
  if (!week.radar) {
    return `${t('planning.calendar.monthV2.week', { number: weekNumber(week.weekRef) })}. ${t(
      'planning.calendar.monthV2.dashboard.noWeeklyReflection'
    )}`
  }
  return t('planning.calendar.monthV2.dashboard.weekRadar', {
    number: weekNumber(week.weekRef),
    requirements: radarValues(week.radar.requirements),
    state: radarValues(week.radar.state),
  })
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function rowMonthValue(row: MonthV2FocusRow): string {
  if (row.text) return row.text
  if (row.monthValue !== undefined) {
    return row.targetValue !== undefined
      ? `${formatNumber(row.monthValue)} / ${formatNumber(row.targetValue)}`
      : formatNumber(row.monthValue)
  }
  if (row.entryCount !== undefined) {
    return t('planning.calendar.monthV2.dashboard.entries', { count: row.entryCount })
  }
  return '—'
}

function rowTitle(row: MonthV2FocusRow): string {
  if (row.title) return row.title
  if (row.key === 'journal:daily' || row.key === 'journal:month') {
    return t('planning.calendar.monthV2.dashboard.dailyEntries')
  }
  if (row.key === 'journal:reflections') {
    return t('planning.calendar.monthV2.dashboard.reflections')
  }
  return categoryLabel(activeCategory.value)
}

function openRow(row: MonthV2FocusRow): void {
  if (!row.subjectId || !row.subjectType) return
  const homeWeekRef = row.series?.weeks.find(week => !week.inactive)?.weekRef
  emit('openObject', {
    type: row.subjectType,
    id: row.subjectId,
    homeWeekRef: row.subjectType === 'weeklyIntention' ? homeWeekRef : undefined,
  })
}

function highlightPriorities(row: MonthV2FocusRow): void {
  highlightedPriorityIds.value = row.priorityIds
}

function clearPriorityHighlight(): void {
  highlightedPriorityIds.value = []
}
</script>

<style scoped>
.month-v2 {
  --month-column: 44fr;
  --weeks-column: 56fr;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.month-v2__stage {
  display: grid;
  gap: 14px;
  transition:
    gap 520ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 520ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 520ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 520ms ease;
}

.month-v2__surface {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top) / 0.97),
    rgb(var(--neo-surface-bottom) / 0.97)
  );
  border: 1px solid rgb(var(--neo-border) / 0.12);
  border-radius: 26px;
  box-shadow:
    -7px -7px 14px rgb(var(--neo-shadow-light) / 0.8),
    7px 7px 14px rgb(var(--neo-shadow-dark) / 0.3);
  color: rgb(var(--neo-text));
  min-width: 0;
  transition:
    border-radius 520ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 520ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 520ms ease;
}

.month-v2__stage--focused {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top) / 0.97),
    rgb(var(--neo-surface-bottom) / 0.97)
  );
  border: 1px solid rgb(var(--neo-border) / 0.12);
  border-radius: 27px;
  box-shadow:
    -8px -8px 17px rgb(var(--neo-shadow-light) / 0.8),
    8px 8px 17px rgb(var(--neo-shadow-dark) / 0.31);
  gap: 0;
  overflow: hidden;
}

.month-v2__stage--focused .month-v2__surface {
  background: transparent;
  border-color: transparent;
  border-radius: 0;
  box-shadow: none;
}

.month-v2__time {
  padding: clamp(20px, 2.4vw, 34px);
}

.month-v2__time-grid,
.month-v2__overview-grid {
  display: grid;
  grid-template-columns: minmax(320px, var(--month-column)) minmax(0, var(--weeks-column));
  min-width: 0;
}

.month-v2__month {
  min-width: 0;
  padding-right: clamp(20px, 2vw, 32px);
  position: relative;
}

.month-v2__month::after,
.month-v2__priorities::after {
  background: linear-gradient(
    180deg,
    transparent,
    rgb(var(--neo-border) / 0.52) 14%,
    rgb(var(--neo-border) / 0.52) 86%,
    transparent
  );
  bottom: 0;
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 1px;
}

.month-v2__month-heading {
  align-items: flex-start;
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  padding: 0 4px;
}

.month-v2__eyebrow,
.month-v2__month-heading p,
.month-v2__priorities header p,
.month-v2__focus-title p,
.month-v2__focus-priorities > p {
  color: rgb(var(--neo-muted));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  margin: 0;
  text-transform: uppercase;
}

.month-v2__month-heading h2 {
  color: rgb(var(--neo-text));
  font-size: clamp(22px, 2vw, 30px);
  font-weight: 650;
  letter-spacing: -0.025em;
  line-height: 1.15;
  margin: 3px 0 0;
  text-transform: capitalize;
}

.month-v2__year {
  color: rgb(var(--neo-muted) / 0.72);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  margin-top: 4px;
}

.month-v2__reflection-cta {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 999px;
  color: rgb(var(--color-primary-strong));
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 11.5px;
  font-weight: 650;
  gap: 6px;
  margin: -2px auto 0;
  padding: 6px 11px;
}

.month-v2__reflection-cta:hover {
  background: rgb(var(--color-primary-soft) / 0.45);
}

.month-v2__weeks {
  min-width: 0;
  padding-left: clamp(20px, 2vw, 32px);
}

.month-v2__week-scroll {
  overflow-x: auto;
  padding: 0 2px 5px;
}

.month-v2__week-grid {
  display: grid;
  gap: clamp(8px, 0.9vw, 16px);
  min-width: 0;
  width: 100%;
}

.month-v2__week {
  align-items: center;
  display: flex;
  flex-direction: column;
  min-width: 104px;
  opacity: 0.94;
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.month-v2__week--future {
  opacity: 0.58;
}

.month-v2__week--current {
  opacity: 1;
}

.month-v2__week-button {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: rgb(var(--neo-text));
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  margin-bottom: 0;
  min-width: 100%;
  padding: 2px 5px 3px;
  position: relative;
  text-align: center;
}

.month-v2__week-button:hover {
  background: rgb(var(--color-primary-soft) / 0.3);
}

.month-v2__week-button strong {
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.2;
}

.month-v2__week-button span {
  color: rgb(var(--neo-muted));
  font-size: 10.5px;
  line-height: 1.25;
  margin-top: 2px;
}

.month-v2__week-button i {
  color: rgb(var(--color-primary-strong));
  font-size: 12px;
  font-style: normal;
  position: absolute;
  right: 5px;
  top: 1px;
}

.month-v2__week :deep(.week-radar) {
  align-self: center;
  margin-top: var(--week-chart-offset, 0px);
  width: 100%;
}

.month-v2__lower {
  min-height: 216px;
  padding: clamp(12px, 1.5vw, 20px);
}

.month-v2__stage--focused .month-v2__lower {
  border-top: 1px solid rgb(var(--neo-border) / 0.32);
  min-height: 310px;
  padding-top: 18px;
}

.month-v2__priorities {
  padding: 8px clamp(20px, 2vw, 32px) 8px 4px;
  position: relative;
}

.month-v2__priorities header {
  margin-bottom: 12px;
}

.month-v2__priority-slots {
  display: grid;
  gap: clamp(10px, 1.2vw, 18px);
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.month-v2__priority-slot {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 9px;
  justify-content: center;
  min-height: 126px;
  min-width: 0;
  padding: 8px;
  text-align: center;
}

.month-v2__priority-slot > span:last-child {
  color: rgb(var(--neo-text));
  display: -webkit-box;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.month-v2__priority-slot--empty {
  opacity: 0.46;
}

.month-v2__priority-placeholder {
  align-items: center;
  border: 1px dashed rgb(var(--neo-border) / 0.52);
  border-radius: 45% 55% 50% 50%;
  color: rgb(var(--neo-muted));
  display: flex;
  height: 54px;
  justify-content: center;
  width: 54px;
}

.month-v2__priority-star {
  align-items: center;
  background: rgb(var(--color-primary-soft) / 0.36);
  border: 1px solid rgb(var(--neo-border) / 0.22);
  border-radius: 48% 52% 45% 55%;
  color: rgb(var(--color-primary-strong));
  display: flex;
  font-size: 21px;
  height: 44px;
  justify-content: center;
  width: 44px;
}

.month-v2__categories {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(88px, 1fr));
  min-width: 0;
  padding-left: clamp(14px, 1.4vw, 24px);
}

.month-v2__category {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 14px;
  color: rgb(var(--neo-text));
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
  padding: 12px clamp(10px, 1.2vw, 18px);
  position: relative;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
}

.month-v2__category:hover {
  background: rgb(var(--color-primary-soft) / 0.34);
  color: rgb(var(--color-primary-strong));
  transform: translateY(-1px);
}

.month-v2__category:nth-child(3n + 2)::before,
.month-v2__category:nth-child(3n + 3)::before {
  background: linear-gradient(180deg, transparent, rgb(var(--neo-border) / 0.42), transparent);
  bottom: 10px;
  content: '';
  left: 0;
  position: absolute;
  top: 10px;
  width: 1px;
}

.month-v2__category:nth-child(n + 4)::after {
  background: linear-gradient(90deg, transparent, rgb(var(--neo-border) / 0.42), transparent);
  content: '';
  height: 1px;
  left: 10px;
  position: absolute;
  right: 10px;
  top: 0;
}

.month-v2__category-title {
  align-items: center;
  display: flex;
  min-width: 0;
}

.month-v2__category-title strong {
  font-size: 13px;
  font-weight: 620;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-v2__focus-layout {
  display: grid;
  grid-template-columns: minmax(168px, 14fr) minmax(0, 86fr);
  min-width: 0;
}

.month-v2__focus-summary {
  align-items: center;
  border-right: 1px solid rgb(var(--neo-border) / 0.38);
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 8px clamp(12px, 1.2vw, 20px) 12px 4px;
}

.month-v2__focus-title {
  align-items: center;
  align-self: stretch;
  display: flex;
  gap: 9px;
}

.month-v2__focus-title h3 {
  font-size: 16px;
  font-weight: 700;
  margin: 2px 0 0;
}

.month-v2__focus-icon,
.month-v2__focus-row-custom-icon {
  align-items: center;
  background: rgb(var(--color-primary-soft) / 0.42);
  border-radius: 50%;
  color: rgb(var(--color-primary-strong));
  display: flex;
  flex: 0 0 auto;
  height: 34px;
  justify-content: center;
  width: 34px;
}

.month-v2__focus-total {
  color: rgb(var(--color-primary-strong));
  font-size: 24px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  letter-spacing: -0.03em;
  text-align: center;
}

.month-v2__focus-priorities {
  align-self: stretch;
  border-top: 1px solid rgb(var(--neo-border) / 0.35);
  padding-top: 13px;
}

.month-v2__focus-priorities ul {
  display: flex;
  flex-direction: column;
  gap: 7px;
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.month-v2__focus-priorities li {
  align-items: center;
  border-radius: 10px;
  color: rgb(var(--neo-muted));
  display: flex;
  font-size: 10.5px;
  font-weight: 600;
  gap: 6px;
  min-width: 0;
  padding: 4px;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

.month-v2__focus-priorities li span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-v2__focus-priority--highlighted {
  background: rgb(var(--sky-100) / 0.68);
  color: rgb(var(--sky-700)) !important;
}

.month-v2__focus-priority--muted {
  opacity: 0.38;
}

.month-v2__focus-table {
  min-width: 0;
  padding-left: clamp(14px, 1.5vw, 24px);
}

.month-v2__focus-row {
  display: grid;
  grid-template-columns: minmax(238px, 30fr) minmax(520px, 56fr);
  min-height: 88px;
  min-width: 0;
  transition: background-color 180ms ease;
}

.month-v2__focus-row + .month-v2__focus-row {
  border-top: 1px solid rgb(var(--neo-border) / 0.32);
}

.month-v2__focus-row:hover,
.month-v2__focus-row:focus-within {
  background: linear-gradient(90deg, rgb(var(--color-primary-soft) / 0.26), transparent 74%);
}

.month-v2__focus-row-month {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 8px;
  grid-template-columns: minmax(0, 1fr) auto auto;
  margin: 5px 8px 5px 0;
  min-width: 0;
  padding: 8px 10px;
  text-align: left;
}

.month-v2__focus-row-month--static {
  cursor: default;
}

.month-v2__focus-row-identity {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.month-v2__focus-row-identity > span:last-child {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.month-v2__focus-row-identity small {
  color: rgb(var(--neo-muted));
  font-size: 9px;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-v2__focus-row-identity strong {
  color: rgb(var(--neo-text));
  font-size: 12px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-v2__focus-row-value {
  color: rgb(var(--color-primary-strong));
  font-size: 16px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  white-space: nowrap;
}

.month-v2__row-open {
  color: rgb(var(--neo-muted));
  font-size: 14px;
  opacity: 0;
  transition: opacity 180ms ease;
}

.month-v2__focus-row-month:hover .month-v2__row-open,
.month-v2__focus-row-month:focus-visible .month-v2__row-open {
  opacity: 1;
}

.month-v2__focus-row-weeks {
  align-items: center;
  border-left: 1px solid rgb(var(--neo-border) / 0.26);
  display: flex;
  min-width: 0;
  padding: 7px 0 7px clamp(10px, 1vw, 16px);
}

.month-v2__focus-row-weeks > * {
  width: 100%;
}

.month-v2__focus-row-no-data,
.month-v2__focus-empty {
  color: rgb(var(--neo-muted));
  font-size: 12px;
  padding: 34px 18px;
  text-align: center;
}

.month-v2__dock {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top) / 0.96),
    rgb(var(--neo-surface-bottom) / 0.96)
  );
  border: 1px solid rgb(var(--neo-border) / 0.12);
  border-radius: 20px;
  box-shadow:
    -5px -5px 12px rgb(var(--neo-shadow-light) / 0.76),
    5px 5px 12px rgb(var(--neo-shadow-dark) / 0.26);
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr)) 58px;
  overflow: hidden;
}

.month-v2__dock-item {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 11px;
  color: rgb(var(--neo-muted));
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 11.5px;
  font-weight: 600;
  gap: 7px;
  justify-content: center;
  min-height: 50px;
  padding: 8px 10px;
  position: relative;
  transition:
    background-color 180ms ease,
    color 180ms ease;
}

.month-v2__dock-item + .month-v2__dock-item::before {
  background: linear-gradient(180deg, transparent, rgb(var(--neo-border) / 0.42), transparent);
  bottom: 8px;
  content: '';
  left: 0;
  position: absolute;
  top: 8px;
  width: 1px;
}

.month-v2__dock-item:hover {
  background: rgb(var(--color-primary-soft) / 0.34);
  color: rgb(var(--color-primary-strong));
}

.month-v2__dock-back {
  font-size: 18px;
}

.month-v2-content-enter-active,
.month-v2-content-leave-active {
  transition:
    opacity 220ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.month-v2-content-enter-from {
  opacity: 0;
  transform: translateY(7px);
}

.month-v2-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.month-v2-dock-enter-active,
.month-v2-dock-leave-active {
  transition:
    opacity 220ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
}

.month-v2-dock-enter-from,
.month-v2-dock-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 1180px) {
  .month-v2__week-grid {
    min-width: 680px;
  }

  .month-v2__categories {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(84px, 1fr));
  }

  .month-v2__category:nth-child(3n + 2)::before,
  .month-v2__category:nth-child(3n + 3)::before,
  .month-v2__category:nth-child(n + 4)::after {
    display: none;
  }

  .month-v2__category:nth-child(even)::before {
    background: linear-gradient(180deg, transparent, rgb(var(--neo-border) / 0.42), transparent);
    bottom: 8px;
    content: '';
    display: block;
    left: 0;
    position: absolute;
    top: 8px;
    width: 1px;
  }

  .month-v2__category:nth-child(n + 3)::after {
    background: linear-gradient(90deg, transparent, rgb(var(--neo-border) / 0.42), transparent);
    content: '';
    display: block;
    height: 1px;
    left: 8px;
    position: absolute;
    right: 8px;
    top: 0;
  }

  .month-v2__focus-table {
    overflow-x: auto;
  }

  .month-v2__focus-row {
    min-width: 780px;
  }
}

@media (max-width: 760px) {
  .month-v2__time,
  .month-v2__lower {
    padding: 16px;
  }

  .month-v2__time-grid,
  .month-v2__overview-grid {
    grid-template-columns: 1fr;
  }

  .month-v2__month {
    padding: 0 0 20px;
  }

  .month-v2__month::after,
  .month-v2__priorities::after {
    background: linear-gradient(90deg, transparent, rgb(var(--neo-border) / 0.45), transparent);
    bottom: 0;
    height: 1px;
    left: 0;
    right: 0;
    top: auto;
    width: auto;
  }

  .month-v2__weeks {
    padding: 18px 0 0;
  }

  .month-v2__priorities {
    padding: 6px 0 18px;
  }

  .month-v2__categories {
    padding: 12px 0 0;
  }

  .month-v2__priority-slots {
    gap: 4px;
  }

  .month-v2__priority-slot {
    min-height: 104px;
    padding: 6px 2px;
  }

  .month-v2__categories {
    grid-template-rows: repeat(3, minmax(112px, 1fr));
  }

  .month-v2__category {
    flex-direction: row;
    gap: 5px;
    justify-content: center;
    padding: 10px 6px;
  }

  .month-v2__category-title strong {
    overflow: visible;
    text-overflow: clip;
  }

  .month-v2__focus-summary {
    align-items: center;
    border-bottom: 1px solid rgb(var(--neo-border) / 0.34);
    border-right: 0;
    display: flex;
    padding: 6px 2px 16px;
  }

  .month-v2__focus-priorities {
    border-left: 0;
    border-top: 1px solid rgb(var(--neo-border) / 0.34);
    padding: 12px 0 0;
  }

  .month-v2__focus-layout {
    grid-template-columns: 1fr;
  }

  .month-v2__focus-table {
    overflow: visible;
    padding: 10px 0 0;
  }

  .month-v2__focus-row {
    grid-template-columns: 1fr;
    min-width: 0;
  }

  .month-v2__focus-row-weeks {
    border-left: 0;
    border-top: 1px solid rgb(var(--neo-border) / 0.26);
    overflow-x: auto;
    padding: 8px 0;
  }

  .month-v2__focus-row-weeks > * {
    min-width: 620px;
  }

  .month-v2__dock {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .month-v2__dock-back {
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .month-v2__stage,
  .month-v2__surface,
  .month-v2-content-enter-active,
  .month-v2-content-leave-active,
  .month-v2-dock-enter-active,
  .month-v2-dock-leave-active {
    transition-duration: 100ms;
    transition-property: opacity;
  }

  .month-v2-content-enter-from,
  .month-v2-content-leave-to,
  .month-v2-dock-enter-from,
  .month-v2-dock-leave-to {
    transform: none;
  }
}
</style>
