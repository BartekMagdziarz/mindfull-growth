<template>
  <div
    class="month-series"
    :class="[`month-series--${density}`, { 'month-series--axis': usesAxis }]"
    :data-series-kind="series.kind"
    role="img"
    :aria-label="ariaLabel ?? weeksDescription"
  >
    <!-- Axis branch: one shared-scale SVG aligned to the week columns. -->
    <svg
      v-if="usesAxis"
      class="month-series__svg"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgb(var(--neo-chart-primary-start))" stop-opacity="0.85" />
          <stop offset="100%" stop-color="rgb(var(--neo-chart-primary-end))" stop-opacity="0.75" />
        </linearGradient>
      </defs>

      <template v-if="axisRenderer === 'bars'">
        <g v-for="(week, i) in series.weeks" :key="week.columnRef ?? week.weekRef">
          <!-- Per-week target tick (handles differing week overrides). -->
          <line
            v-if="week.targetValue !== undefined && !week.contributionOnly"
            :x1="slotX(i) + slotWidth * 0.08"
            :x2="slotX(i) + slotWidth * 0.92"
            :y1="valueY(week.targetValue)"
            :y2="valueY(week.targetValue)"
            stroke="rgb(var(--color-on-surface-variant))"
            stroke-opacity="0.3"
            stroke-width="1"
            stroke-dasharray="3 2"
          />
          <rect
            v-if="week.actualValue === undefined"
            :x="slotX(i) + (slotWidth - barWidth) / 2"
            :y="chartBottom - 1"
            :width="barWidth"
            height="1"
            rx="0.5"
            fill="rgb(var(--color-outline))"
            fill-opacity="0.25"
          />
          <path
            v-else
            :d="barPath(i, week.actualValue)"
            :fill="`url(#${gradientId})`"
            :opacity="week.phase === 'future' ? 0.45 : 1"
          />
          <text
            v-if="showValues && week.actualValue !== undefined"
            :x="slotX(i) + slotWidth / 2"
            :y="valueY(week.actualValue) - 3"
            text-anchor="middle"
            font-size="9"
            fill="rgb(var(--color-on-surface-variant))"
            fill-opacity="0.75"
          >
            {{ formatValue(week.actualValue) }}
          </text>
        </g>
      </template>

      <template v-else>
        <path
          v-for="(piece, pi) in linePieces"
          :key="pi"
          :d="piece.path"
          fill="none"
          stroke="rgb(var(--neo-chart-primary-end))"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          :stroke-opacity="piece.isFuture ? 0.4 : 0.95"
        />
        <g v-for="(week, i) in series.weeks" :key="week.columnRef ?? week.weekRef">
          <line
            v-if="week.targetValue !== undefined && !week.contributionOnly"
            :x1="slotX(i) + slotWidth * 0.08"
            :x2="slotX(i) + slotWidth * 0.92"
            :y1="valueY(week.targetValue)"
            :y2="valueY(week.targetValue)"
            stroke="rgb(var(--color-on-surface-variant))"
            stroke-opacity="0.3"
            stroke-width="1"
            stroke-dasharray="3 2"
          />
          <circle
            v-if="week.actualValue !== undefined"
            :cx="slotX(i) + slotWidth / 2"
            :cy="valueY(week.actualValue)"
            r="3"
            fill="rgb(var(--neo-chart-primary-end))"
            stroke="rgb(var(--neo-surface-top))"
            stroke-width="1.5"
            :opacity="week.phase === 'future' ? 0.45 : 1"
          />
          <text
            v-if="showValues && week.actualValue !== undefined"
            :x="slotX(i) + slotWidth / 2"
            :y="valueY(week.actualValue) - 6"
            text-anchor="middle"
            font-size="9"
            fill="rgb(var(--color-on-surface-variant))"
            fill-opacity="0.75"
          >
            {{ formatValue(week.actualValue) }}
          </text>
        </g>
      </template>
    </svg>

    <!-- Cells branch: one calm cell per week column. -->
    <div
      v-else
      class="month-series__cells"
      :style="{ gridTemplateColumns: `repeat(${series.weeks.length}, minmax(0, 1fr))` }"
    >
      <div
        v-for="week in series.weeks"
        :key="week.columnRef ?? week.weekRef"
        class="month-series__cell"
        :class="{
          'month-series__cell--future': week.phase === 'future',
          'month-series__cell--current': week.phase === 'current',
          'month-series__cell--inactive': week.inactive,
        }"
        :title="weekTitle(week)"
      >
        <template v-if="week.inactive">
          <span class="month-series__empty">—</span>
        </template>

        <!-- specific-days: 7 fixed Mon–Sun micro slots -->
        <template v-else-if="week.days">
          <div class="month-series__days" aria-hidden="true">
            <span
              v-for="day in week.days"
              :key="day.dayRef"
              class="month-series__day"
              :class="{
                'month-series__day--scheduled': day.scheduled && !day.completed,
                'month-series__day--done': day.completed,
                'month-series__day--outside': !day.inMonth,
              }"
            />
          </div>
        </template>

        <!-- multi-completion: met/partial/empty day strip + MET-days value -->
        <template v-else-if="week.multiDays">
          <div class="month-series__days" aria-hidden="true">
            <span
              v-for="day in week.multiDays"
              :key="day.dayRef"
              class="month-series__day"
              :class="{
                'month-series__day--done': day.state === 'met',
                'month-series__day--partial': day.state === 'partial',
                'month-series__day--outside': !day.inMonth,
              }"
            />
          </div>
          <span class="month-series__value">{{ cellValueText(week) }}</span>
        </template>

        <template v-else-if="week.actualValue !== undefined">
          <!-- completion segments: one pill per target unit -->
          <div v-if="segmentCount(week) > 0" class="month-series__segments" aria-hidden="true">
            <span
              v-for="n in segmentCount(week)"
              :key="n"
              class="month-series__segment"
              :class="{ 'month-series__segment--filled': n <= filledSegments(week) }"
            />
          </div>
          <!-- bullet: quiet progress pill -->
          <div v-else-if="displayKind !== 'count'" class="month-series__bullet" aria-hidden="true">
            <span :style="{ width: `${bulletRatio(week) * 100}%` }" />
          </div>
          <span class="month-series__value">{{ cellValueText(week) }}</span>
        </template>

        <template v-else>
          <span class="month-series__empty">—</span>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import type { MonthV2Series, MonthV2WeekDatum } from '@/services/monthV2Overview'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

const props = withDefaults(
  defineProps<{
    series: MonthV2Series
    chartMode?: MonthChartMode
    density?: MonthDensity
    ariaLabel?: string
  }>(),
  { chartMode: 'hybrid', density: 'comfortable' }
)

const gradientId = `mv2-grad-${useId().replace(/:/g, '')}`

type DisplayKind =
  | 'completion'
  | 'multi'
  | 'scheduled-days'
  | 'bars'
  | 'line'
  | 'rating'
  | 'count'

const displayKind = computed<DisplayKind>(() => {
  switch (props.series.kind) {
    case 'monthly-contribution':
      return props.series.display === 'multi'
        ? 'multi'
        : (props.series.display as DisplayKind)
    case 'completion-progress':
      return 'completion'
    case 'multi-completion':
      return 'multi'
    case 'scheduled-days':
      return 'scheduled-days'
    default:
      return props.series.kind
  }
})

// Cells vs axis: day strips and the "+N" count never render on an axis; the
// capsules variant never uses an axis; the axis variant promotes everything
// else; hybrid keeps completion as cells and puts bars/line/rating on the axis.
const usesAxis = computed(() => {
  const kind = displayKind.value
  if (kind === 'scheduled-days' || kind === 'multi' || kind === 'count') return false
  if (props.chartMode === 'capsules') return false
  if (props.chartMode === 'axis') return true
  return kind === 'bars' || kind === 'line' || kind === 'rating'
})

const axisRenderer = computed(() =>
  displayKind.value === 'line' || displayKind.value === 'rating' ? 'line' : 'bars'
)

// ── Axis geometry ────────────────────────────────────────────────────────────

const SLOT_W = 80
const PAD_TOP = 12
const PAD_BOTTOM = 6

const svgWidth = computed(() => props.series.weeks.length * SLOT_W)
const svgHeight = computed(() => (props.density === 'compact' ? 44 : 60))
const chartBottom = computed(() => svgHeight.value - PAD_BOTTOM)
const slotWidth = SLOT_W
const barWidth = computed(() => SLOT_W * (props.density === 'compact' ? 0.4 : 0.5))
const showValues = computed(() => props.density === 'comfortable')

const scale = computed(() => {
  const s = 'scale' in props.series ? props.series.scale : undefined
  return s ?? { min: 0, max: 1 }
})

function slotX(i: number): number {
  return i * SLOT_W
}

function valueY(value: number): number {
  const { min, max } = scale.value
  const ratio = max > min ? (value - min) / (max - min) : 0
  const clamped = Math.max(0, Math.min(1, ratio))
  const h = chartBottom.value - PAD_TOP
  return chartBottom.value - clamped * h
}

function barPath(i: number, value: number): string {
  const x = slotX(i) + (SLOT_W - barWidth.value) / 2
  const y = valueY(value)
  const w = barWidth.value
  const bottom = chartBottom.value
  const r = Math.min(3, w / 2, Math.max(0, bottom - y))
  return `M${x},${bottom} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${bottom} Z`
}

interface LinePiece {
  path: string
  isFuture: boolean
}

// Contiguous runs of defined values, split so a future tail fades out.
const linePieces = computed<LinePiece[]>(() => {
  const pieces: LinePiece[] = []
  let run: Array<{ x: number; y: number; future: boolean }> = []

  const flush = () => {
    if (run.length < 2) {
      run = []
      return
    }
    const lastSolid = run.reduce((acc, p, i) => (!p.future ? i : acc), -1)
    const toPath = (pts: typeof run) =>
      pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('')
    if (lastSolid <= 0) {
      pieces.push({ path: toPath(run), isFuture: lastSolid === -1 })
    } else if (lastSolid === run.length - 1) {
      pieces.push({ path: toPath(run), isFuture: false })
    } else {
      pieces.push({ path: toPath(run.slice(0, lastSolid + 1)), isFuture: false })
      pieces.push({ path: toPath(run.slice(lastSolid)), isFuture: true })
    }
    run = []
  }

  props.series.weeks.forEach((week, i) => {
    if (week.actualValue === undefined) {
      flush()
      return
    }
    run.push({
      x: slotX(i) + SLOT_W / 2,
      y: valueY(week.actualValue),
      future: week.phase === 'future',
    })
  })
  flush()
  return pieces
})

// ── Cell helpers ─────────────────────────────────────────────────────────────

function segmentCount(week: MonthV2WeekDatum): number {
  if (displayKind.value !== 'completion') return 0
  if (week.targetValue === undefined || week.targetValue <= 0 || week.targetValue > 7) return 0
  return Math.round(week.targetValue)
}

function filledSegments(week: MonthV2WeekDatum): number {
  return Math.min(segmentCount(week), Math.round(week.actualValue ?? 0))
}

function bulletRatio(week: MonthV2WeekDatum): number {
  const value = week.actualValue ?? 0
  const reference = week.targetValue ?? scale.value.max
  if (reference <= 0) return 0
  return Math.max(0, Math.min(1, value / reference))
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function cellValueText(week: MonthV2WeekDatum): string {
  if (week.actualValue === undefined) return '—'
  const prefix = week.contributionOnly ? '+' : ''
  const target =
    !week.contributionOnly && week.targetValue !== undefined
      ? `/${formatValue(week.targetValue)}`
      : ''
  return `${prefix}${formatValue(week.actualValue)}${target}`
}

function weekTitle(week: MonthV2WeekDatum): string {
  return `${week.columnRef ?? week.weekRef}: ${week.inactive ? '—' : cellValueText(week)}`
}

const weeksDescription = computed(() =>
  props.series.weeks.map((week) => weekTitle(week)).join(', ')
)
</script>

<style scoped>
.month-series {
  min-width: 0;
}

.month-series__svg {
  display: block;
  height: 60px;
  width: 100%;
}

.month-series--compact .month-series__svg {
  height: 44px;
}

.month-series__cells {
  display: grid;
  gap: 8px; /* mirrors the week-head column gap so cells align with the axis */
  min-height: 44px;
}

.month-series--compact .month-series__cells {
  min-height: 36px;
}

.month-series__cell {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
  min-width: 0;
  opacity: 0.9;
  padding-inline: 4px;
}

.month-series__cell--future {
  opacity: 0.42;
}

.month-series__cell--current {
  opacity: 1;
}

.month-series__cell--inactive {
  opacity: 0.3;
}

.month-series__days {
  display: grid;
  gap: 2px;
  grid-template-columns: repeat(7, 1fr);
  width: 100%;
}

.month-series__day {
  background: rgb(var(--neo-border) / 0.35);
  border-radius: 3px;
  height: 7px;
}

.month-series__day--scheduled {
  background: transparent;
  box-shadow: inset 0 0 0 1px rgb(var(--neo-chart-primary-end) / 0.5);
}

.month-series__day--done {
  background: rgb(var(--neo-chart-primary-end) / 0.85);
}

.month-series__day--partial {
  background: rgb(var(--neo-chart-primary-end) / 0.35);
}

.month-series__day--outside {
  opacity: 0.25;
}

.month-series__segments {
  display: flex;
  gap: 3px;
  width: 100%;
}

.month-series__segment {
  background: rgb(var(--neo-inset-dark) / 0.35);
  border-radius: 4px;
  box-shadow:
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.35),
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6);
  flex: 1;
  height: 8px;
}

.month-series__segment--filled {
  background: linear-gradient(
    90deg,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  box-shadow: none;
}

.month-series__bullet {
  background: rgb(var(--neo-inset-dark) / 0.25);
  border-radius: 999px;
  box-shadow:
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.35),
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6);
  height: 8px;
  overflow: hidden;
  width: 100%;
}

.month-series__bullet > span {
  background: linear-gradient(
    90deg,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  border-radius: inherit;
  display: block;
  height: 100%;
  min-width: 2px;
}

.month-series__value {
  color: rgb(var(--neo-muted));
  font-size: 9px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.month-series__empty {
  color: rgb(var(--neo-muted));
  font-size: 10px;
  opacity: 0.55;
}
</style>
