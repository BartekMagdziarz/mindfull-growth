<template>
  <div
    class="month-focus-series"
    :style="{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }"
  >
    <button
      v-for="column in columns"
      :key="column.weekRef"
      type="button"
      class="month-focus-series__cell neo-focus"
      :class="{
        'month-focus-series__cell--future': column.phase === 'future',
        'month-focus-series__cell--empty': summaryFor(column.weekRef).count === 0,
      }"
      :aria-label="cellLabel(column.weekRef)"
      @click="emit('openWeek', column.weekRef)"
    >
      <template v-if="kind === 'emotions'">
        <span class="month-focus-series__emotion-cloud" aria-hidden="true">
          <span
            v-for="quadrant in QUADRANTS"
            :key="quadrant"
            class="month-focus-series__emotion-dot"
            :class="`month-focus-series__emotion-dot--${quadrant}`"
            :style="emotionDotStyle(column.weekRef, quadrant)"
          />
        </span>
        <strong v-if="summaryFor(column.weekRef).count > 0">
          {{ summaryFor(column.weekRef).count }}
        </strong>
        <span v-else class="month-focus-series__dash">—</span>
      </template>

      <template v-else-if="kind === 'intentions'">
        <span
          v-if="(summaryFor(column.weekRef).total ?? 0) > 0"
          class="month-focus-series__intention-list"
          aria-hidden="true"
        >
          <span
            v-for="(icon, index) in intentionIcons(column.weekRef)"
            :key="`${icon}-${index}`"
            class="month-focus-series__intention-mark"
            :class="{
              'month-focus-series__intention-mark--filled':
                index < (summaryFor(column.weekRef).met ?? 0),
            }"
          >
            <AppIcon :name="icon" />
          </span>
        </span>
        <span v-else class="month-focus-series__dash">—</span>
        <strong v-if="(summaryFor(column.weekRef).total ?? 0) > 0">
          {{ summaryFor(column.weekRef).met ?? 0 }}/{{ summaryFor(column.weekRef).total }}
        </strong>
      </template>

      <template v-else>
        <span class="month-focus-series__bar-track" aria-hidden="true">
          <span :style="barStyle(column.weekRef)" />
        </span>
        <strong v-if="summaryFor(column.weekRef).count > 0">
          {{ summaryFor(column.weekRef).count }}
        </strong>
        <span v-else class="month-focus-series__dash">—</span>
      </template>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Quadrant } from '@/domain/emotion'
import type { WeekRef } from '@/domain/period'
import type {
  MonthV2FocusKey,
  MonthV2FocusWeekSummary,
  MonthV2WeekColumn,
} from '@/services/monthV2Overview'
import AppIcon from '@/components/shared/AppIcon.vue'

const props = defineProps<{
  kind: MonthV2FocusKey
  columns: MonthV2WeekColumn[]
  weeks: MonthV2FocusWeekSummary[]
  ariaLabel: string
}>()

const emit = defineEmits<{
  openWeek: [weekRef: WeekRef]
}>()

const QUADRANTS: Quadrant[] = [
  'high-energy-high-pleasantness',
  'high-energy-low-pleasantness',
  'low-energy-high-pleasantness',
  'low-energy-low-pleasantness',
]

const EMPTY_SUMMARY: MonthV2FocusWeekSummary = {
  weekRef: '' as WeekRef,
  count: 0,
  activeDayCount: 0,
}

const summaryByWeek = computed(
  () => new Map(props.weeks.map(summary => [summary.weekRef, summary]))
)

const maxCount = computed(() => Math.max(1, ...props.weeks.map(summary => summary.count)))

function summaryFor(weekRef: WeekRef): MonthV2FocusWeekSummary {
  return summaryByWeek.value.get(weekRef) ?? EMPTY_SUMMARY
}

function barStyle(weekRef: WeekRef) {
  const value = summaryFor(weekRef).count
  return { height: `${Math.max(value > 0 ? 18 : 2, (value / maxCount.value) * 54)}px` }
}

function emotionDotStyle(weekRef: WeekRef, quadrant: Quadrant) {
  const value = summaryFor(weekRef).quadrantCounts?.[quadrant] ?? 0
  const total = Math.max(1, summaryFor(weekRef).count)
  const scale = value === 0 ? 0.52 : 0.72 + Math.min(0.48, value / total)
  return {
    opacity: value === 0 ? '0.18' : '0.88',
    transform: `scale(${scale})`,
  }
}

function intentionIcons(weekRef: WeekRef): string[] {
  const summary = summaryFor(weekRef)
  const total = summary.total ?? 0
  const icons = summary.icons ?? []
  return Array.from({ length: Math.min(total, 4) }, (_, index) => icons[index] ?? 'wb_sunny')
}

function cellLabel(weekRef: WeekRef): string {
  if (props.kind === 'intentions') {
    const summary = summaryFor(weekRef)
    return `${props.ariaLabel}: ${weekRef}, ${summary.met ?? 0}/${summary.total ?? 0}`
  }
  return `${props.ariaLabel}: ${weekRef}, ${summaryFor(weekRef).count}`
}
</script>

<style scoped>
.month-focus-series {
  display: grid;
  gap: clamp(6px, 0.7vw, 12px);
  min-height: 70px;
  width: 100%;
}

.month-focus-series__cell {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 14px;
  color: rgb(var(--neo-text));
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: 6px;
  justify-content: flex-end;
  min-width: 0;
  padding: 7px 4px;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    opacity 180ms ease;
}

.month-focus-series__cell:hover {
  background: rgb(var(--color-primary-soft) / 0.34);
}

.month-focus-series__cell--future {
  opacity: 0.58;
}

.month-focus-series__cell strong {
  color: rgb(var(--color-primary-strong));
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.month-focus-series__dash {
  color: rgb(var(--neo-muted) / 0.52);
  font-size: 12px;
}

.month-focus-series__bar-track {
  align-items: flex-end;
  border-bottom: 1px dotted rgb(var(--neo-border) / 0.5);
  display: flex;
  height: 56px;
  justify-content: center;
  width: min(42px, 62%);
}

.month-focus-series__bar-track > span {
  background: linear-gradient(180deg, rgb(var(--sky-300) / 0.76), rgb(var(--sky-100) / 0.28));
  border: 1px solid rgb(var(--sky-400) / 0.26);
  border-radius: 11px 10px 7px 9px;
  min-height: 2px;
  transition: height 420ms cubic-bezier(0.22, 1, 0.36, 1);
  width: 100%;
}

.month-focus-series__emotion-cloud {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(2, 18px);
  min-height: 38px;
  place-content: center;
}

.month-focus-series__emotion-dot {
  border-radius: 44% 56% 48% 52% / 57% 43% 56% 44%;
  height: 16px;
  transform-origin: center;
  width: 16px;
}

.month-focus-series__emotion-dot--high-energy-high-pleasantness {
  background: var(--color-quadrant-high-energy-high-pleasantness);
}

.month-focus-series__emotion-dot--high-energy-low-pleasantness {
  background: var(--color-quadrant-high-energy-low-pleasantness);
}

.month-focus-series__emotion-dot--low-energy-high-pleasantness {
  background: var(--color-quadrant-low-energy-high-pleasantness);
}

.month-focus-series__emotion-dot--low-energy-low-pleasantness {
  background: var(--color-quadrant-low-energy-low-pleasantness);
}

.month-focus-series__intention-list {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  justify-content: center;
  min-height: 30px;
}

.month-focus-series__intention-mark {
  align-items: center;
  border: 1px solid rgb(var(--neo-border) / 0.4);
  border-radius: 50% 45% 54% 46%;
  color: rgb(var(--neo-muted) / 0.54);
  display: flex;
  font-size: 15px;
  height: 25px;
  justify-content: center;
  width: 25px;
}

.month-focus-series__intention-mark--filled {
  background: rgb(var(--sky-100) / 0.72);
  border-color: rgb(var(--sky-400) / 0.45);
  color: rgb(var(--sky-600));
}

@media (prefers-reduced-motion: reduce) {
  .month-focus-series__bar-track > span {
    transition: none;
  }
}
</style>
