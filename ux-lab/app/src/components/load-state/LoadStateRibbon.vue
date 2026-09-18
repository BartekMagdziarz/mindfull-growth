<template>
  <figure class="ls-ribbon" role="img" :aria-label="aria">
    <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="ls-ribbon__svg" aria-hidden="true">
      <defs>
        <filter :id="washId" x="-5%" y="-30%" width="110%" height="160%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.09" numOctaves="2" :seed="seed % 50" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="7" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation="1.2 0.8" />
        </filter>
        <clipPath v-for="(p, i) in points" :id="`${clipId}-${i}`" :key="p.weekRef">
          <rect :x="x(i) - step / 2" :y="-20" :width="step" :height="H + 40" />
        </clipPath>
        <!-- płynne przejścia: gradient poziomy ze stopem w środku każdego tygodnia -->
        <linearGradient :id="gradId" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="W" y2="0">
          <stop v-for="(p, i) in points" :key="p.weekRef" :offset="x(i) / W" :style="{ stopColor: bandColor(i) }" />
        </linearGradient>
      </defs>

      <!-- papier w linie: 1 · 3 · 5, bardzo blado -->
      <line v-for="n in [1, 3, 5]" :key="n" :x1="0" :x2="W" :y1="y(n)" :y2="y(n)" class="ls-ribbon__rule" />

      <!-- akwarela: jedno pole między krzywymi, przycięte na tydzień i zabarwione jego ćwiartką -->
      <g class="ls-ribbon__wash" :filter="`url(#${washId})`">
        <path v-if="transition === 'smooth'" :d="areaPath" :style="{ fill: `url(#${gradId})` }" class="ls-ribbon__band" />
        <path
          v-for="(p, i) in points"
          v-else
          :key="p.weekRef"
          :d="areaPath"
          :clip-path="`url(#${clipId}-${i})`"
          :style="{ fill: bandColor(i) }"
          class="ls-ribbon__band"
          :class="{ 'ls-ribbon__band--hover': hover === i }"
        />
      </g>

      <!-- ołówek = obciążenie, atrament = stan -->
      <path :d="loadPath" class="ls-ribbon__line ls-ribbon__line--load" />
      <path :d="statePath" class="ls-ribbon__line ls-ribbon__line--state" />

      <!-- strefy hover -->
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
      />
    </svg>
    <div v-if="hover !== null" class="ls-ribbon__tip" :style="{ left: `${(x(hover) / W) * 100}%` }">
      <b>{{ points[hover].label }}</b>
      <span :style="{ background: bandColor(hover), color: pairInk(points[hover].load, points[hover].state, options) }">
        {{ QUADRANT_LABELS[classifyPair(points[hover].load, points[hover].state, options.midpoint).quadrant] }}
      </span>
      <small>obciążenie {{ points[hover].load ?? '–' }} · stan {{ points[hover].state ?? '–' }}</small>
    </div>
    <div v-if="showAxis" class="ls-ribbon__axis" aria-hidden="true">
      <span v-for="(p, i) in points" :key="p.weekRef">{{ i % tickEvery === 0 ? p.label : '' }}</span>
    </div>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { classifyPair, pairColor, pairInk, QUADRANT_LABELS, type ColorOptions, type WeekPoint } from '~lab/lab/weekLoadState'
import { hashSeed, smoothOpenPath } from '~lab/lab/sketch'

const props = withDefaults(defineProps<{
  points: WeekPoint[]
  label?: string
  height?: number
  showAxis?: boolean
  options?: ColorOptions
  /** Przejścia koloru między tygodniami: cięcie na granicy tygodnia albo gradient między środkami tygodni. */
  transition?: 'sharp' | 'smooth'
}>(), { label: '', height: 64, showAxis: false, options: () => ({}), transition: 'sharp' })

const uid = useId()
const washId = `rwash-${uid}`
const clipId = `rclip-${uid}`
const gradId = `rgrad-${uid}`
const seed = hashSeed(props.label || uid)

const W = 1000
const H = computed(() => props.height)
const padY = 8
const step = computed(() => W / Math.max(props.points.length, 1))
const x = (i: number) => step.value * i + step.value / 2
const y = (v: number) => H.value - padY - ((v - 1) / 4) * (H.value - padY * 2)

const hover = ref<number | null>(null)
const tickEvery = computed(() => (props.points.length > 16 ? 4 : props.points.length > 8 ? 2 : 1))

const valueAt = (i: number, key: 'load' | 'state'): number => props.points[i]?.[key] ?? 3
const pts = (key: 'load' | 'state'): [number, number][] => {
  const inner = props.points.map((_, i) => [x(i), y(valueAt(i, key))] as [number, number])
  // przedłużenie do brzegów, żeby wstęga nie urywała się w połowie pierwszego/ostatniego tygodnia
  return [[0, inner[0]?.[1] ?? y(3)], ...inner, [W, inner.at(-1)?.[1] ?? y(3)]]
}
const loadPath = computed(() => smoothOpenPath(pts('load')))
const statePath = computed(() => smoothOpenPath(pts('state')))
/** Obszar między krzywymi: obciążenie w przód, stan wstecz. */
const areaPath = computed(() => {
  const back = smoothOpenPath([...pts('state')].reverse())
  return `${loadPath.value} L${back.slice(1)} Z`
})

const bandColor = (i: number) => pairColor(props.points[i].load, props.points[i].state, props.options)
const aria = computed(() => `${props.label || 'Obszar'}: ${props.points.length} tygodni, cieńsza linia obciążenia i grubsza linia stanu, akwarela między nimi w kolorze ćwiartki tygodnia.`)
</script>

<style scoped>
.ls-ribbon { position: relative; display: grid; gap: 4px; margin: 0; }
.ls-ribbon__svg { display: block; width: 100%; height: v-bind('`${height}px`'); overflow: visible; }
.ls-ribbon__rule { stroke: rgb(var(--neo-border) / 0.3); stroke-width: 1; vector-effect: non-scaling-stroke; }
.ls-ribbon__wash { opacity: 0.8; mix-blend-mode: multiply; }
.ls-ribbon__band { transition: opacity 120ms ease; }
.ls-ribbon__band--hover { opacity: 1; filter: saturate(1.25); }
.ls-ribbon__line { fill: none; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
.ls-ribbon__line--load { stroke: rgb(var(--color-on-surface) / 0.45); stroke-width: 1.3; }
.ls-ribbon__line--state { stroke: rgb(var(--sky-800)); stroke-width: 2; }
.ls-ribbon__hit { fill: transparent; cursor: crosshair; }
.ls-ribbon__tip { position: absolute; top: -6px; transform: translate(-50%, -100%); display: grid; justify-items: center; gap: 2px; padding: 6px 9px; border-radius: 12px 9px 11px 10px; background: rgb(var(--color-on-surface)); color: white; font-size: 11px; white-space: nowrap; pointer-events: none; z-index: 2; }
.ls-ribbon__tip span { padding: 1px 7px; border-radius: 999px; font-weight: 750; }
.ls-ribbon__tip small { opacity: 0.8; }
.ls-ribbon__axis { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; color: rgb(var(--neo-muted)); font-size: 10px; font-style: italic; text-align: center; }
</style>
