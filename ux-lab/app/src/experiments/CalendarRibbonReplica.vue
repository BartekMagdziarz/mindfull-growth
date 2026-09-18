<template>
  <div class="cal-ribbon">
    <div class="cal-ribbon__paper">
      <CalendarLensBar
        :title="titleLabel"
        :lens="lens"
        :is-today="selectedWeek === fixture.refs.currentWeek"
        @shift="shiftWeek"
        @today="goToday"
        @lens="lens = $event"
      />

      <!-- rząd 1: miesiące roku -->
      <section class="rb-months" aria-label="Miesiące">
        <button
          v-for="month in months"
          :key="month.ref"
          type="button"
          class="rb-month"
          :class="{ active: month.ref === activeMonth, current: month.state === 'current', future: month.state === 'future', selected: picked === 'month' && month.ref === activeMonth }"
          @click="pickMonth(month.ref)"
        >
          <span>{{ monthShort(month.ref) }}</span>
          <LensMark :reading="lensReading(month, lens)" size="xs" />
          <RitualDot :status="month.ritual" kind="month" />
        </button>
      </section>

      <!-- rząd 2: ciągła wstęga tygodni roku, pogrupowana miesiącami -->
      <section ref="ribbonEl" class="rb-weeks" aria-label="Tygodnie roku">
        <div class="rb-weeks__track">
          <div
            v-for="group in weekGroups"
            :key="group.monthRef"
            class="rb-group"
            :class="{ active: group.monthRef === activeMonth }"
          >
            <span class="rb-group__label">{{ monthShort(group.monthRef) }}</span>
            <div class="rb-group__weeks">
              <button
                v-for="week in group.weeks"
                :key="week.metrics.ref"
                type="button"
                class="rb-week"
                :class="{ selected: week.metrics.ref === selectedWeek, current: week.metrics.state === 'current', future: week.metrics.state === 'future', boundary: week.boundary }"
                :data-week="week.metrics.ref"
                :title="`${week.metrics.label} · ${week.metrics.sublabel}`"
                @click="pickWeek(week.metrics.ref)"
              >
                <strong>{{ week.metrics.label }}</strong>
                <LensMark :reading="lensReading(week.metrics, lens)" size="sm" />
                <RitualDot :status="week.metrics.ritual" kind="week" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- rząd 3: dni wybranego tygodnia -->
      <section class="rb-days" aria-label="Dni tygodnia">
        <button
          v-for="day in days"
          :key="day.ref"
          type="button"
          class="rb-day"
          :class="{ today: day.state === 'current', future: day.state === 'future', selected: picked === 'day' && day.ref === selectedDay }"
          @click="pickDay(day.ref)"
        >
          <small>{{ day.label }}</small>
          <strong>{{ day.sublabel }}</strong>
          <LensMark :reading="lensReading(day, lens)" size="sm" />
        </button>
      </section>

      <CalendarPeriodPanel class="rb-panel" :metrics="panelMetrics" :lens="lens" @open-day="openDay" @open-ritual="openRitual" />
      <p v-if="actionNote" class="rb-note">{{ actionNote }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { MonthRef, WeekRef } from '@product/domain/period'
import { getChildPeriods, getPeriodBounds } from '@product/utils/periods'
import CalendarLensBar from '~lab/components/calendar/CalendarLensBar.vue'
import CalendarPeriodPanel from '~lab/components/calendar/CalendarPeriodPanel.vue'
import LensMark from '~lab/components/calendar/LensMark.vue'
import RitualDot from '~lab/components/calendar/RitualDot.vue'
import { useLabStore } from '~lab/stores/lab.store'
import {
  dayMetrics,
  daysOfWeek,
  lensReading,
  metricsFor,
  monthShort,
  monthsOfYear,
  periodTitle,
  refForScale,
  shiftPeriod,
  weekBelongsToMonth,
  weekMetrics,
  type LensId,
  type PeriodMetrics,
} from '~lab/lab/calendarConceptData'

const props = defineProps<{ presetId: string }>()
const labStore = useLabStore()
const fixture = computed(() => labStore.fixture)
const preset = fixture.value.presets.calendar.find(item => item.id === props.presetId) ?? fixture.value.presets.calendar[0]

const lens = ref<LensId>('rytm')
const activeMonth = ref<string>(String(preset.periodRef))
const selectedWeek = ref<string>(initialWeek(activeMonth.value))
const selectedDay = ref<string | null>(null)
const picked = ref<'month' | 'week' | 'day'>('week')
const ribbonEl = ref<HTMLElement | null>(null)
const actionNote = ref('')

function initialWeek(monthRef: string): string {
  const current = fixture.value.refs.currentWeek
  if (weekBelongsToMonth(current, monthRef)) return current
  return getChildPeriods(monthRef as MonthRef).find(week => weekBelongsToMonth(week, monthRef)) ?? getChildPeriods(monthRef as MonthRef)[0]
}

const year = computed(() => activeMonth.value.slice(0, 4))
const months = computed(() => monthsOfYear(fixture.value, year.value))
const weekGroups = computed(() => months.value.map(month => ({
  monthRef: month.ref,
  weeks: getChildPeriods(month.ref as MonthRef)
    .filter(weekRef => weekBelongsToMonth(weekRef, month.ref))
    .map(weekRef => {
      const { start, end } = getPeriodBounds(weekRef)
      return { metrics: weekMetrics(fixture.value, weekRef), boundary: start.slice(0, 7) !== end.slice(0, 7) }
    }),
})))
const days = computed(() => daysOfWeek(fixture.value, selectedWeek.value))
const titleLabel = computed(() => periodTitle(selectedWeek.value))

const panelMetrics = computed<PeriodMetrics>(() => {
  if (picked.value === 'day' && selectedDay.value) return dayMetrics(fixture.value, selectedDay.value)
  if (picked.value === 'month') return metricsFor(fixture.value, activeMonth.value)
  return weekMetrics(fixture.value, selectedWeek.value)
})

function monthOfWeek(weekRef: string): string {
  const { start } = getPeriodBounds(weekRef as WeekRef)
  const thursday = new Date(`${start}T12:00:00`)
  thursday.setDate(thursday.getDate() + 3)
  return `${thursday.getFullYear()}-${String(thursday.getMonth() + 1).padStart(2, '0')}`
}

function pickMonth(monthRef: string) {
  activeMonth.value = monthRef
  selectedWeek.value = initialWeek(monthRef)
  selectedDay.value = null
  picked.value = 'month'
}

function pickWeek(weekRef: string) {
  selectedWeek.value = weekRef
  activeMonth.value = monthOfWeek(weekRef)
  selectedDay.value = null
  picked.value = 'week'
}

function pickDay(dayRef: string) {
  selectedDay.value = dayRef
  picked.value = 'day'
}

function shiftWeek(direction: -1 | 1) {
  pickWeek(shiftPeriod(selectedWeek.value, direction))
}

function goToday() {
  pickWeek(refForScale(fixture.value.refs.today, 'week'))
}

function openDay(dayRef: string) {
  actionNote.value = `→ Dzisiaj · ${dayRef}`
}
function openRitual(ref: string) {
  actionNote.value = `→ Rytuał · ${ref}`
}

watch(selectedWeek, async () => {
  await nextTick()
  const el = ribbonEl.value?.querySelector<HTMLElement>(`[data-week="${selectedWeek.value}"]`)
  el?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' })
}, { immediate: true })
</script>

<style scoped>
.cal-ribbon { box-sizing: border-box; min-height: 100vh; padding: 20px; color: rgb(var(--color-on-surface)); background: rgb(var(--color-background)); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.cal-ribbon *, .cal-ribbon *::before, .cal-ribbon *::after { box-sizing: border-box; }
.cal-ribbon__paper { display: grid; gap: 12px; align-content: start; max-width: 1080px; min-height: calc(100vh - 40px); margin: 0 auto; padding: 14px 16px 18px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: rgb(var(--color-background)); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }

/* miesiące */
.rb-months { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 4px; }
.rb-month { display: grid; justify-items: center; gap: 4px; padding: 7px 4px 6px; border: 1px solid transparent; border-radius: 12px; color: rgb(var(--color-on-surface-variant)); background: transparent; font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }
.rb-month:hover { background: rgb(var(--sky-100) / .8); }
.rb-month.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .7); }
.rb-month.selected { border-color: rgb(var(--neo-border) / .3); background: rgb(var(--neo-surface-base)); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .8), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.rb-month.current span { text-decoration: underline; text-decoration-color: rgb(var(--sky-500)); text-underline-offset: 3px; }
.rb-month.future { color: rgb(var(--neo-muted)); }

/* wstęga tygodni */
.rb-weeks { position: relative; overflow-x: auto; padding: 6px 2px 10px; scrollbar-width: thin; }
.rb-weeks__track { display: flex; gap: 14px; width: max-content; }
.rb-group { display: grid; gap: 4px; padding: 4px 6px 6px; border-radius: 16px; border: 1px solid transparent; }
.rb-group.active { border-color: rgb(var(--sky-300) / .8); background: rgb(var(--sky-50) / .8); }
.rb-group__label { padding-left: 4px; color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
.rb-group.active .rb-group__label { color: rgb(var(--color-primary-strong)); }
.rb-group__weeks { display: flex; gap: 4px; }
.rb-week { position: relative; display: grid; justify-items: center; gap: 6px; width: 64px; padding: 8px 6px 7px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 15px 12px 14px 11px; color: inherit; background: rgb(var(--neo-surface-base)); cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .14); }
.rb-week strong { font-size: 10.5px; font-weight: 800; }
.rb-week:hover { background: rgb(var(--sky-100) / .8); }
.rb-week.selected { background: rgb(var(--sky-100)); border-color: rgb(var(--sky-300)); }
.rb-week.current { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.rb-week.future { color: rgb(var(--neo-muted)); box-shadow: none; background: rgb(var(--color-surface-container) / .35); }
.rb-week.boundary::after { content: ''; position: absolute; left: 50%; bottom: -5px; width: 10px; height: 2px; margin-left: -5px; border-radius: 1px; background: rgb(var(--neo-border) / .6); }

/* dni */
.rb-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.rb-day { display: grid; justify-items: center; gap: 6px; padding: 10px 8px 9px; border: 1px solid rgb(var(--neo-border) / .1); border-radius: 14px 12px 14px 12px; color: inherit; background: rgb(var(--color-surface) / .6); cursor: pointer; }
.rb-day small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.rb-day strong { font-size: 15px; font-weight: 800; line-height: 1; }
.rb-day:hover { background: rgb(var(--sky-100) / .8); }
.rb-day.today { outline: 2px solid rgb(var(--sky-400) / .9); outline-offset: -2px; }
.rb-day.selected { background: rgb(var(--sky-100)); }
.rb-day.future { color: rgb(var(--neo-muted)); }

.rb-panel { border: 1px solid rgb(var(--neo-border) / .14); border-radius: 26px 22px 24px 20px; background: rgb(var(--neo-surface-base)); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }
.rb-note { margin: 0; padding: 0 6px; color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; }
</style>
