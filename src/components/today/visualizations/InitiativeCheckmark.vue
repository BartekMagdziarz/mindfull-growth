<template>
  <div class="flex flex-col items-center gap-1">
    <button
      type="button"
      :class="['initiative-check', sizeClass, isComplete ? 'initiative-check--on' : 'initiative-check--off']"
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
</script>

<style scoped>
.initiative-check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 0;
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, background 200ms ease;
}

.initiative-check:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

/* Same chart-primary gradient as the task ticker / completion dots / bar
   charts so every "filled/positive" blue accent reads as one colour. */
.initiative-check--on {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.6),
    2.5px 2.5px 6px rgb(var(--neo-chart-primary-end) / 0.42);
  color: rgb(var(--neo-accent-text));
}

.initiative-check--off {
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  border: 1px solid rgb(var(--neo-border) / 0.30);
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.80),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
}

.initiative-check--off:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.85),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.36);
}
</style>
