<template>
  <header class="bg-surface border-b border-outline/20 shadow-elevation-1">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <h1 class="text-xl font-semibold text-on-surface">Mindful Growth</h1>
        <div v-if="$slots.actions" class="flex gap-2">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
// AppTopAppBar component for the application header
</script>

