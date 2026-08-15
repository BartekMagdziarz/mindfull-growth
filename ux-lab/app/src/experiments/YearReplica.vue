<template>
  <MonthSketchbookReplica :preset-id="props.presetId" initial-scale="year" />
</template>

<script setup lang="ts">
import MonthSketchbookReplica from '~lab/experiments/MonthSketchbookReplica.vue'

const props = defineProps<{ presetId: string; variantId?: string }>()
</script>
