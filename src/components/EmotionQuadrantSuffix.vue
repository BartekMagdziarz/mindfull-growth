<template>
  <Transition
    enter-active-class="suffix-enter-active"
    leave-active-class="suffix-leave-active"
    enter-from-class="suffix-from"
    leave-to-class="suffix-to"
  >
    <button
      v-if="quadrant && config"
      type="button"
      class="quadrant-suffix"
      :data-testid="`emotion-quadrant-suffix-${quadrant}`"
      :aria-label="t('emotionViews.selector.backToQuadrants')"
      @click="$emit('clear')"
    >
      <span class="separator" aria-hidden="true">·</span>
      <AppIcon
        :name="config.icon"
        class="suffix-icon"
        :style="{ color: accentColor }"
      />
      <span class="suffix-label">{{ config.label }}</span>
      <AppIcon name="close" class="suffix-close" />
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import { getQuadrantDisplayConfig } from '@/domain/emotion'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { Quadrant } from '@/domain/emotion'

const props = defineProps<{ quadrant: Quadrant | null }>()
defineEmits<{ clear: [] }>()

const { t } = useT()

const config = computed(() =>
  props.quadrant ? getQuadrantDisplayConfig(props.quadrant, t) : null
)

const accentColor = computed(() =>
  props.quadrant
    ? `var(--color-quadrant-${props.quadrant}-border)`
    : 'currentColor'
)
</script>

<style scoped>
.quadrant-suffix {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(var(--color-on-surface-variant));
  /* Inherit text-xs font-semibold uppercase tracking-wide from parent header */
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  transition: color 150ms ease, opacity 150ms ease;
}

.separator {
  opacity: 0.4;
  font-weight: 400;
}

.suffix-icon {
  font-size: 1rem;
  line-height: 1;
  transition: transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.suffix-label {
  font-weight: 600;
  white-space: nowrap;
}

.suffix-close {
  font-size: 0.875rem;
  line-height: 1;
  opacity: 0.5;
  transition: opacity 150ms ease, transform 150ms ease;
}

.quadrant-suffix:hover .suffix-close {
  opacity: 1;
  transform: rotate(90deg);
}

.quadrant-suffix:hover .suffix-icon {
  transform: scale(1.1);
}

.quadrant-suffix:focus-visible {
  outline: 2px solid rgb(var(--color-focus));
  outline-offset: 3px;
  border-radius: 6px;
}

.quadrant-suffix:active .suffix-icon {
  transform: scale(0.95);
}

/* Subtle fade-in/out when the suffix appears/disappears */
.suffix-enter-active {
  transition: opacity 200ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 200ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.suffix-leave-active {
  transition: opacity 140ms cubic-bezier(0.4, 0, 1, 1),
    transform 140ms cubic-bezier(0.4, 0, 1, 1);
}
.suffix-from {
  opacity: 0;
  transform: translateX(-4px);
}
.suffix-to {
  opacity: 0;
  transform: translateX(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .quadrant-suffix,
  .suffix-icon,
  .suffix-close,
  .suffix-enter-active,
  .suffix-leave-active {
    transition: opacity 120ms linear !important;
    transform: none !important;
  }
  .quadrant-suffix:hover .suffix-close,
  .quadrant-suffix:hover .suffix-icon,
  .quadrant-suffix:active .suffix-icon {
    transform: none;
  }
  .suffix-from,
  .suffix-to {
    transform: none;
  }
}
</style>
