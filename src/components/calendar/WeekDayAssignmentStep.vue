<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import AssignmentMatrix from './AssignmentMatrix.vue'
import PlannerWeekTargetPill from './PlannerWeekTargetPill.vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { useT } from '@/composables/useT'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import type { DayRef, WeekRef } from '@/domain/period'
import type { PlannerMeasurementRow } from './plannerTypes'
import type {
  AssignmentMatrixColumn,
  AssignmentMatrixRow,
  AssignmentMatrixSection,
} from './assignmentMatrixTypes'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ updated: [] }>()

const { t } = useT()
const { locale } = useT()

const weekRefRef = toRef(props, 'weekRef')
const planner = useWeeklyPlannerState(weekRefRef, locale, () => emit('updated'))
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

watch(planner.mutationError, (message) => {
  if (message) snackbarRef.value?.show(t('planning.calendar.weekV2.planning.saveError'))
})

const rowByKey = computed(() => {
  const map = new Map<string, PlannerMeasurementRow>()
  for (const row of planner.allRows.value) {
    map.set(planner.rowKey(row), row)
  }
  return map
})

const columns = computed<AssignmentMatrixColumn[]>(() =>
  planner.calendarDays.value.map((day, idx) => ({
    key: day.dayRef,
    label: planner.weekdayHeaders.value[idx]?.replace('.', '') ?? '',
    sublabel: day.inMonth
      ? String(Number(day.label))
      : `${Number(day.label)} ${day.monthLabel.toLowerCase()}`,
  }))
)

function toMatrixRow(row: PlannerMeasurementRow): AssignmentMatrixRow {
  const softKind = planner.rowSoftKind(row)
  return {
    key: planner.rowKey(row),
    title: row.title,
    icon: row.icon,
    subjectType: row.subjectType,
    cells: Object.fromEntries(
      planner.calendarDays.value.map(day => [
        day.dayRef,
        { state: planner.dayCellState(row, day.dayRef) },
      ])
    ),
    softLabel:
      softKind === 'whole-week'
        ? t('planning.weekPlanning.days.wholeWeekPill')
        : softKind === 'whole-month'
          ? t('planning.weekPlanning.days.wholeMonthPill')
          : undefined,
    isWholePeriod: softKind === 'whole-week',
    hasPlacement: planner.rowHasWeekPlacement(row),
  }
}

const sections = computed<AssignmentMatrixSection[]>(() => {
  const result: AssignmentMatrixSection[] = []
  const groups: Array<{ key: string; label: string; rows: PlannerMeasurementRow[] }> = [
    {
      key: 'goals',
      label: t('planning.calendar.planner.steps.goals'),
      rows: planner.engagedKeyResultRows.value,
    },
    {
      key: 'habits',
      label: t('planning.calendar.planner.steps.habits'),
      rows: planner.engagedHabitRows.value,
    },
    {
      key: 'trackers',
      label: t('planning.calendar.planner.steps.trackers'),
      rows: planner.engagedTrackerRows.value,
    },
  ]
  for (const group of groups) {
    if (group.rows.length === 0) continue
    result.push({
      key: group.key,
      label: `${group.label} (${group.rows.length})`,
      rows: group.rows.map(toMatrixRow),
    })
  }
  if (planner.dormantRows.value.length > 0) {
    result.push({
      key: 'rest',
      label: t('planning.weekPlanning.days.restSection', {
        n: planner.dormantRows.value.length,
      }),
      rows: planner.dormantRows.value.map(toMatrixRow),
      collapsible: true,
    })
  }
  return result
})

const hasAnyRows = computed(() => sections.value.length > 0)

function findRow(rowKey: string): PlannerMeasurementRow | undefined {
  return rowByKey.value.get(rowKey)
}

function onCellToggle(rowKey: string, columnKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleMatrixCellToggle(row, columnKey as DayRef)
}

function onWholePeriod(rowKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleWholeWeekToggle(row)
}

function onClearRow(rowKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleRowClear(row)
}

function pillTarget(rowKey: string) {
  const row = findRow(rowKey)
  return row ? planner.editableTarget(row) : undefined
}
</script>

<template>
  <div class="space-y-4" data-testid="week-day-assignment-step">
    <p class="text-sm text-on-surface-variant">
      {{ t('planning.weekPlanning.days.intro') }}
    </p>

    <PlanningStatePanel
      v-if="planner.isLoading.value"
      compact
      :title="t('common.loading')"
      :body="t('planning.weekPlanning.days.intro')"
      :eyebrow="t('planning.calendar.weekV2.planning.open')"
    />
    <PlanningStatePanel
      v-else-if="planner.loadError.value"
      compact
      :title="t('planning.calendar.planner.loadError')"
      :body="planner.loadError.value"
      :eyebrow="t('planning.calendar.weekV2.planning.open')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void planner.loadPlannerData()"
    />
    <div v-else class="overflow-x-auto pb-1" :aria-busy="planner.savingKey.value !== ''">
      <AssignmentMatrix
        v-if="hasAnyRows"
        :columns="columns"
        :sections="sections"
        :target-label="t('planning.weekPlanning.days.weekTarget')"
        :whole-period-label="t('planning.weekPlanning.days.wholeWeek')"
        :clear-label="t('planning.weekPlanning.days.clear')"
        @cell-toggle="onCellToggle"
        @whole-period="onWholePeriod"
        @clear-row="onClearRow"
      >
        <template #target="{ row }">
          <PlannerWeekTargetPill
            v-if="findRow(row.key)?.subjectType !== 'tracker' && pillTarget(row.key)"
            :target="pillTarget(row.key)!"
            :has-override="planner.hasWeekOverride(findRow(row.key)!)"
            :disabled="!planner.weekTargetEditable(findRow(row.key)!)"
            @change="value => planner.handleTargetValueChange(findRow(row.key)!, value)"
            @entry-days-change="days => planner.handleEntryDaysValueChange(findRow(row.key)!, days)"
            @clear="planner.handleClearOverride(findRow(row.key)!)"
          />
          <span v-else class="text-xs text-on-surface-variant/50">—</span>
        </template>
      </AssignmentMatrix>
      <p v-else class="text-xs text-on-surface-variant">
        {{ t('planning.weekPlanning.days.empty') }}
      </p>
    </div>
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>
