<template>
  <!-- Date + calendar in one card. The grid is folded by default and opens on
       demand or automatically while a row is being moved ("Wybierz dzień"). -->
  <DsSurface elevation="raised-sm" class="next-day-cal" :class="{ 'is-targeting': targeting }" aria-label="Dziś i kalendarz">
    <header class="next-day-cal__head">
      <div class="next-day-cal__date">
        <small>{{ eyebrow }}</small>
        <h2>{{ dayTitle }}</h2>
      </div>
      <div class="next-day-cal__nav" role="group" :aria-label="t('planning.today.calendar.dayNav')">
        <button type="button" :aria-label="t('planning.today.calendar.previousDay')" :disabled="targeting" @click="emit('navigate', addDaysToDayRef(dayRef, -1))"><AppIcon name="chevron_left" /></button>
        <button v-if="dayRef !== todayRef" type="button" class="next-day-cal__today" :disabled="targeting" @click="emit('navigate', todayRef)">{{ t('planning.today.calendar.today') }}</button>
        <button type="button" :aria-label="t('planning.today.calendar.nextDay')" :disabled="targeting" @click="emit('navigate', addDaysToDayRef(dayRef, 1))"><AppIcon name="chevron_right" /></button>
      </div>
      <button
        v-if="targeting"
        type="button"
        class="next-day-cal__toggle"
        :aria-label="t('common.buttons.cancel')"
        @click="emit('cancel-targeting')"
      ><AppIcon name="close" /></button>
      <button
        v-else
        type="button"
        class="next-day-cal__toggle"
        :aria-expanded="isOpen"
        :aria-label="isOpen ? t('planning.today.calendar.collapse') : t('planning.today.calendar.expand')"
        @click="expanded = !isOpen"
      ><AppIcon :name="isOpen ? 'expand_less' : 'calendar_month'" /></button>
    </header>

    <template v-if="isOpen">
      <div class="next-day-cal__bar">
        <div class="next-day-cal__period" role="group" :aria-label="t('planning.today.calendar.periodNav')">
          <button type="button" :aria-label="t('planning.today.calendar.previousPeriod')" :disabled="targeting" @click="offsets[range] -= 1"><AppIcon name="chevron_left" /></button>
          <strong>{{ periodTitle }}</strong>
          <button type="button" :aria-label="t('planning.today.calendar.nextPeriod')" :disabled="targeting" @click="offsets[range] += 1"><AppIcon name="chevron_right" /></button>
          <button v-if="offsets[range] !== 0 && !targeting" type="button" class="next-day-cal__jump" @click="offsets[range] = 0">{{ t('planning.today.calendar.today') }}</button>
        </div>
        <div class="next-day-cal__switch" role="group" :aria-label="t('planning.today.calendar.range')">
          <button type="button" :aria-pressed="range === 'week'" @click="range = 'week'">{{ t('planning.today.calendar.week') }}</button>
          <button type="button" :aria-pressed="range === 'month'" @click="range = 'month'">{{ t('planning.today.calendar.month') }}</button>
        </div>
      </div>

      <div v-if="range === 'week'" class="next-day-cal__week">
        <button
          v-for="cell in weekCells"
          :key="cell.dayRef"
          type="button"
          class="next-day-cal__day next-day-cal__day--week"
          :class="cellClasses(cell)"
          :title="cellTitle(cell)"
          :aria-label="cellTitle(cell)"
          :disabled="targeting && !isPickable(cell)"
          @click="onCellClick(cell)"
        >
          <small>{{ cell.weekdayLabel }}</small>
          <strong>{{ cell.dayNumber }}</strong>
          <span class="next-day-cal__marks" aria-hidden="true"><i v-for="marker in cell.markers.slice(0, 2)" :key="marker.key" :class="[`is-${marker.kind}`, { 'is-done': marker.state === 'done' }]" /></span>
        </button>
      </div>

      <div v-else class="next-day-cal__month">
        <span v-for="label in weekdayHead" :key="label" class="next-day-cal__month-head">{{ label }}</span>
        <button
          v-for="cell in monthCells"
          :key="cell.dayRef"
          type="button"
          class="next-day-cal__day next-day-cal__day--month"
          :class="cellClasses(cell)"
          :title="cellTitle(cell)"
          :aria-label="cellTitle(cell)"
          :disabled="targeting && !isPickable(cell)"
          @click="onCellClick(cell)"
        >
          <strong>{{ cell.dayNumber }}</strong>
          <span class="next-day-cal__marks" aria-hidden="true"><i v-for="marker in cell.markers.slice(0, 2)" :key="marker.key" :class="[`is-${marker.kind}`, { 'is-done': marker.state === 'done' }]" /></span>
        </button>
      </div>

      <footer class="next-day-cal__foot" aria-hidden="true">
        <span><i class="is-deadline" />{{ t('planning.today.calendar.legendDeadline') }}</span>
        <span><i class="is-ritual" />{{ t('planning.today.calendar.legendRitual') }}</span>
      </footer>
    </template>
  </DsSurface>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { DayRef, MonthRef, WeekRef } from '@/domain/period'
import type { DayMarker } from '@/services/dayUpcomingQueries'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsSurface } from '@/design-system/components'
import { addDaysToDayRef, getChildPeriods, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { formatMonthTitle } from '@/utils/periodLabels'
import { markerTitle } from './dayViewModels'

interface CalendarCell {
  dayRef: DayRef
  dayNumber: number
  weekdayLabel: string
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  isPast: boolean
  markers: DayMarker[]
}

const props = withDefaults(defineProps<{
  dayRef: DayRef
  todayRef: DayRef
  markers: DayMarker[]
  targeting?: boolean
  /** While targeting: only days of this week are pickable (weekly intentions). */
  targetingWeekRef?: WeekRef | null
}>(), { targeting: false, targetingWeekRef: null })
const emit = defineEmits<{ navigate: [dayRef: DayRef]; pick: [dayRef: DayRef]; 'cancel-targeting': [] }>()

const { t, locale } = useT()
const expanded = ref(false)
const range = ref<'week' | 'month'>('week')
// Offsets are relative to the viewed day and reset with it.
const offsets = reactive({ week: 0, month: 0 })
watch(() => props.dayRef, () => { offsets.week = 0; offsets.month = 0 })

const isOpen = computed(() => props.targeting || expanded.value)
const weekdayFormatter = computed(() => new Intl.DateTimeFormat(locale.value, { weekday: 'short' }))
const weekdayHead = computed(() => {
  const monday = getPeriodBounds(getPeriodRefsForDate(props.todayRef).week).start as DayRef
  return Array.from({ length: 7 }, (_, index) => shortWeekday(addDaysToDayRef(monday, index)))
})
const dayTitle = computed(() => {
  const label = new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${props.dayRef}T12:00:00`))
  return label.charAt(0).toUpperCase() + label.slice(1)
})
const eyebrow = computed(() => {
  if (props.targeting) return t('planning.today.calendar.pickDay')
  return props.dayRef === props.todayRef ? t('planning.today.calendar.today') : ''
})

const weekCells = computed<CalendarCell[]>(() => {
  // Targeting always looks forward: seven days from tomorrow, so even on a
  // Sunday there is a day to pick.
  const start = props.targeting
    ? addDaysToDayRef(props.todayRef, 1)
    : addDaysToDayRef(getPeriodBounds(getPeriodRefsForDate(props.dayRef).week).start as DayRef, offsets.week * 7)
  return Array.from({ length: 7 }, (_, index) => buildCell(addDaysToDayRef(start, index), true))
})
const viewedMonthRef = computed<MonthRef>(() => {
  const [year, month] = props.dayRef.split('-').map(Number)
  return getPeriodRefsForDate(new Date(year, month - 1 + offsets.month, 1, 12)).month
})
const monthCells = computed<CalendarCell[]>(() => {
  const bounds = getPeriodBounds(viewedMonthRef.value)
  const firstDay = bounds.start as DayRef
  const gridStart = getPeriodBounds(getPeriodRefsForDate(firstDay).week).start as DayRef
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayRef = addDaysToDayRef(gridStart, index)
    return buildCell(dayRef, dayRef.slice(0, 7) === viewedMonthRef.value)
  })
  return cells.slice(0, cells.slice(35).some(cell => cell.inMonth) ? 42 : 35)
})
const periodTitle = computed(() => {
  if (range.value === 'week') {
    if (props.targeting) return t('planning.today.calendar.nextSevenDays')
    const weekRef = getPeriodRefsForDate(weekCells.value[0].dayRef).week as WeekRef
    return `T${Number(weekRef.slice(-2))}`
  }
  return formatMonthTitle(viewedMonthRef.value as never, locale.value)
})

function shortWeekday(dayRef: DayRef): string {
  const label = weekdayFormatter.value.format(new Date(`${dayRef}T12:00:00`)).replace('.', '')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function buildCell(dayRef: DayRef, inMonth: boolean): CalendarCell {
  return {
    dayRef,
    dayNumber: Number(dayRef.slice(-2)),
    weekdayLabel: shortWeekday(dayRef),
    inMonth,
    isToday: dayRef === props.todayRef,
    isSelected: dayRef === props.dayRef,
    isPast: dayRef < props.todayRef,
    markers: props.markers.filter(marker => marker.dayRef === dayRef),
  }
}

function cellClasses(cell: CalendarCell) {
  return {
    'is-today': cell.isToday,
    'is-selected': cell.isSelected && !props.targeting,
    'is-past': cell.isPast,
    'is-out': !cell.inMonth,
    'is-pickable': props.targeting && isPickable(cell),
  }
}

function isPickable(cell: CalendarCell): boolean {
  if (cell.isPast || cell.isSelected) return false
  if (!props.targetingWeekRef) return true
  return getPeriodRefsForDate(new Date(`${cell.dayRef}T12:00:00`)).week === props.targetingWeekRef
}

function cellTitle(cell: CalendarCell): string {
  const base = `${cell.weekdayLabel} ${cell.dayNumber}`
  if (!cell.markers.length) return base
  return `${base} · ${cell.markers.map(marker => markerTitle(marker, t, locale.value)).join(' · ')}`
}

function onCellClick(cell: CalendarCell) {
  if (props.targeting) {
    if (isPickable(cell)) emit('pick', cell.dayRef)
    return
  }
  emit('navigate', cell.dayRef)
}

// getChildPeriods is the canonical week→days helper; keep the import honest for
// consumers that prefer it over arithmetic.
void getChildPeriods
</script>
