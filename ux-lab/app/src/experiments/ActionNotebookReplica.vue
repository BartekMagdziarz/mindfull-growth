<template>
  <div class="product-replica act-notebook">
    <div class="an-sheet">
      <header class="an-head an-surface">
        <div>
          <span class="an-eyebrow">Widok działania · zeszyt dnia</span>
          <h2>{{ periodTitle }}</h2>
        </div>
        <div class="an-head__side">
          <span v-if="day.lastNote.value" class="an-note">{{ day.lastNote.value }}</span>
          <div class="an-pulse" role="img" :aria-label="`Wykonanie dnia: ${day.doneCount.value} z ${day.todayItems.value.length}`">
            <svg viewBox="0 0 36 36" aria-hidden="true">
              <circle cx="18" cy="18" r="14.5" class="an-pulse-track" />
              <circle cx="18" cy="18" r="14.5" class="an-pulse-fill" :stroke-dasharray="`${pulsePct * 0.911} 100`" />
            </svg>
            <strong>{{ day.doneCount.value }}/{{ day.todayItems.value.length }}</strong>
          </div>
        </div>
      </header>

      <section class="an-compass an-surface" aria-label="Kompas">
        <ActionCompassRow :tiles="tiles" @hover="hoverKey = $event" />
      </section>

      <main class="an-columns">
        <section class="an-list an-surface" aria-label="Plan dnia">
          <section v-for="group in day.dayGroups.value" :key="group.key" class="an-group">
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
              @pick-day="movingKey = movingKey === item.key ? null : item.key"
              @hide="day.hide(item)"
              @open="() => {}"
            />
          </section>
          <button v-if="day.hiddenCount.value" type="button" class="an-hidden" @click="day.restoreHidden()">
            <AppIcon name="visibility" /> Ukryte ({{ day.hiddenCount.value }})
          </button>
        </section>

        <aside class="an-context">
          <section class="an-surface an-context__card" aria-label="Kalendarz">
            <ActionMiniCalendar :targeting="movingKey !== null" @pick="onPickDay" />
          </section>
          <section class="an-surface an-context__card" aria-label="Najbliższe terminy">
            <ActionUpcomingList :limit="5" />
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
import { compassTiles, isRelated } from '~lab/lab/actionConceptData'
import { useActionDayState } from '~lab/lab/useActionDayState'

defineProps<{ presetId: string }>()

const day = useActionDayState()
const hoverKey = ref<string | null>(null)
const movingKey = ref<string | null>(null)

const tiles = computed(() => compassTiles(day.fixture.value))
const pulsePct = computed(() => (day.todayItems.value.length ? Math.round((day.doneCount.value / day.todayItems.value.length) * 100) : 0))
const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

function onPickDay(dayRef: string) {
  if (!movingKey.value) return
  const item = day.todayItems.value.find(candidate => candidate.key === movingKey.value)
  if (item) day.moveTo(item, dayRef)
  movingKey.value = null
}
</script>

<style scoped>
.act-notebook {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-notebook *, .act-notebook *::before, .act-notebook *::after { box-sizing: border-box; }
.act-notebook h3 { margin: 0; padding: 0 2px; color: rgb(var(--color-primary-strong)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }

.an-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.an-surface::after {
  position: absolute;
  inset: 3px 2px 2px 3px;
  border: 1px solid rgb(var(--neo-border) / .07);
  border-radius: inherit;
  pointer-events: none;
  content: '';
  transform: rotate(.08deg);
}

.an-sheet {
  display: grid;
  gap: 16px;
  max-width: 1060px;
  min-height: calc(100vh - 40px);
  margin: 0 auto;
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: rgb(var(--color-background));
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
  grid-template-rows: auto auto minmax(0, 1fr);
}

.an-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 16px; border-radius: 24px 20px 25px 21px; }
.an-eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.an-head h2 { margin: 0; font-size: 15px; font-weight: 800; }
.an-head__side { position: relative; z-index: 1; display: flex; gap: 12px; align-items: center; }
.an-note { color: rgb(var(--neo-muted)); font-size: 9px; font-weight: 800; }
.an-pulse { display: flex; gap: 8px; align-items: center; }
.an-pulse svg { width: 32px; height: 32px; transform: rotate(-90deg); }
.an-pulse strong { font-size: 11px; font-weight: 800; }
.an-pulse-track { fill: none; stroke: rgb(var(--neo-border) / .22); stroke-width: 4.5; }
.an-pulse-fill { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4.5; stroke-linecap: round; }

.an-compass { padding: 10px 14px; border-radius: 25px 30px 24px 28px; }
.an-compass :deep(.ac-compass) { position: relative; z-index: 1; }

.an-columns {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(280px, 1fr);
  gap: 16px;
  align-items: start;
  min-height: 0;
}
.an-list { min-height: 0; max-height: 100%; padding: 11px 16px; overflow: hidden auto; border-radius: 25px 30px 24px 28px; scrollbar-width: thin; }
.an-group + .an-group { margin-top: 8px; }
.an-hidden {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-top: 10px;
  padding: 4px 10px;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 11px 13px 10px 12px;
  color: rgb(var(--neo-muted));
  background: transparent;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}
.an-hidden .material-symbols-outlined { font-size: 12px; }

.an-context { display: grid; gap: 16px; align-content: start; }
.an-context__card { padding: 12px 14px; border-radius: 25px 30px 24px 28px; }
.an-context__card > * { position: relative; z-index: 1; }
</style>
