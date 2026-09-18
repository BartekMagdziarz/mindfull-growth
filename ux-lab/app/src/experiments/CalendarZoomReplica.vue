<template>
  <div class="cal-zoom" tabindex="0" @keydown="onKey">
    <div class="cal-zoom__paper">
      <!-- ścieżka zoomu: każdy okruch to wyjście o poziom wyżej -->
      <nav class="zm-crumbs" aria-label="Ścieżka">
        <button type="button" :class="{ active: scale === 'year' }" @click="setScale('year')">{{ yearLabel }}</button>
        <template v-if="scale !== 'year'">
          <AppIcon name="chevron_right" />
          <button type="button" :class="{ active: scale === 'month' }" @click="setScale('month')">{{ monthLabel }}</button>
        </template>
        <template v-if="scale === 'week'">
          <AppIcon name="chevron_right" />
          <button type="button" class="active">{{ weekLabel }}</button>
        </template>
      </nav>

      <CalendarLensBar
        :title="title"
        :lens="lens"
        :is-today="isTodayFocused"
        @shift="shift"
        @today="goToday"
        @lens="lens = $event"
      />

      <!-- pas jednostek: wybrana rośnie, sąsiedzi pozostają porównywalni -->
      <section class="zm-strip" aria-label="Jednostki okresu">
        <button
          v-for="unit in units"
          :key="unit.ref"
          type="button"
          class="zm-tile"
          :class="{ focus: unit.ref === panelRef, current: unit.state === 'current', future: unit.state === 'future' }"
          @click="select(unit.ref)"
          @dblclick="drill(unit.ref)"
        >
          <small>{{ scale === 'year' ? monthShort(unit.ref) : unit.label }}</small>
          <span v-if="scale !== 'year'" class="zm-tile__sub">{{ unit.sublabel }}</span>
          <LensMark :reading="lensReading(unit, lens)" :size="unit.ref === panelRef ? 'md' : 'sm'" />
          <em v-if="unit.ref === panelRef">{{ lensReading(unit, lens).text || '–' }}</em>
          <RitualDot :status="unit.ritual" :kind="unit.kind" />
        </button>
      </section>

      <div class="zm-actions">
        <button v-if="panelMetrics.kind !== 'day'" type="button" class="zm-btn" @click="drill(panelRef)"><AppIcon name="zoom_in" /> Wejdź</button>
        <button v-else type="button" class="zm-btn" @click="openDay(panelRef)"><AppIcon name="wb_sunny" /> Otwórz dzień</button>
        <button v-if="scale !== 'year'" type="button" class="zm-btn zm-btn--quiet" @click="zoomOut"><AppIcon name="zoom_out" /> Wyjdź</button>
        <span v-if="actionNote" class="zm-note">{{ actionNote }}</span>
      </div>

      <CalendarPeriodPanel class="zm-panel" :metrics="panelMetrics" :lens="lens" :history-count="8" @open-day="openDay" @open-ritual="openRitual" />
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
import { lensReading, metricsFor, monthName, monthShort, parentRef, weekNumber } from '~lab/lab/calendarConceptData'
import { useCalendarState } from '~lab/lab/useCalendarState'

const props = defineProps<{ presetId: string }>()
const {
  fixture, scale, focusRef, selectedRef, lens, title, isTodayFocused, units, actionNote,
  shift, goToday, setScale, select, drill, zoomOut, openDay, openRitual,
} = useCalendarState(props.presetId)

/** W tej koncepcji zawsze jest aktywna JEDNOSTKA pasa: zaznaczona, bieżąca albo skrajna. */
const panelRef = computed(() => {
  if (selectedRef.value && units.value.some(unit => unit.ref === selectedRef.value)) return selectedRef.value
  const current = units.value.find(unit => unit.state === 'current')
  if (current) return current.ref
  return units.value.every(unit => unit.state === 'past') ? units.value[units.value.length - 1].ref : units.value[0].ref
})
const panelMetrics = computed(() => metricsFor(fixture.value, panelRef.value))

const yearLabel = computed(() => focusRef.value.slice(0, 4))
const monthLabel = computed(() => (scale.value === 'month' ? monthName(focusRef.value) : monthName(parentRef(focusRef.value) ?? focusRef.value.slice(0, 7))))
const weekLabel = computed(() => `T${weekNumber(focusRef.value)}`)

function onKey(event: KeyboardEvent) {
  const index = units.value.findIndex(unit => unit.ref === panelRef.value)
  if (event.key === 'ArrowRight' && index < units.value.length - 1) select(units.value[index + 1].ref)
  else if (event.key === 'ArrowLeft' && index > 0) select(units.value[index - 1].ref)
  else if (event.key === 'Enter' && panelMetrics.value.kind !== 'day') drill(panelRef.value)
  else if (event.key === 'Escape') zoomOut()
  else return
  event.preventDefault()
}
</script>

<style scoped>
.cal-zoom { box-sizing: border-box; min-height: 100vh; padding: 20px; color: rgb(var(--color-on-surface)); background: rgb(var(--color-background)); font-family: 'Nunito', 'Avenir Next', sans-serif; outline: none; }
.cal-zoom *, .cal-zoom *::before, .cal-zoom *::after { box-sizing: border-box; }
.cal-zoom__paper { display: grid; gap: 10px; align-content: start; max-width: 980px; min-height: calc(100vh - 40px); margin: 0 auto; padding: 14px 16px 18px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 34px 27px 32px 25px; background: rgb(var(--color-background)); box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13); }

.zm-crumbs { display: flex; align-items: center; gap: 2px; padding: 0 6px; color: rgb(var(--neo-muted)); }
.zm-crumbs .material-symbols-outlined { font-size: 14px; }
.zm-crumbs button { padding: 3px 7px; border: 0; border-radius: 8px; color: rgb(var(--color-on-surface-variant)); background: transparent; font-size: 10px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; cursor: pointer; }
.zm-crumbs button:hover { background: rgb(var(--sky-100)); }
.zm-crumbs button.active { color: rgb(var(--color-primary-strong)); }

.zm-strip { display: flex; align-items: flex-end; gap: 6px; padding: 8px 2px 4px; overflow-x: auto; scrollbar-width: none; }
.zm-tile { position: relative; display: grid; flex: 1 1 0; justify-items: center; gap: 5px; min-width: 56px; padding: 9px 6px 8px; border: 1px solid rgb(var(--neo-border) / .12); border-radius: 15px 12px 14px 11px; color: inherit; background: rgb(var(--color-surface) / .6); cursor: pointer; transition: flex-grow .2s ease, padding .2s ease, background .2s ease; }
.zm-tile small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; }
.zm-tile__sub { margin-top: -4px; color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 700; white-space: nowrap; }
.zm-tile em { font-size: 11px; font-weight: 800; font-style: normal; font-variant-numeric: tabular-nums; }
.zm-tile:hover { background: rgb(var(--sky-100) / .8); }
.zm-tile.focus { flex-grow: 2.4; padding: 14px 10px 12px; border-color: rgb(var(--neo-border) / .2); background: rgb(var(--neo-surface-base)); box-shadow: -5px -5px 11px rgb(var(--neo-shadow-light) / .8), 5px 5px 11px rgb(var(--neo-shadow-dark) / .2); }
.zm-tile.focus small { color: rgb(var(--color-primary-strong)); }
.zm-tile.current { outline: 2px solid rgb(var(--sky-400) / .8); outline-offset: -2px; }
.zm-tile.future { color: rgb(var(--neo-muted)); }

.zm-actions { display: flex; align-items: center; gap: 6px; padding: 0 4px; }
.zm-btn { display: inline-flex; align-items: center; gap: 5px; height: 28px; padding: 0 11px; border: 1px solid rgb(var(--neo-border) / .2); border-radius: 999px; color: rgb(var(--color-primary-strong)); background: rgb(var(--neo-surface-base)); font-size: 10px; font-weight: 800; cursor: pointer; box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .8), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18); }
.zm-btn .material-symbols-outlined { font-size: 15px; }
.zm-btn--quiet { box-shadow: none; background: transparent; color: rgb(var(--color-on-surface-variant)); }
.zm-note { margin-left: auto; color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 700; }

.zm-panel { border: 1px solid rgb(var(--neo-border) / .14); border-radius: 26px 22px 24px 20px; background: rgb(var(--neo-surface-base)); box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22); }
</style>
