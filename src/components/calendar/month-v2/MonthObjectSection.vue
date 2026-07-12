<template>
  <section
    class="month-section"
    :class="{ 'month-section--dense': section.key === 'intentions' }"
    :data-section="section.key"
  >
    <button
      type="button"
      class="month-section__toggle neo-focus"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      :aria-label="
        t(
          expanded
            ? 'planning.calendar.monthV2.collapseSection'
            : 'planning.calendar.monthV2.expandSection',
          { section: sectionTitle }
        )
      "
      @click="emit('toggle')"
    >
      <span class="month-section__toggle-left">
        <span class="month-section__icon" aria-hidden="true">
          <AppIcon :name="sectionIcon" />
        </span>
        <span class="month-section__title">{{ sectionTitle }}</span>
      </span>
      <span class="month-section__toggle-right">
        <span class="month-section__coverage">
          {{
            t('planning.calendar.monthV2.coverage', {
              active: section.coveredRows,
              total: section.rowCount,
            })
          }}
        </span>
        <AppIcon
          name="expand_more"
          class="month-section__chevron"
          :class="{ 'month-section__chevron--open': expanded }"
        />
      </span>
    </button>

    <div v-if="expanded" :id="contentId" class="month-section__content">
      <p v-if="section.rowCount === 0" class="month-section__empty">
        {{ t('planning.calendar.monthV2.noObjects') }}
      </p>

      <div v-for="group in section.groups" :key="group.key" class="month-section__group">
        <button
          v-if="group.goalId"
          type="button"
          class="month-section__group-head month-section__group-head--link neo-focus"
          @click="emit('openObject', { type: 'goal', id: group.goalId })"
        >
          <EntityIcon :icon="group.icon" size="xs" />
          <span>{{ group.title }}</span>
          <AppIcon name="arrow_outward" class="month-section__open-icon" />
        </button>
        <p v-else-if="group.key === 'goal:unlinked'" class="month-section__group-head">
          <AppIcon name="more_horiz" />
          <span>{{ t('planning.calendar.monthV2.remainingResults') }}</span>
        </p>
        <p v-else-if="group.key.startsWith('week:')" class="month-section__group-head">
          <span>{{ weekGroupLabel(group.key) }}</span>
        </p>

        <div v-for="row in group.rows" :key="row.key" class="month-section__row" :data-row-key="row.key">
          <button
            type="button"
            class="month-section__row-label neo-focus"
            :title="row.title"
            @click="
              emit('openObject', { type: row.subjectType, id: row.subjectId, homeWeekRef: row.homeWeekRef })
            "
          >
            <EntityIcon :icon="row.icon" size="xs" />
            <span class="month-section__row-text">
              <span class="month-section__row-title">{{ row.title }}</span>
              <span v-if="rowSubline(row)" class="month-section__row-subline">
                {{ rowSubline(row) }}
              </span>
            </span>
            <AppIcon name="arrow_outward" class="month-section__open-icon" />
          </button>
          <div class="month-section__row-chart">
            <MonthSeriesChart
              :series="row.series"
              :chart-mode="chartMode"
              :density="density"
              :aria-label="row.title"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { WeekRef } from '@/domain/period'
import { getPeriodBounds } from '@/utils/periods'
import type { MonthV2Row, MonthV2Section } from '@/services/monthV2Overview'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useT } from '@/composables/useT'
import MonthSeriesChart from './MonthSeriesChart.vue'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

const props = withDefaults(
  defineProps<{
    section: MonthV2Section
    expanded: boolean
    chartMode?: MonthChartMode
    density?: MonthDensity
  }>(),
  { chartMode: 'hybrid', density: 'comfortable' }
)

const emit = defineEmits<{
  toggle: []
  openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }]
}>()

const { t, locale } = useT()
const contentId = `month-section-${useId().replace(/:/g, '')}`

/** "T27 · 6 lip – 12 lip" header for the per-week intention groups. */
function weekGroupLabel(groupKey: string): string {
  const weekRef = groupKey.slice('week:'.length) as WeekRef
  const bounds = getPeriodBounds(weekRef)
  const formatter = new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'short' })
  const start = formatter.format(new Date(`${bounds.start}T12:00:00`))
  const end = formatter.format(new Date(`${bounds.end}T12:00:00`))
  return `${t('planning.calendar.scales.weekShort')}${weekRef.slice(-2)} · ${start} – ${end}`
}

const SECTION_ICONS: Record<MonthV2Section['key'], string> = {
  goals: 'flag',
  habits: 'loop',
  trackers: 'monitoring',
  intentions: 'edit_calendar',
}

const sectionIcon = computed(() => SECTION_ICONS[props.section.key])

const sectionTitle = computed(() =>
  props.section.key === 'intentions'
    ? t('planning.calendar.monthV2.sections.intentions')
    : t(`planning.calendar.sections.${props.section.key}`)
)

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

/**
 * Quiet per-row context under the name: the month result for monthly-cadence
 * objects (evaluated once for the month, never per week) and the qualified
 * entry-days readout when the target carries an entryDays condition.
 */
function rowSubline(row: MonthV2Row): string | null {
  const parts: string[] = []
  const summary = row.monthSummary
  if (row.cadence === 'monthly' && summary?.actualValue !== undefined) {
    const target = summary.target?.value !== undefined ? `/${formatValue(summary.target.value)}` : ''
    parts.push(
      t('planning.calendar.monthV2.monthResult', {
        value: `${formatValue(summary.actualValue)}${target}`,
      })
    )
  }
  const entryDays = summary?.target?.entryDays
  if (entryDays && summary?.qualifiedEntryDays !== undefined) {
    parts.push(
      t('planning.calendar.monthV2.entryDaysChip', {
        count: summary.qualifiedEntryDays,
        target: entryDays.value,
      })
    )
  }
  return parts.length > 0 ? parts.join(' · ') : null
}
</script>

<style scoped>
/* Flat variant: collapsed section headers sit directly on the page background
   (no raised card); the expanded content is a single inset "table" well. */
.month-section__toggle {
  align-items: center;
  background: none;
  border: none;
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  justify-content: space-between;
  padding: 9px 10px;
  width: 100%;
}

.month-section__toggle:hover {
  background: rgb(var(--neo-inset-dark) / 0.1);
}

.month-section__toggle-left {
  align-items: center;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.month-section__icon {
  align-items: center;
  color: rgb(var(--color-primary-strong));
  display: flex;
  font-size: 15px;
  height: 24px;
  justify-content: center;
  width: 24px;
}

.month-section__title {
  color: rgb(var(--neo-text));
  font-size: 14px;
  font-weight: 700;
}

.month-section__toggle-right {
  align-items: center;
  color: rgb(var(--neo-muted));
  display: flex;
  font-size: 11.5px;
  gap: 10px;
}

.month-section__coverage {
  font-variant-numeric: tabular-nums;
}

.month-section__chevron {
  font-size: 18px;
  transition: transform 0.18s ease;
}

.month-section__chevron--open {
  transform: rotate(180deg);
}

.month-section__content {
  background: rgb(var(--neo-surface-base) / 0.55);
  border-radius: 17px;
  box-shadow:
    inset 2px 2px 5px rgb(var(--neo-inset-dark) / 0.28),
    inset -2px -2px 5px rgb(var(--neo-inset-light) / 0.6);
  margin: 2px 0 10px;
  padding: 6px 0;
}

.month-section__empty {
  color: rgb(var(--neo-muted));
  font-size: 12.5px;
  padding: 10px 12px;
}

.month-section__group + .month-section__group {
  border-top: 1px solid rgb(var(--neo-border) / 0.45);
  margin-top: 6px;
  padding-top: 6px;
}

.month-section__group-head {
  align-items: center;
  color: rgb(var(--neo-muted));
  display: flex;
  font-size: 11.5px;
  font-weight: 700;
  gap: 6px;
  padding: 6px 10px 2px;
}

.month-section__group-head--link {
  background: none;
  border: none;
  border-radius: 9px;
  cursor: pointer;
  font: inherit;
  font-size: 11.5px;
  font-weight: 700;
}

.month-section__group-head--link:hover {
  color: rgb(var(--neo-text));
}

.month-section__row {
  align-items: center;
  display: grid;
  gap: 8px;
  grid-template-columns: var(--month-v2-label-width, minmax(184px, 1.18fr)) minmax(0, 4fr);
  min-height: 56px;
  padding: 0 4px;
}

.month-section--compact .month-section__row {
  min-height: 46px;
}

.month-section--dense .month-section__row {
  min-height: 38px;
}

.month-section__row + .month-section__row,
.month-section__group-head + .month-section__row {
  border-top: 1px solid rgb(var(--neo-border) / 0.35);
}

.month-section__row-label {
  align-items: center;
  background: none;
  border: none;
  border-radius: 11px;
  color: inherit;
  cursor: pointer;
  display: flex;
  font: inherit;
  gap: 8px;
  min-width: 0;
  padding: 6px 8px;
  text-align: left;
}

.month-section__row-label:hover {
  background: rgb(var(--color-primary-soft, var(--neo-border)) / 0.24);
}

.month-section__row-label:hover .month-section__open-icon {
  opacity: 1;
}

.month-section__row-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.month-section__row-title {
  color: rgb(var(--neo-text));
  font-size: 12.5px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-section__row-subline {
  color: rgb(var(--neo-muted));
  font-size: 10.5px;
  font-variant-numeric: tabular-nums;
}

.month-section__open-icon {
  color: rgb(var(--neo-muted));
  font-size: 13px;
  margin-left: auto;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.month-section__row-chart {
  min-width: 0;
}

@media (prefers-reduced-motion: reduce) {
  .month-section__chevron,
  .month-section__open-icon {
    transition: none;
  }
}
</style>
