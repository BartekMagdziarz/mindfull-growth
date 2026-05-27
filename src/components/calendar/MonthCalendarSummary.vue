<template>
  <div class="neo-inset rounded-2xl p-3 md:p-4">
    <!-- Weekday headers -->
    <div class="grid grid-cols-7 gap-1.5 mb-1.5">
      <div
        v-for="name in dayNames"
        :key="name"
        class="text-center text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-variant/70"
      >
        {{ name }}
      </div>
    </div>

    <!-- Day grid -->
    <div class="grid grid-cols-7 gap-1.5">
      <template v-for="(cell, idx) in cells" :key="idx">
        <!-- Empty leading/trailing cells -->
        <div v-if="!cell" class="cal-day cal-day--empty" aria-hidden="true" />

        <!-- Real day cell -->
        <div
          v-else
          class="cal-day relative flex flex-col justify-between overflow-hidden rounded-[10px] border border-neu-border/20 bg-neu-base text-left"
          :title="dayTooltip(cell)"
        >
          <span class="cal-num px-1.5 pt-1 text-[10px] font-semibold leading-none text-on-surface-variant">
            {{ cell.dayNumber }}
          </span>

          <!-- 2x2 emotion-quadrant grid -->
          <div class="cal-emo-grid grid grid-cols-2 grid-rows-2 gap-[2px] flex-1 min-h-0 px-[3px] pb-[3px]">
            <div
              v-for="q in QUADRANT_GRID"
              :key="q.key"
              class="flex items-center justify-center min-w-0 min-h-0"
            >
              <div
                class="rounded-[3px] aspect-square max-w-full transition-all duration-200"
                :style="quadrantStyle(cell, q.key)"
              />
            </div>
          </div>

          <!-- Journal indicator -->
          <span
            v-if="cell.hasJournal"
            class="material-symbols-outlined absolute right-[3px] top-[3px] text-[12px] leading-none text-on-surface-variant/70"
            aria-hidden="true"
          >
            description
          </span>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Quadrant } from '@/domain/emotion'
import type { DailyCalendarSummary } from '@/services/reflectionDataQueries'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  summaries: DailyCalendarSummary[]
}>()

// Render order in 2x2 grid:
//   [hl][hh]
//   [ll][lh]
// (hl = high-energy-low-pleasantness, hh = high-energy-high-pleasantness, etc.)
// Heatmap dots use the muted `-bottom` token (same as the selector buttons),
// not the saturated `-selected` accent — the opacity scaling in
// `quadrantStyle` already conveys intensity, so the base hue can stay soft.
const QUADRANT_GRID: { key: Quadrant; cssVar: string }[] = [
  { key: 'high-energy-low-pleasantness', cssVar: '--color-quadrant-high-energy-low-pleasantness-bottom' },
  { key: 'high-energy-high-pleasantness', cssVar: '--color-quadrant-high-energy-high-pleasantness-bottom' },
  { key: 'low-energy-low-pleasantness', cssVar: '--color-quadrant-low-energy-low-pleasantness-bottom' },
  { key: 'low-energy-high-pleasantness', cssVar: '--color-quadrant-low-energy-high-pleasantness-bottom' },
]

/**
 * Short weekday names rendered above the grid, Monday-first to match the
 * planner conventions used elsewhere in the app. Generated via the locale's
 * `Intl.DateTimeFormat` so the labels match the user's UI language without
 * requiring dedicated translation keys.
 */
const dayNames = computed(() => {
  // 2024-04-01 is a Monday — anchor for label generation.
  const monday = new Date(Date.UTC(2024, 3, 1, 12))
  const labels: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    labels.push(d.toLocaleDateString(undefined, { weekday: 'short' }))
  }
  return labels
})

// Build a 7-column grid: pad with nulls so the first day lines up with its
// weekday column (Mon-anchored), and pad the trailing cells so the grid
// closes at a 7-column boundary.
const cells = computed<(DailyCalendarSummary | null)[]>(() => {
  if (props.summaries.length === 0) return []
  const first = props.summaries[0]
  const padBefore = first.weekday - 1 // weekday: 1=Mon … 7=Sun
  const out: (DailyCalendarSummary | null)[] = []
  for (let i = 0; i < padBefore; i++) out.push(null)
  for (const summary of props.summaries) out.push(summary)
  while (out.length % 7 !== 0) out.push(null)
  return out
})

/**
 * Per-quadrant square sizing. The square size and opacity scale with the count
 * relative to the day's max so days with all four quadrants present stay
 * legible while still highlighting which quadrant dominates.
 */
function quadrantStyle(summary: DailyCalendarSummary, quadrant: Quadrant): Record<string, string> {
  const counts = summary.quadrantCounts
  const max = Math.max(
    counts['high-energy-high-pleasantness'],
    counts['high-energy-low-pleasantness'],
    counts['low-energy-high-pleasantness'],
    counts['low-energy-low-pleasantness'],
    1,
  )
  const value = counts[quadrant]
  const cssVar = QUADRANT_GRID.find((q) => q.key === quadrant)!.cssVar
  if (value === 0) {
    return {
      height: '30%',
      opacity: '0.12',
      background: `var(${cssVar})`,
    }
  }
  const sizePct = 45 + (value / max) * 55
  const opacity = 0.45 + (value / max) * 0.45
  return {
    height: `${sizePct}%`,
    opacity: opacity.toFixed(2),
    background: `var(${cssVar})`,
  }
}

function dayTooltip(summary: DailyCalendarSummary): string {
  if (summary.totalEmotions === 0 && !summary.hasJournal) return summary.dayRef
  const parts: string[] = [summary.dayRef]
  if (summary.totalEmotions > 0) {
    parts.push(
      t('planning.reflection.monthly.calendar.emotionsCount', { count: summary.totalEmotions }),
    )
  }
  if (summary.hasJournal) {
    parts.push(t('planning.reflection.monthly.calendar.journalEntry'))
  }
  return parts.join(' · ')
}
</script>

<style scoped>
.cal-day {
  height: 80px;
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-shadow-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-shadow-dark) / 0.18);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.cal-day--empty {
  background: transparent;
  border: 0;
  box-shadow: none;
  height: 80px;
}
</style>
