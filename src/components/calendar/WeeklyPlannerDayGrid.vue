<template>
  <div class="space-y-3" data-testid="weekly-planner-grid">
    <div>
      <!-- Assignment toolbar -->
      <div
        v-if="assignmentRow"
        class="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-primary/20 bg-primary/6 px-3 py-2.5"
      >
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="neo-icon-button h-9 w-9 rounded-xl text-primary">
            <AppIcon :name="assignmentMode === 'days' ? 'today' : 'calendar_view_week'" class="text-base" />
          </span>
          <p class="min-w-0 truncate text-sm font-semibold text-on-surface">
            {{ assignmentRow.title }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="text" @click="$emit('clearPlacement')">
            {{ t('planning.calendar.planner.weekly.clearPlacement') }}
          </AppButton>
          <AppButton variant="tonal" @click="$emit('finishAssigning')">
            {{ t('common.buttons.done') }}
          </AppButton>
        </div>
      </div>

      <!-- Day grid -->
      <div class="overflow-x-auto" :class="assignmentRow ? 'mt-3' : ''">
        <div class="min-w-[640px] pb-2 pr-2">
          <!-- Weekday headers -->
          <div class="mb-2 grid grid-cols-7 gap-1.5">
            <div
              v-for="header in weekdayHeaders"
              :key="header"
              class="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
            >
              {{ header }}
            </div>
          </div>

          <!-- Day cells -->
          <div class="grid grid-cols-7 gap-1.5">
            <button
              v-for="day in calendarDays"
              :key="day.dayRef"
              type="button"
              :data-testid="`weekly-planner-day-${day.dayRef}`"
              class="flex flex-col rounded-2xl px-1.5 py-1.5 text-left transition-all duration-200"
              :style="dayCellStyle"
              :class="dayCellClass(day)"
              :disabled="!canToggleDay(day)"
              @click="$emit('dayToggle', day.dayRef)"
            >
              <div class="flex shrink-0 items-center justify-between gap-1">
                <span class="text-xs font-semibold text-on-surface">
                  {{ day.label }}
                </span>
                <span
                  class="rounded-full border border-outline/25 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
                >
                  {{ day.monthLabel }}
                </span>
              </div>

              <!-- Items — auto-sized icons -->
              <DayCellIcons :items="collapsedItems(day.items)" density="comfortable" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import DayCellIcons from './DayCellIcons.vue'
import { useT } from '@/composables/useT'
import type { DayRef } from '@/domain/period'
import type {
  CalendarAssignmentItem,
  CollapsedIconItem,
  PlannerPlacementMode,
  PlannerMeasurementRow,
  PlannerWeekDay,
  SubjectKind,
} from './plannerTypes'

const props = defineProps<{
  calendarDays: PlannerWeekDay[]
  assignmentRow: PlannerMeasurementRow | undefined
  assignmentMode: PlannerPlacementMode | null
  weekdayHeaders: string[]
  rowVisibleOnDay: (row: PlannerMeasurementRow, dayRef: DayRef, inMonth: boolean) => boolean
  canToggleDay: (day: { inMonth: boolean }) => boolean
}>()

defineEmits<{
  dayToggle: [dayRef: DayRef]
  clearPlacement: []
  finishAssigning: []
}>()

const { t } = useT()
const dayCellStyle = {
  minHeight: '176px',
}

function collapseByIcon(items: CalendarAssignmentItem[]): CollapsedIconItem[] {
  const result: CollapsedIconItem[] = []
  const seen = new Map<string, CollapsedIconItem>()

  for (const item of items) {
    const collapseKey = item.icon && item.groupKey ? `${item.icon}::${item.groupKey}` : undefined
    if (collapseKey) {
      const existing = seen.get(collapseKey)
      if (existing) {
        existing.count++
        existing.title += `, ${item.title}`
        if (item.isActiveAssignment) existing.isActiveAssignment = true
        continue
      }
    }
    const collapsed: CollapsedIconItem = { ...item, count: 1 }
    result.push(collapsed)
    if (collapseKey) seen.set(collapseKey, collapsed)
  }
  return result
}

function collapsedItems(items: CalendarAssignmentItem[]): CollapsedIconItem[] {
  const order: SubjectKind[] = ['keyResult', 'habit', 'tracker']
  const sorted = [...items].sort((a, b) => order.indexOf(a.subjectType) - order.indexOf(b.subjectType))
  return collapseByIcon(sorted)
}

function dayCellClass(day: PlannerWeekDay): string {
  const row = props.assignmentRow
  const isAssigned = row ? props.rowVisibleOnDay(row, day.dayRef, day.inMonth) : false
  const dayEditing = props.assignmentMode === 'days'

  if (isAssigned) return 'shadow-neu-raised-sm bg-primary/7'
  return row && dayEditing ? 'shadow-neu-raised-sm hover:shadow-neu-raised' : 'shadow-neu-pressed-sm opacity-60'
}

</script>
