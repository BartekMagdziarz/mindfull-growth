<template>
  <div class="rating-monthly" :aria-label="ariaLabel">
    <div class="rating-monthly__readout">
      <span class="rating-monthly__big">{{ formattedAverage }}</span>
      <span v-if="hasEntries" class="rating-monthly__max">/ {{ data.scaleMax }}</span>
    </div>

    <div class="rating-monthly__track-wrap">
      <div class="rating-monthly__track">
        <div
          v-if="hasEntries"
          data-testid="rating-smooth-fill"
          class="rating-monthly__fill"
          :style="{ width: `${(fillRatio * 100).toFixed(1)}%`, background: fillColor }"
        />
        <div
          v-if="hasEntries"
          class="rating-monthly__marker"
          :style="{
            left: `calc(${(fillRatio * 100).toFixed(1)}% - 1.5px)`,
            background: fillColor,
          }"
          aria-hidden="true"
        />
        <div
          v-if="showTargetMarker"
          data-testid="rating-smooth-target"
          class="rating-monthly__target"
          :style="{ left: `calc(${(targetRatio * 100).toFixed(1)}% - 0.75px)` }"
          aria-hidden="true"
        />
      </div>
      <div class="rating-monthly__scale">
        <span>{{ data.scaleMin }}</span>
        <span>{{ data.scaleMax }}</span>
      </div>
    </div>

    <span class="rating-monthly__count">
      {{ t('planning.today.summary.entries', { n: data.entryCount }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { TodayRatingSmoothData } from '@/services/todayChartData'
import { ratingBarColor } from '@/utils/ratingGradient'

const props = defineProps<{
  data: TodayRatingSmoothData
}>()

const { t } = useT()

const hasEntries = computed(() => props.data.entryCount > 0)

// Step-based mapping — the lowest possible value still occupies 1/N of the
// track so it reads as "worst rating" rather than "no data".
const fillRatio = computed(() => {
  if (!hasEntries.value) return 0
  const steps = props.data.scaleMax - props.data.scaleMin + 1
  if (steps <= 1) return 1
  const stepIndex = props.data.averageValue - props.data.scaleMin + 1
  return Math.min(1, Math.max(0, stepIndex / steps))
})

const fillColor = computed(() =>
  ratingBarColor({
    value: props.data.averageValue,
    scaleMin: props.data.scaleMin,
    scaleMax: props.data.scaleMax,
    targetValue: props.data.targetValue,
    targetOperator: props.data.targetOperator,
  }),
)

const showTargetMarker = computed(
  () =>
    props.data.targetValue !== undefined &&
    props.data.targetValue >= props.data.scaleMin &&
    props.data.targetValue <= props.data.scaleMax,
)

const targetRatio = computed(() => {
  if (props.data.targetValue === undefined) return 0
  const steps = props.data.scaleMax - props.data.scaleMin + 1
  if (steps <= 1) return 0.5
  return (props.data.targetValue - props.data.scaleMin + 1) / steps
})

const formattedAverage = computed(() => {
  if (!hasEntries.value) return '—'
  return props.data.averageValue.toFixed(1)
})

const ariaLabel = computed(
  () =>
    `average ${formattedAverage.value} of ${props.data.scaleMax} from ${props.data.entryCount} entries`,
)
</script>

<style scoped>
.rating-monthly {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.rating-monthly__readout {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  line-height: 1;
  color: rgb(var(--neo-text));
  font-variant-numeric: tabular-nums;
}

.rating-monthly__big {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.rating-monthly__max {
  font-size: 12px;
  font-weight: 500;
  color: rgb(var(--neo-muted));
}

.rating-monthly__track-wrap {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

/* Inset track — same neumorphic groove used for value-rating circles so the
   monthly aggregate reads as the same family of control. */
.rating-monthly__track {
  position: relative;
  height: 8px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 2px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 2px rgb(var(--neo-inset-dark) / 0.3);
}

.rating-monthly__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 9999px;
  transition: width 220ms ease, background 220ms ease;
}

/* Tall sliver marker pointing to the exact average position. Same colour
   family as the fill so the eye traces marker → fill seamlessly. */
.rating-monthly__marker {
  position: absolute;
  top: -3px;
  bottom: -3px;
  width: 3px;
  border-radius: 2px;
  box-shadow: 0 0 4px rgb(var(--sky-600) / 0.45);
}

/* Dashed target marker — shorter than the value marker so the user marker
   is clearly the dominant signal. */
.rating-monthly__target {
  position: absolute;
  top: -2px;
  bottom: -2px;
  width: 1.5px;
  background: rgb(var(--neo-muted));
  opacity: 0.55;
  border-radius: 1px;
}

.rating-monthly__scale {
  display: flex;
  justify-content: space-between;
  padding: 0 1px;
  font-size: 9px;
  font-weight: 500;
  color: rgb(var(--neo-muted) / 0.7);
  font-variant-numeric: tabular-nums;
}

.rating-monthly__count {
  font-size: 11px;
  color: rgb(var(--neo-muted) / 0.85);
  line-height: 1;
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>
