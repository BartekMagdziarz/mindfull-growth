<template>
  <span class="ratings-mini" :class="{ 'ratings-mini--lg': size === 'lg' }" :aria-label="label" :title="label" role="img">
    <span v-for="(area, index) in AREAS" :key="area" class="ratings-mini__pair">
      <i class="ratings-mini__load" :style="{ height: `${height(load[index])}%` }" />
      <i class="ratings-mini__state" :style="{ height: `${height(state[index])}%`, background: pairColor(toRating(load[index]), toRating(state[index])) }" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { pairColor, toRating } from '@/domain/loadState'
import { AREAS } from './rhythmProjections'

/** Four load/state pairs of one week: load in ink, state in the quadrant colour of the pair. */
const props = defineProps<{ load: (number | null)[]; state: (number | null)[]; size?: 'sm' | 'lg' }>()

function height(value: number | null): number {
  return value === null ? 0 : (value / 5) * 100
}
const label = computed(() => AREAS.map((area, i) => `${area}: obciążenie ${props.load[i] ?? '–'}, stan ${props.state[i] ?? '–'}`).join(' · '))
</script>

<style scoped>
.ratings-mini { display: inline-flex; gap: 6px; align-items: flex-end; height: 36px; }
.ratings-mini--lg { height: 56px; gap: 10px; }
.ratings-mini__pair { display: inline-flex; gap: 2px; align-items: flex-end; height: 100%; }
.ratings-mini__pair i { display: inline-block; width: 6px; border-radius: 2px 2px 0 0; min-height: 0; }
.ratings-mini--lg .ratings-mini__pair i { width: 9px; }
.ratings-mini__load { background: rgb(var(--sky-800)); }
.ratings-mini__state { background: rgb(var(--sky-500)); }
</style>
