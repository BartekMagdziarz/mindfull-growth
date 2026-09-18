<template>
  <!-- tydzień: 7 slotów dni; miesiąc: cichy słupek „dni z wpisem / dni miesiąca” -->
  <span v-if="data.daySlots" class="entry-slots" :aria-label="label" :title="label" role="img">
    <i v-for="(on, index) in data.daySlots" :key="index" :class="{ on }" />
  </span>
  <span v-else class="entry-bar" :aria-label="label" :title="label" role="img">
    <i v-if="data.days" :style="{ width: `${Math.max(6, (data.days / data.daysInUnit) * 100)}%` }" />
    <i v-else class="none" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { EntriesProjection } from '~lab/lab/calendarPriorityData'

const props = defineProps<{ data: EntriesProjection['kinds'][keyof EntriesProjection['kinds']]; kindLabel: string }>()
const label = computed(() => `${props.kindLabel}: ${props.data.count} wpisów w ${props.data.days} dniach`)
</script>

<style scoped>
.entry-slots { display: inline-flex; gap: 3px; align-items: center; }
.entry-slots i { display: inline-block; width: 9px; height: 9px; border-radius: 999px; background: rgb(var(--sky-200)); }
.entry-slots i.on { background: rgb(var(--sky-700)); }
.entry-bar { position: relative; display: inline-block; width: 34px; height: 8px; border-radius: 4px; background: rgb(var(--sky-100)); overflow: hidden; }
.entry-bar i { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--cp-accent); }
.entry-bar i.none { width: 100%; background: transparent; }
</style>
