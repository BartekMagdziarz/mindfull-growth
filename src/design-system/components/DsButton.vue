<template>
  <button
    :type="type"
    class="mg-v2-button"
    :class="[`mg-v2-button--${variant}`, { 'mg-v2-button--icon': iconOnly }]"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'button' | 'submit'
  variant?: 'primary' | 'quiet' | 'danger'
  iconOnly?: boolean
}>(), {
  type: 'button',
  variant: 'primary',
  iconOnly: false,
})
</script>
