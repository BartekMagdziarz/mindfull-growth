<template>
  <i
    v-if="status !== 'none'"
    class="ritual-dot"
    :class="`ritual-dot--${status}`"
    :title="label"
    :aria-label="label"
    role="img"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ritualLabel, type PeriodMetrics, type RitualStatus } from '~lab/lab/calendarConceptData'

const props = defineProps<{ status: RitualStatus; kind: PeriodMetrics['kind'] }>()
const label = computed(() => ritualLabel(props.status, props.kind))
</script>

<style scoped>
.ritual-dot { display: inline-block; width: 6px; height: 6px; border-radius: 999px; flex: none; }
.ritual-dot--done { background: rgb(var(--sky-700)); }
.ritual-dot--missing { box-shadow: inset 0 0 0 1.5px rgb(var(--rose-300)); }
.ritual-dot--due { background: rgb(var(--sky-400)); box-shadow: 0 0 0 2px rgb(var(--sky-200) / .8); }
.ritual-dot--planned { border: 1px dashed rgb(var(--sky-500)); box-sizing: border-box; }
</style>
