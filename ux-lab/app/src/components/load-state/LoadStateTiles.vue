<template>
  <span class="ls-tiles" :class="{ 'ls-tiles--lg': size === 'lg', 'ls-tiles--column': direction === 'column' }" role="img" :aria-label="aria">
    <span
      v-for="area in AREA_KEYS"
      :key="area"
      class="ls-tiles__tile"
      :style="{ background: pairColor(pairs[area].load, pairs[area].state, options) }"
      :title="`${AREA_LABELS[area]}: obciążenie ${pairs[area].load ?? '–'}, stan ${pairs[area].state ?? '–'}`"
    >
      <i v-if="ticks" class="ls-tiles__ticks" aria-hidden="true">
        <b v-for="n in tickCount(pairs[area].load)" :key="n" />
      </i>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AREA_KEYS, AREA_LABELS, classifyPair, pairColor, QUADRANT_LABELS, type AreaKey, type ColorOptions, type LoadStatePair } from '~lab/lab/weekLoadState'

const props = withDefaults(defineProps<{
  pairs: Record<AreaKey, LoadStatePair>
  size?: 'sm' | 'lg'
  direction?: 'row' | 'column'
  /** Kreski obciążenia (1–3) jako zdublowanie koloru. */
  ticks?: boolean
  options?: ColorOptions
}>(), { size: 'sm', direction: 'row', ticks: false, options: () => ({}) })

const tickCount = (load: number | null) => (load == null ? 0 : load <= 2 ? 1 : load === 3 ? 2 : 3)
const aria = computed(() => AREA_KEYS.map(a => `${AREA_LABELS[a]} ${QUADRANT_LABELS[classifyPair(props.pairs[a].load, props.pairs[a].state, props.options.midpoint).quadrant]}`).join(', '))
</script>

<style scoped>
.ls-tiles { display: inline-grid; grid-auto-flow: column; gap: 3px; }
.ls-tiles--column { grid-auto-flow: row; }
.ls-tiles__tile { position: relative; display: inline-block; width: 12px; height: 12px; border-radius: 48% 52% 44% 56% / 47% 53% 46% 54%; transform: rotate(-3deg); }
.ls-tiles__tile:nth-child(2) { border-radius: 54% 46% 52% 48% / 44% 56% 48% 52%; transform: rotate(2deg); }
.ls-tiles__tile:nth-child(3) { border-radius: 46% 54% 50% 50% / 55% 45% 55% 45%; transform: rotate(4deg); }
.ls-tiles__tile:nth-child(4) { border-radius: 52% 48% 46% 54% / 50% 46% 54% 50%; transform: rotate(-1deg); }
.ls-tiles--lg .ls-tiles__tile { width: 22px; height: 22px; }
.ls-tiles__ticks { position: absolute; left: 2px; right: 2px; bottom: 1px; display: flex; gap: 1px; justify-content: center; }
.ls-tiles__ticks b { width: 2px; height: 3px; border-radius: 1px; background: rgb(var(--color-on-surface) / 0.55); }
.ls-tiles--lg .ls-tiles__ticks { bottom: 3px; gap: 2px; }
.ls-tiles--lg .ls-tiles__ticks b { width: 3px; height: 4px; }
</style>
