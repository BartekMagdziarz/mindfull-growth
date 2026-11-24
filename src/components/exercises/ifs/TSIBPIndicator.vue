<template>
  <!-- The five phases on the app's dots: passed = done, current = ring, to come = empty. -->
  <div class="flex items-center justify-center gap-3">
    <span
      v-for="(label, idx) in labels"
      :key="label"
      class="mg-well mg-well--icon mg-well--md"
      :class="idx < currentIndex ? 'mg-well--done' : idx === currentIndex ? 'mg-well--current' : ''"
    >
      {{ label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'

const { tList } = useT()

defineProps<{
  currentIndex: number
}>()

const labels = computed(() => tList('exerciseWizards.shared.ifs.tsibp.labels'))
</script>
