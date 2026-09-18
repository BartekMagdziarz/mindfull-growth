<template>
  <div class="cal-sheet">
    <div class="cal-sheet__paper">
      <CalendarLensBar
        :title="title"
        :lens="lens"
        :scale="scale"
        :is-today="isTodayFocused"
        @shift="shift"
        @today="goToday"
        @scale="setScale"
        @lens="lens = $event"
      />

      <!-- szyna kontekstu: jednostki okresu nadrzędnego -->
      <nav v-if="scale !== 'year'" class="cal-sheet__rail" :aria-label="scale === 'month' ? 'Miesiące roku' : 'Tygodnie miesiąca'">
        <button
          v-for="unit in railUnits"
          :key="unit.ref"
          type="button"
          class="cal-sheet__rail-item"
          :class="{ active: unit.ref === focusRef, current: unit.state === 'current', future: unit.state === 'future' }"
          @click="drill(unit.ref)"
        >
          <span>{{ scale === 'month' ? monthShort(unit.ref) : unit.label }}</span>
          <LensMark :reading="lensReading(unit, lens)" size="xs" />
        </button>
      </nav>

      <!-- ROK: 12 miesięcy jak kartki kalendarza ściennego -->
      <section v-if="scale === 'year'" class="cal-sheet__year" aria-label="Miesiące">
        <button
          v-for="month in units"
          :key="month.ref"
          type="button"
          class="cal-sheet__month af-surface"
          :class="{ selected: month.ref === panelRef, current: month.state === 'current', future: month.state === 'future' }"
          @click="select(month.ref)"
          @dblclick="drill(month.ref)"
        >
          <header>
            <span>{{ month.label }}</span>
            <RitualDot :status="month.ritual" kind="month" />
          </header>
          <LensMark :reading="lensReading(month, lens)" size="md" />
          <small>{{ lensReading(month, lens).text || '–' }}</small>
          <i class="cal-sheet__enter" role="button" tabindex="-1" aria-label="Otwórz miesiąc" @click.stop="drill(month.ref)"><AppIcon name="chevron_right" /></i>
        </button>
      </section>

      <!-- MIESIĄC: prawdziwa siatka 7 kolumn, karta tygodnia na marginesie każdego wiersza -->
      <section v-else-if="scale === 'month'" class="cal-sheet__grid" aria-label="Tygodnie i dni miesiąca">
        <div class="cal-sheet__weekdays">
          <span class="cal-sheet__corner" />
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>
        <div
          v-for="row in grid"
          :key="row.week.ref"
          class="cal-sheet__row"
          :class="{ dim: !row.belongs, current: row.week.state === 'current' }"
        >
          <button
            type="button"
            class="cal-sheet__weekcard"
            :class="{ selected: row.week.ref === panelRef, future: row.week.state === 'future' }"
            @click="select(row.week.ref)"
            @dblclick="drill(row.week.ref)"
          >
            <strong>{{ row.week.label }}</strong>
            <LensMark :reading="lensReading(row.week, lens)" size="sm" />
            <RitualDot :status="row.week.ritual" kind="week" />
          </button>
          <button
            v-for="day in row.days"
            :key="day.metrics.ref"
            type="button"
            class="cal-sheet__day"
            :class="{ out: !day.inMonth, today: day.metrics.state === 'current', future: day.metrics.state === 'future', selected: day.metrics.ref === panelRef }"
            @click="select(day.metrics.ref)"
          >
            <span class="cal-sheet__num">{{ day.metrics.sublabel }}</span>
            <LensMark :reading="lensReading(day.metrics, lens)" size="xs" />
          </button>
        </div>
      </section>

      <!-- TYDZIEŃ: siedem kolumn dni -->
      <section v-else class="cal-sheet__week" aria-label="Dni tygodnia">
        <button
          v-for="day in units"
          :key="day.ref"
          type="button"
          class="cal-sheet__daycol af-surface"
          :class="{ today: day.state === 'current', future: day.state === 'future', selected: day.ref === panelRef }"
          @click="select(day.ref)"
        >
          <small>{{ day.label }}</small>
          <strong>{{ day.sublabel }}</strong>
          <LensMark :reading="lensReading(day, lens)" size="md" />
          <span class="cal-sheet__entries" aria-hidden="true">
            <i :class="{ on: day.entries.journal }" title="dziennik" />
            <i :class="{ on: day.entries.emotions }" title="emocje" />
            <i :class="{ on: day.entries.exercises }" title="ćwiczenia" />
          </span>
        </button>
      </section>

      <CalendarPeriodPanel class="af-surface cal-sheet__panel" :metrics="panelMetrics" :lens="lens" @open-day="openDay" @open-ritual="openRitual" />
      <p v-if="actionNote" class="cal-sheet__note">{{ actionNote }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import CalendarLensBar from '~lab/components/calendar/CalendarLensBar.vue'
import CalendarPeriodPanel from '~lab/components/calendar/CalendarPeriodPanel.vue'
import LensMark from '~lab/components/calendar/LensMark.vue'
import RitualDot from '~lab/components/calendar/RitualDot.vue'
import { lensReading, monthGrid, monthShort, monthsOfYear, parentRef, weeksOfMonth } from '~lab/lab/calendarConceptData'
import { useCalendarState } from '~lab/lab/useCalendarState'

const props = defineProps<{ presetId: string }>()
const {
  fixture, scale, focusRef, lens, title, isTodayFocused, units, panelRef, panelMetrics, actionNote,
  shift, goToday, setScale, select, drill, openDay, openRitual,
} = useCalendarState(props.presetId)

const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']
const grid = computed(() => (scale.value === 'month' ? monthGrid(fixture.value, focusRef.value) : []))
const railUnits = computed(() => {
  if (scale.value === 'month') return monthsOfYear(fixture.value, focusRef.value.slice(0, 4))
  if (scale.value === 'week') return weeksOfMonth(fixture.value, parentRef(focusRef.value) ?? focusRef.value.slice(0, 7))
  return []
})
</script>

<style scoped>
.cal-sheet { box-sizing: border-box; min-height: 100vh; padding: 20px; color: rgb(var(--color-on-surface)); background: rgb(var(--color-background)); font-family: 'Nunito', 'Avenir Next', sans-serif; }
.cal-sheet *, .cal-sheet *::before, .cal-sheet *::after { box-sizing: border-box; }
.cal-sheet__paper { display: grid; gap: 12px; align-content: start; max-width: 1080px; min-height: calc(100vh - 40px); margin: 0 auto; padding: 14px 16px 18px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: rgb(var(--color-background)); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }

.af-surface { border: 1px solid rgb(var(--neo-border) / .14); background: rgb(var(--neo-surface-base)); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }

/* szyna kontekstu */
.cal-sheet__rail { display: flex; gap: 4px; padding: 0 2px; overflow-x: auto; scrollbar-width: none; }
.cal-sheet__rail-item { display: grid; justify-items: center; gap: 4px; min-width: 52px; padding: 6px 8px 5px; border: 1px solid transparent; border-radius: 12px; color: rgb(var(--color-on-surface-variant)); background: transparent; font-size: 9.5px; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; cursor: pointer; }
.cal-sheet__rail-item:hover { background: rgb(var(--sky-100) / .8); }
.cal-sheet__rail-item.active { color: rgb(var(--color-primary-strong)); border-color: rgb(var(--neo-border) / .3); background: rgb(var(--neo-surface-base)); box-shadow: -2px -2px 5px rgb(var(--neo-shadow-light) / .8), 2px 2px 5px rgb(var(--neo-shadow-dark) / .16); }
.cal-sheet__rail-item.current span { text-decoration: underline; text-decoration-color: rgb(var(--sky-500)); text-underline-offset: 3px; }
.cal-sheet__rail-item.future { color: rgb(var(--neo-muted)); }

/* rok */
.cal-sheet__year { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.cal-sheet__month { position: relative; display: grid; gap: 10px; align-content: start; min-height: 108px; padding: 12px 14px; border-radius: 22px 18px 20px 17px; color: inherit; text-align: left; cursor: pointer; }
.cal-sheet__month header { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 800; }
.cal-sheet__month header span::first-letter { text-transform: uppercase; }
.cal-sheet__month small { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 800; letter-spacing: .03em; font-variant-numeric: tabular-nums; }
.cal-sheet__month.current { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.cal-sheet__month.selected { background: rgb(var(--sky-100)); }
.cal-sheet__month.future { color: rgb(var(--neo-muted)); box-shadow: none; background: rgb(var(--color-surface-container) / .35); }
.cal-sheet__enter { position: absolute; right: 8px; bottom: 8px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 999px; color: rgb(var(--color-primary-strong)); opacity: 0; transition: opacity .15s; }
.cal-sheet__enter .material-symbols-outlined { font-size: 16px; }
.cal-sheet__month:hover .cal-sheet__enter { opacity: 1; background: rgb(var(--sky-100)); }

/* miesiąc */
.cal-sheet__grid { display: grid; gap: 4px; }
.cal-sheet__weekdays, .cal-sheet__row { display: grid; grid-template-columns: 96px repeat(7, minmax(0, 1fr)); gap: 4px; }
.cal-sheet__weekdays span { padding: 0 0 2px; text-align: center; color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.cal-sheet__weekcard { display: grid; justify-items: start; align-content: center; gap: 5px; padding: 8px 10px; border: 1px solid rgb(var(--neo-border) / .14); border-radius: 16px 13px 15px 12px; color: inherit; background: rgb(var(--neo-surface-base)); text-align: left; cursor: pointer; box-shadow: -4px -4px 9px rgb(var(--neo-shadow-light) / .7), 4px 4px 9px rgb(var(--neo-shadow-dark) / .16); }
.cal-sheet__weekcard strong { font-size: 11px; font-weight: 800; }
.cal-sheet__weekcard.selected { background: rgb(var(--sky-100)); }
.cal-sheet__weekcard.future { box-shadow: none; background: rgb(var(--color-surface-container) / .35); color: rgb(var(--neo-muted)); }
.cal-sheet__row.current .cal-sheet__weekcard { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.cal-sheet__row.dim .cal-sheet__weekcard { opacity: .55; }
.cal-sheet__day { display: grid; grid-template-rows: auto 1fr; justify-items: start; align-items: end; gap: 2px; min-height: 58px; padding: 7px 9px 8px; border: 1px solid rgb(var(--neo-border) / .1); border-radius: 12px 10px 12px 10px; color: inherit; background: rgb(var(--color-surface) / .6); text-align: left; cursor: pointer; }
.cal-sheet__day:hover { background: rgb(var(--sky-100) / .8); }
.cal-sheet__num { font-size: 11px; font-weight: 800; font-variant-numeric: tabular-nums; }
.cal-sheet__day.out { opacity: .38; }
.cal-sheet__day.future .cal-sheet__num { color: rgb(var(--neo-muted)); }
.cal-sheet__day.today { outline: 2px solid rgb(var(--sky-400) / .9); outline-offset: -2px; }
.cal-sheet__day.selected { background: rgb(var(--sky-100)); }

/* tydzień */
.cal-sheet__week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 10px; }
.cal-sheet__daycol { display: grid; justify-items: center; gap: 8px; padding: 14px 8px 12px; border-radius: 20px 16px 18px 15px; color: inherit; cursor: pointer; }
.cal-sheet__daycol small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.cal-sheet__daycol strong { font-size: 20px; font-weight: 800; line-height: 1; }
.cal-sheet__daycol.today { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.cal-sheet__daycol.selected { background: rgb(var(--sky-100)); }
.cal-sheet__daycol.future { color: rgb(var(--neo-muted)); box-shadow: none; background: rgb(var(--color-surface-container) / .35); }
.cal-sheet__entries { display: inline-flex; gap: 4px; }
.cal-sheet__entries i { display: block; width: 5px; height: 5px; border-radius: 999px; background: rgb(var(--sky-200) / .6); }
.cal-sheet__entries i.on { background: rgb(var(--sky-600)); }

.cal-sheet__panel { border-radius: 26px 22px 24px 20px; }
.cal-sheet__note { margin: 0; padding: 0 6px; color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; }
</style>
