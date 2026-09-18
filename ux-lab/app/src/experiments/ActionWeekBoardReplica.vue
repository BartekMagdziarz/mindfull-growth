<template>
  <div class="product-replica act-board">
    <div class="ab2-sheet">
      <header class="ab2-head ab2-surface">
        <div>
          <span class="ab2-eyebrow">Widok działania · tablica</span>
          <h2>{{ periodTitle }}</h2>
        </div>
        <div class="ab2-head__side">
          <span v-if="pickedKey" class="ab2-hint"><AppIcon name="east" /> Wskaż kolumnę <button type="button" aria-label="Anuluj" @click="pickedKey = null"><AppIcon name="close" /></button></span>
          <div class="ab2-switch" role="group" aria-label="Zakres tablicy">
            <button type="button" :class="{ active: range === 'week' }" :aria-pressed="range === 'week'" @click="range = 'week'">Tydzień</button>
            <button type="button" :class="{ active: range === 'month' }" :aria-pressed="range === 'month'" @click="range = 'month'">Miesiąc</button>
          </div>
        </div>
      </header>

      <section class="ab2-compass ab2-surface" aria-label="Kompas">
        <ActionCompassRow :tiles="tiles" @hover="hoverKey = $event" />
      </section>

      <!-- Tydzień: 7 kolumn, dziś rozwinięte -->
      <main v-if="range === 'week'" class="ab2-board" :class="{ picking: pickedKey !== null }" :style="{ '--board-columns': boardColumnsTemplate }">
        <section
          v-for="column in weekColumns"
          :key="column.dayRef"
          class="ab2-col ab2-surface"
          :class="{ today: column.isToday, past: column.isPast, droppable: pickedKey !== null && !column.isPast && !column.isToday }"
        >
          <button
            type="button"
            class="ab2-col__head"
            :aria-label="pickedKey ? `Przenieś na ${column.label} ${column.dayNumber}` : `${column.label} ${column.dayNumber}`"
            :disabled="pickedKey !== null && (column.isPast || column.isToday)"
            @click="dropOn(column.dayRef)"
          >
            <small>{{ column.label }}</small>
            <strong>{{ column.dayNumber }}</strong>
            <span class="ab2-col__marks">
              <AppIcon v-for="marker in column.markers" :key="marker.key" :name="marker.icon" :title="marker.title" :class="`mark-${marker.kind}`" />
            </span>
          </button>

          <template v-if="column.isToday">
            <ActionDayRow
              v-for="item in day.todayItems.value"
              :key="item.key"
              :item="item"
              :done="day.isDone(item)"
              :value="day.valueFor(item)"
              :lit="isRelated(item, hoverKey) || pickedKey === item.key"
              :dim="hoverKey !== null && !isRelated(item, hoverKey)"
              @toggle="day.toggle(item)"
              @tomorrow="day.moveToTomorrow(item)"
              @pick-day="pickedKey = pickedKey === item.key ? null : item.key"
              @hide="day.hide(item)"
              @open="() => {}"
            />
          </template>

          <template v-else>
            <button
              v-for="item in column.items"
              :key="item.key"
              type="button"
              class="ab2-chip"
              :class="{ dim: hoverKey !== null && !isRelated(item, hoverKey), picked: pickedKey === item.key }"
              :title="item.title"
              :aria-label="`Podnieś: ${item.title}`"
              @click="pickedKey = pickedKey === item.key ? null : item.key"
            >
              <AppIcon :name="familyIcon[item.family]" />
              <span>{{ item.title }}</span>
            </button>
            <span v-if="!column.items.length && !column.isPast" class="ab2-col__free">wolne</span>
          </template>
        </section>
      </main>

      <!-- Miesiąc: kolumny tygodni -->
      <main v-else class="ab2-board ab2-board--month">
        <section
          v-for="week in monthColumns"
          :key="week.weekRef"
          class="ab2-col ab2-surface"
          :class="{ today: week.isCurrent, past: week.isPast }"
        >
          <div class="ab2-col__head ab2-col__head--static">
            <small>{{ week.label }}</small>
            <strong>{{ week.rangeLabel }}</strong>
          </div>
          <div class="ab2-week-focus">
            <span v-for="item in week.items" :key="item.key" class="ab2-chip ab2-chip--static" :title="item.title">
              <AppIcon :name="familyIcon[item.family]" />
              <span>{{ item.title }}</span>
            </span>
          </div>
          <footer class="ab2-week-foot">
            <span v-if="week.isCurrent">bieżący</span>
            <span v-else-if="week.isPast">{{ week.completion }}%</span>
            <span v-else>nadchodzi</span>
          </footer>
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
import ActionDayRow from '~lab/components/action/ActionDayRow.vue'
import {
  addDays,
  compassTiles,
  currentWeekPoint,
  familyIcon,
  isRelated,
  markersFor,
  shortDayLabel,
  WEEK_FOCUS_KEYS,
  weekdayIndexMonday,
  weeklyObjects,
  type CalendarMarker,
} from '~lab/lab/actionConceptData'
import { useActionDayState } from '~lab/lab/useActionDayState'

defineProps<{ presetId: string }>()

const day = useActionDayState()
const hoverKey = ref<string | null>(null)
const pickedKey = ref<string | null>(null)
const range = ref<'week' | 'month'>('week')
const boardMoves = ref<Record<string, string>>({}) // key → dayRef (przeniesienia z kolumn przyszłych)

const tiles = computed(() => compassTiles(day.fixture.value))
const periodTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${day.todayRef.value}T12:00:00`))
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}`
})

// deterministyczne rozłożenie na dni (w produkcie: przypisania planu tygodnia)
function syntheticPlanned(item: LabFixtureObject, dayRef: string): boolean {
  const point = currentWeekPoint(day.fixture.value, item)
  const target = Math.min(7, Math.max(1, Math.round(point?.target ?? 3)))
  const step = Math.max(1, Math.round(7 / target))
  const seed = weeklyObjects(day.fixture.value).findIndex(candidate => candidate.key === item.key)
  return (weekdayIndexMonday(dayRef) + Math.max(0, seed)) % step === 0
}

function plannedOn(item: LabFixtureObject, dayRef: string): boolean {
  const moved = boardMoves.value[item.key]
  if (moved) return moved === dayRef
  return syntheticPlanned(item, dayRef)
}

interface WeekColumn {
  dayRef: string
  label: string
  dayNumber: number
  isToday: boolean
  isPast: boolean
  items: LabFixtureObject[]
  markers: CalendarMarker[]
}

// szeroka kolumna podąża za dzisiejszym dniem tygodnia
const boardColumnsTemplate = computed(() => weekColumns.value
  .map(column => (column.isToday ? 'minmax(0, 2.4fr)' : 'minmax(0, .58fr)'))
  .join(' '))

// kolumny kroczą od dziś w przód — tablica działania patrzy w przyszłość,
// więc zawsze jest gdzie upuścić (nawet w niedzielę)
const weekColumns = computed<WeekColumn[]>(() => Array.from({ length: 7 }, (_, offset) => {
  const dayRef = addDays(day.todayRef.value, offset)
  return {
    dayRef,
    label: shortDayLabel(dayRef),
    dayNumber: Number(dayRef.slice(-2)),
    isToday: offset === 0,
    isPast: false,
    items: offset === 0
      ? []
      : weeklyObjects(day.fixture.value).filter(item => plannedOn(item, dayRef)).slice(0, 6),
    markers: markersFor(day.fixture.value, dayRef),
  }
}))

function dropOn(dayRef: string) {
  if (!pickedKey.value) return
  const key = pickedKey.value
  const inToday = day.todayItems.value.find(item => item.key === key)
  if (inToday) {
    day.moveTo(inToday, dayRef)
  } else {
    boardMoves.value = { ...boardMoves.value, [key]: dayRef }
  }
  pickedKey.value = null
}

interface MonthColumn {
  weekRef: string
  label: string
  rangeLabel: string
  isCurrent: boolean
  isPast: boolean
  completion: number
  items: LabFixtureObject[]
}

const monthColumns = computed<MonthColumn[]>(() => {
  const fixture = day.fixture.value
  const month = fixture.months.find(item => item.monthRef === fixture.refs.currentMonth) ?? fixture.months.at(-1)!
  const focusItems = WEEK_FOCUS_KEYS
    .map(key => weeklyObjects(fixture).find(item => item.key === key))
    .filter((item): item is LabFixtureObject => Boolean(item))
  return month.weeks.map(week => ({
    weekRef: week.weekRef,
    label: `T${week.weekRef.split('-W')[1]}`,
    rangeLabel: week.rangeLabel,
    isCurrent: week.weekRef === fixture.refs.currentWeek,
    isPast: week.weekRef < fixture.refs.currentWeek,
    completion: week.completion,
    items: focusItems,
  }))
})
</script>

<style scoped>
.act-board {
  box-sizing: border-box;
  min-height: 100vh;
  padding: 20px;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--color-background));
  font-family: 'Nunito', 'Avenir Next', sans-serif;
}
.act-board *, .act-board *::before, .act-board *::after { box-sizing: border-box; }

.ab2-surface {
  position: relative;
  border: 1px solid rgb(var(--neo-border) / .14);
  background: rgb(var(--neo-surface-base));
  box-shadow: -7px -7px 15px rgb(var(--neo-shadow-light) / .76), 7px 7px 15px rgb(var(--neo-shadow-dark) / .22);
}
.ab2-surface::after { position: absolute; inset: 3px 2px 2px 3px; border: 1px solid rgb(var(--neo-border) / .07); border-radius: inherit; pointer-events: none; content: ''; transform: rotate(.08deg); }
.ab2-surface > * { position: relative; z-index: 1; }

.ab2-sheet {
  display: grid;
  gap: 14px;
  min-height: calc(100vh - 40px);
  padding: 14px;
  border: 1px solid rgb(var(--neo-border) / .12);
  border-radius: 34px 27px 32px 25px;
  background: rgb(var(--color-background));
  box-shadow: inset -7px -7px 16px rgb(var(--neo-inset-light) / .6), inset 7px 7px 16px rgb(var(--neo-inset-dark) / .13);
  grid-template-rows: auto auto minmax(0, 1fr);
}

.ab2-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 16px; border-radius: 24px 20px 25px 21px; }
.ab2-eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.ab2-head h2 { margin: 0; font-size: 15px; font-weight: 800; }
.ab2-head__side { display: flex; gap: 12px; align-items: center; }
.ab2-hint { display: inline-flex; gap: 5px; align-items: center; color: rgb(var(--color-primary-strong)); font-size: 9px; font-weight: 800; }
.ab2-hint .material-symbols-outlined { font-size: 13px; }
.ab2-hint button { display: grid; place-items: center; width: 18px; height: 18px; padding: 0; border: 0; border-radius: 50%; color: rgb(var(--neo-muted)); background: rgb(var(--neo-border) / .18); cursor: pointer; }
.ab2-hint button .material-symbols-outlined { font-size: 11px; }

.ab2-switch {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid rgb(var(--neo-border) / .18);
  border-radius: 11px 13px 10px 12px;
  background: rgb(var(--sky-100) / .55);
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .55), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .12);
}
.ab2-switch button { padding: 3px 11px; border: 0; border-radius: 8px 10px 7px 9px; color: rgb(var(--neo-muted)); background: transparent; font-size: 9px; font-weight: 800; cursor: pointer; }
.ab2-switch button.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--color-surface-container) / .95); box-shadow: -2px -2px 4px rgb(var(--neo-shadow-light) / .55), 2px 2px 4px rgb(var(--neo-shadow-dark) / .14); }

.ab2-compass { padding: 10px 14px; border-radius: 25px 30px 24px 28px; }

.ab2-board {
  display: grid;
  grid-template-columns: var(--board-columns, repeat(7, minmax(0, 1fr)));
  gap: 10px;
  align-items: stretch;
  min-height: 0;
}
.ab2-board--month { grid-template-columns: repeat(auto-fit, minmax(0, 1fr)); }

.ab2-col { display: grid; gap: 5px; align-content: start; min-width: 0; padding: 9px 8px 10px; border-radius: 21px 25px 20px 24px; }
.ab2-col.today { padding: 9px 13px 12px; }
.ab2-col.past { opacity: .68; }
.ab2-col.droppable { outline: 2px dashed rgb(var(--sky-500) / .5); outline-offset: -5px; }

.ab2-col__head {
  display: flex;
  gap: 6px;
  align-items: baseline;
  padding: 2px 4px 6px;
  border: 0;
  border-bottom: 1px solid rgb(var(--neo-border) / .16);
  color: inherit;
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.ab2-col__head:disabled { cursor: default; opacity: .55; }
.ab2-col__head--static { cursor: default; }
.ab2-col__head small { color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.ab2-col__head strong { font-size: 12px; font-weight: 800; }
.ab2-col.today .ab2-col__head strong { color: rgb(var(--color-primary-strong)); }
.ab2-col__marks { display: inline-flex; gap: 4px; margin-left: auto; }
.ab2-col__marks .material-symbols-outlined { font-size: 12px; }
.ab2-col__marks .mark-deadline { color: rgb(var(--color-on-surface) / .7); }
.ab2-col__marks .mark-ritual { color: rgb(var(--sky-600)); }

.ab2-chip {
  display: flex;
  gap: 5px;
  align-items: center;
  width: 100%;
  min-height: 26px;
  padding: 3px 7px;
  border: 1px solid rgb(var(--neo-border) / .16);
  border-radius: 11px 13px 10px 12px;
  color: inherit;
  background: rgb(var(--color-surface-container) / .55);
  cursor: pointer;
  text-align: left;
  transition: opacity .18s ease, background .18s ease, border-color .18s ease;
}
.ab2-chip:hover { background: rgb(var(--sky-100) / .8); }
.ab2-chip.dim { opacity: .32; }
.ab2-chip.picked { border-color: rgb(var(--sky-600) / .6); background: rgb(var(--sky-100) / .9); }
.ab2-chip--static { cursor: default; }
.ab2-chip .material-symbols-outlined { flex: 0 0 auto; color: rgb(var(--color-primary-strong)); font-size: 12px; }
.ab2-chip span:last-child { overflow: hidden; font-size: 8.5px; font-weight: 750; line-height: 1.25; text-overflow: ellipsis; white-space: nowrap; }
.ab2-col__free { padding: 5px 4px; color: rgb(var(--neo-muted) / .8); font-size: 8px; font-weight: 750; }

.ab2-week-focus { display: grid; gap: 4px; }
.ab2-week-foot { padding: 3px 4px 0; color: rgb(var(--neo-muted)); font-size: 8px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
</style>
