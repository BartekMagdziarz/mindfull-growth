<template>
  <article
    class="group neo-card neo-raised border-primary/10 px-4 py-3.5 transition-shadow duration-200 hover:shadow-neu-raised-lg hover:-translate-y-px"
  >
    <div class="space-y-2">
      <!-- Row 1: Title + line + chevron/menu -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="min-w-0 shrink-0 text-left text-sm font-semibold text-on-surface transition-colors hover:text-primary-strong"
          @click="$emit('open-object')"
        >
          {{ title }}
        </button>
        <div class="h-px flex-1 bg-neu-border/10" />
        <div ref="menuRootRef" class="relative shrink-0">
          <button
            type="button"
            class="neo-icon-button neo-focus transition-opacity"
            :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
            aria-label="More actions"
            @click.stop="menuOpen = !menuOpen"
          >
            <AppIcon name="more_horiz" class="text-sm" />
          </button>
          <Teleport to="body">
            <div
              v-if="menuOpen"
              ref="menuDropdownRef"
              class="fixed z-50 min-w-[160px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-lg"
              :style="menuStyle"
              @click.stop
            >
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('open-context')"
              >
                {{ t('planning.today.actions.openContext') }}
              </button>
              <button
                type="button"
                class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('open-object')"
              >
                {{ t('planning.objects.actions.open') }}
              </button>
              <template v-if="item.isScheduledToday">
                <button
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMoveToDay"
                >
                  {{ t('planning.today.actions.moveToDay') }}
                </button>
                <button
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMenuAction('clear-schedule')"
                >
                  {{ t('planning.today.actions.clearToday') }}
                </button>
                <button
                  type="button"
                  class="block w-full border-t border-outline/10 px-4 py-2 text-left text-xs font-medium text-error hover:bg-error/5"
                  @click="handleMenuAction('request-delete')"
                >
                  {{ t('common.buttons.delete') }}
                </button>
              </template>
              <template v-else>
                <button
                  v-if="item.canHide"
                  type="button"
                  class="block w-full px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                  @click="handleMenuAction('hide')"
                >
                  {{ t('planning.today.actions.hideForToday') }}
                </button>
              </template>
              <button
                v-if="item.kind === 'measurement' && item.todayEntry"
                type="button"
                class="block w-full border-t border-outline/10 px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleMenuAction('clear-entry')"
              >
                {{ t('planning.today.actions.clearEntry') }}
              </button>
              <!-- Expand details -->
              <button
                type="button"
                class="block w-full border-t border-outline/10 px-4 py-2 text-left text-xs font-medium text-on-surface hover:bg-primary-soft/30"
                @click="handleExpandFromMenu"
              >
                {{ expanded ? 'Collapse' : 'Details' }}
              </button>
            </div>
          </Teleport>
        </div>
        <!-- Initiative: checkmark inlined on the far right of the title row -->
        <InitiativeCheckmark
          v-if="viz.vizType.value === 'initiative-check'"
          :is-complete="item.kind === 'initiative' && !!item.planState.dayRef"
          :day-label="item.kind === 'initiative' && item.planState.dayRef ? todayLabel : undefined"
          :is-pending="isPending"
          class="shrink-0"
          @toggle="$emit('toggle-completion')"
        />
      </div>

      <!-- Measurement cards: unified three-zone layout. The initiative
           branch rendered its checkmark inside the title row above and
           skips this entirely. `min-h-[120px]` is applied to all
           measurement cards so they share the same height regardless of
           which chart primitive renders. -->
      <div
        v-if="viz.vizType.value !== 'initiative-check'"
        class="flex min-h-[120px] gap-3"
      >
        <!-- LEFT COLUMN: chart zone + optional aggregate bar -->
        <div class="flex min-w-0 flex-col gap-2" style="flex: 2 1 0">
          <div class="flex flex-1 items-end min-h-[56px]">
            <CompletionDots
              v-if="viz.vizType.value === 'completion-dots'"
              :slots="viz.completionSlots.value"
              :is-pending="isPending"
              @toggle="$emit('toggle-completion')"
            />
            <CompletionRing
              v-else-if="viz.vizType.value === 'completion-ring'"
              :done-count="completionRingDoneCount"
              :target-count="completionRingTargetCount"
              :is-pending="isPending"
              :has-today-entry="!!(item.kind === 'measurement' && item.todayEntry)"
              :can-toggle-today="completionRingCanToggle"
              @toggle="$emit('toggle-completion')"
            />
            <DailyBarsChart
              v-else-if="viz.vizType.value === 'daily-bars'"
              :slots="viz.barSlots.value"
              :period-status="viz.aggregateData.value?.status"
            />
            <ValueLineChart
              v-else-if="viz.vizType.value === 'value-line'"
              :slots="viz.valueLineSlots.value"
              :target-value="viz.targetValue.value"
            />
            <RatingSegmentedBars
              v-else-if="viz.vizType.value === 'rating-segmented'"
              :slots="viz.barSlots.value"
              :scale-min="1"
              :scale-max="10"
              :target-value="viz.aggregateData.value?.targetValue"
              :target-operator="ratingTargetOperator"
            />
            <CounterRing
              v-else-if="viz.vizType.value === 'counter-ring' && viz.counterRingData.value"
              :data="viz.counterRingData.value"
            />
            <ValueSparklineSummary
              v-else-if="viz.vizType.value === 'value-sparkline-summary' && viz.valueSparklineData.value"
              :data="viz.valueSparklineData.value"
            />
            <RatingSmoothBar
              v-else-if="viz.vizType.value === 'rating-smooth' && viz.ratingSmoothData.value"
              :data="viz.ratingSmoothData.value"
            />
            <SummaryNumber
              v-else-if="viz.vizType.value === 'summary-number' && viz.summaryNumberData.value"
              :data="viz.summaryNumberData.value"
            />
          </div>
          <AggregateBar
            v-if="showAggregateBar && viz.aggregateData.value"
            :data="viz.aggregateData.value"
          />
        </div>
        <!-- RIGHT COLUMN: today entry input -->
        <div
          v-if="hasRightColumn"
          class="flex shrink-0 items-center justify-center"
          style="flex: 1 1 0"
        >
          <CounterEntryControl
            v-if="viz.entryMode.value === 'counter'"
            :current-value="viz.currentValue.value"
            :is-pending="isPending"
            @increment="handleStep(1)"
            @save-value="handleSaveValue"
          />
          <TodayEntryInput
            v-else-if="viz.entryMode.value === 'value' || viz.entryMode.value === 'rating'"
            :entry-mode="viz.entryMode.value"
            :current-value="viz.currentValue.value"
            :is-pending="isPending"
            @save-value="handleSaveValue"
          />
          <button
            v-else-if="viz.vizType.value === 'summary-number' && viz.entryMode.value === 'completion'"
            type="button"
            class="neo-icon-button neo-focus"
            :disabled="isPending"
            :aria-label="item.kind === 'measurement' && item.todayEntry ? t('planning.today.actions.undoEntry') : t('planning.today.actions.recordEntry')"
            @click.stop="$emit('toggle-completion')"
          >
            <AppIcon name="check" class="text-base" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expanded detail section -->
    <div
      class="transition-all duration-200 ease-in-out"
      :style="{
        maxHeight: expanded ? '10rem' : '0',
        opacity: expanded ? 1 : 0,
        overflow: expanded ? 'visible' : 'hidden',
      }"
    >
      <div class="mt-2 space-y-0.5 border-t border-neu-border/15 pt-2 text-[11px] text-on-surface-variant">
        <p v-if="item.goalTitle" class="font-medium">
          {{ t('planning.today.details.goal', { title: item.goalTitle }) }}
        </p>
        <template v-if="item.kind === 'measurement'">
          <p v-if="item.measurement.target">{{ formatTarget(item.measurement.target) }}</p>
          <p>
            {{ formatActual(item) }}
            · {{ t('planning.calendar.details.entryCount', { n: item.measurement.entryCount }) }}
            · {{ t('planning.today.details.daysLeft', { n: daysRemaining }) }}
          </p>
        </template>
        <p class="text-on-surface-variant/60">{{ contextLabel }}</p>
      </div>
    </div>

    <!-- Move to day picker (shown when triggered from menu) -->
    <input
      ref="moveDateInputRef"
      type="date"
      class="sr-only"
      @change="handleMoveDateChange"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import CompletionDots from '@/components/today/visualizations/CompletionDots.vue'
import CompletionRing from '@/components/today/visualizations/CompletionRing.vue'
import CounterEntryControl from '@/components/today/visualizations/CounterEntryControl.vue'
import CounterRing from '@/components/today/visualizations/CounterRing.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import ValueSparklineSummary from '@/components/today/visualizations/ValueSparklineSummary.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import RatingSmoothBar from '@/components/today/visualizations/RatingSmoothBar.vue'
import SummaryNumber from '@/components/today/visualizations/SummaryNumber.vue'
import AggregateBar from '@/components/today/visualizations/AggregateBar.vue'
import TodayEntryInput from '@/components/today/visualizations/TodayEntryInput.vue'
import InitiativeCheckmark from '@/components/today/visualizations/InitiativeCheckmark.vue'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
import { getPeriodBounds } from '@/utils/periods'
import { formatPeriodLabel } from '@/utils/periodLabels'
import { periodLabel } from '@/components/objects/sparklines/sparklineUtils'

interface Props {
  item: TodayItem
  todayDayRef: DayRef
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
  isPending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isPending: false,
})

const emit = defineEmits<{
  'open-object': []
  'open-context': []
  'toggle-completion': []
  'save-entry': [value: number]
  'clear-entry': []
  hide: []
  move: [dayRef: DayRef]
  'clear-schedule': []
  'request-delete': []
}>()

const { t, locale } = useT()

const expanded = ref(false)
const menuOpen = ref(false)
const menuRootRef = ref<HTMLElement | null>(null)
const menuDropdownRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const moveDateInputRef = ref<HTMLInputElement | null>(null)

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)

const todayLabel = computed(() => periodLabel(props.todayDayRef, 'daily', locale.value))

// Right column is absent for viz types that either handle their own input
// (completion-dots / completion-ring render click-to-toggle directly), use
// a dedicated single-row layout (initiative-check puts the checkmark inline
// with the title), or have no entry mode at all (e.g. goals rendered with
// daily-bars for display only).
const hasRightColumn = computed(() => {
  const vt = viz.vizType.value
  if (vt === 'completion-dots' || vt === 'completion-ring') return false
  if (vt === 'initiative-check') return false
  if (!viz.entryMode.value) return false
  return true
})

// AggregateBar sits under the chart only for weekly per-day detail charts
// with a target. Monthly summary primitives and completion charts carry
// their own progress signals.
const showAggregateBar = computed(() => {
  const vt = viz.vizType.value
  if (vt === 'daily-bars' || vt === 'value-line' || vt === 'rating-segmented') {
    return !!viz.aggregateData.value
  }
  return false
})

// Completion-ring derives its done/target counts from the existing completion
// slots and target value so the ring stays a thin presentational layer.
const completionRingDoneCount = computed(
  () => viz.completionSlots.value.filter((s) => s.state === 'done' || s.state === 'today-done').length,
)
const completionRingTargetCount = computed(() => viz.targetValue.value ?? 0)
const completionRingCanToggle = computed(
  () => props.item.kind === 'measurement' && viz.entryMode.value === 'completion',
)

// `aggregateData.operator` is typed as `'min' | 'max' | 'gte' | 'lte'`, but
// `RatingSegmentedBars` only understands `'gte' | 'lte'`. Rating targets always
// use gte/lte in practice, so this is just a type narrowing.
const ratingTargetOperator = computed<'gte' | 'lte' | undefined>(() => {
  const op = viz.aggregateData.value?.operator
  return op === 'gte' || op === 'lte' ? op : undefined
})

const contextLabel = computed(() =>
  formatPeriodLabel(props.item.contextPeriodRef, locale.value, t('planning.calendar.scales.week'))
)

const daysRemaining = computed(() => {
  if (props.item.kind !== 'measurement') return 0
  const bounds = getPeriodBounds(props.item.measurement.periodRef)
  const endDate = new Date(`${bounds.end}T00:00:00Z`)
  const todayDate = new Date(`${props.todayDayRef}T00:00:00Z`)
  return Math.max(0, Math.round((endDate.getTime() - todayDate.getTime()) / 86400000))
})

watch(menuOpen, async (isOpen) => {
  if (isOpen && menuRootRef.value) {
    await nextTick()
    const rect = menuRootRef.value.getBoundingClientRect()
    menuStyle.value = {
      top: `${rect.bottom + 4}px`,
      left: `${Math.max(0, rect.right - 160)}px`,
    }
  }
})

function handleStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'counter') return
  const currentValue = props.item.todayEntry?.value ?? 0
  const nextValue = Math.max(0, currentValue + delta)
  emit('save-entry', nextValue)
}

function handleSaveValue(value: number): void {
  emit('save-entry', value)
}

function handleMenuAction(action: string): void {
  menuOpen.value = false
  switch (action) {
    case 'open-object': emit('open-object'); break
    case 'open-context': emit('open-context'); break
    case 'clear-schedule': emit('clear-schedule'); break
    case 'request-delete': emit('request-delete'); break
    case 'hide': emit('hide'); break
    case 'clear-entry': emit('clear-entry'); break
  }
}

function handleExpandFromMenu(): void {
  menuOpen.value = false
  expanded.value = !expanded.value
}

function handleMoveToDay(): void {
  menuOpen.value = false
  moveDateInputRef.value?.showPicker()
}

function handleMoveDateChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.value && input.value !== props.todayDayRef) {
    emit('move', input.value as DayRef)
  }
}

function handleOutsideClick(event: MouseEvent): void {
  if (
    menuOpen.value &&
    menuRootRef.value &&
    !menuRootRef.value.contains(event.target as Node) &&
    menuDropdownRef.value &&
    !menuDropdownRef.value.contains(event.target as Node)
  ) {
    menuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutsideClick)
})

function formatTarget(target: MeasurementTarget): string {
  switch (target.kind) {
    case 'count':
      return t(
        target.operator === 'min'
          ? 'planning.calendar.details.targetCountMin'
          : 'planning.calendar.details.targetCountMax',
        { n: target.value }
      )
    case 'value':
      return t('planning.calendar.details.targetRule', {
        aggregation: t(`planning.calendar.labels.aggregation.${target.aggregation}`),
        operator: target.operator === 'gte' ? '>=' : '<=',
        value: formatMeasurementValue(target.value),
      })
    case 'rating':
      return t('planning.calendar.details.targetRule', {
        aggregation: t('planning.calendar.labels.aggregation.average'),
        operator: target.operator === 'gte' ? '>=' : '<=',
        value: formatMeasurementValue(target.value),
      })
  }
}

function formatActual(item: TodayMeasurementItem): string {
  if (item.measurement.actualValue === undefined) {
    return t('planning.calendar.details.actualNoData')
  }
  return t('planning.calendar.details.actual', {
    value: formatMeasurementValue(item.measurement.actualValue),
  })
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
</script>
