<template>
  <!-- Phase A „Co zachować”: open subjects × break weeks. A checked cell keeps
       the week in the plan (phase B edits it); an empty one makes the week
       disappear. The corner dot marks a week the subject was placed in, so
       what disappears is visible before it does. -->
  <div
    class="rr-matrix"
    :class="{ 'rr-matrix--narrow': inventory.columns.length <= 2 }"
    data-testid="return-keep-matrix"
  >
    <AssignmentMatrix
      :columns="columns"
      :sections="sections"
      target-label=""
      whole-period-label="Zachowaj wszystkie tygodnie"
      clear-label="Nic nie zachowuj"
      @cell-toggle="(rowKey, columnKey) => emit('toggle', `${rowKey}:${columnKey}`)"
      @whole-period="rowKey => emit('rowKeep', rowKey, true)"
      @clear-row="rowKey => emit('rowKeep', rowKey, false)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AssignmentMatrix from '@/components/calendar/AssignmentMatrix.vue'
import type {
  AssignmentMatrixColumn,
  AssignmentMatrixRow,
  AssignmentMatrixSection,
} from '@/components/calendar/assignmentMatrixTypes'
import type { WeekRef } from '@/domain/period'
import {
  subjectKey,
  weekDraftKey,
  type ReturnInventory,
  type ReturnPlan,
  type ReturnSubjectType,
} from '@/domain/returnRitual'
import { subjectIcon, weekRangeShort } from './useReturnRitual'

const props = defineProps<{
  inventory: ReturnInventory
  plan: ReturnPlan
}>()

const emit = defineEmits<{
  toggle: [key: string]
  rowKeep: [subjectKey: string, keep: boolean]
}>()

const SECTION_LABEL: Record<ReturnSubjectType, string> = {
  habit: 'Nawyki',
  keyResult: 'Rezultaty',
  tracker: 'Trackery',
}
const SECTION_ORDER: ReturnSubjectType[] = ['habit', 'keyResult', 'tracker']

function weekNumber(weekRef: WeekRef): string {
  return weekRef.split('-W')[1] ?? weekRef
}

const columns = computed<AssignmentMatrixColumn[]>(() =>
  props.inventory.columns.map(weekRef => ({
    key: weekRef,
    label: `T${weekNumber(weekRef)}`,
    sublabel: weekRangeShort(weekRef),
    marker: weekRef === props.inventory.currentWeekRef ? 'Ten tydzień, do dziś' : undefined,
  }))
)

const placedByKey = computed(() => {
  const map = new Map<string, boolean>()
  for (const placement of props.inventory.weekPlacements) {
    map.set(weekDraftKey(placement), placement.placed)
  }
  return map
})

const keepByKey = computed(() => {
  const map = new Map<string, boolean>()
  for (const week of props.plan.weeks) map.set(weekDraftKey(week), week.keep)
  return map
})

const sections = computed<AssignmentMatrixSection[]>(() =>
  SECTION_ORDER.map(type => ({
    key: type,
    label: SECTION_LABEL[type],
    rows: props.inventory.subjects
      .filter(subject => subject.subjectType === type)
      .map<AssignmentMatrixRow>(subject => {
        const rowKey = subjectKey({ subjectType: type, subjectId: subject.subject.id })
        const cells: AssignmentMatrixRow['cells'] = {}
        let kept = 0
        for (const weekRef of props.inventory.columns) {
          const key = `${rowKey}:${weekRef}`
          const keep = keepByKey.value.get(key) ?? false
          const placed = placedByKey.value.get(key) ?? false
          if (keep) kept += 1
          cells[weekRef] = {
            state: keep ? 'checked' : 'empty',
            badge: placed && !keep ? '•' : undefined,
            title: keep
              ? 'Zostaje w planie — uzupełnisz niżej'
              : placed
                ? 'Był w planie — zniknie'
                : 'Nie był w planie',
          }
        }
        return {
          key: rowKey,
          title: subject.subject.title,
          icon: subjectIcon(subject),
          subjectType: type,
          cells,
          hasPlacement: kept > 0,
          isWholePeriod: kept === props.inventory.columns.length && kept > 0,
          softLabel: subject.aliveBeforeBreak ? undefined : 'cicho przed przerwą',
        }
      }),
  }))
)
</script>
