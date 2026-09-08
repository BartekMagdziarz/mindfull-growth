<template>
  <!-- compact: pięć cienkich słupków 1–5 (komórka roku); domyślnie: segmenty per oś -->
  <span v-if="compact" class="compass-bars" :aria-label="label" :title="label" role="img">
    <i v-for="(axis, index) in COMPASS" :key="axis" :style="{ height: `${((values[index] ?? 0) / 5) * 100}%` }" />
  </span>
  <span v-else class="compass-mini" :class="{ 'compass-mini--labels': labels }" :aria-label="label" :title="label" role="img">
    <span v-for="(axis, index) in COMPASS" :key="axis" class="compass-mini__axis">
      <small v-if="labels">{{ axis }}</small>
      <b>
        <i v-for="step in 5" :key="step" :class="{ on: (values[index] ?? 0) >= step }" />
      </b>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { COMPASS } from './rhythmProjections'

const props = defineProps<{ values: (number | null)[]; labels?: boolean; compact?: boolean }>()
const label = computed(() => COMPASS.map((axis, i) => `${axis} ${props.values[i] ?? '–'} / 5`).join(' · '))
</script>

<style scoped>
.compass-bars { display: inline-flex; gap: 3px; align-items: flex-end; height: 28px; }
.compass-bars i { display: inline-block; width: 5px; border-radius: 2px 2px 0 0; background: var(--cp-accent); min-height: 2px; }
.compass-mini { display: inline-flex; gap: 6px; align-items: center; }
.compass-mini--labels { gap: 18px; flex-wrap: wrap; }
.compass-mini__axis { display: inline-flex; align-items: center; gap: 6px; }
.compass-mini__axis small { color: var(--mg-color-muted); font-size: 11px; font-weight: 700; }
.compass-mini__axis b { display: inline-flex; gap: 2px; }
.compass-mini__axis i { display: inline-block; width: 5px; height: 11px; border-radius: 2px; background: var(--cp-mark-dim); }
.compass-mini--labels .compass-mini__axis i { width: 7px; height: 13px; }
.compass-mini__axis i.on { background: var(--cp-accent); }
</style>
