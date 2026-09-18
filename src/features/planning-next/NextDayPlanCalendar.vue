<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { DayRef } from '@/domain/period'
import { useTodayStore } from '@/stores/today.store'
import { useT } from '@/composables/useT'
import { addDaysToDayRef, getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { DsSurface } from '@/design-system/components'
import AppIcon from '@/components/shared/AppIcon.vue'
import NextObjectChartCard from './NextObjectChartCard.vue'
import NextWeekPlanBoard from './NextWeekPlanBoard.vue'
import { buildDayChartPoints } from './nextObjectChart'
import { dayItemTitle, rescheduleWeekLock } from './dayViewModels'
import { useDayPlanDragMotion } from './useDayPlanDragMotion'
const dragMotion = useDayPlanDragMotion()
const props = defineProps<{ dayRef: DayRef; expanded: boolean }>()
const emit = defineEmits<{ navigate: [date: DayRef]; expand: [value: boolean] }>()
const store = useTodayStore()
const { t, locale } = useT()
const offset = ref(0)
const hasOpened = ref(props.expanded)
watch(
  () => props.expanded,
  value => {
    if (value) hasOpened.value = true
  }
)
const editButton = ref<HTMLButtonElement>()
const root = ref<HTMLElement>()
const today = computed(() => getPeriodRefsForDate(new Date()).day)
const start = computed(() =>
  addDaysToDayRef(
    getPeriodBounds(getPeriodRefsForDate(props.dayRef).week).start as DayRef,
    offset.value * 7
  )
)
const days = computed(() => Array.from({ length: 7 }, (_, i) => addDaysToDayRef(start.value, i)))
const selected = computed(() =>
  store.allVisibleItems.find(
    item => item.key === (store.targetingItem?.key ?? store.selectedItemKey)
  )
)
const measurement = computed(() => (selected.value?.kind === 'measurement' ? selected.value : null))
const points = computed(() =>
  measurement.value
    ? buildDayChartPoints(
        measurement.value,
        props.dayRef,
        store.rawEntries,
        store.allDayAssignments
      )
    : []
)
const label = (date: DayRef, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, opts).format(new Date(`${date}T12:00:00`))
watch(
  () => props.dayRef,
  () => {
    offset.value = 0
  }
)
watch(
  () => store.targetingItem,
  async item => {
    if (!item) return
    offset.value = 0
    await nextTick()
    if (!store.draggingItemKey) root.value?.querySelector<HTMLElement>('.is-drop-target')?.focus()
  }
)
function allowed(date: DayRef) {
  const item = store.targetingItem
  if (
    !item ||
    date === props.dayRef ||
    store.isPending(item.key)
  )
    return false
  const lock = rescheduleWeekLock(item)
  if (lock && getPeriodRefsForDate(date).week !== lock) return false
  return (
    item.kind !== 'measurement' ||
    !store.allDayAssignments.some(
      a =>
        a.dayRef === date && a.subjectId === item.subject.id && a.subjectType === item.subjectType
    )
  )
}
function pick(date: DayRef) {
  if (store.targetingItem) {
    if (allowed(date)) store.pickTargetDay(date)
  } else emit('navigate', date)
}
function dragover(event: DragEvent, date: DayRef) {
  if (!store.draggingItemKey || !allowed(date)) { dragMotion?.hover(null); return }
  event.preventDefault()
  dragMotion?.hover(event.currentTarget as HTMLElement)
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}
function drop(event: DragEvent, date: DayRef) {
  event.preventDefault()
  if (
    !store.draggingItemKey ||
    event.dataTransfer?.getData('application/x-mindful-plan') !== store.draggingItemKey ||
    !allowed(date)
  )
    return
  dragMotion?.land(event.currentTarget as HTMLElement)
  store.pickTargetDay(date)
  store.draggingItemKey = null
}
function jumpToToday() {
  offset.value = 0
  emit('navigate', today.value)
}
async function expand(value: boolean) {
  store.cancelTargeting()
  emit('expand', value)
  await nextTick()
  if (value) root.value?.querySelector<HTMLElement>('.week-plan-board')?.focus()
  else editButton.value?.focus()
}
</script>
<template>
  <DsSurface elevation="raised-sm" class="day-plan-calendar">
    <div ref="root">
      <NextWeekPlanBoard
        v-if="hasOpened"
        v-show="expanded"
        :active="expanded"
        :day-ref="dayRef"
        @close="expand(false)"
      />
      <template v-if="!expanded">
        <header class="day-plan-calendar__header">
          <strong>{{ label(dayRef, { weekday: 'long', day: 'numeric', month: 'long' }) }}</strong>
          <button
            v-if="store.targetingItem"
            :aria-label="t('common.buttons.cancel')"
            @click="store.cancelTargeting()"
          >
            <AppIcon name="close" />
          </button>
          <button
            v-else
            ref="editButton"
            :aria-label="t('planning.today.calendarPlan.expand')"
            :title="t('planning.today.calendarPlan.expand')"
            :aria-expanded="expanded"
            @click="expand(true)"
          >
            <AppIcon name="edit_calendar" />
          </button>
        </header>
        <div class="day-plan-calendar__period">
          <button :aria-label="t('planning.today.calendar.previousPeriod')" @click="offset--">
            <AppIcon name="chevron_left" /></button
          ><span
            >{{ label(start, { day: 'numeric', month: 'short' }) }} –
            {{ label(days[6], { day: 'numeric', month: 'short', year: 'numeric' }) }}</span
          ><button :aria-label="t('planning.today.calendar.nextPeriod')" @click="offset++">
            <AppIcon name="chevron_right" /></button
          ><button
            v-if="offset || dayRef !== today"
            @click="jumpToToday"
          >
            {{ t('planning.today.calendar.today') }}
          </button>
        </div>
        <p v-if="selected" class="day-plan-calendar__selection">
          {{ dayItemTitle(selected)
          }}<span v-if="store.targetingItem"> · {{ t('planning.today.calendar.pickDay') }}</span>
        </p>
        <div class="day-plan-calendar__days">
          <button
            v-for="date in days"
            :key="date"
            :aria-label="label(date, { weekday: 'long', day: 'numeric', month: 'long' })"
            :aria-pressed="date === dayRef"
            :disabled="!!store.targetingItem && !allowed(date)"
            :class="{ 'is-drop-target': store.targetingItem && allowed(date) }"
            @click="pick(date)"
            @dragover="dragover($event, date)"
            @drop="drop($event, date)"
          >
            <small>{{ label(date, { weekday: 'short' }) }}</small
            ><strong>{{ Number(date.slice(-2)) }}</strong>
          </button>
        </div>
        <NextObjectChartCard
          v-if="measurement && !offset"
          bare
          class="day-plan-calendar__chart"
          scale="day"
          icon=""
          :title="measurement.subject.title"
          summary=""
          :entry-mode="measurement.subject.entryMode"
          :cadence="measurement.subject.cadence"
          :points="points"
          :actual-value="measurement.measurement.actualValue"
          :target-value="measurement.measurement.target?.value"
          :aggregate-status="measurement.measurement.evaluationStatus"
        />
      </template>
    </div>
  </DsSurface>
</template>
