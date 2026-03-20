<template>
  <div class="space-y-3" data-testid="monthly-planner-grid">
    <div>
      <!-- Assignment toolbar -->
      <div
        v-if="assignmentRow"
        class="flex flex-col gap-3 rounded-[1.15rem] border border-primary/20 bg-primary/6 px-3 py-3 lg:flex-row lg:items-center lg:justify-between"
      >
        <div class="min-w-0">
          <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-on-surface-variant">
            {{ t('planning.calendar.planner.assignmentMode') }}
          </p>
          <p class="mt-1 text-sm font-semibold text-on-surface">
            {{ assignmentRow.title }}
          </p>
          <p class="mt-1 text-xs text-on-surface-variant">
            {{
              assignmentRow.cadence === 'monthly'
                ? t('planning.calendar.scales.month')
                : t('planning.calendar.scales.week')
            }}
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton variant="tonal" @click="$emit('wholeMonth')">
            {{ t('planning.calendar.planner.wholeMonth') }}
          </AppButton>
          <AppButton variant="text" @click="$emit('clearPlacement')">
            {{ t('planning.calendar.planner.clearPlacement') }}
          </AppButton>
          <AppButton variant="outlined" @click="$emit('finishAssigning')">
            {{ t('planning.calendar.planner.finishAssigning') }}
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
              :disabled="!assignmentRow"
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
              :disabled="!canToggleDay(day)"
              @click="$emit('dayToggle', day.dayRef)"
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
import DayCellIcons from './DayCellIcons.vue'
import { useT } from '@/composables/useT'
import type { DayRef, WeekRef } from '@/domain/period'
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
  canToggleDay: (day: { inMonth: boolean }) => boolean
}>()

defineEmits<{
  weekToggle: [weekRef: WeekRef]
  dayToggle: [dayRef: DayRef]
  wholeMonth: []
  clearPlacement: []
  finishAssigning: []
}>()

const { t } = useT()
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
  return 'neo-inset text-on-surface-variant'
}

function dayCellClass(day: PlannerWeekDay): string {
  const row = props.assignmentRow
  const isAssigned = row ? props.rowVisibleOnDay(row, day.dayRef, day.inMonth) : false

  if (!day.inMonth) {
    return isAssigned
      ? 'shadow-neu-raised-sm bg-primary/10 opacity-95'
      : 'shadow-neu-pressed-sm opacity-60'
  }

  if (isAssigned) return 'shadow-neu-raised-sm bg-primary/7'
  return row ? 'shadow-neu-raised-sm hover:shadow-neu-raised' : 'shadow-neu-raised-sm'
}

</script>
