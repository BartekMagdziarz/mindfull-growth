<template>
  <article class="next-object-card">
    <header>
      <span><AppIcon :name="icon" /><strong>{{ title }}</strong></span>
      <em>{{ summary }}</em>
    </header>

    <div v-if="chartKind === 'dots'" class="next-object-card__chart" aria-hidden="true">
      <div class="next-object-card__dots" :style="columnsStyle">
        <i v-for="point in points" :key="point.key" :class="dotState(point)" />
      </div>
      <div class="next-object-card__labels" :style="columnsStyle">
        <span v-for="point in points" :key="point.key">{{ point.label }}</span>
      </div>
    </div>

    <div v-else-if="chartKind === 'bars'" class="next-object-card__chart" aria-hidden="true">
      <div class="next-object-card__bars">
        <i
          v-for="point in points"
          :key="point.key"
          :class="barState(point)"
          :style="{ height: point.value == null ? '2px' : `${barHeight(point.value)}%` }"
        />
      </div>
      <div class="next-object-card__labels" :style="columnsStyle">
        <span v-for="point in points" :key="point.key">{{ point.label }}</span>
      </div>
    </div>

    <div v-else-if="chartKind === 'line'" class="next-object-card__chart">
      <svg viewBox="0 0 500 115" preserveAspectRatio="none" role="img" :aria-label="chartAriaLabel">
        <line v-if="targetY !== null" x1="0" :y1="targetY" x2="500" :y2="targetY" class="next-object-card__target" />
        <path v-if="linePath" class="next-object-card__line-echo" :d="linePathWithOffset" />
        <path v-if="linePath" class="next-object-card__line" :d="linePath" />
        <circle v-if="lastPoint" :cx="lastPoint.x" :cy="lastPoint.y" r="5" />
      </svg>
      <div class="next-object-card__labels" :style="columnsStyle" aria-hidden="true">
        <span v-for="point in points" :key="point.key">{{ point.label }}</span>
      </div>
    </div>

    <div v-else class="next-object-card__chart next-object-card__chart--span" aria-hidden="true">
      <span class="next-object-card__span-track">
        <i :class="`status-${aggregateStatus}`" :style="{ width: `${spanFill}%` }" />
      </span>
      <small>cały miesiąc</small>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MeasurementEntryMode, PlanningCadence } from '@/domain/planning'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { NextObjectChartPoint } from './nextObjectChart'

const props = defineProps<{
  icon: string
  title: string
  summary: string
  entryMode: MeasurementEntryMode
  cadence: PlanningCadence
  scale: 'day' | 'week' | 'month'
  points: NextObjectChartPoint[]
  actualValue?: number
  targetValue?: number
  aggregateStatus?: 'met' | 'missed' | 'no-data' | 'no-target'
}>()

const chartKind = computed<'dots' | 'bars' | 'line' | 'span'>(() => {
  if (props.scale === 'month' && props.cadence === 'monthly') return 'span'
  if (props.entryMode === 'completion' || props.entryMode === 'multi-completion') return 'dots'
  if (props.entryMode === 'counter') return 'bars'
  return 'line'
})
const columnsStyle = computed(() => ({ gridTemplateColumns: `repeat(${Math.max(1, props.points.length)}, minmax(0, 1fr))` }))
const maxValue = computed(() => Math.max(1, props.targetValue ?? 0, ...props.points.map(point => point.value ?? 0)))
const valuesForLine = computed(() => props.points.flatMap((point, index) => point.value == null ? [] : [{ index, value: point.value }]))
const lineRange = computed(() => {
  const values = valuesForLine.value.map(point => point.value)
  if (props.targetValue !== undefined) values.push(props.targetValue)
  if (!values.length) return { min: 0, max: 1 }
  const min = Math.min(...values)
  const max = Math.max(...values)
  return { min, max: max === min ? min + 1 : max }
})
const linePoints = computed(() => valuesForLine.value.map(point => ({
  x: props.points.length <= 1 ? 250 : 5 + point.index * (490 / (props.points.length - 1)),
  y: lineY(point.value),
})))
const linePath = computed(() => pathFor(linePoints.value))
const linePathWithOffset = computed(() => pathFor(linePoints.value, 3))
const lastPoint = computed(() => linePoints.value.at(-1) ?? null)
const targetY = computed(() => props.targetValue === undefined ? null : lineY(props.targetValue))
const spanFill = computed(() => {
  if (props.actualValue === undefined) return 4
  return Math.max(6, Math.min(100, (props.actualValue / Math.max(1, props.targetValue ?? props.actualValue)) * 100))
})
const chartAriaLabel = computed(() => `${props.title}. ${props.summary}`)

function barHeight(value: number): number {
  return Math.max(9, Math.min(96, (value / maxValue.value) * 92))
}
function dotState(point: NextObjectChartPoint): string {
  if (point.future) return 'pending'
  if (point.value !== undefined) return point.status === 'missed' ? 'missed' : 'done'
  return point.assigned ? 'missed' : 'off'
}
function barState(point: NextObjectChartPoint): Record<string, boolean> {
  return { empty: point.value == null, future: Boolean(point.future), current: Boolean(point.current), missed: point.status === 'missed' }
}
function lineY(value: number): number {
  const { min, max } = lineRange.value
  return 18 + ((max - value) / (max - min)) * 68
}
function pathFor(points: Array<{ x: number; y: number }>, offset = 0): string {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(1)} ${(point.y + offset).toFixed(1)}`).join(' ')
}
</script>

<style scoped>
.next-object-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
  min-height: 7.25rem;
  padding: var(--mg-space-3);
  border: 1px solid var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  color: var(--mg-color-ink);
  background: var(--mg-color-paper);
  box-shadow: var(--mg-shadow-raised-sm);
}

.next-object-card > header,
.next-object-card > header > span {
  display: flex;
  align-items: center;
}

.next-object-card > header {
  justify-content: space-between;
  gap: var(--mg-space-3);
  min-width: 0;
  max-width: 100%;
}

.next-object-card > header > span {
  flex: 1 1 auto;
  min-width: 0;
  gap: var(--mg-space-2);
}

.next-object-card > header .material-symbols-outlined {
  flex: 0 0 auto;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-lg);
}

.next-object-card > header strong {
  flex: 1 1 auto;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font-size: var(--mg-font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.next-object-card > header em {
  flex: 0 0 auto;
  color: var(--mg-color-primary-strong);
  font-size: var(--mg-font-size-xs);
  font-style: normal;
  font-weight: 800;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard), transform var(--mg-duration-fast) var(--mg-ease-standard);
}

.next-object-card:hover > header em,
:global(button:hover) > .next-object-card > header em,
:global(button:focus-visible) > .next-object-card > header em {
  opacity: 1;
  transform: translateY(0);
}

.next-object-card__chart {
  display: flex;
  min-width: 0;
  flex-direction: column;
  justify-content: flex-end;
}

.next-object-card__dots {
  display: grid;
  align-items: center;
  gap: var(--mg-space-2);
  min-height: 3.05rem;
  padding: 0.55rem 0.4rem 0.1rem;
}

.next-object-card__dots i {
  position: relative;
  display: grid;
  width: 100%;
  max-width: 3.4rem;
  aspect-ratio: 1;
  place-items: center;
  justify-self: center;
  border-radius: var(--mg-radius-organic-a);
  background: var(--mg-color-border);
}

.next-object-card__dots i:nth-child(even) { border-radius: var(--mg-radius-organic-b); }
.next-object-card__dots i.done { background: var(--mg-color-sky-field); box-shadow: var(--mg-shadow-inset-sm); }
.next-object-card__dots i.done::after {
  width: 70%;
  aspect-ratio: 1;
  border-radius: var(--mg-radius-organic-c);
  background: var(--mg-color-state);
  content: '';
  transform: rotate(-2deg);
}
.next-object-card__dots i.missed { background: var(--mg-color-effort-soft); }
.next-object-card__dots i.pending { border: 1px dashed var(--mg-color-state-soft); background: transparent; }

.next-object-card__bars {
  display: flex;
  align-items: end;
  gap: var(--mg-space-2);
  height: 3.5rem;
  padding: 0.5rem 0.4rem 0.1rem;
}

.next-object-card__bars i {
  flex: 1;
  min-width: 4px;
  border-radius: var(--mg-radius-icon-field-a);
  background: var(--mg-color-sky-field);
  transform: rotate(0.8deg);
}
.next-object-card__bars i:nth-child(even) { background: var(--mg-color-state-soft); transform: rotate(-1.2deg); }
.next-object-card__bars i.current { background: var(--mg-color-state-soft); box-shadow: var(--mg-shadow-raised-sm); }
.next-object-card__bars i.missed { background: var(--mg-color-effort-soft); }
.next-object-card__bars i.empty { align-self: end; border-radius: var(--mg-radius-pill); background: var(--mg-color-border); }
.next-object-card__bars i.future { border: 1px dashed var(--mg-color-state-soft); background: transparent; box-shadow: none; }

.next-object-card__chart > svg {
  width: 100%;
  height: 3.7rem;
  margin-top: 0.1rem;
  overflow: visible;
  fill: none;
}
.next-object-card__line,
.next-object-card__line-echo,
.next-object-card__target { stroke-linecap: round; stroke-linejoin: round; }
.next-object-card__line { stroke: var(--mg-color-state); stroke-width: 3.5; }
.next-object-card__line-echo { stroke: var(--mg-color-sky-field); stroke-width: 7; }
.next-object-card__target { stroke: var(--mg-color-primary); stroke-width: 1; stroke-dasharray: 7 7; }
.next-object-card__chart circle { fill: var(--mg-color-state); }

.next-object-card__labels {
  display: grid;
  padding: 0 0.25rem;
  color: var(--mg-color-muted);
  font-size: var(--mg-font-size-xs);
  font-weight: 700;
  line-height: 1;
  text-align: center;
  opacity: 0;
  transition: opacity var(--mg-duration-fast) var(--mg-ease-standard);
}

.next-object-card:hover .next-object-card__labels,
:global(button:hover) > .next-object-card .next-object-card__labels,
:global(button:focus-visible) > .next-object-card .next-object-card__labels {
  opacity: 1;
}

.next-object-card__chart--span {
  align-items: center;
  gap: var(--mg-space-2);
  min-height: 4rem;
}
.next-object-card__span-track {
  width: 100%;
  height: 0.65rem;
  overflow: hidden;
  border-radius: var(--mg-radius-pill);
  background: var(--mg-color-sky-well);
  box-shadow: var(--mg-shadow-inset-sm);
}
.next-object-card__span-track i { display: block; height: 100%; border-radius: inherit; background: var(--mg-color-state-soft); }
.next-object-card__span-track i.status-missed { background: var(--mg-color-effort-soft); }
.next-object-card__span-track i.status-no-data { background: var(--mg-color-border); }
.next-object-card__chart--span small { color: var(--mg-color-muted); font-size: var(--mg-font-size-xs); }

@media (prefers-reduced-motion: reduce) {
  .next-object-card > header em { transition: none; }
  .next-object-card__labels { transition: none; }
}
</style>
