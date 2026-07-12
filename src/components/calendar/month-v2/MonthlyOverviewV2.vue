<template>
  <section class="month-v2" :aria-label="t('planning.calendar.monthV2.overview')">
    <div class="month-v2__bar">
      <p class="month-v2__eyebrow">{{ t('planning.calendar.monthV2.experimentBadge') }}</p>
      <div class="month-v2__actions">
        <AppButton :variant="planningOpen ? 'tonal' : 'filled'" @click="togglePlanning">
          <AppIcon name="calendar_month" class="text-base" />
          {{
            planningOpen
              ? t('planning.calendar.monthV2.planning.close')
              : t('planning.calendar.monthV2.planning.open')
          }}
        </AppButton>
        <AppButton variant="tonal" :disabled="planningOpen" @click="emit('openReflection')">
          <AppIcon name="auto_awesome" class="text-base" />
          {{ reflectionLabel }}
        </AppButton>
      </div>
    </div>

    <PlanningStatePanel
      v-if="isLoading"
      :title="t('common.loading')"
      :body="t('planning.calendar.title')"
      :eyebrow="t('planning.calendar.monthV2.experimentBadge')"
      compact
    />

    <PlanningStatePanel
      v-else-if="loadError"
      :title="t('planning.calendar.loadError')"
      :body="loadError"
      :eyebrow="t('planning.calendar.monthV2.experimentBadge')"
      :action-label="t('common.buttons.tryAgain')"
      compact
      @action="void reload()"
    />

    <template v-else-if="viewModel">
      <!-- Planning mode: the current MonthlyPlanner (AssignmentMatrix on week
           columns) replaces the week axis; the rail stays for context. -->
      <div class="month-v2__layout">
        <MonthSummaryRail :rail="viewModel.rail" />
        <MonthlyPlanner
          v-if="planningOpen"
          :month-ref="monthRef"
          @updated="handlePlannerUpdated"
        />
        <MonthWeekGrid
          v-else
          :weeks="viewModel.weeks"
          :sections="viewModel.sections"
          :chart-mode="chartMode"
          :density="density"
          @open-week="emit('openWeek', $event)"
          @open-object="emit('openObject', $event)"
        />
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { MonthV2OverviewViewModel } from '@/services/monthV2Overview'
import {
  buildMonthV2OverviewViewModel,
  loadMonthV2OverviewData,
} from '@/services/monthV2Overview'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import MonthlyPlanner from '@/components/calendar/MonthlyPlanner.vue'
import { useT } from '@/composables/useT'
import MonthSummaryRail from './MonthSummaryRail.vue'
import MonthWeekGrid from './MonthWeekGrid.vue'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

const props = withDefaults(
  defineProps<{
    monthRef: MonthRef
    chartMode?: MonthChartMode
    density?: MonthDensity
  }>(),
  { chartMode: 'hybrid', density: 'comfortable' }
)

const emit = defineEmits<{
  openWeek: [weekRef: WeekRef]
  openObject: [payload: { type: string; id: string; homeWeekRef?: WeekRef }]
  openReflection: []
  updated: []
}>()

const { t } = useT()

const isLoading = ref(true)
const loadError = ref<string | null>(null)
const viewModel = ref<MonthV2OverviewViewModel | null>(null)
const hasReflection = ref(false)
const planningOpen = ref(false)
const planningDirty = ref(false)

const reflectionLabel = computed(() =>
  hasReflection.value
    ? t('planning.calendar.actions.editReflection')
    : t('planning.calendar.actions.createReflection')
)

async function reload(): Promise<void> {
  isLoading.value = true
  loadError.value = null
  try {
    const data = await loadMonthV2OverviewData(props.monthRef)
    viewModel.value = buildMonthV2OverviewViewModel(data)
    hasReflection.value = data.monthlyReflection !== null
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoading.value = false
  }
}

watch(
  () => props.monthRef,
  () => {
    planningOpen.value = false
    planningDirty.value = false
    void reload()
  },
  { immediate: true }
)

function handlePlannerUpdated(): void {
  planningDirty.value = true
  emit('updated')
}

function togglePlanning(): void {
  if (planningOpen.value) {
    planningOpen.value = false
    // Closing the planner refreshes the full overview model so every series,
    // placement badge and coverage count reflects the saved plan.
    if (planningDirty.value) {
      planningDirty.value = false
      void reload()
    }
    return
  }
  planningOpen.value = true
}
</script>

<style scoped>
.month-v2 {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.month-v2__bar {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.month-v2__eyebrow {
  color: rgb(var(--neo-muted));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-v2__actions {
  display: flex;
  gap: 8px;
}

.month-v2__layout {
  align-items: start;
  display: grid;
  gap: clamp(18px, 2vw, 28px);
  grid-template-columns: minmax(292px, 35%) minmax(0, 1fr);
}

@media (max-width: 1040px) {
  .month-v2__layout {
    grid-template-columns: 1fr;
  }
}
</style>
