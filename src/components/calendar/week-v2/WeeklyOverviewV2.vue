<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { WeekV2OverviewViewModel } from '@/services/weekV2Overview'
import { buildWeekV2OverviewViewModel, loadWeekV2OverviewData } from '@/services/weekV2Overview'
import type { MonthChartMode, MonthDensity } from '@/components/calendar/month-v2/monthV2Types'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import WeekDayAssignmentStep from '@/components/calendar/WeekDayAssignmentStep.vue'
import MonthExperimentPanel from '@/components/calendar/month-v2/MonthExperimentPanel.vue'
import { useT } from '@/composables/useT'
import WeekSummaryRail from './WeekSummaryRail.vue'
import WeekDayGrid from './WeekDayGrid.vue'

const props = withDefaults(defineProps<{ weekRef: WeekRef; chartMode?: MonthChartMode; density?: MonthDensity }>(), { chartMode: 'hybrid', density: 'comfortable' })
const emit = defineEmits<{
  openObject: [payload: { type: string; id: string }]
  openReflection: []
  openMonth: [monthRef: MonthRef]
  experimentChange: [config: { chartMode: MonthChartMode; density: MonthDensity }]
  updated: []
}>()
const { t } = useT()
const isLoading = ref(true)
const loadError = ref<string | null>(null)
const viewModel = ref<WeekV2OverviewViewModel | null>(null)
const planningOpen = ref(false)
const planningDirty = ref(false)
const hasReflection = computed(() => Boolean(viewModel.value?.rail.matrix))
const reflectionLabel = computed(() => hasReflection.value ? t('planning.calendar.actions.editReflection') : t('planning.calendar.actions.createReflection'))

async function reload() {
  isLoading.value = true
  loadError.value = null
  try { viewModel.value = buildWeekV2OverviewViewModel(await loadWeekV2OverviewData(props.weekRef)) }
  catch (error) { loadError.value = error instanceof Error ? error.message : String(error) }
  finally { isLoading.value = false }
}

watch(() => props.weekRef, () => { planningOpen.value = false; planningDirty.value = false; void reload() }, { immediate: true })

function togglePlanning() {
  if (planningOpen.value && planningDirty.value) { planningDirty.value = false; void reload() }
  planningOpen.value = !planningOpen.value
}

function plannerUpdated() { planningDirty.value = true; emit('updated') }
</script>

<template>
  <section class="week-v2" :aria-label="t('planning.calendar.weekV2.overview')">
    <div class="week-v2__bar">
      <div class="week-v2__bar-left">
        <button v-if="viewModel" type="button" class="week-v2__eyebrow neo-focus" @click="emit('openMonth', viewModel.parentMonthRef)">
          <AppIcon name="arrow_upward" />{{ t('planning.calendar.weekV2.experimentBadge') }}
        </button>
        <MonthExperimentPanel :chart-mode="chartMode" :density="density" @change="emit('experimentChange', $event)" />
      </div>
      <div class="week-v2__actions">
        <AppButton :variant="planningOpen ? 'tonal' : 'filled'" @click="togglePlanning"><AppIcon name="calendar_month" />{{ planningOpen ? t('planning.calendar.weekV2.planning.close') : t('planning.calendar.weekV2.planning.open') }}</AppButton>
        <AppButton variant="tonal" :disabled="planningOpen" @click="emit('openReflection')"><AppIcon name="auto_awesome" />{{ reflectionLabel }}</AppButton>
      </div>
    </div>
    <PlanningStatePanel v-if="isLoading" :title="t('common.loading')" :body="t('planning.calendar.title')" :eyebrow="t('planning.calendar.weekV2.experimentBadge')" compact />
    <PlanningStatePanel v-else-if="loadError" :title="t('planning.calendar.loadError')" :body="loadError" :eyebrow="t('planning.calendar.weekV2.experimentBadge')" :action-label="t('common.buttons.tryAgain')" compact @action="void reload()" />
    <div v-else-if="viewModel" class="week-v2__layout">
      <WeekSummaryRail :rail="viewModel.rail" @open-reflection="emit('openReflection')" @open-object="emit('openObject', $event)" />
      <div class="week-v2__workspace">
        <WeekDayAssignmentStep v-if="planningOpen" :week-ref="weekRef" @updated="plannerUpdated" />
        <WeekDayGrid v-else :days="viewModel.days" :sections="viewModel.sections" :chart-mode="chartMode" :density="density" @open-object="emit('openObject', $event)" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.week-v2 { display: flex; flex-direction: column; gap: 14px; }
.week-v2__bar { align-items: center; display: flex; gap: 12px; justify-content: space-between; }
.week-v2__bar-left, .week-v2__actions { align-items: center; display: flex; flex-wrap: wrap; gap: 10px; }
.week-v2__eyebrow { align-items: center; background: none; border: 0; border-radius: 9px; color: rgb(var(--neo-muted)); cursor: pointer; display: flex; font: inherit; font-size: 10px; font-weight: 700; gap: 5px; letter-spacing: .12em; padding: 5px; text-transform: uppercase; }
.week-v2__eyebrow:hover { color: rgb(var(--color-primary-strong)); }
.week-v2__layout { align-items: start; display: grid; gap: 17px; grid-template-columns: minmax(292px, 35%) minmax(0, 1fr); }
.week-v2__workspace { min-width: 0; }
@media (max-width: 980px) { .week-v2__layout { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .week-v2__bar { align-items: flex-start; flex-direction: column; } }
</style>
