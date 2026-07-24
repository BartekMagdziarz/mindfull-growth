<template>
  <div
    class="month-progress-ring"
    :class="{ 'month-progress-ring--empty': percentage === null }"
    :style="chartStyle"
    role="img"
    :aria-label="ariaLabel"
  >
    <svg viewBox="0 0 112 50" aria-hidden="true">
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="rgb(var(--sky-200))" stop-opacity="0.26" />
          <stop offset="100%" stop-color="rgb(var(--sky-400))" stop-opacity="0.82" />
        </linearGradient>
      </defs>
      <line class="month-progress-ring__track" x1="10" y1="32" x2="102" y2="32" />
      <line
        v-if="percentage !== null"
        class="month-progress-ring__value"
        x1="10"
        y1="32"
        :x2="markerX"
        y2="32"
        :stroke="`url(#${gradientId})`"
      />
      <circle
        v-if="percentage !== null"
        class="month-progress-ring__marker"
        :cx="markerX"
        cy="32"
        r="3.5"
      />
      <text class="month-progress-ring__label" :x="percentage === null ? 56 : markerX" y="16">
        {{ displayValue }}
      </text>
    </svg>
    <small v-if="caption">{{ caption }}</small>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    percentage: number | null
    ariaLabel: string
    caption?: string
    size?: number
  }>(),
  {
    caption: undefined,
    size: 68,
  }
)

const gradientId = `month-progress-${useId().replace(/:/g, '')}`
const safePercentage = computed(() =>
  props.percentage === null ? 0 : Math.max(0, Math.min(100, Math.round(props.percentage)))
)
const markerX = computed(() => 10 + (safePercentage.value / 100) * 92)
const displayValue = computed(() => (props.percentage === null ? '—' : `${safePercentage.value}%`))
const chartStyle = computed(() => ({
  '--month-chart-width': `${Math.max(78, props.size * 1.48)}px`,
}))
</script>

<style scoped>
.month-progress-ring {
  color: rgb(var(--color-primary-strong));
  flex: 0 0 auto;
  width: var(--month-chart-width);
}

.month-progress-ring svg {
  display: block;
  height: auto;
  overflow: visible;
  width: 100%;
}

.month-progress-ring__track {
  stroke: rgb(var(--neo-border) / 0.16);
  stroke-linecap: round;
  stroke-width: 8;
}

.month-progress-ring__value {
  filter: drop-shadow(0 2px 4px rgb(var(--sky-300) / 0.14));
  stroke-linecap: round;
  stroke-width: 8.5;
}

.month-progress-ring__marker {
  fill: rgb(var(--sky-400) / 0.72);
  stroke: rgb(var(--neo-surface-top) / 0.68);
  stroke-width: 0.75;
}

.month-progress-ring__label {
  fill: rgb(var(--neo-muted) / 0.84);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  font-weight: 650;
  text-anchor: middle;
}

.month-progress-ring small {
  color: rgb(var(--neo-muted));
  display: block;
  font-size: 8px;
  margin-top: -4px;
  text-align: center;
}

.month-progress-ring--empty {
  opacity: 0.62;
}
</style>
