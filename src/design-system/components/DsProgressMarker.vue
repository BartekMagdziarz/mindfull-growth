<template>
  <span
    class="mg-v2-progress-marker"
    :class="{ 'mg-v2-progress-marker--done': done }"
    :aria-label="label"
  >
    <template v-if="!done">{{ value }}</template>
  </span>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  done?: boolean
  value?: string | number
  label: string
}>(), {
  done: false,
  value: '',
})
</script>
