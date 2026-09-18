<template>
  <!-- Jedna warstwa na cały wiersz: linia (punkt / ocena) albo słupki podjednostek, rozciągnięta na wszystkie kolumny. -->
  <svg class="sl" :class="{ 'sl--bars': bars, 'sl--observation': series.evidenceRole === 'observation' }" :style="{ '--dot': `${dotSize}px`, '--ring': `${dotSize + 4.5}px`, '--bar': `${barSize}px` }" :viewBox="`0 0 ${width} ${HEIGHT}`" preserveAspectRatio="none" aria-hidden="true">
    <path v-for="c in columns - 1" :key="`sep-${c}`" class="sl-sep" :d="`M ${c * COL} 6 L ${c * COL} ${HEIGHT - 6}`" />
    <path v-if="bars" class="sl-base" :d="baseline" />
    <template v-for="(t, c) in targets" :key="`t-${c}`">
      <path v-if="t !== null" class="sl-target" :d="`M ${c * COL + 6} ${y(t)} L ${(c + 1) * COL - 6} ${y(t) + 0.4}`" />
    </template>

    <template v-if="bars">
      <path v-for="n in nodes" :key="`be-${n.key}`" class="sl-bar-echo" :d="barPath(n)" transform="translate(0.7 1.1)" />
      <path v-for="n in nodes" :key="n.key" class="sl-bar" :d="barPath(n)" @click="emit('select', n.unitRef)"><title>{{ n.title }}</title></path>
    </template>
    <template v-else>
      <path v-for="(d, i) in bridges" :key="`b-${i}`" class="sl-bridge" :d="d" />
      <path v-for="(d, i) in segments" :key="`e-${i}`" class="sl-echo" :d="d" transform="translate(0.6 0.9)" />
      <path v-for="(d, i) in segments" :key="`s-${i}`" class="sl-line" :d="d" />
      <path v-for="n in nodes" :key="`r-${n.key}`" class="sl-ring" :d="`M ${n.x} ${y(n.value)} l 0.01 0`" />
      <path v-for="n in nodes" :key="n.key" class="sl-dot" :d="`M ${n.x} ${y(n.value)} l 0.01 0`" @click="emit('select', n.unitRef)"><title>{{ n.title }}</title></path>
    </template>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { isLineKind, seriesAxis, type Grain, type SeriesProjection } from '~lab/lab/calendarPriorityData'

const props = defineProps<{ series: SeriesProjection; grain: Grain; unitLabels: string[] }>()
const emit = defineEmits<{ select: [unitRef: string] }>()

const COL = 100
const HEIGHT = 100
const PAD = 14

const columns = computed(() => props.series.points.length)
const width = computed(() => columns.value * COL)
const bars = computed(() => !isLineKind(props.series.markKind))
const baseY = HEIGHT - PAD

interface Node { key: string; x: number; value: number; unitRef: string; title: string; slot: number; col: number }
/** Sloty czasu w kolejności (null = brak zapisu w slocie); węzły tylko dla wartości. */
const slots = computed<{ x: number; value: number | null; future: boolean; unitRef: string; title: string; col: number }[]>(() => {
  const out: { x: number; value: number | null; future: boolean; unitRef: string; title: string; col: number }[] = []
  props.series.points.forEach((point, c) => {
    const label = props.unitLabels[c] ?? point.unitRef
    if (props.grain === 'fine' && point.samples?.length) {
      const n = point.samples.length
      point.samples.forEach((sample, i) => out.push({ x: c * COL + (i + 0.5) * COL / n, value: sample.value, future: sample.future, unitRef: point.unitRef, title: `${sample.label}: ${sample.value === null ? 'brak zapisu' : format(sample.value)}`, col: c }))
    } else {
      out.push({ x: c * COL + COL / 2, value: point.value, future: point.state === 'future', unitRef: point.unitRef, title: `${label}: ${point.readout}`, col: c })
    }
  })
  return out
})
/** Gęstość slotów na kolumnę: 52 tygodnie roku dostają mniejsze kropki i słupki niż 12 miesięcy. */
const density = computed(() => slots.value.length / Math.max(1, columns.value))
const dotSize = computed(() => (density.value > 6 ? 4.5 : density.value > 3 ? 6 : 7.5))
const barSize = computed(() => (density.value > 6 ? 4 : density.value > 3 ? 5.5 : 7))
const nodes = computed<Node[]>(() => slots.value.flatMap((s, i) => s.value === null ? [] : [{ key: `${s.unitRef}-${i}`, x: s.x, value: s.value, unitRef: s.unitRef, title: s.title, slot: i, col: s.col }]))
/** Cel per kolumna: tylko dla linii (cel słupków dotyczy sumy okresu, nie podjednostek) i tylko do zegara. */
const targets = computed(() => props.series.points.map(p => (bars.value || p.state === 'future' ? null : p.target)))

const axis = computed(() => seriesAxis(props.series, props.grain))
function y(value: number): number {
  const span = Math.max(axis.value.max - axis.value.min, 1e-9)
  return baseY - Math.max(0, Math.min(1, (value - axis.value.min) / span)) * (HEIGHT - 2 * PAD)
}
function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',') }

/**
 * Odcinki łączą kolejne punkty z tej samej lub sąsiedniej kolumny (rzadkie pomiary w tygodniu to nie luka);
 * mostek (kreskowany, bez interpolacji wartości) tylko tam, gdzie cała kolumna między nimi jest bez zapisu.
 */
const connected = (a: Node, b: Node) => b.col - a.col <= 1
const segments = computed(() => nodes.value.flatMap((n, i) => {
  const next = nodes.value[i + 1]
  if (!next || !connected(n, next)) return []
  return [curve(n.x, y(n.value), next.x, y(next.value), i)]
}))
const bridges = computed(() => nodes.value.flatMap((n, i) => {
  const next = nodes.value[i + 1]
  if (!next || connected(n, next)) return []
  return [`M ${n.x} ${y(n.value)} L ${next.x} ${y(next.value)}`]
}))
/** Słupek lekko pochylony i z rzadka odchylony — jak kreska ołówkiem, nie z linijki. */
function barPath(n: Node): string {
  const lean = ((n.slot * 7) % 5 - 2) * 0.12
  return `M ${n.x} ${baseY} L ${n.x + lean} ${y(n.value)}`
}
/** Linia bazowa: delikatna fala zamiast prostej. */
const baseline = computed(() => {
  const segs = Math.max(2, columns.value * 2)
  const step = (width.value - 8) / segs
  let d = `M 4 ${baseY}`
  for (let i = 0; i < segs; i++) d += ` Q ${4 + step * (i + 0.5)} ${baseY + (i % 2 ? 0.7 : -0.7)} ${4 + step * (i + 1)} ${baseY}`
  return d
})
function curve(x1: number, y1: number, x2: number, y2: number, i: number): string {
  return `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${(y1 + y2) / 2 + (i % 2 ? -1.4 : 1.4)} ${x2} ${y2}`
}
</script>

<style scoped>
.sl { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.sl path { fill: none; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.sl-sep { stroke: rgb(var(--neo-border) / .22); stroke-width: 1; stroke-dasharray: 2 4; }
.sl-base { stroke: rgb(var(--sky-700) / .35); stroke-width: 1.2; }
.sl-target { stroke: var(--cp-accent-strong); stroke-width: 1.25; stroke-dasharray: 3 4; }
.sl-line { stroke: rgb(var(--sky-700)); stroke-width: 2; }
.sl-echo { stroke: rgb(var(--sky-400) / .35); stroke-width: 3.2; }
.sl-bridge { stroke: rgb(var(--sky-400) / .7); stroke-width: 1.2; stroke-dasharray: 2 5; }
.sl-ring { stroke: rgb(var(--color-background)); stroke-width: var(--ring, 12px); }
.sl-dot { stroke: rgb(var(--sky-800)); stroke-width: var(--dot, 7.5px); pointer-events: visibleStroke; cursor: pointer; }
.sl-bar { stroke: var(--cp-accent); stroke-width: var(--bar, 7px); pointer-events: visibleStroke; cursor: pointer; }
.sl-bar-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: var(--bar, 7px); }
.sl-bar:hover, .sl-dot:hover { stroke: rgb(var(--sky-900, var(--sky-800))); }
.sl--observation .sl-line { stroke: var(--cp-accent-strong); }
.sl--observation .sl-dot { stroke: rgb(var(--sky-700)); }
.sl--bars .sl-target { stroke-dasharray: 3 3; }
</style>
