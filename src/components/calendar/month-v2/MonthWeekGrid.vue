<template>
  <div class="month-grid" :class="`month-grid--${density}`" data-testid="month-v2-week-grid">
    <!-- Shared axis: week heads aligned with every row's chart column. -->
    <div class="month-grid__axis">
      <div class="month-grid__axis-spacer" aria-hidden="true" />
      <div
        class="month-grid__heads"
        :style="{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }"
      >
        <button
          v-for="week in weeks"
          :key="week.weekRef"
          type="button"
          class="month-grid__week neo-focus"
          :class="{
            'month-grid__week--current': week.phase === 'current',
            'month-grid__week--future': week.phase === 'future',
          }"
          :aria-current="week.phase === 'current' ? 'date' : undefined"
          :aria-label="t('planning.calendar.monthV2.openWeek', { number: weekNumber(week) })"
          @click="emit('openWeek', week.weekRef)"
        >
          <span class="month-grid__week-top">
            <span class="month-grid__week-num">
              {{ t('planning.calendar.scales.weekShort') }}{{ weekNumber(week) }}
            </span>
            <span
              v-if="week.isBoundary"
              class="month-grid__week-marker"
              :title="t('planning.calendar.planner.matrix.boundaryHint')"
            >◦</span>
            <span v-if="week.phase === 'current'" class="month-grid__week-badge">
              {{ t('planning.calendar.monthV2.currentWeek') }}
            </span>
          </span>
          <span class="month-grid__week-range">{{ weekRange(week) }}</span>

          <!-- Full 4-areas × 3-groups reflection matrix (no aggregation). -->
          <span
            v-if="week.reflectionMatrix"
            class="month-grid__matrix"
            :title="matrixTitle(week)"
            role="img"
            :aria-label="matrixTitle(week)"
          >
            <span v-for="row in week.reflectionMatrix" :key="row.areaKey" class="month-grid__matrix-row">
              <span
                v-for="cell in row.cells"
                :key="cell.section"
                class="month-grid__matrix-cell"
                :style="cell.color ? { background: cell.color } : undefined"
              />
            </span>
          </span>
          <span v-else class="month-grid__matrix-empty" :title="t('planning.calendar.monthV2.noReflection')">
            —
          </span>
        </button>
      </div>
    </div>

    <div class="month-grid__sections">
      <MonthObjectSection
        v-for="section in sections"
        :key="section.key"
        :section="section"
        :expanded="isSectionExpanded(section.key)"
        :chart-mode="chartMode"
        :density="density"
        @toggle="toggleSection(section.key)"
        @open-object="emit('openObject', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { MonthV2Section, MonthV2SectionKey, MonthV2WeekColumn } from '@/services/monthV2Overview'
import { useT } from '@/composables/useT'
import MonthObjectSection from './MonthObjectSection.vue'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

withDefaults(
  defineProps<{
    weeks: MonthV2WeekColumn[]
    sections: MonthV2Section[]
    chartMode?: MonthChartMode
    density?: MonthDensity
  }>(),
  { chartMode: 'hybrid', density: 'comfortable' }
)

const emit = defineEmits<{
  openWeek: [weekRef: WeekRef]
  openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }]
}>()

const { t, locale } = useT()

// ── Section disclosure: default collapsed, manual state persisted locally ────

interface MonthV2SectionState {
  goals: boolean
  habits: boolean
  trackers: boolean
  intentions: boolean
}

const STORAGE_KEY = 'calendar.month-v2.sections'

const expandedSections = ref<MonthV2SectionState>({
  goals: false,
  habits: false,
  trackers: false,
  intentions: false,
})

onMounted(() => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return
    for (const key of Object.keys(expandedSections.value) as MonthV2SectionKey[]) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'boolean') expandedSections.value[key] = value
    }
  } catch {
    // Corrupt storage is ignored — defaults stay collapsed.
  }
})

function isSectionExpanded(key: MonthV2SectionKey): boolean {
  return expandedSections.value[key]
}

function toggleSection(key: MonthV2SectionKey): void {
  expandedSections.value[key] = !expandedSections.value[key]
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(expandedSections.value))
  } catch {
    // Persisting is best-effort.
  }
}

// ── Week head labels ─────────────────────────────────────────────────────────

function weekNumber(week: MonthV2WeekColumn): string {
  return week.weekRef.slice(-2)
}

function weekRange(week: MonthV2WeekColumn): string {
  const formatter = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' })
  const start = formatter.format(new Date(`${week.weekStart}T12:00:00`))
  const end = formatter.format(new Date(`${week.weekEnd}T12:00:00`))
  return `${start} – ${end}`
}

function matrixTitle(week: MonthV2WeekColumn): string {
  if (!week.reflectionMatrix) return ''
  return week.reflectionMatrix
    .map(
      (row) =>
        `${row.areaKey}: ${row.cells.map((cell) => cell.rating ?? '—').join(' / ')}`
    )
    .join('\n')
}
</script>

<style scoped>
.month-grid {
  --month-v2-label-width: minmax(208px, 1.3fr);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.month-grid--compact {
  --month-v2-label-width: minmax(188px, 1.15fr);
}

.month-grid__axis {
  align-items: stretch;
  background: rgb(var(--neo-surface-base));
  border-radius: 0 0 14px 14px;
  display: grid;
  gap: 8px;
  grid-template-columns: var(--month-v2-label-width) minmax(0, 4fr);
  padding-bottom: 6px;
  position: sticky;
  top: 0;
  z-index: 6;
}

.month-grid__heads {
  display: grid;
  gap: 8px;
}

.month-grid__week {
  align-items: center;
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  border: none;
  border-radius: 16px;
  box-shadow:
    3px 3px 7px rgb(var(--neo-shadow-dark) / 0.5),
    -3px -3px 7px rgb(var(--neo-shadow-light) / 0.85);
  color: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: 4px;
  justify-content: flex-start;
  min-height: 74px;
  min-width: 0;
  padding: 8px 6px;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.month-grid--compact .month-grid__week {
  min-height: 62px;
}

.month-grid__week:hover {
  transform: translateY(-1px);
}

.month-grid__week--current {
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.35),
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.7);
}

.month-grid__week--future {
  opacity: 0.8;
}

.month-grid__week-top {
  align-items: center;
  display: flex;
  gap: 4px;
}

.month-grid__week-num {
  color: rgb(var(--neo-text));
  font-size: 12px;
  font-weight: 700;
}

.month-grid__week-marker {
  color: rgb(var(--neo-muted));
  font-size: 9px;
}

.month-grid__week-badge {
  background: rgb(var(--neo-chart-primary-end) / 0.18);
  border-radius: 999px;
  color: rgb(var(--color-primary-strong));
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  text-transform: uppercase;
}

.month-grid__week-range {
  color: rgb(var(--neo-muted));
  font-size: 10.5px;
  white-space: nowrap;
}

.month-grid__matrix {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 2px;
}

.month-grid__matrix-row {
  display: flex;
  gap: 2px;
}

.month-grid__matrix-cell {
  background: rgb(var(--neo-border) / 0.4);
  border-radius: 2.5px;
  height: 7px;
  width: 13px;
}

.month-grid--compact .month-grid__matrix-cell {
  height: 6px;
  width: 11px;
}

.month-grid__matrix-empty {
  color: rgb(var(--neo-muted));
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.55;
}

/* Sections sit flat on the background, separated from the raised week cards
   above by a single hairline; between sections only hairlines — the whole
   area reads as one table. */
.month-grid__sections {
  border-top: 1px solid rgb(var(--neo-border) / 0.55);
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 4px;
  padding-top: 8px;
}

.month-grid__sections > * + * {
  border-top: 1px solid rgb(var(--neo-border) / 0.35);
  padding-top: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .month-grid__week {
    transition: none;
  }
}
</style>
