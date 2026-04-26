<template>
  <article
    class="today-item-card group relative cursor-pointer rounded-xl px-3 py-2.5 transition-colors duration-150 hover:bg-white/20"
    @click="handleCardClick"
  >
    <!-- Title row: always visible -->
    <div class="flex items-center gap-2">
      <span
        class="today-item-icon grid shrink-0 place-items-center"
        :class="hasTodayEntry ? 'today-item-icon--active' : ''"
        aria-hidden="true"
      >
        <AppIcon
          :name="iconName"
          class="text-[15px] leading-none"
          :class="hasTodayEntry ? 'text-primary-strong' : 'text-on-surface-variant/65'"
        />
      </span>
      <button
        type="button"
        class="min-w-0 flex-1 truncate text-left text-[13px] font-semibold text-on-surface transition-colors hover:text-primary-strong"
        @click.stop="$emit('open-object')"
      >
        {{ title }}
      </button>

      <!-- Inline today control (sized to ~32px height) -->
      <div class="shrink-0" @click.stop>
        <!-- Initiative: dedicated checkmark -->
        <InitiativeCheckmark
          v-if="viz.vizType.value === 'initiative-check'"
          :is-complete="item.kind === 'initiative' && !!item.planState.dayRef"
          :day-label="item.kind === 'initiative' && item.planState.dayRef ? todayLabel : undefined"
          :is-pending="isPending"
          @toggle="$emit('toggle-completion')"
        />

        <!-- Completion: small circle toggle -->
        <button
          v-else-if="viz.entryMode.value === 'completion'"
          type="button"
          class="today-inline-completion neo-focus grid place-items-center"
          :class="completionTodayDone ? 'today-inline-completion--done' : ''"
          :disabled="isPending"
          :aria-label="completionTodayDone ? t('planning.today.actions.undoEntry') : t('planning.today.actions.recordEntry')"
          @click="$emit('toggle-completion')"
        >
          <svg viewBox="0 0 12 12" class="h-[14px] w-[14px]" aria-hidden="true">
            <path
              d="M2 6 L5 9 L10 3"
              fill="none"
              :stroke="completionTodayDone ? 'white' : 'rgb(var(--color-on-surface-variant))'"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              :stroke-opacity="completionTodayDone ? 1 : 0.5"
            />
          </svg>
        </button>

        <!-- Counter: [−] {value} [+] horizontal pill -->
        <div
          v-else-if="viz.entryMode.value === 'counter'"
          class="today-inline-counter flex items-center gap-1"
        >
          <button
            type="button"
            class="today-inline-step neo-focus"
            :disabled="isPending || (viz.currentValue.value ?? 0) <= 0"
            aria-label="Decrement"
            @click="handleStep(-1)"
          >
            −
          </button>
          <span class="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-on-surface">
            {{ viz.currentValue.value ?? 0 }}
          </span>
          <button
            type="button"
            class="today-inline-step neo-focus"
            :disabled="isPending"
            aria-label="Increment"
            @click="handleStep(1)"
          >
            +
          </button>
        </div>

        <!-- Rating: [−] {value} [+] horizontal pill (clamped to scale) -->
        <div
          v-else-if="viz.entryMode.value === 'rating'"
          class="today-inline-counter flex items-center gap-1"
        >
          <button
            type="button"
            class="today-inline-step neo-focus"
            :disabled="isPending || (viz.currentValue.value ?? 0) <= viz.ratingScaleMin.value"
            aria-label="Decrement"
            @click="handleRatingStep(-1)"
          >
            −
          </button>
          <span class="min-w-[1.5rem] text-center text-xs font-semibold tabular-nums text-on-surface">
            {{ viz.currentValue.value || '—' }}
          </span>
          <button
            type="button"
            class="today-inline-step neo-focus"
            :disabled="isPending || (viz.currentValue.value ?? 0) >= viz.ratingScale.value"
            aria-label="Increment"
            @click="handleRatingStep(1)"
          >
            +
          </button>
        </div>

        <!-- Value: editable inline number pill -->
        <div v-else-if="viz.entryMode.value === 'value'" class="today-inline-value">
          <input
            v-if="showValueEdit"
            ref="valueInputRef"
            :value="valueDraft"
            type="number"
            step="0.1"
            class="neo-input w-16 rounded-full px-2 py-0.5 text-center text-xs"
            @click.stop
            @input="valueDraft = ($event.target as HTMLInputElement).value"
            @blur="submitValueDraft($event)"
            @keydown.enter="submitValueDraft($event)"
            @keydown.escape.prevent="cancelValueEdit"
          />
          <button
            v-else
            type="button"
            class="today-inline-value-btn neo-focus"
            :disabled="isPending"
            @click="openValueEdit"
          >
            {{ viz.currentValue.value || '—' }}
          </button>
        </div>
      </div>

      <!-- More menu (hover-only) -->
      <div ref="menuRootRef" class="relative shrink-0" @click.stop>
        <button
          type="button"
          class="neo-icon-button neo-focus transition-opacity"
          :class="menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
          aria-label="More actions"
          @click="menuOpen = !menuOpen"
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
          </div>
        </Teleport>
      </div>
    </div>

    <!-- Expanded section: full chart + footer (cadence/target pills + Open button) -->
    <div
      v-if="expanded"
      class="mt-3 border-t border-neu-border/30 pt-3"
      @click.stop
    >
      <!-- Chart visualization -->
      <div
        v-if="viz.vizType.value !== 'initiative-check'"
        class="flex min-h-[80px] items-end"
      >
        <CompletionDots
          v-if="viz.vizType.value === 'completion-dots'"
          :slots="viz.completionSlots.value"
        />
        <CompletionRing
          v-else-if="viz.vizType.value === 'completion-ring'"
          :done-count="completionRingDoneCount"
          :target-count="completionRingTargetCount"
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
          :scale-min="viz.ratingScaleMin.value"
          :scale-max="viz.ratingScale.value"
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
        class="mt-2"
      />

      <!-- Footer: cadence/target pills + Open button -->
      <div class="mt-3 flex items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2 text-[10px]">
          <span v-if="cadenceLabel" class="today-pill">
            {{ cadenceLabel }}
          </span>
          <span v-if="targetPillLabel" class="today-pill">
            <span class="opacity-60">{{ t('planning.today.details.targetPrefix') }} · </span>
            <span class="font-semibold text-on-surface">{{ targetPillLabel }}</span>
          </span>
          <span v-if="actualPillLabel" class="today-pill">
            <span class="opacity-60">{{ t('planning.today.details.progressPrefix') }} · </span>
            <span class="font-semibold text-on-surface">{{ actualPillLabel }}</span>
          </span>
        </div>
        <button
          type="button"
          class="today-item-open-btn neo-focus shrink-0"
          @click="$emit('open-object')"
        >
          <span>{{ t('planning.objects.actions.open') }}</span>
          <AppIcon name="arrow_outward" class="text-[12px]" />
        </button>
      </div>
    </div>

    <!-- Hover-only expand affordance on the bottom edge -->
    <button
      type="button"
      class="today-item-expand-btn neo-focus absolute left-1/2 -translate-x-1/2 transition-opacity duration-150"
      :class="expanded ? 'opacity-60' : 'opacity-0 group-hover:opacity-50'"
      :aria-label="expanded ? t('common.buttons.collapse') : t('common.buttons.expand')"
      @click.stop="expanded = !expanded"
    >
      <AppIcon
        name="expand_more"
        class="text-[14px] text-on-surface-variant transition-transform"
        :class="expanded ? 'rotate-180' : ''"
      />
    </button>

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
import CounterRing from '@/components/today/visualizations/CounterRing.vue'
import DailyBarsChart from '@/components/today/visualizations/DailyBarsChart.vue'
import ValueLineChart from '@/components/today/visualizations/ValueLineChart.vue'
import ValueSparklineSummary from '@/components/today/visualizations/ValueSparklineSummary.vue'
import RatingSegmentedBars from '@/components/today/visualizations/RatingSegmentedBars.vue'
import RatingSmoothBar from '@/components/today/visualizations/RatingSmoothBar.vue'
import SummaryNumber from '@/components/today/visualizations/SummaryNumber.vue'
import AggregateBar from '@/components/today/visualizations/AggregateBar.vue'
import InitiativeCheckmark from '@/components/today/visualizations/InitiativeCheckmark.vue'
import type { DayRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { DailyMeasurementEntry, MeasurementDayAssignment } from '@/domain/planningState'
import { useT } from '@/composables/useT'
import { useTodayItemVisualization } from '@/composables/useTodayItemVisualization'
import type { TodayItem, TodayMeasurementItem } from '@/services/todayViewQueries'
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
const showValueEdit = ref(false)
const valueDraft = ref('')
const valueInputRef = ref<HTMLInputElement | null>(null)
const justSubmittedValue = ref(false)

const viz = useTodayItemVisualization(
  toRef(props, 'item'),
  toRef(props, 'rawEntries'),
  toRef(props, 'allDayAssignments'),
  toRef(props, 'todayDayRef'),
  computed(() => locale.value),
)

const title = computed(() =>
  props.item.kind === 'initiative' ? props.item.initiative.title : props.item.subject.title
)

// Icon shown to the left of the title. Falls back to a panel-type default
// when the underlying entity has no icon set yet.
const PANEL_TYPE_ICONS: Record<string, string> = {
  habit: 'loop',
  tracker: 'monitoring',
  keyResult: 'flag',
  initiative: 'rocket_launch',
}

const iconName = computed(() => {
  if (props.item.kind === 'initiative') {
    return props.item.initiative.icon || PANEL_TYPE_ICONS.initiative
  }
  const subject = props.item.subject as { icon?: string }
  if (subject.icon) return subject.icon
  return PANEL_TYPE_ICONS[props.item.panelType] ?? 'circle'
})

// Active-state styling for the icon chip — triggered when there's any value
// recorded for today (completion, counter, value, or rating).
const hasTodayEntry = computed(() => {
  if (props.item.kind === 'initiative') {
    return !!props.item.planState.dayRef
  }
  const entry = props.item.todayEntry
  if (!entry) return false
  if (props.item.subject.entryMode === 'completion') return true
  return typeof entry.value === 'number' && entry.value !== 0
})

const todayLabel = computed(() => periodLabel(props.todayDayRef, 'daily', locale.value))

const completionTodayDone = computed(() =>
  viz.completionSlots.value.some(s => s.state === 'today-done'),
)

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

// `aggregateData.operator` is typed as `'min' | 'max' | 'gte' | 'lte'`, but
// `RatingSegmentedBars` only understands `'gte' | 'lte'`. Rating targets always
// use gte/lte in practice, so this is just a type narrowing.
const ratingTargetOperator = computed<'gte' | 'lte' | undefined>(() => {
  const op = viz.aggregateData.value?.operator
  return op === 'gte' || op === 'lte' ? op : undefined
})

// Cadence label shown in the expanded footer.
const cadenceLabel = computed(() => {
  if (props.item.kind !== 'measurement') return ''
  const cadence = props.item.measurement.cadence
  if (cadence === 'monthly') return t('planning.calendar.scales.month')
  if (cadence === 'weekly') return t('planning.calendar.scales.week')
  return t('planning.calendar.scales.day')
})

// Target pill — short, inline. Uses unit if available.
const targetPillLabel = computed(() => {
  if (props.item.kind !== 'measurement') return ''
  const target = props.item.measurement.target
  if (!target) return ''
  return formatTargetCompact(target, getUnit(props.item))
})

// Actual / progress pill — short, inline.
const actualPillLabel = computed(() => {
  if (props.item.kind !== 'measurement') return ''
  if (props.item.measurement.actualValue === undefined) return ''
  return formatMeasurementValue(props.item.measurement.actualValue) + (getUnit(props.item) ? ` ${getUnit(props.item)}` : '')
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

function handleRatingStep(delta: number): void {
  if (props.item.kind !== 'measurement' || props.item.subject.entryMode !== 'rating') return
  const currentValue = props.item.todayEntry?.value ?? 0
  const min = viz.ratingScaleMin.value
  const max = viz.ratingScale.value
  const nextValue = Math.min(max, Math.max(min, currentValue + delta))
  emit('save-entry', nextValue)
}

function openValueEdit(): void {
  valueDraft.value = viz.currentValue.value ? String(viz.currentValue.value) : ''
  showValueEdit.value = true
  void nextTick(() => {
    valueInputRef.value?.focus()
    valueInputRef.value?.select()
  })
}

function cancelValueEdit(): void {
  showValueEdit.value = false
}

function submitValueDraft(event: Event): void {
  if (justSubmittedValue.value) {
    justSubmittedValue.value = false
    return
  }

  const input = event.target as HTMLInputElement
  const raw = input.value.trim()
  showValueEdit.value = false

  if (!raw) return
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return

  emit('save-entry', parsed)

  if (event.type === 'keydown') {
    justSubmittedValue.value = true
    input.blur()
  }
}

function handleCardClick(): void {
  // Click on card body (outside title button, inline control, menu, expand
  // chevron) toggles expansion to match the design.
  expanded.value = !expanded.value
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

function getUnit(item: TodayMeasurementItem): string {
  const subject = item.subject as { unit?: string }
  return subject.unit ?? ''
}

function formatTargetCompact(target: MeasurementTarget, unit: string): string {
  switch (target.kind) {
    case 'count':
      return `${target.value}${unit ? ` ${unit}` : ''}`
    case 'value':
    case 'rating':
      return `${target.operator === 'gte' ? '≥' : '≤'} ${formatMeasurementValue(target.value)}${unit ? ` ${unit}` : ''}`
  }
}

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}
</script>

<style scoped>
.today-item-card {
  border-radius: 0.85rem;
}

.today-item-icon {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.2);
  transition: background-color 220ms ease, box-shadow 220ms ease;
}

.today-item-icon--active {
  background: rgb(var(--color-primary-soft));
  box-shadow:
    inset -1px -1px 2px rgb(255 255 255 / 0.55),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.18);
}

/* Inline completion toggle: 32px circle */
.today-inline-completion {
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  border: 1.5px solid rgb(var(--neo-border) / 0.4);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    -1px -1px 2px rgb(var(--neo-shadow-light) / 0.6),
    1px 1px 2px rgb(var(--neo-shadow-dark) / 0.2);
  transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease, border-color 200ms ease;
}

.today-inline-completion:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.7),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.25);
}

.today-inline-completion--done {
  border-color: transparent;
  background: linear-gradient(
    to bottom,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  box-shadow: inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.4),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.25);
}

/* Counter / rating ± buttons */
.today-inline-step {
  width: 22px;
  height: 22px;
  border-radius: 9999px;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 600;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--neo-surface-base));
  box-shadow:
    -1px -1px 2px rgb(var(--neo-shadow-light) / 0.7),
    1px 1px 2px rgb(var(--neo-shadow-dark) / 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease, opacity 150ms ease;
}

.today-inline-step:hover:not(:disabled) {
  transform: translateY(-1px);
}

.today-inline-step:active:not(:disabled) {
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.4),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.25);
}

.today-inline-step:disabled {
  opacity: 0.4;
  pointer-events: none;
}

/* Inline value pill */
.today-inline-value-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 56px;
  padding: 0 0.65rem;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--color-on-surface));
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.7),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.25);
  transition: color 200ms ease;
}

.today-inline-value-btn:hover:not(:disabled) {
  color: rgb(var(--color-primary-strong));
}

/* Pills in expanded footer */
.today-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  color: rgb(var(--color-on-surface-variant) / 0.8);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.2);
}

.today-item-open-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 500;
  color: rgb(var(--color-primary-strong));
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -2px -2px 4px rgb(var(--neo-shadow-light) / 0.8),
    2px 2px 4px rgb(var(--neo-shadow-dark) / 0.25);
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.today-item-open-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.85),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.3);
}

.today-item-open-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.5),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.2);
}

.today-item-expand-btn {
  bottom: 2px;
  display: grid;
  place-items: center;
  width: 24px;
  height: 16px;
  border-radius: 9999px;
}
</style>
