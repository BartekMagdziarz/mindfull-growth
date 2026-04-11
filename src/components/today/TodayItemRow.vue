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
      </div>

      <!-- Counter mode: chart + aggregate left, count + [+] right column -->
      <template v-if="viz.vizType.value === 'daily-bars' && viz.entryMode.value === 'counter'">
        <div class="flex gap-2">
          <!-- Left: chart + aggregate (same width) -->
          <div class="min-w-0 flex-1 space-y-2">
            <DailyBarsChart
              :slots="viz.barSlots.value"
              :period-status="viz.aggregateData.value?.status"
            />
            <AggregateBar
              v-if="viz.aggregateData.value"
              :data="viz.aggregateData.value"
            />
          </div>
          <!-- Right: today's count above [+] button, both centered -->
          <div class="flex shrink-0 flex-col items-center justify-end gap-1">
            <span class="text-sm font-bold tabular-nums text-on-surface">
              {{ formatCounterDisplay(viz.currentValue.value) }}
            </span>
            <button
              type="button"
              class="neo-icon-button neo-focus text-xs"
              :disabled="isPending"
              aria-label="Increment"
              @click.stop="handleStep(1)"
            >
              +
            </button>
          </div>
        </div>
      </template>

      <!-- Value mode with daily-bars (sum aggregation): chart + input in one row -->
      <template v-else-if="viz.vizType.value === 'daily-bars' && viz.entryMode.value === 'value'">
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <DailyBarsChart
              :slots="viz.barSlots.value"
              :period-status="viz.aggregateData.value?.status"
            />
          </div>
          <TodayEntryInput
            :entry-mode="viz.entryMode.value"
            :current-value="viz.currentValue.value"
            :is-pending="isPending"
            class="shrink-0"
            @increment="handleStep(1)"
            @save-value="handleSaveValue"
          />
        </div>
        <AggregateBar
          v-if="viz.aggregateData.value"
          :data="viz.aggregateData.value"
        />
      </template>

      <!-- Rating segmented bars: vertical segmented rectangles + input -->
      <template v-else-if="viz.vizType.value === 'rating-segmented'">
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1">
            <!-- TODO (Epic 10): lift rating scale out of TodayEntryInput's
                 ratingMax default once the domain has a scale field. -->
            <RatingSegmentedBars
              :slots="viz.barSlots.value"
              :scale-min="1"
              :scale-max="10"
              :target-value="viz.aggregateData.value?.targetValue"
              :target-operator="ratingTargetOperator"
            />
          </div>
          <TodayEntryInput
            v-if="hasEntryInput"
            :entry-mode="viz.entryMode.value!"
            :current-value="viz.currentValue.value"
            :is-pending="isPending"
            class="shrink-0"
            @increment="handleStep(1)"
            @save-value="handleSaveValue"
          />
        </div>
        <AggregateBar
          v-if="viz.aggregateData.value"
          :data="viz.aggregateData.value"
        />
      </template>

      <!-- Value line: chart + input in one row -->
      <template v-else-if="viz.vizType.value === 'value-line'">
        <div class="flex items-end gap-2">
          <div class="min-w-0 flex-1 min-h-[40px]">
            <ValueLineChart
              :slots="viz.valueLineSlots.value"
              :target-value="viz.targetValue.value"
            />
          </div>
          <TodayEntryInput
            v-if="hasEntryInput"
            :entry-mode="viz.entryMode.value!"
            :current-value="viz.currentValue.value"
            :is-pending="isPending"
            class="shrink-0"
            @increment="handleStep(1)"
            @save-value="handleSaveValue"
          />
        </div>
        <AggregateBar
          v-if="viz.aggregateData.value"
          :data="viz.aggregateData.value"
        />
      </template>

      <!-- Completion dots (unchanged) -->
      <template v-else-if="viz.vizType.value === 'completion-dots'">
        <div class="min-h-[40px]">
          <CompletionDots
            :slots="viz.completionSlots.value"
            :is-pending="isPending"
            @toggle="$emit('toggle-completion')"
          />
        </div>
        <AggregateBar
          v-if="viz.aggregateData.value"
          :data="viz.aggregateData.value"
        />
      </template>

      <!-- Initiative checkmark (unchanged) -->
      <template v-else-if="viz.vizType.value === 'initiative-check'">
        <div class="min-h-[40px]">
          <InitiativeCheckmark
            :is-complete="item.kind === 'initiative' && !!item.planState.dayRef"
            :day-label="item.kind === 'initiative' && item.planState.dayRef ? todayLabel : undefined"
            :is-pending="isPending"
            @toggle="$emit('toggle-completion')"
          />
        </div>
      </template>

      <!-- Daily bars without entry (e.g. goals) -->
      <template v-else-if="viz.vizType.value === 'daily-bars'">
        <div class="min-h-[40px]">
          <DailyBarsChart :slots="viz.barSlots.value" />
        </div>
        <AggregateBar
          v-if="viz.aggregateData.value"
          :data="viz.aggregateData.value"
        />
      </template>
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
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
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

const hasEntryInput = computed(() =>
  props.item.kind === 'measurement' && viz.entryMode.value && viz.entryMode.value !== 'completion'
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

function formatCounterDisplay(value: number): string {
  return String(value || 0)
}
</script>
