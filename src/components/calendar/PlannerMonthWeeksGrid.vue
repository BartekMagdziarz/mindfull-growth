<template>
  <div class="space-y-3" data-testid="monthly-planner-grid">
    <!-- Assignment toolbar -->
    <div
      v-if="assignmentRow"
      class="space-y-2 rounded-[1.15rem] border border-primary/20 bg-primary/6 px-3 py-2.5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="neo-icon-button h-9 w-9 rounded-xl text-primary">
            <AppIcon name="event_available" class="text-base" />
          </span>
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-on-surface">
              {{ assignmentRow.title }}
            </p>
            <p class="truncate text-[11px] text-on-surface-variant">
              {{ t('planning.calendar.planner.weekRow.assigningHint') }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <AppButton
            v-if="canDistribute"
            variant="text"
            data-testid="monthly-planner-distribute"
            @click="$emit('distributeEvenly')"
          >
            {{ t('planning.calendar.planner.weekRow.distributeEvenly') }}
          </AppButton>
          <AppButton variant="text" @click="$emit('clearPlacement')">
            {{ t('planning.calendar.planner.clearPlacement') }}
          </AppButton>
          <AppButton variant="tonal" @click="$emit('finishAssigning')">
            {{ t('common.buttons.done') }}
          </AppButton>
        </div>
      </div>

      <!-- Soft sum indicator -->
      <p
        v-if="weekTargetSummary"
        data-testid="monthly-planner-target-sum"
        class="text-[11px] font-medium"
        :class="sumIndicatorClass"
      >
        {{ sumIndicatorText }}
      </p>
    </div>

    <!-- Week rows -->
    <div class="space-y-2">
      <div
        v-for="week in weekRows"
        :key="week.weekRef"
        class="flex items-stretch gap-2"
      >
        <!-- Assignment mode: whole row is the week toggle -->
        <button
          v-if="assignmentRow"
          type="button"
          :data-testid="`monthly-planner-week-${week.weekRef}`"
          class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-200"
          :class="weekRowClass(week)"
          :disabled="!canToggleWeek"
          @click="$emit('weekToggle', week.weekRef)"
        >
          <span class="w-8 shrink-0 text-center text-sm font-semibold">{{ week.label }}</span>
          <span class="shrink-0 text-xs text-on-surface-variant">{{ week.rangeLabel }}</span>

          <span
            v-if="week.isBoundary"
            class="rounded-full border border-outline/25 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
          >
            {{ t('planning.calendar.planner.weekRow.boundaryWeek') }}
          </span>

          <span
            v-if="week.viaWholeMonth"
            class="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-strong"
          >
            {{ t('planning.calendar.planner.weekRow.wholeMonthChip') }}
          </span>

          <span
            v-if="week.dayBadge"
            :data-testid="`monthly-planner-day-badge-${week.weekRef}`"
            class="inline-flex items-center gap-1 rounded-full bg-background/70 px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
            :title="t('planning.calendar.planner.weekRow.dayBadgeHint')"
          >
            <AppIcon name="event" class="text-[11px]" />
            {{ tp(week.dayBadge.count, 'planning.calendar.planner.weekRow.dayBadge.one', 'planning.calendar.planner.weekRow.dayBadge.few', 'planning.calendar.planner.weekRow.dayBadge.many') }}
            ({{ week.dayBadge.days }})
          </span>
        </button>

        <!-- Idle mode: static row with the week's placed objects -->
        <div
          v-else
          :data-testid="`monthly-planner-week-${week.weekRef}`"
          class="flex min-h-[3.25rem] min-w-0 flex-1 items-center gap-3 rounded-2xl px-3 py-2 shadow-neu-raised-sm"
        >
          <span class="w-8 shrink-0 text-center text-sm font-semibold text-on-surface">{{ week.label }}</span>
          <span class="shrink-0 text-xs text-on-surface-variant">{{ week.rangeLabel }}</span>
          <span
            v-if="week.isBoundary"
            class="rounded-full border border-outline/25 bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant"
          >
            {{ t('planning.calendar.planner.weekRow.boundaryWeek') }}
          </span>
          <div class="h-9 min-w-0 flex-1">
            <DayCellIcons :items="collapsedChips(week.chips)" density="compact" />
          </div>
        </div>

        <!-- Week sub-target pill (assignment mode, explicitly placed weeks of KRs/habits) -->
        <div
          v-if="assignmentRow && week.canEditTarget && week.effectiveTarget"
          class="flex shrink-0 items-center"
          :data-testid="`monthly-planner-week-target-${week.weekRef}`"
        >
          <PlannerWeekTargetPill
            :target="week.effectiveTarget"
            :has-override="Boolean(week.weekTargetOverride)"
            :disabled="!canToggleWeek"
            @change="value => $emit('weekTargetChange', week.weekRef, value)"
            @clear="$emit('weekTargetClear', week.weekRef)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import DayCellIcons from './DayCellIcons.vue'
import PlannerWeekTargetPill from './PlannerWeekTargetPill.vue'
import { useT } from '@/composables/useT'
import type { WeekRef } from '@/domain/period'
import type {
  CalendarAssignmentItem,
  CollapsedIconItem,
  PlannerMeasurementRow,
  PlannerMonthWeekRow,
  PlannerWeekTargetSummary,
  SubjectKind,
} from './plannerTypes'

const props = defineProps<{
  weekRows: PlannerMonthWeekRow[]
  assignmentRow: PlannerMeasurementRow | undefined
  weekTargetSummary: PlannerWeekTargetSummary | null
  canDistribute: boolean
  canToggleWeek: boolean
}>()

defineEmits<{
  weekToggle: [weekRef: WeekRef]
  weekTargetChange: [weekRef: WeekRef, value: number]
  weekTargetClear: [weekRef: WeekRef]
  distributeEvenly: []
  clearPlacement: []
  finishAssigning: []
}>()

const { t, tp } = useT()

const sumIndicatorText = computed(() => {
  const summary = props.weekTargetSummary
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
})

const sumIndicatorClass = computed(() => {
  const summary = props.weekTargetSummary
  if (!summary) return ''
  return summary.assigned === summary.total ? 'text-primary-strong' : 'text-on-surface-variant'
})

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

function collapsedChips(items: CalendarAssignmentItem[]): CollapsedIconItem[] {
  const order: SubjectKind[] = ['keyResult', 'habit', 'tracker']
  const sorted = [...items].sort((a, b) => order.indexOf(a.subjectType) - order.indexOf(b.subjectType))
  return collapseByIcon(sorted)
}

function weekRowClass(week: PlannerMonthWeekRow): string {
  if (week.assignmentScope === 'whole-week') {
    return 'bg-primary text-on-primary shadow-neu-raised-sm'
  }
  if (week.assignmentScope === 'specific-days' || week.dayBadge) {
    return 'neo-inset border border-primary/30 text-on-surface'
  }
  if (week.viaWholeMonth) {
    return 'neo-inset bg-primary/8 text-on-surface'
  }
  return 'neo-inset text-on-surface hover:bg-primary/8'
}
</script>
