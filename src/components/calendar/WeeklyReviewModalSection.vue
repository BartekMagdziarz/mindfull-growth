<template>
  <div class="flex items-center gap-1.5">
    <AppIcon :name="icon" class="text-sm text-primary" />
    <span class="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant/80">
      {{ title }}
    </span>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

defineProps<{
  icon: string
  title: string
}>()
</script>
