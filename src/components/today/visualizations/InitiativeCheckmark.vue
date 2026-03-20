<template>
  <div class="flex flex-col items-center gap-1">
    <button
      type="button"
      class="flex h-10 w-10 items-center justify-center rounded-full transition-all"
      :class="buttonClass"
      :disabled="isPending"
      @click.stop="$emit('toggle')"
    >
      <svg viewBox="0 0 20 20" class="h-5 w-5" aria-hidden="true">
        <path
          d="M6 10 L9 13 L14 7"
          fill="none"
          :stroke="isComplete ? 'white' : 'rgb(var(--color-on-surface-variant))'"
          :stroke-opacity="isComplete ? 1 : 0.4"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>
    <span
      v-if="dayLabel"
      class="text-[9px] text-on-surface-variant/50"
    >
      {{ dayLabel }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    isComplete: boolean
    dayLabel?: string
    isPending?: boolean
  }>(),
  { isPending: false },
)

defineEmits<{ toggle: [] }>()

const buttonClass = computed(() =>
  props.isComplete
    ? 'bg-primary shadow-neu-pressed text-white'
    : 'neo-card neo-raised hover:shadow-neu-raised-lg hover:-translate-y-px'
)
</script>
