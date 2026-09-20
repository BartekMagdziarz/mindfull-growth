<template>
  <figure class="ls-ribbon" :class="{ 'ls-ribbon--thin': thin, 'ls-ribbon--quiet': quiet }" role="img" :aria-label="aria">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="ls-ribbon__svg" aria-hidden="true">
      <defs>
        <filter :id="washId" x="-5%" y="-30%" width="110%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="2" :seed="seed % 50" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.2 0.8" />
        </filter>
        <!-- smooth transitions: one horizontal gradient with a stop at the centre of every rated week -->
        <linearGradient :id="gradId" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="W" y2="0">
          <stop v-for="stop in gradientStops" :key="stop.offset" :offset="stop.offset" :style="{ stopColor: stop.color }" />
        </linearGradient>
      </defs>

      <!-- ruled paper: 1 · 3 · 5 -->
      <line v-for="n in [1, 3, 5]" :key="n" :x1="0" :x2="W" :y1="y(n)" :y2="y(n)" class="ls-ribbon__rule" />

      <!-- watercolour between the two curves, one piece per unbroken run of rated weeks -->
      <g class="ls-ribbon__wash" :filter="`url(#${washId})`">
        <path v-for="seg in segments" :key="`a-${seg.from}`" :d="seg.area" :style="{ fill: `url(#${gradId})` }" class="ls-ribbon__band" />
      </g>

      <!-- pencil = load, ink = state -->
      <path v-for="seg in segments" :key="`l-${seg.from}`" :d="seg.load" class="ls-ribbon__line ls-ribbon__line--load" />
      <path v-for="seg in segments" :key="`s-${seg.from}`" :d="seg.state" class="ls-ribbon__line ls-ribbon__line--state" />

      <!-- hover / click zones -->
      <rect
        v-for="(p, i) in points"
        :key="`hit-${p.weekRef}`"
        :x="x(i) - step / 2"
        :y="0"
        :width="step"
        :height="H"
        class="ls-ribbon__hit"
        @mouseenter="hover = i"
        @mouseleave="hover = null"
        @click="emit('select', p.weekRef)"
      />
    </svg>
    <div v-if="!quiet && hover !== null" class="ls-ribbon__tip" :style="{ left: `${(x(hover) / W) * 100}%` }">
      <b>{{ points[hover].label }}</b>
      <template v-if="points[hover].load != null && points[hover].state != null">
        <span :style="{ background: pairColor(points[hover].load, points[hover].state), color: pairInk(points[hover].load, points[hover].state) }">
          {{ QUADRANT_LABELS[classifyPair(points[hover].load, points[hover].state).quadrant] }}
        </span>
        <small>obciążenie {{ points[hover].load }} · stan {{ points[hover].state }}</small>
      </template>
      <small v-else>bez refleksji</small>
    </div>
    <div v-if="showAxis" class="ls-ribbon__axis" aria-hidden="true">
      <span v-for="(p, i) in points" :key="p.weekRef">{{ i % tickStep === 0 ? p.label : '' }}</span>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { classifyPair, pairColor, pairInk, QUADRANT_LABELS } from '@/domain/loadState'
import type { WeekPoint } from '@/domain/loadStateSeries'
import type { WeekRef } from '@/domain/period'
import { hashSeed, smoothOpenPath } from '@/utils/sketchPaths'

const props = withDefaults(
  defineProps<{
    /** Chronological points; a `null` pair is a gap (the ribbon breaks there). */
    points: WeekPoint[]
    /** Name used in aria and as the watercolour seed. */
    label?: string
    height?: number
    showAxis?: boolean
    /** Thinner lines for small heights (summary cards, context column). */
    thin?: boolean
    /** No tooltips, default cursor — for cards where the ribbon is a preview. */
    quiet?: boolean
    /** Axis label every N points; defaults by point count (1 / 2 / 4). */
    tickEvery?: number
  }>(),
  { label: '', height: 64, showAxis: false, thin: false, quiet: false, tickEvery: 0 },
)

const emit = defineEmits<{ select: [weekRef: WeekRef] }>()

const uid = useId()
const washId = `ls-wash-${uid}`
const gradId = `ls-grad-${uid}`
const seed = hashSeed(props.label || uid)

const W = 1000
const H = computed(() => props.height)
const padY = 8
const step = computed(() => W / Math.max(props.points.length, 1))
const x = (i: number) => step.value * i + step.value / 2
const y = (v: number) => H.value - padY - ((v - 1) / 4) * (H.value - padY * 2)

const hover = ref<number | null>(null)
const tickStep = computed(() => props.tickEvery || (props.points.length > 16 ? 4 : props.points.length > 8 ? 2 : 1))

const rated = (p: WeekPoint) => p.load != null && p.state != null

interface Segment {
  from: number
  load: string
  state: string
  area: string
}

/** Unbroken runs of rated weeks → separate curves; gaps stay as bare paper. */
const segments = computed<Segment[]>(() => {
  const out: Segment[] = []
  const pts = props.points
  let i = 0
  while (i < pts.length) {
    if (!rated(pts[i])) {
      i++
      continue
    }
    const from = i
    while (i < pts.length && rated(pts[i])) i++
    const to = i - 1
    const run = (key: 'load' | 'state'): [number, number][] => {
      const inner: [number, number][] = []
      for (let k = from; k <= to; k++) inner.push([x(k), y(pts[k][key] as number)])
      // extend to the container edges only when the run touches the series boundary
      if (from === 0) inner.unshift([0, inner[0][1]])
      else inner.unshift([x(from) - step.value / 2, inner[0][1]])
      if (to === pts.length - 1) inner.push([W, inner[inner.length - 1][1]])
      else inner.push([x(to) + step.value / 2, inner[inner.length - 1][1]])
      return inner
    }
    const loadPts = run('load')
    const statePts = run('state')
    const load = smoothOpenPath(loadPts)
    const back = smoothOpenPath([...statePts].reverse())
    out.push({ from, load, state: smoothOpenPath(statePts), area: `${load} L${back.slice(1)} Z` })
  }
  return out
})

const gradientStops = computed(() => {
  const stops = props.points
    .map((p, i) => (rated(p) ? { offset: x(i) / W, color: pairColor(p.load, p.state) } : null))
    .filter((s): s is { offset: number; color: string } => s !== null)
  // an empty gradient renders black — fall back to the neutral tone
  return stops.length ? stops : [{ offset: 0, color: 'rgb(var(--sky-500))' }]
})

const aria = computed(() => {
  const ratedCount = props.points.filter(rated).length
  return `${props.label || 'Obszar'}: ${props.points.length} tygodni, ${ratedCount} z refleksją. Cieńsza linia to obciążenie, grubsza stan; kolor między nimi to ćwiartka tygodnia.`
})
</script>

<style scoped>
.ls-ribbon {
  position: relative;
  display: grid;
  gap: 4px;
  margin: 0;
  min-width: 0;
}
.ls-ribbon__svg {
  display: block;
  width: 100%;
  height: v-bind('`${height}px`');
  overflow: visible;
}
.ls-ribbon__rule {
  stroke: rgb(var(--neo-border) / 0.3);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}
.ls-ribbon--thin .ls-ribbon__rule {
  stroke: rgb(var(--neo-border) / 0.18);
}
.ls-ribbon__wash {
  opacity: 0.8;
  mix-blend-mode: multiply;
}
.ls-ribbon__line {
  fill: none;
  vector-effect: non-scaling-stroke;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.ls-ribbon__line--load {
  stroke: rgb(var(--color-on-surface) / 0.45);
  stroke-width: 1.3;
}
.ls-ribbon__line--state {
  stroke: rgb(var(--sky-800));
  stroke-width: 2;
}
.ls-ribbon--thin .ls-ribbon__line--load {
  stroke-width: 0.8;
}
.ls-ribbon--thin .ls-ribbon__line--state {
  stroke-width: 1.2;
}
.ls-ribbon__hit {
  fill: transparent;
  cursor: pointer;
}
.ls-ribbon--quiet .ls-ribbon__hit {
  cursor: default;
}
.ls-ribbon__tip {
  position: absolute;
  top: -6px;
  transform: translate(-50%, -100%);
  display: grid;
  justify-items: center;
  gap: 2px;
  padding: 6px 9px;
  border-radius: 12px 9px 11px 10px;
  background: rgb(var(--color-on-surface));
  color: white;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 2;
}
.ls-ribbon__tip span {
  padding: 1px 7px;
  border-radius: 999px;
  font-weight: 750;
}
.ls-ribbon__tip small {
  opacity: 0.8;
}
.ls-ribbon__axis {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  color: rgb(var(--neo-muted));
  font-size: 10px;
  font-style: italic;
  text-align: center;
}
</style>
