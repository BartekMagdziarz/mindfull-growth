<template>
  <div class="ac-cal" :class="{ targeting }">
    <!-- nagłówek: data dnia + rozwinięcie na życzenie (gdy withDate) -->
    <header v-if="withDate" class="ac-cal__datehead">
      <div class="ac-cal__date">
        <span class="ac-cal__eyebrow">{{ targeting ? 'Wybierz dzień' : selectedDay && selectedDay !== labStore.fixture.refs.today ? '' : 'Dziś' }}</span>
        <h2>{{ todayTitle }}</h2>
      </div>
      <div v-if="selectedDay" class="ac-cal__daynav">
        <button type="button" aria-label="Poprzedni dzień" :disabled="targeting" @click="emit('navigate', addDays(selectedDay, -1))"><AppIcon name="chevron_left" /></button>
        <button v-if="selectedDay !== labStore.fixture.refs.today" type="button" class="ac-cal__return" @click="emit('navigate', labStore.fixture.refs.today)">Dziś</button>
        <button type="button" aria-label="Następny dzień" :disabled="targeting" @click="emit('navigate', addDays(selectedDay, 1))"><AppIcon name="chevron_right" /></button>
      </div>
      <button
        type="button"
        class="ac-cal__expand"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? 'Zwiń kalendarz' : 'Rozwiń kalendarz'"
        @click="userExpanded = !isOpen"
      >
        <AppIcon :name="isOpen ? 'expand_less' : 'calendar_month'" />
      </button>
    </header>

    <template v-if="isOpen">
      <header class="ac-cal__head">
        <div class="ac-cal__nav" role="group" aria-label="Nawigacja kalendarza">
          <button type="button" aria-label="Poprzedni okres" :disabled="targeting" @click="page(-1)"><AppIcon name="chevron_left" /></button>
          <strong>{{ periodTitle }}</strong>
          <button type="button" aria-label="Następny okres" :disabled="targeting" @click="page(1)"><AppIcon name="chevron_right" /></button>
          <button v-if="offset !== 0" type="button" class="ac-cal__today-jump" @click="offsets[range] = 0">Dziś</button>
        </div>
        <div class="ac-cal__switch" role="group" aria-label="Zakres kalendarza">
          <button type="button" :class="{ active: range === 'week' }" :aria-pressed="range === 'week'" @click="range = 'week'">Tydzień</button>
          <button type="button" :class="{ active: range === 'month' }" :aria-pressed="range === 'month'" @click="range = 'month'">Miesiąc</button>
        </div>
      </header>

      <div v-if="range === 'week'" class="ac-cal__week">
        <button
          v-for="cell in weekGrid"
          :key="cell.dayRef"
          type="button"
          class="ac-cal__wday"
          :class="cellClasses(cell)"
          :title="cellTitle(cell)"
          :aria-label="cellTitle(cell)"
          :disabled="targeting && cell.isPast"
          @click="emit('pick', cell.dayRef)"
        >
          <small>{{ cell.weekdayLabel }}</small>
          <strong>{{ cell.dayNumber }}</strong>
          <span class="ac-cal__marks" aria-hidden="true">
            <i v-for="marker in cell.markers.slice(0, 2)" :key="marker.key" :class="`mark-${marker.kind}`" />
          </span>
        </button>
      </div>

      <div v-else class="ac-cal__month">
        <span v-for="label in weekdayHead" :key="label" class="ac-cal__month-head">{{ label }}</span>
        <button
          v-for="cell in monthGrid"
          :key="cell.dayRef"
          type="button"
          class="ac-cal__mday"
          :class="cellClasses(cell)"
          :title="cellTitle(cell)"
          :aria-label="cellTitle(cell)"
          :disabled="targeting && cell.isPast"
          @click="emit('pick', cell.dayRef)"
        >
          <strong>{{ cell.dayNumber }}</strong>
          <span class="ac-cal__marks" aria-hidden="true">
            <i v-for="marker in cell.markers.slice(0, 2)" :key="marker.key" :class="`mark-${marker.kind}`" />
          </span>
        </button>
      </div>

      <footer class="ac-cal__foot">
        <span class="ac-cal__marks-legend" aria-hidden="true">
          <span><i class="mark-deadline" /> termin</span>
          <span><i class="mark-ritual" /> rytuał</span>
        </span>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AppIcon from '@product/components/shared/AppIcon.vue'
import { useLabStore } from '~lab/stores/lab.store'
import {
  addDays,
  weekdayIndexMonday,
  monthCells,
  monthTitle,
  weekCells,
  weekTitle,
  type CalendarCell,
} from '~lab/lab/actionConceptData'

const props = withDefaults(defineProps<{ targeting?: boolean; withDate?: boolean; startExpanded?: boolean; selectedDay?: string }>(), {
  targeting: false,
  withDate: false,
  startExpanded: true,
})
const emit = defineEmits<{ pick: [dayRef: string]; navigate: [dayRef: string] }>()

const labStore = useLabStore()
const range = ref<'week' | 'month'>('week')
const userExpanded = ref(props.startExpanded)
const offsets = reactive({ week: 0, month: 0 })
const weekdayHead = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd']

// celowanie zawsze otwiera kalendarz; poza tym decyduje użytkownik
const isOpen = computed(() => props.targeting || userExpanded.value)
const offset = computed(() => offsets[range.value])

const todayTitle = computed(() => {
  const label = new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${props.selectedDay ?? labStore.fixture.refs.today}T12:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
})
const periodTitle = computed(() => (range.value === 'week'
  ? (props.targeting ? 'Najbliższe 7 dni' : weekTitle(labStore.fixture, offsets.week))
  : monthTitle(labStore.fixture, offsets.month)))

const weekGrid = computed(() => weekCells(labStore.fixture, props.targeting ? { forward: true } : { offset: offsets.week }))
const monthGrid = computed(() => monthCells(labStore.fixture, { offset: offsets.month }))

watch(() => props.selectedDay, date => {
  if (!date) return
  const anchor = labStore.fixture.refs.today
  const monday = (value: string) => Date.parse(`${addDays(value, -weekdayIndexMonday(value))}T12:00:00Z`)
  offsets.week = Math.round((monday(date) - monday(anchor)) / 604800000)
  offsets.month = (Number(date.slice(0, 4)) - Number(anchor.slice(0, 4))) * 12 + Number(date.slice(5, 7)) - Number(anchor.slice(5, 7))
}, { immediate: true })

function page(direction: -1 | 1) {
  offsets[range.value] += direction
}

function cellClasses(cell: CalendarCell) {
  return {
    today: props.selectedDay ? cell.dayRef === props.selectedDay : cell.isToday,
    past: cell.isPast,
    out: !cell.inMonth,
    pickable: props.targeting && !cell.isPast,
  }
}
function cellTitle(cell: CalendarCell): string {
  const base = `${cell.weekdayLabel} ${cell.dayNumber}`
  if (!cell.markers.length) return base
  return `${base} · ${cell.markers.map(marker => marker.title).join(' · ')}`
}
</script>

<style scoped>
.ac-cal { display: grid; gap: 8px; }
.ac-cal.targeting { outline: 2px dashed rgb(var(--sky-500) / .5); outline-offset: 6px; border-radius: 12px; }

.ac-cal__datehead { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.ac-cal__eyebrow { display: block; color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 850; letter-spacing: .17em; text-transform: uppercase; }
.ac-cal.targeting .ac-cal__eyebrow { color: rgb(var(--sky-700)); }
.ac-cal__date h2 { margin: 0; font-size: 13.5px; font-weight: 800; }
.ac-cal__expand {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 1px solid rgb(var(--color-primary) / .1);
  border-radius: 52% 48% 54% 46% / 47% 53% 46% 54%;
  color: rgb(var(--color-primary-strong));
  background: rgb(var(--sky-200) / .6);
  cursor: pointer;
  box-shadow: -3px -3px 7px rgb(var(--neo-shadow-light) / .7), 3px 3px 7px rgb(var(--neo-shadow-dark) / .18);
}
.ac-cal__expand .material-symbols-outlined { font-size: 16px; }

.ac-cal__head { display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; justify-content: space-between; }
.ac-cal__nav { display: inline-flex; gap: 4px; align-items: center; }
.ac-cal__nav > strong { min-width: 86px; font-size: 8.5px; font-weight: 850; letter-spacing: .04em; text-align: center; text-transform: uppercase; color: rgb(var(--color-primary-strong)); }
.ac-cal__nav > button {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid rgb(var(--neo-border) / .2);
  border-radius: 47% 53% 49% 51% / 54% 46% 53% 47%;
  color: rgb(var(--neo-muted));
  background: transparent;
  cursor: pointer;
}
.ac-cal__nav > button:hover:not(:disabled) { color: rgb(var(--color-primary-strong)); background: rgb(var(--sky-100) / .8); }
.ac-cal__nav > button:disabled { opacity: .35; cursor: default; }
.ac-cal__nav .material-symbols-outlined { font-size: 12px; }
.ac-cal__today-jump { width: auto !important; padding: 1px 8px !important; border-radius: 9px 11px 8px 10px !important; font-size: 8px; font-weight: 850; }

.ac-cal__switch {
  display: inline-flex;
  gap: 3px;
  padding: 3px;
  border: 1px solid rgb(var(--neo-border) / .18);
  border-radius: 11px 13px 10px 12px;
  background: rgb(var(--sky-100) / .55);
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .55), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .12);
}
.ac-cal__switch button { padding: 2px 9px; border: 0; border-radius: 8px 10px 7px 9px; color: rgb(var(--neo-muted)); background: transparent; font-size: 8.5px; font-weight: 800; cursor: pointer; }
.ac-cal__switch button.active { color: rgb(var(--color-primary-strong)); background: rgb(var(--color-surface-container) / .95); box-shadow: -2px -2px 4px rgb(var(--neo-shadow-light) / .55), 2px 2px 4px rgb(var(--neo-shadow-dark) / .14); }

.ac-cal__week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
.ac-cal__wday {
  display: grid;
  gap: 1px;
  justify-items: center;
  padding: 5px 2px 3px;
  border: 1px solid transparent;
  border-radius: 12px 14px 11px 13px;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.ac-cal__wday small { color: rgb(var(--neo-muted)); font-size: 7px; font-weight: 850; letter-spacing: .1em; text-transform: uppercase; }
.ac-cal__wday strong { font-size: 11.5px; font-weight: 800; }

.ac-cal__month { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
.ac-cal__month-head { padding: 1px 0 3px; color: rgb(var(--neo-muted)); font-size: 6.5px; font-weight: 850; letter-spacing: .1em; text-align: center; text-transform: uppercase; }
.ac-cal__mday {
  display: grid;
  gap: 0;
  justify-items: center;
  min-height: 26px;
  padding: 3px 1px 2px;
  border: 1px solid transparent;
  border-radius: 9px 11px 8px 10px;
  color: inherit;
  background: transparent;
  cursor: pointer;
}
.ac-cal__mday strong { font-size: 9.5px; font-weight: 750; }
.ac-cal__mday.out strong { color: rgb(var(--neo-muted) / .55); }

/* tło nic nie koduje — wyróżnia się tylko „dziś”; przeszłość wyciszona typografią */
.ac-cal__wday.past strong, .ac-cal__mday.past strong { color: rgb(var(--color-on-surface) / .55); }
.ac-cal__wday.today, .ac-cal__mday.today {
  border-color: rgb(var(--sky-600) / .55);
  box-shadow: inset -2px -2px 4px rgb(var(--neo-inset-light) / .5), inset 2px 2px 4px rgb(var(--neo-inset-dark) / .12);
}
.ac-cal__wday:hover:not(:disabled), .ac-cal__mday:hover:not(:disabled) { border-color: rgb(var(--neo-border) / .3); }
.ac-cal__wday.pickable, .ac-cal__mday.pickable { border-color: rgb(var(--sky-500) / .4); }
.ac-cal__wday:disabled, .ac-cal__mday:disabled { cursor: default; opacity: .5; }

.ac-cal__marks { display: flex; gap: 2px; min-height: 5px; }
.ac-cal__marks i, .ac-cal__marks-legend i { display: inline-block; width: 4.5px; height: 4.5px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; }
.mark-deadline { background: rgb(var(--color-on-surface) / .75); }
.mark-ritual { background: rgb(var(--sky-500)); }

.ac-cal__foot { display: flex; justify-content: flex-end; padding-top: 2px; border-top: 1px solid rgb(var(--neo-border) / .12); }
.ac-cal__marks-legend { display: inline-flex; gap: 8px; color: rgb(var(--neo-muted)); font-size: 7px; font-weight: 750; }
.ac-cal__marks-legend span { display: inline-flex; gap: 3px; align-items: center; }
.ac-cal__daynav { display: flex; align-items: center; gap: 3px; margin-left: auto; }
.ac-cal__daynav button { display: grid; place-items: center; width: 24px; height: 28px; border: 0; border-radius: 10px; color: rgb(var(--color-primary-strong)); background: transparent; cursor: pointer; }
.ac-cal__daynav button:hover { background: rgb(var(--sky-200) / .5); }
.ac-cal__daynav button:disabled { opacity: .3; }
.ac-cal__daynav .material-symbols-outlined { font-size: 17px; }
.ac-cal__daynav .ac-cal__return { width: auto; padding: 0 5px; font-size: 9px; font-weight: 800; }
.ac-cal button:focus-visible { outline: 2px solid rgb(var(--sky-600)); outline-offset: 2px; }
</style>
