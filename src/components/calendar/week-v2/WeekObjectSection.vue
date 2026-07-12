<script setup lang="ts">
import { computed, useId } from 'vue'
import type { WeekV2Row, WeekV2Section } from '@/services/weekV2Overview'
import type { WeekRef } from '@/domain/period'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import MonthSeriesChart from '@/components/calendar/month-v2/MonthSeriesChart.vue'
import type { MonthChartMode, MonthDensity } from '@/components/calendar/month-v2/monthV2Types'
import { useT } from '@/composables/useT'

const props = withDefaults(defineProps<{
  section: WeekV2Section
  expanded: boolean
  chartMode?: MonthChartMode
  density?: MonthDensity
}>(), { chartMode: 'hybrid', density: 'comfortable' })
const emit = defineEmits<{
  toggle: []
  openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }]
}>()
const { t } = useT()
const contentId = `week-section-${useId().replace(/:/g, '')}`
const ICONS: Record<WeekV2Section['key'], string> = { goals: 'flag', habits: 'loop', trackers: 'monitoring', intentions: 'edit_calendar' }
const sectionTitle = computed(() => props.section.key === 'intentions'
  ? t('planning.calendar.weekV2.sections.intentions')
  : t(`planning.calendar.sections.${props.section.key}`))

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function rowSubline(row: WeekV2Row): string | null {
  const summary = row.weekSummary
  if (summary) {
    const parts: string[] = []
    if (summary.actualValue !== undefined) {
      const target = summary.target?.value !== undefined ? `/${formatValue(summary.target.value)}` : ''
      parts.push(t('planning.calendar.weekV2.weekResult', { value: `${formatValue(summary.actualValue)}${target}` }))
    }
    if (summary.target?.entryDays && summary.qualifiedEntryDays !== undefined) {
      parts.push(t('planning.calendar.weekV2.entryDaysChip', { count: summary.qualifiedEntryDays, target: summary.target.entryDays.value }))
    }
    return parts.join(' · ') || null
  }
  if (row.contextSummary?.actualValue !== undefined) {
    return t('planning.calendar.weekV2.monthContext', { value: formatValue(row.contextSummary.actualValue) })
  }
  return null
}
</script>

<template>
  <section class="week-section" :data-section="section.key">
    <button
      type="button"
      class="week-section__toggle neo-focus"
      :aria-expanded="expanded"
      :aria-controls="contentId"
      @click="emit('toggle')"
    >
      <span class="week-section__toggle-left"><span class="week-section__icon"><AppIcon :name="ICONS[section.key]" /></span><b>{{ sectionTitle }}</b></span>
      <span class="week-section__toggle-right"><span>{{ section.rowCount }}</span><small>{{ t('planning.calendar.weekV2.coverage', { active: section.coveredRows, total: section.rowCount }) }}</small><AppIcon name="expand_more" :class="{ 'week-section__chevron--open': expanded }" /></span>
    </button>
    <div v-if="expanded" :id="contentId" class="week-section__content">
      <p v-if="section.rowCount === 0" class="week-section__empty">{{ t('planning.calendar.weekV2.noObjects') }}</p>
      <div v-for="group in section.groups" :key="group.key" class="week-section__group">
        <button v-if="group.goalId" type="button" class="week-section__group-head neo-focus" @click="emit('openObject', { type: 'goal', id: group.goalId })">
          <EntityIcon :icon="group.icon" size="xs" /><span>{{ group.title }}</span><AppIcon name="arrow_outward" />
        </button>
        <div v-for="row in group.rows" :key="row.key" class="week-section__row" :data-row-key="row.key">
          <button type="button" class="week-section__row-label neo-focus" @click="emit('openObject', { type: row.subjectType, id: row.subjectId })">
            <EntityIcon :icon="row.icon" size="xs" />
            <span class="week-section__row-text"><span>{{ row.title }}</span><small v-if="rowSubline(row)">{{ rowSubline(row) }}</small></span>
            <AppIcon name="arrow_outward" class="week-section__open" />
          </button>
          <div class="week-section__chart"><MonthSeriesChart :series="row.series" :chart-mode="chartMode" :density="density" :aria-label="row.title" /></div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.week-section__toggle { align-items: center; background: none; border: 0; border-radius: 12px; color: inherit; cursor: pointer; display: flex; font: inherit; justify-content: space-between; padding: 9px 10px; width: 100%; }
.week-section__toggle:hover { background: rgb(var(--neo-inset-dark) / .1); }
.week-section__toggle-left, .week-section__toggle-right { align-items: center; display: flex; gap: 9px; }
.week-section__toggle-left b { font-size: 12px; }
.week-section__toggle-right { color: rgb(var(--neo-muted)); font-size: 11px; }
.week-section__toggle-right small { font-size: 9px; }
.week-section__icon { align-items: center; color: rgb(var(--color-primary-strong)); display: flex; justify-content: center; width: 22px; }
.week-section__chevron--open { transform: rotate(180deg); }
.week-section__content { border-radius: 18px; box-shadow: inset 2px 2px 5px rgb(var(--neo-inset-dark) / .25), inset -2px -2px 5px rgb(var(--neo-inset-light) / .55); overflow: hidden; padding: 7px; }
.week-section__group + .week-section__group { border-top: 1px solid rgb(var(--neo-border) / .35); }
.week-section__group-head { align-items: center; background: none; border: 0; color: rgb(var(--neo-muted)); cursor: pointer; display: flex; font: inherit; font-size: 10px; gap: 6px; padding: 7px 9px; width: 100%; }
.week-section__group-head span:nth-child(2) { flex: 1; text-align: left; }
.week-section__row { align-items: stretch; display: grid; gap: 8px; grid-template-columns: var(--week-v2-label-width) minmax(0, 4fr); min-height: 54px; }
.week-section__row + .week-section__row { border-top: 1px solid rgb(var(--neo-border) / .22); }
.week-section__row-label { align-items: center; background: none; border: 0; border-radius: 10px; color: inherit; cursor: pointer; display: flex; font: inherit; gap: 8px; min-width: 0; padding: 7px; text-align: left; }
.week-section__row-label:hover { background: rgb(var(--neo-inset-dark) / .09); }
.week-section__row-text { display: flex; flex: 1; flex-direction: column; font-size: 11px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.week-section__row-text small { color: rgb(var(--neo-muted)); font-size: 8px; overflow: hidden; text-overflow: ellipsis; }
.week-section__open { color: rgb(var(--neo-muted)); font-size: 12px; }
.week-section__chart { align-items: center; display: flex; min-width: 0; padding: 4px 0; }
.week-section__chart > * { width: 100%; }
.week-section__empty { color: rgb(var(--neo-muted)); font-size: 10px; padding: 14px; text-align: center; }
@media (max-width: 760px) { .week-section__row { grid-template-columns: minmax(150px, .9fr) minmax(430px, 3fr); } .week-section__content { overflow-x: auto; } }
</style>
