<template>
  <div class="product-replica act-queue">
    <div class="aq-sheet">
      <aside class="aq-rail">
        <section class="aq-surface aq-rail__card" aria-label="Kompas">
          <h3>Kompas</h3>
          <ActionCompassRow :tiles="tiles" vertical @hover="hoverKey = $event" />
        </section>
        <section class="aq-surface aq-rail__card" aria-label="Kalendarz">
          <ActionMiniCalendar :targeting="picking" @pick="onPickDay" />
        </section>
        <section class="aq-surface aq-rail__card" aria-label="Najbliższe terminy">
          <ActionUpcomingList :limit="4" />
        </section>
      </aside>

      <main class="aq-main">
        <header class="aq-head aq-surface">
          <div>
            <span class="aq-eyebrow">Widok działania · kolejka</span>
            <h2>{{ periodTitle }}</h2>
          </div>
          <strong class="aq-progress">{{ day.doneCount.value }}/{{ day.todayItems.value.length }}</strong>
        </header>

        <section v-if="nowItem" class="aq-now aq-surface" aria-label="Teraz">
          <header class="aq-now__head">
            <span class="aq-now__icon"><AppIcon :name="familyIcon[nowItem.family]" /></span>
            <div>
              <h3>Teraz</h3>
              <h2 :title="nowItem.contribution || nowItem.title">{{ nowItem.title }}</h2>
              <small v-if="nowItem.targetLabel">{{ nowItem.targetLabel }}</small>
            </div>
          </header>

          <div class="aq-now__chart">
            <div v-if="nowChart.kind === 'ring'" class="aq-ring" role="img" :aria-label="`Tydzień: ${nowChart.label}`">
              <svg viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="14.5" class="aq-ring-track" />
                <circle cx="18" cy="18" r="14.5" class="aq-ring-fill" :stroke-dasharray="`${nowChart.pct * 0.911} 100`" />
              </svg>
              <div class="aq-ring__copy"><strong>{{ nowChart.label }}</strong><small>w tym tygodniu</small></div>
            </div>
            <div v-else-if="nowChart.kind === 'bars'" class="aq-bars" role="img" :aria-label="`Ostatnie tygodnie: ${nowItem.title}`">
              <div class="aq-bars__row">
                <i v-for="(bar, index) in nowChart.bars" :key="index" :style="{ height: `${bar.pct}%` }" :class="{ current: bar.current, empty: bar.empty }" />
              </div>
              <small>ostatnie tygodnie · cel {{ nowChart.label }}</small>
            </div>
            <div v-else class="aq-line" role="img" :aria-label="`Przebieg: ${nowItem.title}`">
              <svg viewBox="0 0 320 84" preserveAspectRatio="none">
                <line v-if="nowChart.targetY !== null" x1="0" :y1="nowChart.targetY" x2="320" :y2="nowChart.targetY" class="aq-target" />
                <path v-if="nowChart.line.length > 1" class="aq-echo" :d="smoothPath(nowChart.line, 2.5)" />
                <path v-if="nowChart.line.length > 1" :d="smoothPath(nowChart.line)" />
                <circle v-if="nowChart.line.length" :cx="nowChart.line.at(-1)!.x" :cy="nowChart.line.at(-1)!.y" r="4" />
              </svg>
              <small>ostatnie tygodnie</small>
            </div>
          </div>

          <footer class="aq-now__actions">
            <button
              type="button"
              class="aq-do"
              :aria-label="nowItem.entryMode === 'completion' ? `Zapisz: ${nowItem.title}` : `Zwiększ: ${nowItem.title}`"
              @click="completeNow"
            >
              <AppIcon :name="nowItem.entryMode === 'completion' ? 'check' : 'add'" />
              <span v-if="nowItem.entryMode !== 'completion'">{{ formatNumber(day.valueFor(nowItem)) }}</span>
            </button>
            <div class="aq-secondary">
              <button type="button" title="Przenieś na jutro" @click="day.moveToTomorrow(nowItem)"><AppIcon name="east" /> Jutro</button>
              <button type="button" title="Wybierz dzień" :class="{ active: picking }" @click="picking = !picking"><AppIcon name="calendar_month" /> Dzień</button>
              <button type="button" title="Pomiń dziś" @click="day.hide(nowItem)"><AppIcon name="visibility_off" /> Pomiń</button>
            </div>
          </footer>
        </section>

        <section v-else class="aq-now aq-surface aq-now--empty">
          <AppIcon name="done_all" />
          <strong>Dzień domknięty</strong>
        </section>

        <section class="aq-queue aq-surface" aria-label="Dalej w kolejce">
          <h3>Dalej ({{ queueRest.length }})</h3>
          <button
            v-for="item in queueRest"
            :key="item.key"
            type="button"
            class="aq-queue__row"
            :class="{ lit: isRelated(item, hoverKey), dim: hoverKey !== null && !isRelated(item, hoverKey) }"
            :aria-label="`Przenieś na scenę: ${item.title}`"
            @click="promotedKey = item.key"
          >
            <AppIcon :name="familyIcon[item.family]" />
            <strong>{{ item.title }}</strong>
            <em v-if="item.targetLabel">{{ item.targetLabel }}</em>
          </button>
          <p v-if="!queueRest.length" class="aq-queue__empty">Kolejka pusta</p>
        </section>

        <button v-if="doneItems.length" type="button" class="aq-done" @click="doneOpen = !doneOpen">
          <AppIcon name="check_circle" /> Zrobione ({{ doneItems.length }})
          <AppIcon :name="doneOpen ? 'expand_less' : 'expand_more'" />
        </button>
        <section v-if="doneOpen && doneItems.length" class="aq-donelist aq-surface">
          <div v-for="item in doneItems" :key="item.key" class="aq-donelist__row">
            <AppIcon :name="familyIcon[item.family]" />
            <span>{{ item.title }}</span>
            <button type="button" :aria-label="`Cofnij: ${item.title}`" @click="day.toggle(item)"><AppIcon name="undo" /></button>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import ActionCompassRow from '~lab/components/action/ActionCompassRow.vue'
import ActionMiniCalendar from '~lab/components/action/ActionMiniCalendar.vue'
import ActionUpcomingList from '~lab/components/action/ActionUpcomingList.vue'
import { compassTiles, currentWeekPoint, familyIcon, formatNumber, isRelated, smoothPath, type Point } from '~lab/lab/actionConceptData'
import { useActionDayState } from '~lab/lab/useActionDayState'

defineProps<{ presetId: string }>()

const day = useActionDayState()
const hoverKey = ref<string | null>(null)
const picking = ref(false)
const promotedKey = ref<string | null>(null)
const doneOpen = ref(false)

const tiles = computed(() => compassTiles(day.fixture.value))
const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

const openItems = computed(() => day.todayItems.value.filter(item => !day.hasEntry(item)))
const doneItems = computed(() => day.todayItems.value.filter(item => day.hasEntry(item)))

const nowItem = computed<LabFixtureObject | null>(() => {
  const promoted = openItems.value.find(item => item.key === promotedKey.value)
  return promoted ?? openItems.value[0] ?? null
})
const queueRest = computed(() => openItems.value.filter(item => item.key !== nowItem.value?.key))

function completeNow() {
  if (!nowItem.value) return
  day.toggle(nowItem.value)
}
function onPickDay(dayRef: string) {
  if (!picking.value || !nowItem.value) return
  day.moveTo(nowItem.value, dayRef)
  picking.value = false
}

type NowChart =
  | { kind: 'ring'; pct: number; label: string }
  | { kind: 'bars'; bars: Array<{ pct: number; current: boolean; empty: boolean }>; label: string }
  | { kind: 'line'; line: Point[]; targetY: number | null }

const nowChart = computed<NowChart>(() => {
  const item = nowItem.value
  if (!item) return { kind: 'ring', pct: 0, label: '—' }
  const point = currentWeekPoint(day.fixture.value, item)
  if (item.entryMode === 'completion' || item.entryMode === 'multi-completion') {
    const value = Math.max(0, Math.round(point?.value ?? 0))
    const target = Math.max(1, Math.round(point?.target ?? 1))
    return { kind: 'ring', pct: Math.min(100, Math.round((value / target) * 100)), label: `${value}/${target}` }
  }
  if (item.entryMode === 'counter') {
    const points = item.chart.slice(-6)
    const target = point?.target
    const max = Math.max(1, ...points.map(entry => entry.value ?? 0), target ?? 0)
    return {
      kind: 'bars',
      label: item.targetLabel ?? '—',
      bars: points.map(entry => ({
        pct: entry.value === undefined ? 4 : Math.max(8, Math.round((entry.value / max) * 92)),
        current: entry.periodRef === day.fixture.value.refs.currentWeek,
        empty: entry.value === undefined,
      })),
    }
  }
  const points = item.chart.slice(-8).filter(entry => entry.value !== undefined)
  const target = point?.target
  const values = points.map(entry => entry.value!)
  const min = Math.min(...values, target ?? Number.POSITIVE_INFINITY)
  const max = Math.max(...values, target ?? Number.NEGATIVE_INFINITY)
  const range = Math.max(1, max - min)
  const yFor = (value: number) => 12 + ((max - value) / range) * 58
  return {
    kind: 'line',
    targetY: target === undefined ? null : Math.round(yFor(target)),
    line: points.map((entry, index) => ({
      x: points.length === 1 ? 160 : 8 + index * (304 / (points.length - 1)),
      y: Math.round(yFor(entry.value!)),
    })),
  }
})
</script>

<style scoped>
.act-queue {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-queue *, .act-queue *::before, .act-queue *::after { box-sizing: border-box; }
.act-queue h3 { margin: 0; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.aq-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.aq-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.aq-surface > * { position: relative; z-index: 1; }

.aq-sheet {
  display: grid;
  grid-template-columns: minmax(280px, .42fr) minmax(0, 1fr);
  gap: 16px;
  max-width: 1040px;
  min-height: calc(100vh - 40px);
  margin: 0 auto;
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: rgb(var(--color-background));
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
}

.aq-rail { display: grid; gap: 14px; align-content: start; }
.aq-rail__card { display: grid; gap: 8px; padding: 12px 14px; border-radius: 25px 30px 24px 28px; }

.aq-main { display: grid; gap: 14px; align-content: start; min-width: 0; }
.aq-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 16px; border-radius: 24px 20px 25px 21px; }
.aq-eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.aq-head h2 { margin: 0; font-size: 15px; font-weight: 800; }
.aq-progress { font-size: 12px; font-weight: 800; }

.aq-now { display: grid; gap: 12px; padding: 16px 18px; border-radius: 25px 30px 24px 28px; }
.aq-now__head { display: flex; gap: 12px; align-items: center; }
.aq-now__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .7);
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}
.aq-now__icon .material-symbols-outlined { font-size: 24px; }
.aq-now__head h2 { margin: 2px 0 0; font-size: 14px; font-weight: 800; line-height: 1.25; }
.aq-now__head small { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 750; }

.aq-now__chart { display: grid; justify-items: center; }
.aq-ring { display: flex; gap: 12px; align-items: center; }
.aq-ring svg { width: 68px; height: 68px; transform: rotate(-90deg); }
.aq-ring-track { fill: none; stroke: rgb(var(--neo-border) / .22); stroke-width: 4; }
.aq-ring-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4; stroke-linecap: round; }
.aq-ring__copy { display: grid; }
.aq-ring__copy strong { font-size: 16px; font-weight: 800; }
.aq-ring__copy small { color: rgb(var(--neo-muted)); font-size: 8.5px; font-weight: 750; }

.aq-bars { display: grid; gap: 5px; justify-items: center; width: 100%; }
.aq-bars__row { display: flex; gap: 8px; align-items: flex-end; height: 64px; }
.aq-bars__row i { width: 18px; border-radius: 7px 9px 3px 4px; background: rgb(var(--sky-300) / .8); }
.aq-bars__row i.current { background: rgb(var(--sky-600)); }
.aq-bars__row i.empty { background: rgb(var(--neo-border) / .3); }
.aq-bars small, .aq-line small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 750; }

.aq-line { display: grid; gap: 3px; justify-items: center; width: 100%; }
.aq-line svg { width: min(320px, 100%); height: 72px; }
.aq-line path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 2.6; stroke-linecap: round; }
.aq-line path.aq-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 3.4; }
.aq-line circle { fill: rgb(var(--sky-700)); }
.aq-target { stroke: rgb(var(--neo-border) / .5); stroke-width: 1; stroke-dasharray: 4 4; }

.aq-now__actions { display: flex; gap: 14px; align-items: center; justify-content: center; }
.aq-do {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  min-width: 58px;
  height: 46px;
  padding: 0 16px;
  border: 1px solid rgb(var(--color-primary) / .12);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-surface-container));
  background: rgb(var(--sky-600));
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: -3px -3px 8px rgb(var(--neo-shadow-light) / .7), 3px 3px 8px rgb(var(--neo-shadow-dark) / .22);
}
.aq-do:hover { background: rgb(var(--sky-700)); }
.aq-do .material-symbols-outlined { font-size: 22px; }

.aq-secondary { display: inline-flex; gap: 6px; }
.aq-secondary button {
  display: inline-flex;
  gap: 5px;
  align-items: center;
  padding: 6px 11px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 13px 16px 12px 15px;
  color: rgb(var(--neo-muted));
  background: transparent;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}
.aq-secondary button:hover, .aq-secondary button.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .8); }
.aq-secondary .material-symbols-outlined { font-size: 13px; }

.aq-now--empty { display: grid; gap: 6px; justify-items: center; padding: 26px; color: rgb(var(--neo-muted)); }
.aq-now--empty .material-symbols-outlined { color: rgb(var(--sky-600)); font-size: 30px; }
.aq-now--empty strong { font-size: 12px; font-weight: 800; }

.aq-queue { display: grid; gap: 4px; padding: 11px 14px; border-radius: 25px 30px 24px 28px; }
.aq-queue__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 9px;
  align-items: center;
  min-height: 33px;
  padding: 0 4px;
  border: 0;
  border-bottom: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 10px;
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: opacity .18s ease, background .18s ease;
}
.aq-queue__row:hover { background: rgb(var(--sky-100) / .6); }
.aq-queue__row.dim { opacity: .32; }
.aq-queue__row.lit { background: rgb(var(--sky-100) / .6); }
.aq-queue__row .material-symbols-outlined { color: rgb(var(--color-primary-strong)); font-size: 15px; }
.aq-queue__row strong { overflow: hidden; font-size: 10.5px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.aq-queue__row em { color: rgb(var(--neo-muted)); font-size: 8px; font-style: normal; font-weight: 750; }
.aq-queue__empty { margin: 2px 0; color: rgb(var(--neo-muted)); font-size: 10px; }

.aq-done {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  justify-self: start;
  padding: 5px 12px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 13px 16px 12px 15px;
  color: rgb(var(--neo-muted));
  background: transparent;
  font-size: 9.5px;
  font-weight: 800;
  cursor: pointer;
}
.aq-done .material-symbols-outlined { font-size: 13px; }
.aq-donelist { display: grid; gap: 2px; padding: 9px 14px; border-radius: 20px 24px 19px 23px; }
.aq-donelist__row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 9px; align-items: center; min-height: 28px; color: rgb(var(--neo-muted)); }
.aq-donelist__row .material-symbols-outlined { font-size: 14px; }
.aq-donelist__row span { overflow: hidden; font-size: 10px; font-weight: 700; text-decoration: line-through; text-overflow: ellipsis; white-space: nowrap; }
.aq-donelist__row button { display: grid; place-items: center; width: 22px; height: 22px; padding: 0; border: 0; border-radius: 50%; color: rgb(var(--neo-muted)); background: rgb(var(--neo-border) / .16); cursor: pointer; }
.aq-donelist__row button .material-symbols-outlined { font-size: 12px; }
</style>
