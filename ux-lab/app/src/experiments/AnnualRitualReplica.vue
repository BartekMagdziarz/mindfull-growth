<template>
  <AnnualRitualSketchbookReplica
    v-if="props.variantId === 'sketchbook-v1'"
    :preset-id="props.presetId"
  />
  <AnnualRitualSketchbookReplica v-else :preset-id="props.presetId" />
</template>

<script setup lang="ts">
import AnnualRitualSketchbookReplica from '~lab/experiments/AnnualRitualSketchbookReplica.vue'

const props = defineProps<{ presetId: string; variantId: string }>()
</script>
