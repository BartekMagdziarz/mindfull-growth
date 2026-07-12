<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { WeekV2DayColumn, WeekV2Section, WeekV2SectionKey } from '@/services/weekV2Overview'
import type { WeekRef } from '@/domain/period'
import type { MonthChartMode, MonthDensity } from '@/components/calendar/month-v2/monthV2Types'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import WeekObjectSection from './WeekObjectSection.vue'

withDefaults(defineProps<{ days: WeekV2DayColumn[]; sections: WeekV2Section[]; chartMode?: MonthChartMode; density?: MonthDensity }>(), { chartMode: 'hybrid', density: 'comfortable' })
const emit = defineEmits<{ openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }] }>()
const { t, locale } = useT()
const STORAGE_KEY = 'calendar.week-v2.sections'
const expanded = ref<Record<WeekV2SectionKey, boolean>>({ goals: false, habits: false, trackers: false, intentions: false })

onMounted(() => {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!value || typeof value !== 'object') return
    for (const key of Object.keys(expanded.value) as WeekV2SectionKey[]) {
      const next = (value as Record<string, unknown>)[key]
      if (typeof next === 'boolean') expanded.value[key] = next
    }
  } catch { /* corrupted local state is ignored */ }
})

function toggle(key: WeekV2SectionKey) {
  expanded.value[key] = !expanded.value[key]
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expanded.value)) } catch { /* best effort */ }
}

function weekday(dayRef: string): string {
  return new Intl.DateTimeFormat(locale.value, { weekday: 'short' }).format(new Date(`${dayRef}T12:00:00`)).replace('.', '')
}
</script>

<template>
  <div class="week-grid" :class="`week-grid--${density}`" data-testid="week-v2-day-grid">
    <div class="week-grid__axis">
      <div aria-hidden="true" />
      <div class="week-grid__heads">
        <div v-for="day in days" :key="day.dayRef" class="week-grid__day" :class="{ 'week-grid__day--current': day.isToday, 'week-grid__day--future': day.phase === 'future' }" :aria-current="day.isToday ? 'date' : undefined">
          <span class="week-grid__day-label">{{ weekday(day.dayRef) }} {{ Number(day.dayRef.slice(-2)) }}<sup v-if="day.isBoundary">◦</sup></span>
          <span v-if="day.isToday" class="week-grid__today">{{ t('planning.calendar.weekV2.today') }}</span>
          <span class="week-grid__markers">
            <AppIcon v-if="day.activity.emotionCount" name="mood" />
            <AppIcon v-if="day.activity.journalWritten" name="menu_book" />
            <AppIcon v-if="day.activity.exerciseCount" name="self_improvement" />
          </span>
        </div>
      </div>
    </div>
    <div class="week-grid__sections">
      <WeekObjectSection v-for="section in sections" :key="section.key" :section="section" :expanded="expanded[section.key]" :chart-mode="chartMode" :density="density" @toggle="toggle(section.key)" @open-object="emit('openObject', $event)" />
    </div>
  </div>
</template>

<style scoped>
.week-grid { --week-v2-label-width: minmax(184px, 1.18fr); display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.week-grid--compact { --week-v2-label-width: minmax(170px, 1.08fr); }
.week-grid__axis { display: grid; gap: 8px; grid-template-columns: var(--week-v2-label-width) minmax(0, 4fr); }
.week-grid__heads { display: grid; gap: 8px; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.week-grid__day { align-items: center; background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom))); border-radius: 16px; box-shadow: 3px 3px 7px rgb(var(--neo-shadow-dark) / .5), -3px -3px 7px rgb(var(--neo-shadow-light) / .85); display: flex; flex-direction: column; gap: 4px; min-height: 68px; padding: 8px 3px; }
.week-grid__day--current { background: rgb(var(--neo-surface-base)); box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .35), inset -2px -2px 5px rgb(var(--neo-inset-light) / .7), 0 0 0 1px rgb(var(--neo-chart-primary-end) / .4); }
.week-grid__day--future { opacity: .46; }
.week-grid__day-label { color: rgb(var(--neo-text)); font-size: 10px; font-weight: 700; text-transform: capitalize; white-space: nowrap; }
.week-grid__today { color: rgb(var(--color-primary-strong)); font-size: 7px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.week-grid__markers { align-items: center; color: rgb(var(--neo-muted)); display: flex; font-size: 11px; gap: 2px; min-height: 13px; }
.week-grid__sections { display: flex; flex-direction: column; gap: 5px; }
@media (max-width: 900px) { .week-grid { overflow-x: auto; } .week-grid__axis, .week-grid__sections { min-width: 720px; } }
</style>
