<template>
  <!-- Ta sama gramatyka wykresów co NextObjectChartCard w produkcie:
       kropki dni (wykonania), słupki dni (liczniki), linia z celem (wartości/oceny),
       pasmo „cały miesiąc” (kadencja miesięczna) — zawsze na osi dni tygodnia. -->
  <div class="ac-ochart">
    <div v-if="chart.kind === 'dots'" class="ac-ochart__week" aria-hidden="true">
      <div class="ac-ochart__dots" :style="axisColumns"><i v-for="(cell, index) in chart.cells" :key="index" :class="cell" /></div>
      <div class="ac-ochart__axis" :style="axisColumns"><span v-for="label in chart.axisLabels" :key="label">{{ label }}</span></div>
    </div>

    <div v-else-if="chart.kind === 'bars'" class="ac-ochart__week" aria-hidden="true">
      <div class="ac-ochart__bars">
        <i
          v-for="(bar, index) in chart.bars"
          :key="index"
          :style="{ height: bar.empty ? '2px' : `${bar.height}%`, transform: `rotate(${index % 2 ? '-1.2deg' : '.8deg'})` }"
          :class="{ current: bar.current, empty: bar.empty }"
        />
      </div>
      <div class="ac-ochart__axis" :style="axisColumns"><span v-for="label in chart.axisLabels" :key="label">{{ label }}</span></div>
    </div>

    <div v-else-if="chart.kind === 'line'" class="ac-ochart__week">
      <svg class="ac-ochart__line" viewBox="0 0 500 115" role="img" :aria-label="`Przebieg: ${item.title}`" preserveAspectRatio="none">
        <line v-if="chart.targetY !== null" x1="0" :y1="chart.targetY" x2="500" :y2="chart.targetY" class="target-line" />
        <path v-if="chart.line.length > 1" class="pencil-echo" :d="smoothPath(chart.line, 3)" />
        <path v-if="chart.line.length > 1" :d="smoothPath(chart.line)" />
        <circle v-if="chart.line.length" :cx="chart.line.at(-1)!.x" :cy="chart.line.at(-1)!.y" r="5" />
      </svg>
      <div class="ac-ochart__axis" aria-hidden="true" :style="axisColumns"><span v-for="label in chart.axisLabels" :key="label">{{ label }}</span></div>
    </div>

    <div v-else class="ac-ochart__week" aria-hidden="true">
      <div class="ac-ochart__span">
        <span class="ac-ochart__track"><i :class="`fill-${chart.span.status}`" :style="{ width: `${chart.span.fillPct}%` }" /></span>
        <small>{{ chart.spanLabel }}</small>
      </div>
    </div>

    <em v-if="withSummary" class="ac-ochart__summary">{{ chart.summary }}</em>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LabFixtureObject } from '@product/dev/richVerificationScenario'
import { objectWeekChart, smoothPath, type LiveDayEntry } from '~lab/lab/actionConceptData'
import { useLabStore } from '~lab/stores/lab.store'

const props = withDefaults(defineProps<{ item: LabFixtureObject; withSummary?: boolean; live?: LiveDayEntry }>(), { withSummary: false, live: undefined })
const labStore = useLabStore()
const chart = computed(() => objectWeekChart(labStore.fixture, props.item, props.live))
const axisColumns = computed(() => ({ gridTemplateColumns: `repeat(${chart.value.axisLabels.length}, minmax(0, 1fr))` }))
</script>

<style scoped>
.ac-ochart { display: grid; gap: 3px; width: 100%; max-width: 320px; }
.ac-ochart__week { display: grid; gap: 4px; }

.ac-ochart__dots { display: grid; gap: 5px; justify-items: center; }
.ac-ochart__dots i { width: 13px; height: 13px; border-radius: 49% 51% 45% 55% / 54% 46% 53% 47%; }
.ac-ochart__dots i.done { background: rgb(var(--sky-600)); }
.ac-ochart__dots i.missed { background: rgb(var(--rose-400) / .8); }
.ac-ochart__dots i.assigned { border: 1.5px solid rgb(var(--sky-500) / .7); background: transparent; }
.ac-ochart__dots i.unassigned { background: rgb(var(--neo-border) / .3); }

.ac-ochart__bars { display: flex; gap: 7px; align-items: flex-end; height: 44px; padding: 0 2px; }
.ac-ochart__bars i { flex: 1; border-radius: 6px 8px 2px 3px; background: rgb(var(--sky-300) / .85); }
.ac-ochart__bars i.current { background: rgb(var(--sky-600)); }
.ac-ochart__bars i.empty { background: rgb(var(--neo-border) / .3); }

.ac-ochart__line { width: 100%; height: 52px; }
.ac-ochart__line path { fill: none; stroke: rgb(var(--sky-600)); stroke-width: 4; stroke-linecap: round; }
.ac-ochart__line path.pencil-echo { stroke: rgb(var(--sky-300) / .55); stroke-width: 5.5; }
.ac-ochart__line circle { fill: rgb(var(--sky-700)); }
.target-line { stroke: rgb(var(--neo-border) / .55); stroke-width: 2; stroke-dasharray: 8 8; }

.ac-ochart__span { display: grid; gap: 4px; padding: 6px 2px 2px; }
.ac-ochart__track { display: block; overflow: hidden; height: 11px; border-radius: 7px 9px 6px 8px; background: rgb(var(--neo-border) / .22); }
.ac-ochart__track i { display: block; height: 100%; border-radius: inherit; }
.ac-ochart__track i.fill-met { background: rgb(var(--sky-500) / .85); }
.ac-ochart__track i.fill-missed { background: rgb(var(--rose-400) / .7); }
.ac-ochart__track i.fill-no-target { background: rgb(var(--sky-300) / .7); }
.ac-ochart__track i.fill-empty { background: rgb(var(--neo-border) / .35); }
.ac-ochart__span small { color: rgb(var(--neo-muted)); font-size: 7.5px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }

.ac-ochart__axis { display: grid; justify-items: center; }
.ac-ochart__axis span { color: rgb(var(--neo-muted)); font-size: 7px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }

.ac-ochart__summary { color: rgb(var(--neo-muted)); font-size: 8px; font-style: normal; font-weight: 750; }
</style>
