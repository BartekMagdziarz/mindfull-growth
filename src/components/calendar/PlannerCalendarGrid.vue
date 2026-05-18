<template>
  <div class="space-y-3" data-testid="monthly-planner-grid">
    <div>
      <!-- Assignment toolbar -->
      <div
        v-if="assignmentRow"
        class="flex flex-wrap items-center justify-between gap-3 rounded-[1.15rem] border border-primary/20 bg-primary/6 px-3 py-2.5"
      >
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="neo-icon-button h-9 w-9 rounded-xl text-primary">
            <AppIcon name="event_available" class="text-base" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-on-surface">
              {{ assignmentRow.title }}
            </p>
            <p class="truncate text-[11px] text-on-surface-variant">
              {{ t('planning.calendar.planner.assigningHint') }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="text" @click="$emit('clearPlacement')">
            {{ t('planning.calendar.planner.clearPlacement') }}
          </AppButton>
          <AppButton variant="tonal" @click="$emit('finishAssigning')">
            {{ t('common.buttons.done') }}
          </AppButton>
        </div>
      </div>

      <!-- Calendar grid -->
      <div class="overflow-x-auto" :class="assignmentRow ? 'mt-3' : ''">
        <div class="min-w-[640px] space-y-2 pb-2 pr-2">
          <!-- Weekday headers -->
          <div class="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1.5">
            <div class="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant">
              {{ t('planning.calendar.scales.weekShort') }}
            </div>
            <div
              v-for="header in weekdayHeaders"
              :key="header"
              class="px-1 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
            >
              {{ header }}
            </div>
          </div>

          <!-- Week rows -->
          <div
            v-for="week in calendarWeeks"
            :key="week.weekRef"
            class="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] gap-1.5"
          >
            <!-- Week button -->
            <button
              type="button"
              :data-testid="`monthly-planner-week-${week.weekRef}`"
              class="flex items-center justify-center rounded-xl py-2.5 text-sm font-semibold transition-all duration-200"
              :class="weekButtonClass(week)"
              :disabled="!canToggleWeek"
              @click="$emit('weekToggle', week.weekRef)"
            >
              {{ week.label }}
            </button>

            <!-- Day cells -->
            <button
              v-for="day in week.days"
              :key="day.dayRef"
              type="button"
              :data-testid="`monthly-planner-day-${day.dayRef}`"
              class="flex flex-col rounded-2xl px-1.5 py-1.5 text-left transition-all duration-200"
              :style="dayCellStyle"
              :class="dayCellClass(day)"
              :disabled="Boolean(assignmentRow) && !canToggleDay(day)"
              @click="assignmentRow ? $emit('dayToggle', day.dayRef) : $emit('dayOpen', day.dayRef)"
            >
              <div class="flex shrink-0 items-center justify-between gap-1">
                <span class="text-xs font-semibold" :class="day.inMonth ? 'text-on-surface' : 'text-on-surface-variant'">
                  {{ day.label }}
                </span>
                <span
                  v-if="!day.inMonth"
                  class="rounded-full border border-outline/25 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
                >
                  {{ day.monthLabel }}
                </span>
              </div>

              <!-- Items — auto-sized icons -->
              <DayCellIcons :items="collapsedItems(day.items)" density="compact" />
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
import type { DayRef, WeekRef } from '@/domain/period'
import { getPeriodRefsForDate } from '@/utils/periods'
import type {
  CalendarAssignmentItem,
  CollapsedIconItem,
  PlannerMeasurementRow,
  PlannerWeek,
  PlannerWeekDay,
  SubjectKind,
} from './plannerTypes'

const props = defineProps<{
  calendarWeeks: PlannerWeek[]
  assignmentRow: PlannerMeasurementRow | undefined
  weekdayHeaders: string[]
  rowVisibleOnDay: (row: PlannerMeasurementRow, dayRef: DayRef, inMonth: boolean) => boolean
  canToggleWeek: boolean
  canToggleDay: (day: { inMonth: boolean }) => boolean
}>()

defineEmits<{
  weekToggle: [weekRef: WeekRef]
  dayToggle: [dayRef: DayRef]
  dayOpen: [dayRef: DayRef]
  clearPlacement: []
  finishAssigning: []
}>()

const { t } = useT()
const todayRef = getPeriodRefsForDate(new Date()).day
const dayCellStyle = {
  minHeight: '104px',
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
  // Sort by type order, then collapse same-icon items
  const order: SubjectKind[] = ['keyResult', 'habit', 'tracker']
  const sorted = [...items].sort((a, b) => order.indexOf(a.subjectType) - order.indexOf(b.subjectType))
  return collapseByIcon(sorted)
}

function weekButtonClass(week: PlannerWeek): string {
  const row = props.assignmentRow
  if (!row) return 'neo-inset text-on-surface-variant opacity-55'

  const scope = row.weekScopeByRef[week.weekRef]
  if (scope === 'whole-week') return 'bg-primary text-on-primary shadow-neu-raised-sm'
  if (scope === 'specific-days') return 'neo-inset border border-primary/30 text-on-surface'
  return 'neo-inset text-on-surface hover:bg-primary/8'
}

function dayCellClass(day: PlannerWeekDay): string {
  const row = props.assignmentRow
  const isAssigned = row ? props.rowVisibleOnDay(row, day.dayRef, day.inMonth) : false
  const isAssigning = Boolean(row)
  const isPast = day.dayRef < todayRef

  if (!day.inMonth) {
    return isAssigned
      ? 'shadow-neu-raised-sm bg-primary/10 opacity-95'
      : isAssigning
        ? 'shadow-neu-raised-sm hover:shadow-neu-raised opacity-80'
        : 'shadow-neu-pressed-sm opacity-60'
  }

  if (isAssigned) return 'shadow-neu-raised-sm bg-primary/7'
  if (isAssigning) return 'shadow-neu-raised-sm hover:shadow-neu-raised'
  return isPast ? 'shadow-neu-pressed-sm opacity-60' : 'shadow-neu-raised-sm'
}

</script>
