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
  hit: { icon: 'check', color: 'var(--color-primary)', bg: 'var(--color-primary-container, rgba(95,138,201,0.18))' },
  partial: { icon: 'remove', color: 'var(--color-primary)', bg: 'var(--color-primary-container, rgba(95,138,201,0.12))' },
  miss: { icon: 'close', color: 'var(--color-error)', bg: 'var(--color-error-container, rgba(212,120,120,0.18))' },
  logged: { icon: 'check', color: 'var(--color-primary)', bg: 'var(--color-primary-container, rgba(95,138,201,0.12))' },
  empty: { icon: 'remove', color: 'var(--color-on-surface-variant)', bg: 'var(--color-surface-container, rgba(0,0,0,0.05))' },
}

const style = computed(() => MAP[props.state] ?? MAP.empty)
</script>
