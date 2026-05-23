<template>
  <div
    class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
    :style="{ backgroundColor: style.bg, color: style.color }"
  >
    <AppIcon :name="style.icon" class="text-xs" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'

type ChipState = 'hit' | 'partial' | 'miss' | 'logged' | 'empty'

const props = defineProps<{
  state: ChipState
}>()

const MAP: Record<ChipState, { icon: string; color: string; bg: string }> = {
  hit: { icon: 'check', color: 'rgb(var(--color-primary))', bg: 'rgb(var(--color-primary) / 0.18)' },
  partial: { icon: 'remove', color: 'rgb(var(--color-primary))', bg: 'rgb(var(--color-primary) / 0.12)' },
  miss: { icon: 'close', color: 'rgb(var(--color-error))', bg: 'rgb(var(--color-error-container))' },
  logged: { icon: 'check', color: 'rgb(var(--color-primary))', bg: 'rgb(var(--color-primary) / 0.12)' },
  empty: { icon: 'remove', color: 'rgb(var(--color-on-surface-variant))', bg: 'rgb(var(--color-surface-container))' },
}

const style = computed(() => MAP[props.state] ?? MAP.empty)
</script>
