<template>
  <div class="space-y-1.5">
    <!-- Row 1: Icon + Title + Value label (or inline input for value type) -->
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-section/60 text-on-surface-variant"
        >
          <component :is="iconComponent" class="h-3 w-3" />
        </span>
        <p class="text-xs font-semibold text-on-surface truncate">{{ title }}</p>
      </div>

      <!-- Value type: always-visible inline-editable field -->
      <template v-if="type === 'value'">
        <input
          v-if="isEditingValue"
          ref="valueInputRef"
          v-model.number="valueDraft"
          type="number"
          class="value-input h-5 w-20 shrink-0 rounded bg-surface-variant/60 px-1.5 text-xs
                 font-semibold text-on-surface tabular-nums text-right
                 border border-neu-border/30 focus:border-primary/50 focus:outline-none"
          :placeholder="tracker.unit || '0'"
          :disabled="isSaving"
          @keydown.enter="commitValueEdit"
          @keydown.escape="cancelValueEdit"
          @blur="commitValueEdit"
        />
        <button
          v-else
          type="button"
          class="h-5 shrink-0 rounded bg-surface-variant/40 px-1.5 text-xs font-semibold
                 text-on-surface tabular-nums text-right cursor-pointer transition-colors
                 border border-transparent hover:border-neu-border/20 hover:bg-surface-variant/60"
          @click="startValueEdit"
        >
          {{ valueLabel }}
        </button>
      </template>

      <!-- All other types: static label -->
      <span v-else class="text-xs font-semibold text-on-surface shrink-0 tabular-nums">
        {{ valueLabel }}
      </span>
    </div>

    <!-- Value type: sparkline chart (clickable to expand) -->
    <div
      v-if="type === 'value' && sparklinePoints.length > 1"
      class="cursor-pointer"
      role="button"
      tabindex="0"
      :aria-label="isExpanded ? t('planning.components.trackerProgressRow.collapseHistory') : t('planning.components.trackerProgressRow.showHistory')"
      @click="isExpanded = !isExpanded"
      @keydown.enter="isExpanded = !isExpanded"
    >
      <svg
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
        class="w-full"
        :style="{ height: `${svgHeight}px` }"
        preserveAspectRatio="none"
        role="img"
        :aria-label="t('planning.components.trackerProgressRow.trendFor', { title })"
      >
        <!-- Area fill -->
        <polygon
          :points="areaPoints"
          :style="{ fill: 'rgb(var(--color-primary) / 0.08)' }"
        />
        <!-- Historical line (thin) -->
        <polyline
          v-if="sparklinePoints.length > 2"
          :points="historyLinePoints"
          fill="none"
          :style="{ stroke: 'rgb(var(--color-primary) / 0.4)' }"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Current period line (thick) -->
        <polyline
          :points="currentSegmentPoints"
          fill="none"
          :style="{ stroke: 'rgb(var(--color-primary))' }"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <!-- Historical dots -->
        <circle
          v-for="(pt, i) in sparklinePoints.slice(0, -1)"
          :key="i"
          :cx="pt.x"
          :cy="pt.y"
          r="2"
          :style="{ fill: 'rgb(var(--color-primary) / 0.4)' }"
        />
        <!-- Current value dot -->
        <circle
          :cx="sparklinePoints[sparklinePoints.length - 1].x"
          :cy="sparklinePoints[sparklinePoints.length - 1].y"
          r="3"
          :style="{ fill: 'rgb(var(--color-primary))' }"
        />
      </svg>
    </div>
    <!-- Value type: single-point fallback (clickable) -->
    <div
      v-else-if="type === 'value' && sparklinePoints.length === 1"
      class="flex items-center h-6 cursor-pointer"
      role="button"
      tabindex="0"
      :aria-label="isExpanded ? t('planning.components.trackerProgressRow.collapseHistory') : t('planning.components.trackerProgressRow.showHistory')"
      @click="isExpanded = !isExpanded"
      @keydown.enter="isExpanded = !isExpanded"
    >
      <div class="w-2 h-2 rounded-full bg-primary/70" />
    </div>

    <!-- Row 2 (non-value types): Past bars + Current bar + Controls -->
    <div v-if="type !== 'value'" class="flex items-center gap-1">
      <!-- Past period bars container (50% width, clickable to expand) -->
      <div
        v-if="trendData && trendData.length"
        class="flex items-center gap-[3px] w-1/2 shrink-0 cursor-pointer"
        role="button"
        tabindex="0"
        :aria-label="isExpanded ? t('planning.components.trackerProgressRow.collapseHistory') : t('planning.components.trackerProgressRow.showHistory')"
        @click="isExpanded = !isExpanded"
        @keydown.enter="isExpanded = !isExpanded"
      >
        <div
          v-for="point in trendData"
          :key="point.startDate"
          :title="`${point.label}: ${point.summary}`"
          class="neo-progress-track h-1.5 flex-1 overflow-hidden"
        >
          <div
            class="neo-progress-fill h-full"
            :style="buildProgressFillStyle(getTrendBarPercent(point))"
          />
        </div>
      </div>

      <!-- Current period bar (fills remaining space) -->
      <div
        :title="`Current: ${currentProgress.summary}`"
        class="neo-progress-track h-3 flex-1 min-w-[40px] overflow-hidden border border-neu-border/30 shadow-sm"
      >
        <div
          class="neo-progress-fill h-full"
          :style="buildProgressFillStyle(localPercent)"
        />
      </div>

      <!-- Count / Rating controls: − + -->
      <template v-if="type === 'count' || type === 'rating' || type === 'adherence'">
        <button
          type="button"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                 border border-neu-border/20 bg-neu-base text-on-surface-variant
                 hover:bg-section hover:text-primary transition-colors
                 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="isSaving || !canDecrement"
          :aria-label="type === 'rating' ? t('planning.components.trackerProgressRow.decreaseRating') : t('planning.components.trackerProgressRow.removeOneCompletion')"
          @click="decrement"
        >
          <MinusIcon class="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full
                 border border-neu-border/20 bg-neu-base text-on-surface-variant
                 hover:bg-section hover:text-primary transition-colors
                 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="isSaving || !canIncrement"
          :aria-label="type === 'rating' ? t('planning.components.trackerProgressRow.increaseRating') : t('planning.components.trackerProgressRow.addOneCompletion')"
          @click="increment"
        >
          <PlusIcon class="h-3.5 w-3.5" />
        </button>
      </template>
    </div>

    <!-- Expanded history table -->
    <div v-if="isExpanded && historyRows.length" class="neo-inset rounded-lg px-2.5 py-2 mt-1">
      <table class="w-full text-[11px]">
        <tbody>
          <tr
            v-for="row in historyRows"
            :key="row.label"
            class="border-b border-neu-border/10 last:border-b-0"
            :class="row.isCurrent ? 'text-on-surface font-semibold' : 'text-on-surface-variant'"
          >
            <td class="py-1 pr-3 whitespace-nowrap">{{ row.label }}</td>
            <td class="py-1 text-right tabular-nums whitespace-nowrap">{{ row.displayValue }}</td>
            <td class="py-1 pl-2 w-16">
              <div class="h-1 rounded-full bg-surface-variant overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :class="row.isCurrent ? 'bg-primary' : 'bg-primary/40'"
                  :style="{ width: `${clampPercent(row.percent)}%` }"
                />
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  ChartBarIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  StarIcon,
} from '@heroicons/vue/24/outline'
import { MinusIcon, PlusIcon } from '@heroicons/vue/20/solid'
import { useT } from '@/composables/useT'

const { t } = useT()
import type { Tracker, TrackerType, TrackerPeriod, TrackerPeriodTick } from '@/domain/planning'
import { trackerPeriodDexieRepository } from '@/repositories/planningDexieRepository'
import { resolveEntryDateWithinPeriod } from '@/services/projectTrackerScope.service'

export interface TrendDataPoint {
  startDate: string
  label: string
  percent: number | null
  summary: string
  value?: number
  numerator?: number
  denominator?: number
}

export interface CurrentProgressData {
  summary: string
  percent: number | null
  numerator?: number
  denominator?: number
  value?: number
}

const props = defineProps<{
  title: string
  type: TrackerType
  currentProgress: CurrentProgressData
  trendData?: TrendDataPoint[]
  tracker: Tracker
  startDate: string
  endDate: string
}>()

const emit = defineEmits<{
  logged: [trackerId: string]
}>()

// ---------- Icon ----------

const iconComponent = computed(() => {
  const map: Record<TrackerType, typeof ChartBarIcon> = {
    count: ChartBarIcon,
    adherence: CheckCircleIcon,
    value: ArrowTrendingUpIcon,
    rating: StarIcon,
    checkin: ChartBarIcon,
  }
  return map[props.type] ?? ChartBarIcon
})

// ---------- Expanded history ----------

const isExpanded = ref(false)

interface HistoryRow {
  label: string
  displayValue: string
  percent: number | null
  isCurrent: boolean
}

function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value)}%`
}

function formatTrendValue(point: TrendDataPoint): string {
  if (props.type === 'count') {
    return `${point.numerator ?? 0}`
  }
  if (props.type === 'rating') {
    if (point.value == null) return '—'
    return `${Math.round(point.value * 10) / 10}/${ratingMax.value}`
  }
  if (props.type === 'adherence') {
    return formatPercent(point.percent)
  }
  // value
  if (point.value == null) return '—'
  const rounded = Math.round(point.value * 10) / 10
  const unit = props.tracker.unit
  return unit ? `${rounded} ${unit}` : `${rounded}`
}

const historyRows = computed<HistoryRow[]>(() => {
  const rows: HistoryRow[] = []

  if (props.trendData) {
    for (const point of props.trendData) {
      rows.push({
        label: point.label,
        displayValue: formatTrendValue(point),
        percent: getTrendBarPercent(point),
        isCurrent: false,
      })
    }
  }

  rows.push({
    label: t('planning.components.trackerProgressRow.current'),
    displayValue: valueLabel.value,
    percent: localPercent.value,
    isCurrent: true,
  })

  return rows
})

// ---------- Local period state (for inline logging) ----------

const period = ref<TrackerPeriod | null>(null)
const isSaving = ref(false)
const valueDraft = ref<number | null>(null)
const isEditingValue = ref(false)
const valueInputRef = ref<HTMLInputElement | null>(null)
let loadToken = 0
let periodCreationPromise: Promise<TrackerPeriod> | null = null

function buildInitialTicks(count: number): TrackerPeriodTick[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    completed: false,
  }))
}

async function loadState() {
  const token = ++loadToken
  try {
    const found = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      props.tracker.id,
      props.startDate,
    )
    if (token !== loadToken) return
    period.value = found ?? null
  } catch {
    // Silently fail — props provide fallback
  }
}

async function ensurePeriod(): Promise<TrackerPeriod> {
  if (period.value) return period.value
  if (periodCreationPromise) return periodCreationPromise

  periodCreationPromise = (async () => {
    const existing = await trackerPeriodDexieRepository.getByTrackerIdAndPeriod(
      props.tracker.id,
      props.startDate,
    )
    if (existing) {
      period.value = existing
      return existing
    }

    const initialTicks =
      props.type === 'adherence'
        ? buildInitialTicks(localTargetCount.value)
        : undefined

    const created = await trackerPeriodDexieRepository.create({
      trackerId: props.tracker.id,
      startDate: props.startDate,
      endDate: props.endDate,
      sourceType: 'manual',
      ticks: initialTicks,
    })

    period.value = created
    return created
  })()

  try {
    return await periodCreationPromise
  } finally {
    periodCreationPromise = null
  }
}

async function persistUpdate(
  update: Partial<Pick<TrackerPeriod, 'ticks' | 'entries' | 'rating' | 'note'>>,
) {
  isSaving.value = true
  try {
    const current = await ensurePeriod()
    const updated = await trackerPeriodDexieRepository.update(current.id, update)
    period.value = updated
    emit('logged', props.tracker.id)
  } catch {
    // Silent fail — UI stays in last known state
  } finally {
    isSaving.value = false
  }
}

// ---------- Count helpers ----------

const localTargetCount = computed(() => {
  if (period.value?.periodTarget && period.value.periodTarget > 0) return period.value.periodTarget
  if (props.tracker.targetCount && props.tracker.targetCount > 0) return props.tracker.targetCount
  return period.value?.ticks?.length ?? (props.currentProgress.denominator ?? 0)
})

const localCompletedCount = computed(() => {
  if (period.value?.ticks) {
    return period.value.ticks.filter((t) => t.completed).length
  }
  return props.currentProgress.numerator ?? 0
})

const localAdherenceCompletedCount = computed(() => {
  if (period.value?.ticks) {
    return period.value.ticks
      .filter((tick) => tick.completed && tick.index < localTargetCount.value)
      .length
  }
  return props.currentProgress.numerator ?? 0
})

// ---------- Rating helpers ----------

const ratingMin = computed(() => props.tracker.ratingScaleMin ?? 1)
const ratingMax = computed(() => props.tracker.ratingScaleMax ?? 10)

const localRating = computed(() => {
  if (period.value?.rating != null) return period.value.rating
  return props.currentProgress.value ?? null
})

// ---------- Count / Adherence helpers ----------

const countScaleMax = computed(() => {
  if (props.type !== 'count') return 0

  const values: number[] = [localCompletedCount.value]
  for (const point of props.trendData ?? []) {
    values.push(point.numerator ?? 0)
  }

  return Math.max(0, ...values)
})

function getTrendBarPercent(point: TrendDataPoint): number | null {
  if (props.type === 'count') {
    const max = countScaleMax.value
    if (max <= 0) return 0
    return ((point.numerator ?? 0) / max) * 100
  }
  return point.percent
}

const localCountPercent = computed(() => {
  const max = countScaleMax.value
  if (props.type !== 'count' || max <= 0) return 0
  return Math.min(100, Math.round((localCompletedCount.value / max) * 100))
})

const localAdherencePercent = computed(() => {
  const target = localTargetCount.value
  if (target <= 0) return 0
  return Math.min(100, Math.round((localAdherenceCompletedCount.value / target) * 100))
})

// ---------- Unified percent for current bar ----------

const localPercent = computed(() => {
  if (props.type === 'count') {
    return localCountPercent.value
  }
  if (props.type === 'rating') {
    if (localRating.value == null) return 0
    const range = ratingMax.value - ratingMin.value
    if (range <= 0) return 0
    return Math.min(100, Math.round(((localRating.value - ratingMin.value) / range) * 100))
  }
  if (props.type === 'adherence') {
    return localAdherencePercent.value
  }
  return Math.max(0, Math.min(100, props.currentProgress.percent ?? 0))
})

// ---------- Value label ----------

const localCurrentValue = computed(() => {
  if (period.value?.entries?.length) {
    const entries = period.value.entries
    return entries[entries.length - 1].value
  }
  return props.currentProgress.value ?? null
})

const valueLabel = computed(() => {
  if (props.type === 'count') {
    return `${localCompletedCount.value}`
  }
  if (props.type === 'rating') {
    if (localRating.value == null) return t('planning.components.trackerProgressRow.noData')
    return `${Math.round(localRating.value * 10) / 10}/${ratingMax.value}`
  }
  if (props.type === 'adherence') {
    return formatPercent(localAdherencePercent.value)
  }
  // value type
  const val = localCurrentValue.value
  if (val == null) return t('planning.components.trackerProgressRow.noData')
  const rounded = Math.round(val * 10) / 10
  const unit = props.tracker.unit
  return unit ? `${rounded} ${unit}` : `${rounded}`
})

// ---------- Value type: inline edit ----------

function startValueEdit() {
  valueDraft.value = localCurrentValue.value
  isEditingValue.value = true
  void nextTick(() => {
    valueInputRef.value?.focus()
    valueInputRef.value?.select()
  })
}

function cancelValueEdit() {
  isEditingValue.value = false
  valueDraft.value = null
}

async function commitValueEdit() {
  if (!isEditingValue.value) return
  isEditingValue.value = false

  if (typeof valueDraft.value !== 'number' || Number.isNaN(valueDraft.value)) {
    valueDraft.value = null
    return
  }

  // Only log if the value actually changed
  if (valueDraft.value === localCurrentValue.value) {
    valueDraft.value = null
    return
  }

  const current = await ensurePeriod()
  const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)
  const entries = [...(current.entries ?? [])]
  entries.push({
    value: valueDraft.value,
    date: entryDate,
  })

  await persistUpdate({ entries })
  valueDraft.value = null
}

// ---------- Value type: sparkline ----------

const svgWidth = 200
const svgHeight = 36
const svgPadding = 4

interface SparkPoint { x: number; y: number }

const sparklinePoints = computed<SparkPoint[]>(() => {
  const allValues: number[] = []

  if (props.trendData) {
    for (const p of props.trendData) {
      if (p.value != null) allValues.push(p.value)
    }
  }
  if (localCurrentValue.value != null) {
    allValues.push(localCurrentValue.value)
  }

  if (allValues.length === 0) return []

  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min || 1

  return allValues.map((value, index) => ({
    x: allValues.length === 1
      ? svgWidth / 2
      : svgPadding + (index / (allValues.length - 1)) * (svgWidth - 2 * svgPadding),
    y: svgPadding + (1 - (value - min) / range) * (svgHeight - 2 * svgPadding),
  }))
})

const historyLinePoints = computed(() => {
  if (sparklinePoints.value.length < 2) return ''
  return sparklinePoints.value
    .slice(0, -1)
    .map((p) => `${p.x},${p.y}`)
    .join(' ')
})

const currentSegmentPoints = computed(() => {
  if (sparklinePoints.value.length < 2) return ''
  const pts = sparklinePoints.value
  return `${pts[pts.length - 2].x},${pts[pts.length - 2].y} ${pts[pts.length - 1].x},${pts[pts.length - 1].y}`
})

const areaPoints = computed(() => {
  if (sparklinePoints.value.length < 2) return ''
  const first = sparklinePoints.value[0]
  const last = sparklinePoints.value[sparklinePoints.value.length - 1]
  const line = sparklinePoints.value.map((p) => `${p.x},${p.y}`).join(' ')
  return `${first.x},${svgHeight} ${line} ${last.x},${svgHeight}`
})

// ---------- Can increment / decrement ----------

const canIncrement = computed(() => {
  if (props.type === 'count') {
    return true
  }
  if (props.type === 'adherence') {
    return localTargetCount.value > 0 && localAdherenceCompletedCount.value < localTargetCount.value
  }
  if (props.type === 'rating') {
    return (localRating.value ?? ratingMin.value) < ratingMax.value
  }
  return false
})

const canDecrement = computed(() => {
  if (props.type === 'count') {
    return localCompletedCount.value > 0
  }
  if (props.type === 'adherence') {
    return localAdherenceCompletedCount.value > 0
  }
  if (props.type === 'rating') {
    return (localRating.value ?? ratingMin.value) > ratingMin.value
  }
  return false
})

// ---------- Actions ----------

async function increment() {
  if (props.type === 'count') {
    const current = await ensurePeriod()
    const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)
    const ticks = [...(current.ticks ?? [])]
    const nextIndex = ticks.reduce((max, tick) => Math.max(max, tick.index), -1) + 1
    ticks.push({
      index: nextIndex,
      completed: true,
      date: entryDate,
    })
    ticks.sort((a, b) => a.index - b.index)
    await persistUpdate({ ticks })
  } else if (props.type === 'adherence') {
    const current = await ensurePeriod()
    const entryDate = resolveEntryDateWithinPeriod(props.startDate, props.endDate)
    const target = Math.max(1, localTargetCount.value)
    const ticks = [...(current.ticks ?? buildInitialTicks(target))]

    for (let index = 0; index < target; index += 1) {
      if (!ticks.some((tick) => tick.index === index)) {
        ticks.push({ index, completed: false })
      }
    }

    const nextIncomplete = ticks
      .filter((tick) => tick.index < target)
      .sort((a, b) => a.index - b.index)
      .find((tick) => !tick.completed)
    if (!nextIncomplete) return

    nextIncomplete.completed = true
    nextIncomplete.date = entryDate

    ticks.sort((a, b) => a.index - b.index)
    await persistUpdate({ ticks })
  } else if (props.type === 'rating') {
    const currentVal = localRating.value ?? ratingMin.value
    const next = Math.min(currentVal + 1, ratingMax.value)
    await persistUpdate({ rating: next })
  }
}

async function decrement() {
  if (props.type === 'count') {
    const current = await ensurePeriod()
    const ticks = [...(current.ticks ?? [])]
    const lastCompleted = [...ticks].reverse().find((t) => t.completed)
    if (!lastCompleted) return
    await persistUpdate({
      ticks: ticks.filter((tick) => tick.index !== lastCompleted.index),
    })
  } else if (props.type === 'adherence') {
    const current = await ensurePeriod()
    const target = Math.max(1, localTargetCount.value)
    const ticks = [...(current.ticks ?? buildInitialTicks(target))]
    const lastCompleted = ticks
      .filter((tick) => tick.completed && tick.index < target)
      .sort((a, b) => b.index - a.index)[0]
    if (!lastCompleted) return

    lastCompleted.completed = false
    lastCompleted.date = undefined

    ticks.sort((a, b) => a.index - b.index)
    await persistUpdate({ ticks })
  } else if (props.type === 'rating') {
    const currentVal = localRating.value ?? ratingMin.value
    const next = Math.max(currentVal - 1, ratingMin.value)
    await persistUpdate({ rating: next })
  }
}

// ---------- Utility ----------

function clampPercent(value: number | null): number {
  if (value == null) return 0
  return Math.max(0, Math.min(100, value))
}

function buildProgressFillStyle(value: number | null): Record<string, string> {
  const width = clampPercent(value)
  return {
    width: `${width}%`,
    minWidth: width > 0 ? '2px' : '0',
  }
}

// ---------- Lifecycle ----------

watch(
  () => [props.tracker.id, props.startDate],
  () => {
    periodCreationPromise = null
    valueDraft.value = null
    isEditingValue.value = false
    isExpanded.value = false
    void loadState()
  },
  { immediate: true },
)
</script>

<style scoped>
.value-input::-webkit-outer-spin-button,
.value-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.value-input {
  -moz-appearance: textfield;
}
</style>
