<template>
  <figure class="ls-traj" role="img" :aria-label="aria">
    <svg :viewBox="`0 0 ${S} ${S}`" :width="S" :height="S" aria-hidden="true">
      <!-- tło: 5×5 pól w kolorach ćwiartek -->
      <template v-for="row in grid" :key="row[0].state">
        <rect
          v-for="cell in row"
          :key="`${cell.load}-${cell.state}`"
          :x="gx(cell.load)"
          :y="gy(cell.state)"
          :width="cellSize"
          :height="cellSize"
          :style="{ fill: pairColor(cell.load, cell.state, options) }"
          class="ls-traj__cell"
        />
      </template>
      <!-- ślad -->
      <polyline :points="trail" class="ls-traj__trail" />
      <circle v-for="(p, i) in tail" :key="p.weekRef" :cx="px(p.load)" :cy="py(p.state)" :r="i === tail.length - 1 ? 5 : 2.5" class="ls-traj__dot" :class="{ 'ls-traj__dot--now': i === tail.length - 1 }" />
    </svg>
    <figcaption>
      <b>{{ label }}</b>
      <small>ślad {{ tail.length }} tyg. · teraz {{ now?.load ?? '–' }} · {{ now?.state ?? '–' }}</small>
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { legendGrid, pairColor, type ColorOptions, type WeekPoint } from '~lab/lab/weekLoadState'

const props = withDefaults(defineProps<{
  points: WeekPoint[]
  label: string
  weeks?: number
  options?: ColorOptions
}>(), { weeks: 5, options: () => ({}) })

const S = 110
const cellSize = S / 5
const grid = legendGrid()
const gx = (load: number) => (load - 1) * cellSize
const gy = (state: number) => (5 - state) * cellSize
const px = (load: number | null) => gx(load ?? 3) + cellSize / 2
const py = (state: number | null) => gy(state ?? 3) + cellSize / 2

const tail = computed(() => props.points.slice(-props.weeks))
const now = computed(() => tail.value.at(-1))
const trail = computed(() => tail.value.map(p => `${px(p.load)},${py(p.state)}`).join(' '))
const aria = computed(() => `${props.label}: trajektoria ostatnich ${tail.value.length} tygodni na polu obciążenie × stan.`)
</script>

<style scoped>
.ls-traj { display: inline-grid; gap: 6px; margin: 0; justify-items: start; }
.ls-traj svg { border-radius: 18px 14px 17px 15px; overflow: hidden; }
.ls-traj__cell { opacity: 0.5; filter: blur(1.5px); }
.ls-traj__trail { fill: none; stroke: rgb(var(--color-on-surface) / 0.65); stroke-width: 1.3; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 3 2; }
.ls-traj__dot { fill: rgb(var(--color-on-surface) / 0.6); }
.ls-traj__dot--now { fill: rgb(var(--sky-800)); stroke: none; }
.ls-traj figcaption { display: grid; font-size: 11px; }
.ls-traj figcaption small { color: rgb(var(--neo-muted)); }
</style>
