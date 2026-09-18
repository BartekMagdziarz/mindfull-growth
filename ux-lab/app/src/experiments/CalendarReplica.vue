<template>
  <CalendarSheetReplica v-if="props.variantId === 'sheet-v1'" :preset-id="props.presetId" />
  <CalendarRibbonReplica v-else-if="props.variantId === 'ribbon-v1'" :preset-id="props.presetId" />
  <CalendarMatrixReplica v-else-if="props.variantId === 'matrix-v1'" :preset-id="props.presetId" />
  <CalendarPriorityRhythmReplica v-else-if="props.variantId === 'priority-rhythm-v1'" :preset-id="props.presetId" :variant-id="props.variantId" />
  <CalendarZoomReplica v-else-if="props.variantId === 'zoom-v1'" :preset-id="props.presetId" />
  <p v-else class="calendar-unknown-variant">Nieznany wariant kalendarza: {{ props.variantId }}</p>
</template>

<script setup lang="ts">
import CalendarMatrixReplica from '~lab/experiments/CalendarMatrixReplica.vue'
import CalendarPriorityRhythmReplica from '~lab/experiments/CalendarPriorityRhythmReplica.vue'
import CalendarRibbonReplica from '~lab/experiments/CalendarRibbonReplica.vue'
import CalendarSheetReplica from '~lab/experiments/CalendarSheetReplica.vue'
import CalendarZoomReplica from '~lab/experiments/CalendarZoomReplica.vue'

const props = defineProps<{ presetId: string; variantId: string }>()
</script>
