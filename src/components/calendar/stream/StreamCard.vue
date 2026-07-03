<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Render as a drill button (default) or a plain tile (day cards). */
    tag?: 'button' | 'div'
    current?: boolean
    future?: boolean
    delayMs?: number
  }>(),
  {
    tag: 'button',
    current: false,
    future: false,
    delayMs: 0,
  },
)

const emit = defineEmits<{ select: [] }>()

const rootStyle = computed(() => ({ animationDelay: `${props.delayMs}ms` }))

function onClick() {
  if (props.tag === 'button') emit('select')
}
</script>

<template>
  <component
    :is="tag"
    :type="tag === 'button' ? 'button' : undefined"
    class="stream-card neo-focus"
    :class="[
      current ? 'stream-card--current' : '',
      future ? 'stream-card--future' : '',
      tag === 'button' ? 'stream-card--interactive' : '',
    ]"
    :style="rootStyle"
    @click="onClick"
  >
    <slot />
  </component>
</template>

<style scoped>
.stream-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  padding: 17px 17px 16px;
  border-radius: 20px;
  text-align: left;
  border: 1px solid rgb(var(--stream-track, 185 205 228) / 0.14);
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top, 242 248 255)),
    rgb(var(--neo-surface-bottom, 230 240 252))
  );
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light, 255 255 255) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark, 145 170 205) / 0.33);
  color: rgb(var(--stream-ink, 15 39 69));
  animation: streamCardIn 0.45s both;
  transition:
    box-shadow 200ms ease,
    transform 200ms ease,
    border-color 200ms ease;
}

.stream-card--interactive {
  cursor: pointer;
}

.stream-card--interactive:hover {
  transform: translateY(-2px);
  box-shadow:
    -6px -6px 13px rgb(var(--neo-shadow-light, 255 255 255) / 0.85),
    6px 6px 13px rgb(var(--neo-shadow-dark, 145 170 205) / 0.38);
}

.stream-card--interactive:active {
  transform: translateY(0);
}

.stream-card--current {
  border-color: rgb(var(--stream-accent, 112 168 232) / 0.5);
  background: rgb(var(--stream-accent, 112 168 232) / 0.06);
}

.stream-card--future {
  opacity: 0.8;
}

@keyframes streamCardIn {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stream-card {
    animation: none;
  }
  .stream-card--interactive:hover {
    transform: none;
  }
}
</style>
