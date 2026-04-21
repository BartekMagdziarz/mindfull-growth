<template>
  <div class="flex flex-col gap-3 rounded-2xl bg-neu-top p-4 shadow-neu-raised-sm">
    <div class="flex items-center gap-2">
      <div
        class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg shadow-neu-pressed-sm"
        :class="accent ? 'bg-primary/10 text-primary' : 'bg-neu-base text-on-surface-variant'"
      >
        <AppIcon :name="icon" class="text-sm" />
      </div>
      <span
        class="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/80"
      >
        {{ title }}
      </span>
    </div>
    <div class="flex flex-1 flex-col gap-2.5">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

defineProps<{
  title: string
  icon: string
  accent?: boolean
}>()
</script>
