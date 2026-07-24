<template>
  <component :is="tag" class="mg-v2-surface" :class="`mg-v2-surface--${elevation}`">
    <slot />
  </component>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  tag?: 'article' | 'aside' | 'div' | 'main' | 'section'
  elevation?: 'raised' | 'inset' | 'flat'
}>(), {
  tag: 'section',
  elevation: 'raised',
})
</script>
