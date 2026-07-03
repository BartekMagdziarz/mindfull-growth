<script setup lang="ts">
import { computed, toRef } from 'vue'
import StreamCard from './stream/StreamCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useT } from '@/composables/useT'
import { useWeeklyPlannerState } from '@/composables/useWeeklyPlannerState'
import type { WeekRef } from '@/domain/period'
import type { PlannerMeasurementRow, PlannerWeekDay } from './plannerTypes'

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ updated: [] }>()

const { t, locale } = useT()

// Reuse the classic planner's day-assignment machinery (load + toggle + persist), rendered
// in the Strumień stream's day-card visual language instead of the classic grid.
const weekRefRef = toRef(props, 'weekRef')
const planner = useWeeklyPlannerState(weekRefRef, locale, () => emit('updated'))
const {
  isLoading,
  calendarDays,
  weekdayHeaders,
  assignmentRow,
  keyResultRows,
  habitRows,
  trackerRows,
  toggleAssigning,
  startAssigning,
  isAssignmentActive,
  handleDayToggle,
  rowVisibleOnDay,
  canToggleDay,
  applyWholePeriod,
  handleClearPlacement,
} = planner

const rows = computed<PlannerMeasurementRow[]>(() => [
  ...keyResultRows.value,
  ...habitRows.value,
  ...trackerRows.value,
])

function dayAssigned(day: PlannerWeekDay): boolean {
  const row = assignmentRow.value
  return row ? rowVisibleOnDay(row, day.dayRef, day.inMonth) : false
}

function onDayClick(day: PlannerWeekDay): void {
  if (!canToggleDay(day)) return
  void handleDayToggle(day.dayRef)
}

// applyWholePeriod clears the active selection as part of saving, but this step renders
// day state only from the selection — so without re-selecting, every day card reverts
// and the whole-week placement looks like it did nothing. Re-select after the save reload
// (matches on subjectType/id, which survive it) so all 7 days light up.
async function onWholeWeek(): Promise<void> {
  const row = assignmentRow.value
  if (!row) return
  await applyWholePeriod(row)
  startAssigning(row)
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-on-surface-variant">
      {{ t('planning.weekPlanning.days.intro') }}
    </p>

    <!-- Object picker: choose which object to place across the week. -->
    <div v-if="rows.length > 0" class="flex flex-wrap gap-2">
      <button
        v-for="row in rows"
        :key="`${row.subjectType}:${row.id}`"
        type="button"
        class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all"
        :class="
          isAssignmentActive(row)
            ? 'bg-primary/15 text-primary shadow-neu-pressed-sm'
            : 'text-on-surface shadow-neu-raised-sm bg-gradient-to-br from-neu-top to-neu-bottom'
        "
        @click="toggleAssigning(row)"
      >
        <EntityIcon :icon="row.icon" size="xs" />
        <span class="max-w-[11rem] truncate">{{ row.title }}</span>
      </button>
    </div>
    <p v-else class="text-xs text-on-surface-variant">
      {{ t('planning.weekPlanning.days.empty') }}
    </p>

    <!-- Active-object toolbar: whole-week / clear shortcuts. -->
    <div
      v-if="assignmentRow"
      class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2"
    >
      <span class="min-w-0 truncate text-xs text-on-surface-variant">
        {{ t('planning.weekPlanning.days.assigningHint', { title: assignmentRow.title }) }}
      </span>
      <div class="flex shrink-0 gap-2">
        <AppButton variant="text" @click="handleClearPlacement">
          {{ t('planning.weekPlanning.days.clear') }}
        </AppButton>
        <AppButton variant="tonal" @click="onWholeWeek">
          {{ t('planning.weekPlanning.days.wholeWeek') }}
        </AppButton>
      </div>
    </div>

    <!-- 7 day cards in the stream visual language. -->
    <div v-if="!isLoading" class="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
      <StreamCard v-for="(day, idx) in calendarDays" :key="day.dayRef" tag="div" :delay-ms="idx * 30">
        <button
          type="button"
          class="flex w-full flex-col gap-2.5 text-left disabled:cursor-default"
          :disabled="!canToggleDay(day)"
          :aria-pressed="dayAssigned(day)"
          @click="onDayClick(day)"
        >
          <div class="flex w-full items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
              {{ weekdayHeaders[idx] }}
            </span>
            <span class="text-sm font-bold text-on-surface">{{ day.label }}</span>
          </div>
          <div
            class="flex h-9 w-full items-center justify-center rounded-xl transition-all"
            :class="
              dayAssigned(day)
                ? 'bg-primary/15 text-primary shadow-neu-pressed-sm'
                : 'text-on-surface-variant shadow-neu-raised-sm'
            "
          >
            <AppIcon
              :name="dayAssigned(day) ? 'check' : 'add'"
              class="text-base"
              :class="assignmentRow ? '' : 'opacity-30'"
            />
          </div>
        </button>
      </StreamCard>
    </div>
  </div>
</template>
