<template>
  <span
    class="mg-well mg-well--icon mg-v2-progress-marker"
    :class="{ 'mg-well--done': done, 'mg-well--current': current && !done }"
    :aria-label="label"
  >
    <template v-if="!done">{{ value }}</template>
  </span>
</template>

<script setup lang="ts">
/** A numbered step on the app's well: number = to do, ring = current, dot = done. */
withDefaults(
  defineProps<{
    done?: boolean
    current?: boolean
    value?: string | number
    label: string
  }>(),
  {
    done: false,
    current: false,
    value: '',
  }
)
</script>
