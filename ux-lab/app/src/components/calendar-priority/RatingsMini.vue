<template>
  <span class="ratings-mini" :class="{ 'ratings-mini--lg': size === 'lg' }" :aria-label="label" :title="label" role="img">
    <span v-for="(area, index) in AREAS" :key="area" class="ratings-mini__pair">
      <i class="ratings-mini__effort" :style="{ height: `${height(effort[index])}%` }" />
      <i class="ratings-mini__state" :style="{ height: `${height(state[index])}%` }" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { AREAS } from '~lab/lab/calendarPriorityData'

const props = defineProps<{ effort: (number | null)[]; state: (number | null)[]; size?: 'sm' | 'lg' }>()

function height(value: number | null): number {
  return value === null ? 0 : (value / 5) * 100
}
const label = computed(() => AREAS.map((area, i) => `${area}: wysiłek ${props.effort[i] ?? '–'}, stan ${props.state[i] ?? '–'}`).join(' · '))
</script>

<style scoped>
.ratings-mini { display: inline-flex; gap: 6px; align-items: flex-end; height: 36px; }
.ratings-mini--lg { height: 56px; gap: 10px; }
.ratings-mini__pair { display: inline-flex; gap: 2px; align-items: flex-end; height: 100%; }
.ratings-mini__pair i { display: inline-block; width: 6px; border-radius: 2px 2px 0 0; min-height: 0; }
.ratings-mini--lg .ratings-mini__pair i { width: 9px; }
.ratings-mini__effort { background: rgb(var(--rose-400)); }
.ratings-mini__state { background: var(--cp-accent); }
</style>
