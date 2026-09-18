<template>
  <div class="product-replica act-pulse">
    <div class="tp-sheet">
      <header class="tp-head tp-surface">
        <div class="tp-head__date">
          <span class="tp-eyebrow">Widok działania · rytm celu</span>
          <h2>{{ periodTitle }}</h2>
        </div>
        <div class="tp-rhythm" role="img" :aria-label="`Rytm ostatnich 14 dni, dziś ${day.doneCount.value} z ${day.todayItems.value.length}`">
          <svg viewBox="0 0 240 44" preserveAspectRatio="none">
            <path class="tp-echo" :d="smoothPath(rhythmLine, 2)" />
            <path :d="smoothPath(rhythmLine)" />
            <circle v-if="rhythmLine.length" :cx="rhythmLine.at(-1)!.x" :cy="rhythmLine.at(-1)!.y" r="3.5" />
          </svg>
          <div class="tp-rhythm__copy">
            <strong>{{ day.doneCount.value }}/{{ day.todayItems.value.length }}</strong>
            <small>rytm 14 dni</small>
          </div>
          <span v-if="streak > 1" class="tp-streak" :title="`Seria: ${streak} dni z wykonaniem`">
            <AppIcon name="bolt" /> {{ streak }}
          </span>
        </div>
      </header>

      <section class="tp-compass tp-surface" aria-label="Kompas">
        <ActionCompassRow :tiles="tiles" @hover="hoverKey = $event" />
      </section>

      <main class="tp-columns">
        <section class="tp-list tp-surface" aria-label="Plan dnia">
          <section v-for="group in groupsWithProgress" :key="group.key" class="tp-group">
            <header class="tp-group__head">
              <h3>{{ group.label }}</h3>
              <span v-if="group.avgPct !== null" class="tp-group__arc" role="img" :aria-label="`${group.label}: ${group.avgPct}% celu tygodnia`">
                <svg viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="14.5" class="tp-arc-track" />
                  <circle cx="18" cy="18" r="14.5" class="tp-arc-fill" :stroke-dasharray="`${group.avgPct * 0.911} 100`" />
                </svg>
                <small>{{ group.avgPct }}%</small>
              </span>
            </header>
            <ActionDayRow
              v-for="entry in group.items"
              :key="entry.item.key"
              :item="entry.item"
              :done="day.isDone(entry.item)"
              :value="day.valueFor(entry.item)"
              :lit="isRelated(entry.item, hoverKey)"
              :dim="hoverKey !== null && !isRelated(entry.item, hoverKey)"
              :progress-pct="entry.pct"
              @toggle="day.toggle(entry.item)"
              @tomorrow="day.moveToTomorrow(entry.item)"
              @pick-day="movingKey = movingKey === entry.item.key ? null : entry.item.key"
              @hide="day.hide(entry.item)"
              @open="() => {}"
            />
          </section>
        </section>

        <aside class="tp-context">
          <section class="tp-surface tp-context__card" aria-label="Kalendarz">
            <ActionMiniCalendar :targeting="movingKey !== null" @pick="onPickDay" />
          </section>
          <section class="tp-surface tp-context__card" aria-label="Najbliższe terminy">
            <ActionUpcomingList :limit="4" />
          </section>
        </aside>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import ActionCompassRow from '~lab/components/action/ActionCompassRow.vue'
import ActionDayRow from '~lab/components/action/ActionDayRow.vue'
import ActionMiniCalendar from '~lab/components/action/ActionMiniCalendar.vue'
import ActionUpcomingList from '~lab/components/action/ActionUpcomingList.vue'
import { compassTiles, isRelated, rhythmSeries, smoothPath, weekTargetProgress, type Point } from '~lab/lab/actionConceptData'
import { useActionDayState } from '~lab/lab/useActionDayState'

defineProps<{ presetId: string }>()

const day = useActionDayState()
const hoverKey = ref<string | null>(null)
const movingKey = ref<string | null>(null)

const tiles = computed(() => compassTiles(day.fixture.value))
const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

const rhythm = computed(() => rhythmSeries(day.fixture.value))
const rhythmLine = computed<Point[]>(() => rhythm.value.map((entry, index) => ({
  x: rhythm.value.length === 1 ? 120 : 6 + index * (228 / (rhythm.value.length - 1)),
  y: Math.round(38 - (entry.completion / 100) * 30),
})))
const streak = computed(() => {
  let count = 0
  for (const entry of [...rhythm.value].reverse()) {
    if (entry.completion < 50) break
    count += 1
  }
  return count
})

const groupsWithProgress = computed(() => day.dayGroups.value.map(group => {
  const items = group.items.map(item => {
    const progress = weekTargetProgress(day.fixture.value, item)
    return { item, pct: progress }
  })
  const withTargets = items.filter(entry => entry.pct !== null)
  const avgPct = withTargets.length
    ? Math.round((withTargets.reduce((sum, entry) => sum + (entry.pct ?? 0), 0) / withTargets.length) * 100)
    : null
  return { key: group.key, label: group.label, items, avgPct }
}))

function onPickDay(dayRef: string) {
  if (!movingKey.value) return
  const item = day.todayItems.value.find(candidate => candidate.key === movingKey.value)
  if (item) day.moveTo(item, dayRef)
  movingKey.value = null
}
</script>

<style scoped>
.act-pulse {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-pulse *, .act-pulse *::before, .act-pulse *::after { box-sizing: border-box; }
.act-pulse h3 { margin: 0; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.tp-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.tp-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.tp-surface > * { position: relative; z-index: 1; }

.tp-sheet {
  display: grid;
  gap: 15px;
  max-width: 1040px;
  min-height: calc(100vh - 40px);
  margin: 0 auto;
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: rgb(var(--color-background));
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
  grid-template-rows: auto auto minmax(0, 1fr);
}

.tp-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 10px 16px; border-radius: 24px 20px 25px 21px; }
.tp-eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.tp-head h2 { margin: 0; font-size: 15px; font-weight: 800; }

.tp-rhythm { display: flex; gap: 12px; align-items: center; }
.tp-rhythm svg { width: 190px; height: 40px; }
.tp-rhythm path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 2.4; stroke-linecap: round; }
.tp-rhythm path.tp-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 3.2; }
.tp-rhythm circle { fill: rgb(var(--sky-700)); }
.tp-rhythm__copy { display: grid; }
.tp-rhythm__copy strong { font-size: 12px; font-weight: 800; }
.tp-rhythm__copy small { color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.tp-streak {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  padding: 3px 9px 3px 6px;
  border: 1px solid rgb(var(--amber-400, 240 200 130) / .6);
  border-radius: 12px 14px 11px 13px;
  color: rgb(var(--amber-700, 170 120 35));
  background: rgb(var(--amber-200, 245 224 181) / .5);
  font-size: 10px;
  font-weight: 800;
}
.tp-streak .material-symbols-outlined { font-size: 13px; }

.tp-compass { padding: 10px 14px; border-radius: 25px 30px 24px 28px; }

.tp-columns { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(270px, 1fr); gap: 15px; align-items: start; min-height: 0; }
.tp-list { min-height: 0; max-height: 100%; padding: 11px 16px; overflow: hidden auto; border-radius: 25px 30px 24px 28px; scrollbar-width: thin; }
.tp-group + .tp-group { margin-top: 10px; }
.tp-group__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-right: 2px; }
.tp-group__arc { display: inline-flex; gap: 5px; align-items: center; }
.tp-group__arc svg { width: 20px; height: 20px; transform: rotate(-90deg); }
.tp-group__arc small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 800; }
.tp-arc-track { fill: none; stroke: rgb(var(--neo-border) / .22); stroke-width: 5; }
.tp-arc-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 5; stroke-linecap: round; }

.tp-context { display: grid; gap: 15px; align-content: start; }
.tp-context__card { padding: 12px 14px; border-radius: 25px 30px 24px 28px; }
</style>
