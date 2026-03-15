<template>
  <span
    class="material-symbols-outlined"
    aria-hidden="true"
  >{{ name }}</span>
</template>

<script setup lang="ts">
defineProps<{ name: string }>()
</script>
