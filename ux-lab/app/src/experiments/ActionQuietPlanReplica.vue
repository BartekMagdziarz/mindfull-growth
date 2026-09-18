<template>
  <div class="product-replica act-quiet">
    <div class="qp-sheet" :class="{ 'qp-sheet--drawer': drawerOpen }">
      <div class="qp-column">
        <header class="qp-brief qp-surface">
          <div class="qp-brief__date">
            <span class="qp-eyebrow">Widok działania · cichy plan</span>
            <h2>{{ periodTitle }}</h2>
          </div>
          <div class="qp-brief__wellbeing" role="group" aria-label="Szybkie wpisy">
            <button type="button" :class="{ done: journalDone }" :aria-label="journalDone ? 'Wpis zapisany' : 'Dziennik'" title="Dziennik" @click="journalDone = !journalDone"><AppIcon :name="journalDone ? 'check' : 'history_edu'" /></button>
            <button type="button" :aria-label="`Emocje: ${emotionLogs}/3`" title="Emocje" @click="emotionLogs = emotionLogs === 3 ? 0 : emotionLogs + 1"><AppIcon name="cognition" /><i v-for="dot in emotionLogs" :key="dot" class="qp-mini-dot" /></button>
            <button type="button" :class="{ done: exerciseDone }" :aria-label="exerciseDone ? 'Ćwiczenie wykonane' : 'Ćwiczenia'" title="Ćwiczenia" @click="exerciseDone = !exerciseDone"><AppIcon :name="exerciseDone ? 'check' : 'psychology'" /></button>
          </div>
          <div class="qp-brief__context">
            <span v-for="entry in briefMarkers" :key="entry.key" class="qp-ghost" :title="entry.title">
              <AppIcon :name="entry.icon" /> {{ entry.dateLabel }}
            </span>
            <div class="qp-pulse" role="img" :aria-label="`Wykonanie dnia: ${day.doneCount.value} z ${day.todayItems.value.length}`">
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14.5" class="qp-pulse-track" />
                <circle cx="18" cy="18" r="14.5" class="qp-pulse-fill" :stroke-dasharray="`${pulsePct * 0.911} 100`" />
              </svg>
              <strong>{{ day.doneCount.value }}/{{ day.todayItems.value.length }}</strong>
            </div>
          </div>
        </header>

        <section class="qp-compass" aria-label="Kompas">
          <ActionCompassRow :tiles="tiles" @hover="hoverKey = $event" />
        </section>

        <main class="qp-list qp-surface" aria-label="Plan dnia">
          <section v-for="group in day.dayGroups.value" :key="group.key" class="qp-group">
            <h3>{{ group.label }}</h3>
            <ActionDayRow
              v-for="item in group.items"
              :key="item.key"
              :item="item"
              :done="day.isDone(item)"
              :value="day.valueFor(item)"
              :lit="isRelated(item, hoverKey)"
              :dim="hoverKey !== null && !isRelated(item, hoverKey)"
              @toggle="day.toggle(item)"
              @tomorrow="day.moveToTomorrow(item)"
              @pick-day="startPick(item.key)"
              @hide="day.hide(item)"
              @open="() => {}"
            />
          </section>
        </main>

        <button type="button" class="qp-more" :class="{ active: drawerOpen }" :aria-expanded="drawerOpen" @click="drawerOpen = !drawerOpen">
          <AppIcon name="right_panel_open" /> Szczegóły
        </button>
      </div>

      <aside v-if="drawerOpen" class="qp-drawer qp-surface" aria-label="Szczegóły dnia">
        <header class="qp-drawer__head">
          <h3>Szczegóły</h3>
          <button type="button" aria-label="Zamknij szczegóły" @click="drawerOpen = false"><AppIcon name="close" /></button>
        </header>
        <ActionMiniCalendar :targeting="movingKey !== null" @pick="onPickDay" />
        <ActionUpcomingList :limit="5" />
        <section class="qp-focus-charts" aria-label="Fokus tygodnia w liczbach">
          <h3>Fokus tygodnia</h3>
          <article v-for="chart in focusCharts" :key="chart.key" class="qp-chart">
            <header>
              <AppIcon :name="chart.icon" />
              <strong>{{ chart.title }}</strong>
              <em>{{ chart.label }}</em>
            </header>
            <svg v-if="chart.line.length > 1" viewBox="0 0 220 52" preserveAspectRatio="none" role="img" :aria-label="`Przebieg: ${chart.title}`">
              <line v-if="chart.targetY !== null" x1="0" :y1="chart.targetY" x2="220" :y2="chart.targetY" class="qp-target" />
              <path class="qp-echo" :d="smoothPath(chart.line, 2)" />
              <path :d="smoothPath(chart.line)" />
              <circle :cx="chart.line.at(-1)!.x" :cy="chart.line.at(-1)!.y" r="3.5" />
            </svg>
            <div v-else class="qp-chart__ring">
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14.5" class="qp-pulse-track" />
                <circle cx="18" cy="18" r="14.5" class="qp-pulse-fill" :stroke-dasharray="`${chart.pct * 0.911} 100`" />
              </svg>
              <small>w tym tygodniu</small>
            </div>
          </article>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import ActionCompassRow from '~lab/components/action/ActionCompassRow.vue'
import ActionDayRow from '~lab/components/action/ActionDayRow.vue'
import ActionMiniCalendar from '~lab/components/action/ActionMiniCalendar.vue'
import ActionUpcomingList from '~lab/components/action/ActionUpcomingList.vue'
import {
  compassTiles,
  currentWeekPoint,
  familyIcon,
  isRelated,
  smoothPath,
  upcomingEntries,
  WEEK_FOCUS_KEYS,
  weeklyObjects,
  type Point,
} from '~lab/lab/actionConceptData'
import { useActionDayState } from '~lab/lab/useActionDayState'

defineProps<{ presetId: string }>()

const day = useActionDayState()
const hoverKey = ref<string | null>(null)
const movingKey = ref<string | null>(null)
const drawerOpen = ref(false)
const journalDone = ref(false)
const emotionLogs = ref(1)
const exerciseDone = ref(false)

const tiles = computed(() => compassTiles(day.fixture.value))
const pulsePct = computed(() => (day.todayItems.value.length ? Math.round((day.doneCount.value / day.todayItems.value.length) * 100) : 0))
const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

// maksymalnie dwa najbliższe znaczniki jako ciche „duchy” w odprawie
const briefMarkers = computed(() => upcomingEntries(day.fixture.value).slice(0, 2))

function startPick(key: string) {
  movingKey.value = movingKey.value === key ? null : key
  drawerOpen.value = true
}
function onPickDay(dayRef: string) {
  if (!movingKey.value) return
  const item = day.todayItems.value.find(candidate => candidate.key === movingKey.value)
  if (item) day.moveTo(item, dayRef)
  movingKey.value = null
}

interface FocusChart {
  key: string
  icon: string
  title: string
  label: string
  line: Point[]
  targetY: number | null
  pct: number
}

const focusCharts = computed<FocusChart[]>(() => WEEK_FOCUS_KEYS
  .map(key => weeklyObjects(day.fixture.value).find(item => item.key === key))
  .filter((item): item is LabFixtureObject => Boolean(item))
  .map(item => {
    const point = currentWeekPoint(day.fixture.value, item)
    if (item.entryMode === 'completion' || item.entryMode === 'multi-completion') {
      const value = Math.max(0, Math.round(point?.value ?? 0))
      const target = Math.max(1, Math.round(point?.target ?? 1))
      return { key: item.key, icon: familyIcon[item.family], title: item.title, label: `${value}/${target}`, line: [], targetY: null, pct: Math.min(100, Math.round((value / target) * 100)) }
    }
    const points = item.chart.slice(-8).filter(entry => entry.value !== undefined)
    const target = point?.target
    const values = points.map(entry => entry.value!)
    const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY)
    const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY)
    const range = Math.max(1, max - min)
    const yFor = (value: number) => 8 + ((max - value) / range) * 36
    return {
      key: item.key,
      icon: familyIcon[item.family],
      title: item.title,
      label: item.targetLabel ?? '',
      targetY: target === undefined ? null : Math.round(yFor(target)),
      pct: 0,
      line: points.map((entry, index) => ({
        x: points.length === 1 ? 110 : 6 + index * (208 / (points.length - 1)),
        y: Math.round(yFor(entry.value!)),
      })),
    }
  }))
</script>

<style scoped>
.act-quiet {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-quiet *, .act-quiet *::before, .act-quiet *::after { box-sizing: border-box; }
.act-quiet h3 { margin: 0; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.qp-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.qp-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.qp-surface > * { position: relative; z-index: 1; }

.qp-sheet { display: grid; grid-template-columns: minmax(0, 640px); gap: 16px; justify-content: center; min-height: calc(100vh - 40px); }
.qp-sheet--drawer { grid-template-columns: minmax(0, 640px) minmax(300px, 360px); }

.qp-column { display: grid; gap: 14px; align-content: start; }

.qp-brief { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 14px; align-items: center; padding: 11px 16px; border-radius: 24px 20px 25px 21px; }
.qp-eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.qp-brief h2 { margin: 0; font-size: 15px; font-weight: 800; }

.qp-brief__wellbeing { display: inline-flex; gap: 6px; }
.qp-brief__wellbeing button {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 7px;
  border: 1px solid rgb(var(--color-primary) / .1);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .6);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}
.qp-brief__wellbeing button.done { background: rgb(var(--sky-300) / .85); }
.qp-brief__wellbeing .material-symbols-outlined { font-size: 16px; }
.qp-mini-dot { width: 4px; height: 4px; border-radius: 50%; background: rgb(var(--sky-700)); }

.qp-brief__context { display: inline-flex; gap: 10px; align-items: center; }
.qp-ghost {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 3px 9px;
  border: 1px dashed rgb(var(--neo-border) / .4);
  border-radius: 11px 13px 10px 12px;
  color: rgb(var(--neo-muted));
  font-size: 8.5px;
  font-weight: 800;
}
.qp-ghost .material-symbols-outlined { font-size: 12px; }
.qp-pulse { display: flex; gap: 7px; align-items: center; }
.qp-pulse svg { width: 30px; height: 30px; transform: rotate(-90deg); }
.qp-pulse strong { font-size: 10.5px; font-weight: 800; }
.qp-pulse-track { fill: none; stroke: rgb(var(--neo-border) / .22); stroke-width: 4.5; }
.qp-pulse-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4.5; stroke-linecap: round; }

.qp-compass :deep(.ac-tile) { padding: 8px 5px 7px; }
.qp-compass :deep(.ac-tile__icon) { width: 30px; height: 30px; }
.qp-compass :deep(.ac-tile__icon .material-symbols-outlined) { font-size: 17px; }

.qp-list { padding: 11px 16px; border-radius: 25px 30px 24px 28px; }
.qp-group + .qp-group { margin-top: 8px; }

.qp-more {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-self: end;
  padding: 6px 13px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 13px 16px 12px 15px;
  color: rgb(var(--neo-muted));
  background: transparent;
  font-size: 9.5px;
  font-weight: 800;
  cursor: pointer;
}
.qp-more:hover, .qp-more.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .8); }
.qp-more .material-symbols-outlined { font-size: 14px; }

.qp-drawer { display: grid; gap: 16px; align-content: start; align-self: start; padding: 13px 15px; border-radius: 25px 30px 24px 28px; }
.qp-drawer__head { display: flex; align-items: center; justify-content: space-between; }
.qp-drawer__head button { display: grid; place-items: center; width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; color: rgb(var(--neo-muted)); background: rgb(var(--neo-border) / .18); cursor: pointer; }
.qp-drawer__head button .material-symbols-outlined { font-size: 12px; }

.qp-focus-charts { display: grid; gap: 8px; }
.qp-chart { display: grid; gap: 5px; padding: 8px 10px; border: 1px solid rgb(var(--neo-border) / .16); border-radius: 15px 18px 14px 17px; background: rgb(var(--color-surface-container) / .5); }
.qp-chart header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 6px; align-items: center; }
.qp-chart header .material-symbols-outlined { color: rgb(var(--color-primary-strong)); font-size: 14px; }
.qp-chart header strong { overflow: hidden; font-size: 9.5px; font-weight: 750; text-overflow: ellipsis; white-space: nowrap; }
.qp-chart header em { color: rgb(var(--neo-muted)); font-size: 8px; font-style: normal; font-weight: 800; }
.qp-chart svg:not(.qp-chart__ring svg) { width: 100%; height: 40px; }
.qp-chart path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 2.2; stroke-linecap: round; }
.qp-chart path.qp-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 3; }
.qp-chart circle { fill: rgb(var(--sky-700)); }
.qp-target { stroke: rgb(var(--neo-border) / .5); stroke-width: 1; stroke-dasharray: 4 4; }
.qp-chart__ring { display: flex; gap: 8px; align-items: center; }
.qp-chart__ring svg { width: 30px; height: 30px; transform: rotate(-90deg); }
.qp-chart__ring small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 750; }
</style>
