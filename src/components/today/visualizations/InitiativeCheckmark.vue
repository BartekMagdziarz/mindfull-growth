<template>
  <div class="flex flex-col items-center gap-1">
    <button
      type="button"
      :class="['flex items-center justify-center rounded-full transition-all', sizeClass, buttonClass]"
      :disabled="isPending"
      @click.stop="$emit('toggle')"
    >
      <svg viewBox="0 0 20 20" :class="iconSizeClass" aria-hidden="true">
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
    /** 'md' (default, 40px) matches the standalone visualization look.
     *  'sm' (~34px) matches the shrunk task-row right-side controls. */
    size?: 'md' | 'sm'
  }>(),
  { isPending: false, size: 'md' },
)

defineEmits<{ toggle: [] }>()

const sizeClass = computed(() => (props.size === 'sm' ? 'h-[34px] w-[34px]' : 'h-10 w-10'))
const iconSizeClass = computed(() => (props.size === 'sm' ? 'h-[18px] w-[18px]' : 'h-5 w-5'))

const buttonClass = computed(() =>
  props.isComplete
    ? 'bg-primary shadow-neu-pressed text-white'
    : 'neo-card neo-raised hover:shadow-neu-raised-lg hover:-translate-y-px'
)
</script>
