<template>
  <section data-testid="monthly-planner" class="space-y-3">
    <PlanningStatePanel
      v-if="planner.isLoading.value"
      compact
      :title="t('common.loading')"
      :body="t('planning.calendar.planner.description')"
      :eyebrow="t('planning.calendar.planner.eyebrow')"
    />

    <PlanningStatePanel
      v-else-if="planner.loadError.value"
      compact
      :title="t('planning.calendar.planner.loadError')"
      :body="planner.loadError.value"
      :eyebrow="t('planning.calendar.planner.eyebrow')"
      :action-label="t('common.buttons.tryAgain')"
      @action="void planner.loadPlannerData()"
    />

    <div v-else class="overflow-x-auto pb-1">
      <AssignmentMatrix
        v-if="hasAnyRows"
        :columns="columns"
        :sections="sections"
        :target-label="t('planning.calendar.planner.matrix.monthTarget')"
        :whole-period-label="t('planning.calendar.planner.wholeMonth')"
        :clear-label="t('planning.calendar.planner.clearPlacement')"
        :expand-label="t('planning.calendar.planner.matrix.expand')"
        @cell-toggle="onCellToggle"
        @whole-period="onWholePeriod"
        @clear-row="onClearRow"
      >
        <template #target="{ row }">
          <PlannerWeekTargetPill
            v-if="findRow(row.key)?.subjectType !== 'tracker' && monthTarget(row.key)"
            :target="monthTarget(row.key)!"
            :has-override="Boolean(findRow(row.key)?.targetOverride)"
            :disabled="!planner.rowHasPlacement(findRow(row.key)!)"
            @change="value => planner.handleTargetValueChange(findRow(row.key)!, value)"
            @clear="planner.handleClearOverride(findRow(row.key)!)"
          />
          <span v-else class="text-xs text-on-surface-variant/50">—</span>
        </template>

        <!-- Target calibration + (for summable monthly rows) week sub-targets. -->
        <template #row-detail="{ row }">
          <div v-if="findRow(row.key)" class="space-y-2.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.calendar.planner.target') }}
              </span>
              <PlannerTargetControls
                :target="monthTarget(row.key)!"
                :has-override="Boolean(findRow(row.key)!.targetOverride)"
                @operator-change="planner.handleTargetOperatorChange(findRow(row.key)!, $event)"
                @aggregation-change="planner.handleTargetAggregationChange(findRow(row.key)!, $event)"
                @value-change="planner.handleTargetValueChange(findRow(row.key)!, $event)"
                @clear-override="planner.handleClearOverride(findRow(row.key)!)"
              />
            </div>

            <div
              v-if="planner.canSplitTarget(findRow(row.key)!) && placedWeeks(row.key).length > 0"
              class="flex flex-wrap items-center gap-x-3 gap-y-2"
              :data-testid="`monthly-planner-split-${row.key}`"
            >
              <span class="text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
                {{ t('planning.calendar.planner.matrix.subTargets') }}
              </span>
              <div
                v-for="weekRef in placedWeeks(row.key)"
                :key="weekRef"
                class="flex items-center gap-1.5"
              >
                <span class="text-[11px] font-semibold text-on-surface-variant">
                  {{ t('planning.calendar.planner.matrix.weekShort', { n: weekRef.slice(6) }) }}
                </span>
                <PlannerWeekTargetPill
                  :target="weekSubTarget(row.key, weekRef)!"
                  :has-override="Boolean(findRow(row.key)!.weekTargetOverrideByRef[weekRef])"
                  @change="value => planner.handleWeekTargetChange(findRow(row.key)!, weekRef, value)"
                  @clear="planner.handleWeekTargetClear(findRow(row.key)!, weekRef)"
                />
              </div>
              <AppButton
                variant="text"
                data-testid="monthly-planner-distribute"
                @click="planner.handleDistributeEvenly(findRow(row.key)!)"
              >
                {{ t('planning.calendar.planner.weekRow.distributeEvenly') }}
              </AppButton>
              <span
                v-if="sumIndicator(row.key)"
                data-testid="monthly-planner-target-sum"
                class="text-[11px] font-medium"
                :class="sumIndicatorClass(row.key)"
              >
                {{ sumIndicator(row.key) }}
              </span>
            </div>
          </div>
        </template>
      </AssignmentMatrix>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('planning.calendar.planner.matrix.empty') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import PlanningStatePanel from '@/components/planning/PlanningStatePanel.vue'
import AppButton from '@/components/AppButton.vue'
import AssignmentMatrix from './AssignmentMatrix.vue'
import PlannerTargetControls from './PlannerTargetControls.vue'
import PlannerWeekTargetPill from './PlannerWeekTargetPill.vue'
import { useT } from '@/composables/useT'
import { usePlannerState } from '@/composables/usePlannerState'
import type { MeasurementTarget } from '@/domain/planning'
import type { MonthRef, WeekRef } from '@/domain/period'
import type { PlannerMeasurementRow } from './plannerTypes'
import type {
  AssignmentMatrixColumn,
  AssignmentMatrixRow,
  AssignmentMatrixSection,
} from './assignmentMatrixTypes'

const props = defineProps<{
  monthRef: MonthRef
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { t, locale } = useT()

const monthRefRef = computed(() => props.monthRef as MonthRef)

const planner = usePlannerState(monthRefRef, locale, () => emit('updated'))

const rowByKey = computed(() => {
  const map = new Map<string, PlannerMeasurementRow>()
  for (const row of planner.allRows.value) {
    map.set(planner.rowKey(row), row)
  }
  return map
})

const columns = computed<AssignmentMatrixColumn[]>(() =>
  planner.weekColumns.value.map(week => ({
    key: week.weekRef,
    label: t('planning.calendar.planner.matrix.weekShort', { n: week.label }),
    sublabel: week.rangeLabel,
    marker: week.isBoundary
      ? t('planning.calendar.planner.matrix.boundaryHint')
      : undefined,
  }))
)

function toMatrixRow(row: PlannerMeasurementRow): AssignmentMatrixRow {
  const cells: AssignmentMatrixRow['cells'] = {}
  for (const week of planner.weekColumns.value) {
    const badge = planner.weekDayBadge(row, week.weekRef)
    cells[week.weekRef] = {
      state: planner.weekCellState(row, week.weekRef),
      badge: badge > 0 ? String(badge) : undefined,
      title: badge > 0 ? t('planning.calendar.planner.weekRow.dayBadgeHint') : undefined,
    }
  }
  return {
    key: planner.rowKey(row),
    title: row.title,
    icon: row.icon,
    subjectType: row.subjectType,
    cells,
    softLabel: planner.rowSoftKind(row)
      ? t('planning.calendar.planner.weekRow.wholeMonthChip')
      : undefined,
    isWholePeriod: planner.isWholePeriodApplied(row),
    hasPlacement: planner.rowHasPlacement(row),
    expandable:
      row.subjectType !== 'tracker' &&
      Boolean(planner.editableTarget(row)) &&
      planner.rowHasPlacement(row),
  }
}

const sections = computed<AssignmentMatrixSection[]>(() => {
  const groups: Array<{ key: string; label: string; rows: PlannerMeasurementRow[] }> = [
    {
      key: 'goals',
      label: t('planning.calendar.planner.steps.goals'),
      rows: planner.keyResultRows.value,
    },
    {
      key: 'habits',
      label: t('planning.calendar.planner.steps.habits'),
      rows: planner.habitRows.value,
    },
    {
      key: 'trackers',
      label: t('planning.calendar.planner.steps.trackers'),
      rows: planner.trackerRows.value,
    },
  ]
  return groups
    .filter(group => group.rows.length > 0)
    .map(group => ({
      key: group.key,
      label: `${group.label} (${group.rows.length})`,
      rows: group.rows.map(toMatrixRow),
    }))
})

const hasAnyRows = computed(() => sections.value.length > 0)

function findRow(rowKey: string): PlannerMeasurementRow | undefined {
  return rowByKey.value.get(rowKey)
}

function monthTarget(rowKey: string): MeasurementTarget | undefined {
  const row = findRow(rowKey)
  return row ? planner.editableTarget(row) : undefined
}

function placedWeeks(rowKey: string): WeekRef[] {
  const row = findRow(rowKey)
  return row ? planner.explicitlyPlacedWeeks(row) : []
}

function weekSubTarget(rowKey: string, weekRef: WeekRef): MeasurementTarget | undefined {
  const row = findRow(rowKey)
  if (!row) return undefined
  return row.weekTargetOverrideByRef[weekRef] ?? planner.editableTarget(row)
}

function sumIndicator(rowKey: string): string {
  const row = findRow(rowKey)
  const summary = row ? planner.rowWeekTargetSummary(row) : null
  if (!summary) return ''
  const { assigned, total } = summary
  if (assigned === total) {
    return t('planning.calendar.planner.weekRow.sumOk', { assigned, total })
  }
  if (assigned < total) {
    return t('planning.calendar.planner.weekRow.sumUnder', {
      assigned,
      total,
      rest: Math.round((total - assigned) * 100) / 100,
    })
  }
  return t('planning.calendar.planner.weekRow.sumOver', {
    assigned,
    total,
    over: Math.round((assigned - total) * 100) / 100,
  })
}

function sumIndicatorClass(rowKey: string): string {
  const row = findRow(rowKey)
  const summary = row ? planner.rowWeekTargetSummary(row) : null
  if (!summary) return ''
  return summary.assigned === summary.total ? 'text-primary-strong' : 'text-on-surface-variant'
}

function onCellToggle(rowKey: string, columnKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleMatrixCellToggle(row, columnKey as WeekRef)
}

function onWholePeriod(rowKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleWholeMonthToggle(row)
}

function onClearRow(rowKey: string): void {
  const row = findRow(rowKey)
  if (!row) return
  void planner.handleRowClear(row)
}
</script>
