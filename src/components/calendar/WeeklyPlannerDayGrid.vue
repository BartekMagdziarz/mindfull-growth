<template>
  <div class="space-y-3">
    <div class="neo-inset rounded-[1.35rem] px-3 py-3">
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
          <AppButton variant="tonal" @click="$emit('wholeWeek')">
            {{ t('planning.calendar.planner.weekly.wholeWeek') }}
          </AppButton>
          <AppButton variant="text" @click="$emit('clearPlacement')">
            {{ t('planning.calendar.planner.weekly.clearPlacement') }}
          </AppButton>
          <AppButton variant="outlined" @click="$emit('finishAssigning')">
            {{ t('planning.calendar.planner.finishAssigning') }}
          </AppButton>
        </div>
      </div>

      <!-- Day grid -->
      <div class="overflow-x-auto" :class="assignmentRow ? 'mt-3' : ''">
        <div class="min-w-[640px]">
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
              class="rounded-[1.15rem] border border-outline/8 px-1.5 py-1.5 text-left transition-all duration-200"
              :class="dayCellClass(day)"
              :disabled="!canToggleDay(day)"
              @click="$emit('dayToggle', day.dayRef)"
            >
              <div class="flex items-center justify-between gap-1">
                <span class="text-xs font-semibold text-on-surface">
                  {{ day.label }}
                </span>
                <span
                  class="rounded-full border border-outline/25 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
                >
                  {{ day.monthLabel }}
                </span>
              </div>

              <!-- Items grouped by type, color-coded -->
              <div class="mt-1.5 flex h-28 flex-col gap-0.5 overflow-y-auto pr-0.5">
                <div
                  v-for="group in groupedItems(day.items)"
                  :key="group.type"
                  class="flex flex-wrap gap-0.5"
                >
                  <div
                    v-for="item in group.items"
                    :key="item.key"
                    :title="item.title"
                    class="transition-all duration-200"
                    :class="dayItemClass(item)"
                    :style="dayItemStyle(item)"
                  >
                    <EntityIcon v-if="item.icon" :icon="item.icon" size="xs" :circle="false" />
                    <template v-else>{{ item.title }}</template>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import AppButton from '@/components/AppButton.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useT } from '@/composables/useT'
import type { DayRef } from '@/domain/period'
import type {
  CalendarAssignmentItem,
  PlannerMeasurementRow,
  PlannerWeekDay,
  SubjectKind,
} from './plannerTypes'

const props = defineProps<{
  calendarDays: PlannerWeekDay[]
  assignmentRow: PlannerMeasurementRow | undefined
  weekdayHeaders: string[]
  rowVisibleOnDay: (row: PlannerMeasurementRow, dayRef: DayRef, inMonth: boolean) => boolean
  canToggleDay: (day: { inMonth: boolean }) => boolean
}>()

defineEmits<{
  dayToggle: [dayRef: DayRef]
  wholeWeek: []
  clearPlacement: []
  finishAssigning: []
}>()

const { t } = useT()

// Chart-color CSS variable for each object type
const typeColorVar: Record<SubjectKind, string> = {
  keyResult: '--neo-chart-kr-end',
  habit: '--neo-chart-habit-end',
  tracker: '--neo-chart-tracker-end',
}

interface ItemGroup {
  type: SubjectKind
  items: CalendarAssignmentItem[]
}

function groupedItems(items: CalendarAssignmentItem[]): ItemGroup[] {
  const groups: Partial<Record<SubjectKind, CalendarAssignmentItem[]>> = {}
  for (const item of items) {
    ;(groups[item.subjectType] ??= []).push(item)
  }
  const order: SubjectKind[] = ['keyResult', 'habit', 'tracker']
  return order
    .filter(type => groups[type]?.length)
    .map(type => ({ type, items: groups[type]! }))
}

function dayCellClass(day: PlannerWeekDay): string {
  const row = props.assignmentRow
  const isAssigned = row ? props.rowVisibleOnDay(row, day.dayRef, day.inMonth) : false

  if (isAssigned) return 'bg-primary/7 border-primary/15'
  return row ? 'bg-background hover:border-primary/20' : 'bg-background'
}

function dayItemStyle(item: CalendarAssignmentItem): Record<string, string> {
  const cssVar = typeColorVar[item.subjectType]
  const opacity = item.isActiveAssignment ? 0.25 : 0.10
  return { backgroundColor: `rgb(var(${cssVar}) / ${opacity})` }
}

function dayItemClass(item: CalendarAssignmentItem): string {
  const text = item.isActiveAssignment ? 'text-primary-strong' : 'text-on-surface-variant'
  const ring = item.isActiveAssignment ? 'ring-1 ring-primary/25' : ''

  if (item.icon) {
    return `flex h-6 w-6 items-center justify-center rounded-full ${text} ${ring}`
  }
  return `rounded-2xl px-1.5 py-0.5 text-[10px] leading-4 font-medium ${text} ${ring}`
}
</script>
