<template>
  <div class="date-switch">
    <button
      type="button"
      class="date-switch__icon-btn neo-focus"
      :aria-label="t('common.buttons.back')"
      :disabled="prevDisabled"
      @click="emit('prev')"
    >
      <AppIcon name="chevron_left" class="text-[18px]" />
    </button>

    <button
      type="button"
      class="date-switch__pill neo-focus"
      @click="emit('pill-click')"
    >
      <span class="date-switch__pill-date">{{ shortDate }}</span>
      <span class="date-switch__pill-weekday">{{ weekday }}</span>
    </button>

    <button
      type="button"
      class="date-switch__icon-btn neo-focus"
      :aria-label="t('common.buttons.next')"
      :disabled="nextDisabled"
      @click="emit('next')"
    >
      <AppIcon name="chevron_right" class="text-[18px]" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import type { DayRef } from '@/domain/period'

const props = defineProps<{
  dayRef: DayRef | ''
  prevDisabled?: boolean
  nextDisabled?: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
  'pill-click': []
}>()

const { t, locale } = useT()

const dayDate = computed(() => {
  if (!props.dayRef) return null
  const [y, m, d] = props.dayRef.split('-').map(Number)
  return new Date(y, m - 1, d)
})

const shortDate = computed(() => {
  if (!dayDate.value) return ''
  return new Intl.DateTimeFormat(locale.value, {
    day: 'numeric',
    month: 'short',
  }).format(dayDate.value)
})

const weekday = computed(() => {
  if (!dayDate.value) return ''
  return new Intl.DateTimeFormat(locale.value, {
    weekday: 'long',
  }).format(dayDate.value)
})
</script>

<style scoped>
.date-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
}

.date-switch__icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 9999px;
  border: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--neo-muted));
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.30);
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, color 200ms ease;
  flex-shrink: 0;
}

.date-switch__icon-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  color: rgb(var(--neo-text));
}

.date-switch__icon-btn:active:not(:disabled) {
  transform: translateY(0);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.6),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.3);
}

.date-switch__icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-switch__pill {
  flex: 1 1 auto;
  min-width: 0;
  height: 40px;
  padding: 4px 8px;
  border-radius: 14px;
  border: 1px solid rgb(var(--neo-border) / 0.14);
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -3px -3px 7px rgb(var(--neo-shadow-light) / 0.85),
    3px 3px 7px rgb(var(--neo-shadow-dark) / 0.28);
  color: rgb(var(--neo-text));
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.date-switch__pill:hover {
  transform: translateY(-1px);
}

.date-switch__pill:active {
  transform: translateY(0);
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.6),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.3);
}

.date-switch__pill-date {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: 0.01em;
}

.date-switch__pill-weekday {
  font-size: 9.5px;
  font-weight: 500;
  line-height: 1.05;
  color: rgb(var(--neo-muted));
  text-transform: lowercase;
  letter-spacing: 0.04em;
}
</style>
