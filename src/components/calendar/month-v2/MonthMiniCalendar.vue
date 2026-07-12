<template>
  <div class="month-mini" role="img" :aria-label="t('planning.calendar.monthV2.activity')">
    <div class="month-mini__weekdays" aria-hidden="true">
      <span v-for="label in weekdayLabels" :key="label">{{ label }}</span>
    </div>
    <div class="month-mini__grid" aria-hidden="true">
      <span v-for="n in leadingBlanks" :key="`blank-${n}`" class="month-mini__blank" />
      <div
        v-for="day in days"
        :key="day.dayRef"
        class="month-mini__day"
        :class="{
          'month-mini__day--future': day.isFuture,
          'month-mini__day--today': day.isToday,
        }"
        :title="dayTitle(day)"
      >
        <span class="month-mini__num">{{ dayNumber(day.dayRef) }}</span>
        <span class="month-mini__markers">
          <span
            v-for="segment in emotionSegments(day)"
            :key="segment.quadrant"
            class="month-mini__dot"
            :style="{ background: segment.color }"
          />
          <AppIcon v-if="day.journalWritten" name="menu_book" class="month-mini__icon" />
          <AppIcon v-if="day.exerciseCount > 0" name="self_improvement" class="month-mini__icon" />
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MonthV2ActivityDay } from '@/services/monthV2Overview'
import type { Quadrant } from '@/domain/emotion'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const props = defineProps<{
  days: MonthV2ActivityDay[]
}>()

const { t, locale } = useT()

const QUADRANT_COLOR: Record<Quadrant, string> = {
  'high-energy-high-pleasantness': 'var(--color-quadrant-high-energy-high-pleasantness)',
  'low-energy-high-pleasantness': 'var(--color-quadrant-low-energy-high-pleasantness)',
  'high-energy-low-pleasantness': 'var(--color-quadrant-high-energy-low-pleasantness)',
  'low-energy-low-pleasantness': 'var(--color-quadrant-low-energy-low-pleasantness)',
}

const weekdayLabels = computed(() => {
  // Monday-first, matching the app's canonical weeks.
  const formatter = new Intl.DateTimeFormat(locale.value, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, i) =>
    formatter.format(new Date(Date.UTC(2024, 0, i + 1, 12))) // 2024-01-01 is a Monday
  )
})

const days = computed(() => props.days)
const leadingBlanks = computed(() => props.days[0]?.weekdayIndex ?? 0)

function dayNumber(dayRef: string): number {
  return Number(dayRef.slice(-2))
}

function emotionSegments(day: MonthV2ActivityDay): Array<{ quadrant: string; color: string }> {
  return (Object.keys(day.quadrantCounts) as Quadrant[])
    .filter((quadrant) => day.quadrantCounts[quadrant] > 0)
    .map((quadrant) => ({ quadrant, color: QUADRANT_COLOR[quadrant] }))
}

function dayTitle(day: MonthV2ActivityDay): string {
  const parts: string[] = [day.dayRef]
  if (day.emotionCount > 0)
    parts.push(`${t('planning.calendar.wellness.emotions')}: ${day.emotionCount}`)
  if (day.journalWritten) parts.push(t('planning.calendar.wellness.journal'))
  if (day.exerciseCount > 0)
    parts.push(`${t('planning.calendar.wellness.exercises')}: ${day.exerciseCount}`)
  return parts.join(' · ')
}
</script>

<style scoped>
.month-mini__weekdays {
  color: rgb(var(--neo-muted));
  display: grid;
  font-size: 8px;
  font-weight: 700;
  gap: 2px;
  grid-template-columns: repeat(7, 1fr);
  letter-spacing: 0.08em;
  margin-bottom: 4px;
  text-align: center;
  text-transform: uppercase;
}

.month-mini__grid {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(7, 1fr);
}

.month-mini__day {
  align-items: center;
  background: rgb(var(--neo-surface-base) / 0.5);
  border-radius: 7px;
  box-shadow:
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.22),
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.5);
  display: flex;
  flex-direction: column;
  gap: 2px;
  justify-content: center;
  min-height: 30px;
  padding: 3px 1px;
}

.month-mini__day--future {
  opacity: 0.45;
}

.month-mini__day--today {
  box-shadow:
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.22),
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.5),
    0 0 0 1.5px rgb(var(--neo-chart-primary-end) / 0.55);
}

.month-mini__num {
  color: rgb(var(--neo-text));
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  line-height: 1;
}

.month-mini__markers {
  align-items: center;
  display: flex;
  gap: 2px;
  min-height: 8px;
}

.month-mini__dot {
  border-radius: 999px;
  display: inline-block;
  height: 5px;
  width: 5px;
}

.month-mini__icon {
  color: rgb(var(--neo-muted));
  font-size: 9px;
}
</style>
