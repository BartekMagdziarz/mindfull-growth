<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef, MonthRef, PeriodRef, WeekRef, YearRef } from '@/domain/period'
import {
  getChildPeriods,
  getNextPeriod,
  getParentPeriod,
  getPeriodRefsForDate,
  getPeriodType,
  getPreviousPeriod,
  isPeriodRef,
  parsePeriodRef,
} from '@/utils/periods'
import { formatMonthName } from '@/utils/periodLabels'
import { useT } from '@/composables/useT'
import type {
  StreamDayVM,
  StreamMonthVM,
  StreamWeekVM,
} from '@/components/calendar/stream/streamModel'
import {
  loadStreamMonth,
  loadStreamWeek,
  loadStreamYear,
} from '@/components/calendar/stream/streamData'
import StreamMonthCard from '@/components/calendar/stream/StreamMonthCard.vue'
import StreamWeekCard from '@/components/calendar/stream/StreamWeekCard.vue'
import StreamDayCard from '@/components/calendar/stream/StreamDayCard.vue'
import StreamDetailPanel from '@/components/calendar/stream/StreamDetailPanel.vue'
import MonthlyReflectionWizard from '@/components/calendar/MonthlyReflectionWizard.vue'
import WeeklyReflectionWizard from '@/components/calendar/WeeklyReflectionWizard.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'

type StreamScale = 'year' | 'month' | 'week'

const props = defineProps<{ periodRef?: string }>()

const router = useRouter()
const { t, locale } = useT()

const todayRefs = getPeriodRefsForDate(new Date())

const scale = ref<StreamScale>('year')
const yearRef = ref<YearRef>(todayRefs.year)
const monthRef = ref<MonthRef>(todayRefs.month)
const weekRef = ref<WeekRef>(todayRefs.week)

// --- anchor setters (keep year ⇄ month ⇄ week refs consistent) ---------------

function setFromYear(next: YearRef) {
  yearRef.value = next
  monthRef.value = getChildPeriods(next)[0]
  weekRef.value = getChildPeriods(monthRef.value)[0]
}

function setFromMonth(next: MonthRef) {
  monthRef.value = next
  yearRef.value = getParentPeriod(next)
  weekRef.value = getChildPeriods(next)[0]
}

function setFromWeek(next: WeekRef) {
  weekRef.value = next
  monthRef.value = getParentPeriod(next)
  yearRef.value = getParentPeriod(monthRef.value)
}

function initFromParam(raw?: string) {
  if (!raw || !isPeriodRef(raw)) {
    scale.value = 'year'
    setFromYear(todayRefs.year)
    return
  }
  const parsed = parsePeriodRef(raw)
  switch (getPeriodType(parsed)) {
    case 'year':
      scale.value = 'year'
      setFromYear(parsed as YearRef)
      break
    case 'month':
      scale.value = 'month'
      setFromMonth(parsed as MonthRef)
      break
    case 'week':
      scale.value = 'week'
      setFromWeek(parsed as WeekRef)
      break
    case 'day':
      scale.value = 'week'
      setFromWeek(getPeriodRefsForDate(parsed as DayRef).week)
      break
  }
}

initFromParam(props.periodRef)

// --- reflection wizards (hosted in-stream, above the detail panel) -----------

const monthWizardOpen = ref(false)
const weekWizardOpen = ref(false)
const detailDirty = ref(false)
const detailReloadKey = ref(0)
const wizardSectionRef = ref<HTMLElement | null>(null)

// Consume `?action=` before the first syncUrl — router.replace below rewrites
// the URL with params only, silently dropping the query. Month `plan` stays
// with the classic MonthlyPlanner route, so only `reflect` opens the month
// wizard; the weekly ritual is one wizard for both actions.
{
  const action = router.currentRoute.value.query.action
  if (action === 'reflect' && scale.value === 'month') {
    monthWizardOpen.value = true
  }
  if ((action === 'reflect' || action === 'plan') && scale.value === 'week') {
    weekWizardOpen.value = true
  }
}

function scrollWizardIntoView() {
  void nextTick(() => {
    wizardSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function openMonthWizard() {
  monthWizardOpen.value = true
  scrollWizardIntoView()
}

function openWeekWizard() {
  weekWizardOpen.value = true
  scrollWizardIntoView()
}

function refreshDetailIfDirty() {
  if (detailDirty.value) {
    detailDirty.value = false
    // Remount the detail panel so it reloads what the wizard just saved.
    detailReloadKey.value++
  }
}

function closeMonthWizard() {
  monthWizardOpen.value = false
  refreshDetailIfDirty()
}

function closeWeekWizard() {
  weekWizardOpen.value = false
  refreshDetailIfDirty()
}

// "Zaplanuj następny tydzień →" from the weekly journal step: advance the
// stream to the next week and keep the wizard open on its planning step.
let keepWizardsAcrossPeriodChange = false

function planNextWeekInStream() {
  keepWizardsAcrossPeriodChange = true
  refreshDetailIfDirty()
  setFromWeek(getNextPeriod(weekRef.value) as WeekRef)
  scale.value = 'week'
  weekWizardOpen.value = true
  scrollWizardIntoView()
}

// --- active period + URL sync ------------------------------------------------

const activeRef = computed<PeriodRef>(() =>
  scale.value === 'year' ? yearRef.value : scale.value === 'month' ? monthRef.value : weekRef.value,
)

function syncUrl() {
  void router.replace({ name: 'calendar-stream', params: { periodRef: activeRef.value } })
}

watch(activeRef, syncUrl)
onMounted(syncUrl)

// Re-init when the route param changes externally (e.g. browser back/forward).
watch(
  () => props.periodRef,
  (value) => {
    if (value && isPeriodRef(value) && value !== activeRef.value) {
      initFromParam(value)
    }
  },
)

// --- navigation --------------------------------------------------------------

function drillToMonth(next: MonthRef) {
  setFromMonth(next)
  scale.value = 'month'
}

// Paging or re-scaling away closes the in-stream wizards — each is bound to
// one period. planNextWeekInStream() re-opens across its own week change.
watch([scale, monthRef, weekRef], () => {
  if (keepWizardsAcrossPeriodChange) {
    keepWizardsAcrossPeriodChange = false
    return
  }
  monthWizardOpen.value = false
  weekWizardOpen.value = false
})

function drillToWeek(next: WeekRef) {
  // Boundary weeks (whose Monday falls in an adjacent month) are still listed
  // under the month the user is viewing, so keep the current month/year as the
  // breadcrumb context instead of re-parenting to the week's own Monday.
  weekRef.value = next
  scale.value = 'week'
}

function goToYearScale() {
  scale.value = 'year'
}

function goToMonthScale() {
  scale.value = 'month'
}

function goPrev() {
  if (scale.value === 'year') setFromYear(getPreviousPeriod(yearRef.value) as YearRef)
  else if (scale.value === 'month') setFromMonth(getPreviousPeriod(monthRef.value) as MonthRef)
  else setFromWeek(getPreviousPeriod(weekRef.value) as WeekRef)
}

function goNext() {
  if (scale.value === 'year') setFromYear(getNextPeriod(yearRef.value) as YearRef)
  else if (scale.value === 'month') setFromMonth(getNextPeriod(monthRef.value) as MonthRef)
  else setFromWeek(getNextPeriod(weekRef.value) as WeekRef)
}

function goToday() {
  // Recompute "today" on click so a session left open across midnight still
  // lands on the real current period (matches the card highlight in streamModel).
  const refs = getPeriodRefsForDate(new Date())
  yearRef.value = refs.year
  monthRef.value = refs.month
  weekRef.value = refs.week
}

// --- ribbon data (real, loaded per scale) ------------------------------------

const months = ref<StreamMonthVM[]>([])
const weeks = ref<StreamWeekVM[]>([])
const days = ref<StreamDayVM[]>([])
const ribbonLoading = ref(false)
const ribbonError = ref<string | null>(null)
let ribbonToken = 0

async function loadRibbon() {
  const token = ++ribbonToken
  ribbonLoading.value = true
  ribbonError.value = null
  try {
    if (scale.value === 'year') {
      const result = await loadStreamYear(yearRef.value)
      if (token !== ribbonToken) return
      months.value = result
    } else if (scale.value === 'month') {
      const result = await loadStreamMonth(monthRef.value)
      if (token !== ribbonToken) return
      weeks.value = result
    } else {
      const result = await loadStreamWeek(weekRef.value)
      if (token !== ribbonToken) return
      days.value = result
    }
  } catch (error) {
    if (token !== ribbonToken) return
    ribbonError.value = error instanceof Error ? error.message : String(error)
    // Drop stale cards so the error panel surfaces, rather than silently leaving
    // the previous period's data on screen when a reload fails.
    months.value = []
    weeks.value = []
    days.value = []
    console.warn('[stream] failed to load ribbon data', error)
  } finally {
    if (token === ribbonToken) ribbonLoading.value = false
  }
}

watch([scale, yearRef, monthRef, weekRef], loadRibbon, { immediate: true })

const ribbonItems = computed(() =>
  scale.value === 'year' ? months.value : scale.value === 'month' ? weeks.value : days.value,
)
// Only block the ribbon with a spinner on a cold load; keep the previous cards
// visible while re-fetching as the user pages (data is cached → usually instant).
const showRibbonLoading = computed(() => ribbonLoading.value && ribbonItems.value.length === 0)
const showRibbonError = computed(() => Boolean(ribbonError.value) && ribbonItems.value.length === 0)

// Fresh "today" for the detail panel's today-highlighting (matches streamModel).
const todayDayRef = computed(() => getPeriodRefsForDate(new Date()).day)

const showDetailPanel = computed(() => scale.value === 'month' || scale.value === 'week')

// --- localized labels --------------------------------------------------------

const ringLabels = computed(() => ({
  goals: t('planning.calendar.stream.rings.goals'),
  habits: t('planning.calendar.stream.rings.habits'),
  intentions: t('planning.calendar.stream.rings.intentions'),
}))

// Matrix column headers reuse the weekly-reflection group titles
// (Demands/Actions/State) — the week-card matrix renders those exact ratings.
const sectionLabels = computed(() => ({
  demands: t('planning.reflection.weekly.groups.demands.title'),
  actions: t('planning.reflection.weekly.groups.actions.title'),
  state: t('planning.reflection.weekly.groups.state.title'),
}))

function monthName(ref: MonthRef): string {
  const name = formatMonthName(ref, locale.value)
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function weekdayLabel(dayRef: DayRef): string {
  return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(
    new Date(`${dayRef}T00:00:00`),
  )
}

function rangeLabel(start: DayRef, end: DayRef): string {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const day = new Intl.DateTimeFormat(locale.value, { day: 'numeric' })
  const mon = new Intl.DateTimeFormat(locale.value, { month: 'short' })
  if (startDate.getMonth() === endDate.getMonth()) {
    return `${day.format(startDate)}–${day.format(endDate)} ${mon.format(endDate)}`
  }
  return `${day.format(startDate)} ${mon.format(startDate)}–${day.format(endDate)} ${mon.format(endDate)}`
}

function weekShortLabel(weekNumber: number): string {
  return t('planning.calendar.stream.weekShort', { n: weekNumber })
}

// --- breadcrumb spine --------------------------------------------------------

interface Crumb {
  key: string
  label: string
  current: boolean
  onClick?: () => void
}

const spine = computed<Crumb[]>(() => {
  if (scale.value === 'year') {
    return [{ key: 'y', label: String(yearRef.value), current: true }]
  }
  if (scale.value === 'month') {
    return [
      { key: 'y', label: String(yearRef.value), current: false, onClick: goToYearScale },
      { key: 'm', label: monthName(monthRef.value), current: true },
    ]
  }
  return [
    { key: 'y', label: String(yearRef.value), current: false, onClick: goToYearScale },
    { key: 'm', label: monthName(monthRef.value), current: false, onClick: goToMonthScale },
    {
      key: 'w',
      label: t('planning.calendar.stream.weekLong', { n: Number(weekRef.value.slice(-2)) }),
      current: true,
    },
  ]
})

const scaleHint = computed(() => t(`planning.calendar.stream.hint.${scale.value}`))
const scaleHintIcon = computed(() => (scale.value === 'week' ? 'today' : 'ads_click'))

</script>

<template>
  <div class="stream">
    <!-- Spine: prev/next + breadcrumb + jump-to-today + scale hint -->
    <div class="stream-spine">
      <div class="stream-spine__left">
        <button
          type="button"
          class="stream-nav-btn neo-focus"
          :aria-label="t('planning.calendar.stream.prevPeriod')"
          @click="goPrev"
        >
          <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </button>

        <div class="stream-spine__crumbs">
          <template v-for="(crumb, i) in spine" :key="crumb.key">
            <span v-if="i > 0" class="material-symbols-outlined stream-spine__sep" aria-hidden="true"
              >chevron_right</span
            >
            <button
              v-if="crumb.onClick"
              type="button"
              class="stream-spine__crumb stream-spine__crumb--link"
              @click="crumb.onClick"
            >
              {{ crumb.label }}
            </button>
            <span v-else class="stream-spine__crumb stream-spine__crumb--current">{{
              crumb.label
            }}</span>
          </template>
        </div>

        <button
          type="button"
          class="stream-nav-btn neo-focus"
          :aria-label="t('planning.calendar.stream.nextPeriod')"
          @click="goNext"
        >
          <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>

        <button type="button" class="stream-today neo-focus" @click="goToday">
          <span class="material-symbols-outlined stream-today__icon" aria-hidden="true">today</span>
          {{ t('planning.calendar.stream.today') }}
        </button>
      </div>

      <div class="stream-spine__hint">
        <span class="material-symbols-outlined stream-spine__hint-icon" aria-hidden="true">{{
          scaleHintIcon
        }}</span>
        {{ scaleHint }}
      </div>
    </div>

    <!-- Ribbon loading / error (cold load only) -->
    <PlanningStatePanel
      v-if="showRibbonLoading"
      compact
      :title="t('common.loading')"
      :eyebrow="t('planning.calendar.stream.eyebrow')"
    />
    <PlanningStatePanel
      v-else-if="showRibbonError"
      compact
      :title="t('planning.calendar.loadError')"
      :body="ribbonError ?? ''"
      :eyebrow="t('planning.calendar.stream.eyebrow')"
      :action-label="t('common.buttons.tryAgain')"
      @action="loadRibbon"
    />

    <!-- Year scale: 12 month cards -->
    <section v-else-if="scale === 'year'" class="stream-year-grid">
      <StreamMonthCard
        v-for="(month, i) in months"
        :key="month.monthRef"
        :month="month"
        :month-label="monthName(month.monthRef)"
        :index="i"
        @select="drillToMonth(month.monthRef)"
      />
    </section>

    <!-- Month scale: week cards -->
    <div v-else-if="scale === 'month'" class="stream-hscroll neo-scroll">
      <div class="stream-week-row">
        <StreamWeekCard
          v-for="(week, i) in weeks"
          :key="week.weekRef"
          :week="week"
          :week-label="weekShortLabel(week.weekNumber)"
          :range-label="rangeLabel(week.startDayRef, week.endDayRef)"
          :section-labels="sectionLabels"
          :ring-labels="ringLabels"
          :index="i"
          @select="drillToWeek(week.weekRef)"
        />
      </div>
    </div>

    <!-- Week scale: 7 day cards -->
    <div v-else class="stream-hscroll neo-scroll">
      <div class="stream-day-grid">
        <StreamDayCard
          v-for="(day, i) in days"
          :key="day.dayRef"
          :day="day"
          :weekday-label="weekdayLabel(day.dayRef)"
          :journal-label="t('planning.calendar.stream.day.journal')"
          :emotions-label="t('planning.calendar.stream.day.emotions')"
          :ring-labels="ringLabels"
          :index="i"
        />
      </div>
    </div>

    <!-- Reflection wizards hosted above the detail panel, so the user can
         still peek at the period details below while working through steps. -->
    <section
      v-if="(scale === 'month' && monthWizardOpen) || (scale === 'week' && weekWizardOpen)"
      ref="wizardSectionRef"
      class="stream-wizard"
    >
      <MonthlyReflectionWizard
        v-if="scale === 'month'"
        :month-ref="monthRef"
        @close="closeMonthWizard"
        @updated="detailDirty = true"
      />
      <WeeklyReflectionWizard
        v-else
        :week-ref="weekRef"
        @close="closeWeekWizard"
        @updated="detailDirty = true"
        @plan-next-week="planNextWeekInStream"
      />
    </section>

    <!-- Full detail for the focused month / week — the classic review summary. -->
    <section v-if="showDetailPanel" class="stream-detail">
      <div class="stream-detail__head">
        <h2 class="stream-detail__title">{{ t('planning.calendar.stream.detailsTitle') }}</h2>
      </div>
      <StreamDetailPanel
        :key="detailReloadKey"
        :scale="scale"
        :month-ref="monthRef"
        :week-ref="weekRef"
        :today-ref="todayDayRef"
        @open-month-wizard="openMonthWizard"
        @open-week-wizard="openWeekWizard"
      />
    </section>
  </div>
</template>

<style scoped>
.stream {
  /* Stream design tokens, mapped onto the app palette so the view is theme-aware. */
  /* Data fills share the app's main blue (--color-primary) so cards match the detail panel. */
  --stream-bar: var(--color-primary);
  --stream-accent: var(--color-primary);
  --stream-accent-soft: var(--neo-accent-start);
  --stream-ink: var(--color-on-surface);
  --stream-muted: var(--neo-muted);
  --stream-faint: var(--color-outline);
  --stream-track: var(--neo-border);
  --stream-hole: rgb(var(--color-surface-container));

  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  padding: 34px 36px 72px;
}

@media (max-width: 640px) {
  .stream {
    padding: 20px 16px 56px;
  }
}

.stream-today {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 16px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  border: 1px solid rgb(var(--stream-track) / 0.12);
  color: rgb(var(--color-on-surface-variant));
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
}

.stream-today__icon {
  font-size: 17px;
  color: rgb(var(--stream-accent));
}

/* Spine */
.stream-spine {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 22px;
  animation: streamFadeUp 0.55s both;
}

.stream-spine__left {
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;
}

.stream-nav-btn {
  width: 42px;
  height: 42px;
  flex: none;
  border-radius: 9999px;
  border: 1px solid rgb(var(--stream-track) / 0.12);
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  box-shadow:
    -5px -5px 11px rgb(var(--neo-shadow-light) / 0.8),
    5px 5px 11px rgb(var(--neo-shadow-dark) / 0.33);
  color: rgb(var(--color-on-surface-variant));
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms ease;
}

.stream-nav-btn:hover {
  transform: translateY(-1px);
}

.stream-nav-btn .material-symbols-outlined {
  font-size: 22px;
}

.stream-spine__crumbs {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
  flex-wrap: wrap;
}

.stream-spine__sep {
  font-size: 19px;
  color: rgb(var(--stream-track));
  align-self: center;
}

.stream-spine__crumb {
  background: none;
  border: none;
  padding: 4px 4px;
  line-height: 1;
  text-transform: capitalize;
}

.stream-spine__crumb--link {
  font-size: 15px;
  font-weight: 600;
  color: rgb(var(--stream-faint));
  cursor: pointer;
  transition: color 0.2s ease;
}

.stream-spine__crumb--link:hover {
  color: rgb(var(--stream-accent));
}

.stream-spine__crumb--current {
  font-size: 23px;
  font-weight: 700;
  color: rgb(var(--stream-ink));
  letter-spacing: -0.01em;
  white-space: nowrap;
  padding: 0 2px;
}

.stream-spine__hint {
  display: flex;
  align-items: center;
  gap: 9px;
  color: rgb(var(--stream-muted));
  font-size: 12px;
  font-weight: 500;
}

.stream-spine__hint-icon {
  font-size: 17px;
  color: rgb(var(--stream-faint));
}

/* Scales */
.stream-year-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  animation: streamFadeUp 0.6s both;
}

@media (max-width: 1023px) {
  .stream-year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .stream-year-grid {
    grid-template-columns: 1fr;
  }
}

.stream-hscroll {
  overflow-x: auto;
  /* Pad + negative-margin so the cards' neumorphic shadow isn't clipped by the
     scroll container (esp. the last card on the right). Net layout is unchanged. */
  padding: 16px;
  margin: -16px;
  animation: streamFadeUp 0.6s both;
}

.stream-week-row {
  display: flex;
  align-items: stretch;
  gap: 14px;
  min-width: 760px;
}

.stream-week-row > * {
  flex: 1 1 0;
  min-width: 200px;
}

.stream-day-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 10px;
  min-width: 840px;
}

.stream-wizard {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid rgb(var(--stream-track) / 0.4);
  animation: streamFadeUp 0.6s both;
  /* Anchor for scrollIntoView so the wizard lands below the sticky top bar. */
  scroll-margin-top: 64px;
}

.stream-detail {
  margin-top: 28px;
  padding-top: 24px;
  border-top: 1px solid rgb(var(--stream-track) / 0.4);
  animation: streamFadeUp 0.6s both;
}

.stream-detail__head {
  margin-bottom: 16px;
}

.stream-detail__title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: rgb(var(--stream-ink));
  letter-spacing: -0.01em;
}

@keyframes streamFadeUp {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-spine,
  .stream-year-grid,
  .stream-hscroll,
  .stream-detail {
    animation: none;
  }
}
</style>
