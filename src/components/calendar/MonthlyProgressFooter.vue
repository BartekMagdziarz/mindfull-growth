<template>
  <div class="monthly-footer" :aria-label="ariaLabel">
    <!-- count-progress / value-progress: thin fill bar + label "X / Y" -->
    <template v-if="data.variant === 'count-progress' || data.variant === 'value-progress'">
      <div class="monthly-footer__track">
        <div
          class="monthly-footer__fill"
          :data-status="data.status ?? 'in-progress'"
          :style="{ width: progressPct + '%' }"
        />
      </div>
      <span class="monthly-footer__label">
        <span class="monthly-footer__value">{{ progressLabel }}</span>
        <span class="monthly-footer__hint">{{ t('planning.reflection.review.thisMonth') }}</span>
      </span>
    </template>

    <!-- avg-marker: scaleMin..scaleMax bar with avg fill + optional target tick -->
    <template v-else-if="data.variant === 'avg-marker'">
      <div class="monthly-footer__track">
        <div
          class="monthly-footer__fill"
          :data-status="data.status ?? 'in-progress'"
          :style="{ width: avgFillPct + '%' }"
        />
        <div
          v-if="showTargetTick"
          class="monthly-footer__target-tick"
          :style="{ left: 'calc(' + targetTickPct + '% - 1px)' }"
          aria-hidden="true"
        />
      </div>
      <span class="monthly-footer__label">
        <span class="monthly-footer__value">{{ avgLabel }}</span>
        <span class="monthly-footer__hint">{{ t('planning.reflection.review.thisMonth') }}</span>
      </span>
    </template>

    <!-- value-label: text only -->
    <template v-else>
      <span class="monthly-footer__label monthly-footer__label--solo">
        <span class="monthly-footer__value">{{ labelOnlyValue }}</span>
        <span class="monthly-footer__hint">{{ t('planning.reflection.review.thisMonth') }}</span>
      </span>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type { MonthlyContextFooterData } from '@/services/weeklySliceChartData'

const props = defineProps<{
  data: MonthlyContextFooterData
}>()

const { t } = useT()

function formatNumber(value: number, fractionDigits = 1): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(fractionDigits).replace(/\.0$/, '')
}

const progressPct = computed(() => {
  if (props.data.target === undefined || props.data.target <= 0) return 0
  return Math.min(100, Math.max(0, (props.data.current / props.data.target) * 100))
})

const progressLabel = computed(() => {
  const current = formatNumber(props.data.current, 1)
  const target = formatNumber(props.data.target ?? 0, 1)
  return `${current} / ${target}`
})

const avgFillPct = computed(() => {
  const min = props.data.scaleMin ?? 1
  const max = props.data.scaleMax ?? 10
  if (max <= min) return 0
  const steps = max - min + 1
  const stepIndex = props.data.current - min + 1
  return Math.min(100, Math.max(0, (stepIndex / steps) * 100))
})

const targetTickPct = computed(() => {
  if (props.data.target === undefined) return 0
  const min = props.data.scaleMin ?? 1
  const max = props.data.scaleMax ?? 10
  if (max <= min) return 50
  const steps = max - min + 1
  return ((props.data.target - min + 1) / steps) * 100
})

const showTargetTick = computed(() => {
  if (props.data.target === undefined) return false
  const min = props.data.scaleMin ?? 1
  const max = props.data.scaleMax ?? 10
  return props.data.target >= min && props.data.target <= max
})

const avgLabel = computed(() => {
  const avg = formatNumber(props.data.current, 1)
  if (props.data.target !== undefined) {
    return `${t('planning.reflection.review.avgLabel')} ${avg} · ${formatNumber(props.data.target, 1)}`
  }
  return `${t('planning.reflection.review.avgLabel')} ${avg}`
})

const labelOnlyValue = computed(() => {
  const value = formatNumber(props.data.current, 1)
  switch (props.data.aggregationLabel) {
    case 'sum':
      return `${t('planning.reflection.review.sumLabel')} ${value}`
    case 'avg':
      return `${t('planning.reflection.review.avgLabel')} ${value}`
    case 'last':
      return `${t('planning.reflection.review.lastLabel')} ${value}`
    case 'days':
      return String(props.data.entryCount)
    default:
      return value
  }
})

const ariaLabel = computed(() => {
  if (props.data.variant === 'count-progress' || props.data.variant === 'value-progress') {
    return `${progressLabel.value} this month`
  }
  if (props.data.variant === 'avg-marker') {
    return `${avgLabel.value} this month`
  }
  return `${labelOnlyValue.value} this month`
})
</script>

<style scoped>
.monthly-footer {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  padding-top: 4px;
}

.monthly-footer__track {
  position: relative;
  width: 100%;
  height: 4px;
  border-radius: 9999px;
  background: rgb(var(--neo-surface-base));
  box-shadow:
    inset -1px -1px 1.5px rgb(var(--neo-inset-light) / 0.85),
    inset 1px 1px 1.5px rgb(var(--neo-inset-dark) / 0.3);
}

.monthly-footer__fill {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  border-radius: 9999px;
  transition: width 220ms ease;
  background: linear-gradient(
    90deg,
    rgb(var(--neo-chart-primary-start)),
    rgb(var(--neo-chart-primary-end))
  );
}

.monthly-footer__fill[data-status='missed'] {
  background: rgb(var(--color-error) / 0.85);
}

.monthly-footer__fill[data-status='in-progress'] {
  opacity: 0.75;
}

.monthly-footer__target-tick {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: rgb(var(--neo-muted));
  opacity: 0.5;
  border-radius: 1px;
}

.monthly-footer__label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px;
  font-size: 9px;
  font-weight: 500;
  color: rgb(var(--neo-muted));
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.monthly-footer__label--solo {
  justify-content: flex-start;
  gap: 6px;
}

.monthly-footer__value {
  color: rgb(var(--neo-text));
  font-weight: 600;
}

.monthly-footer__hint {
  font-weight: 500;
  font-size: 9px;
  color: rgb(var(--neo-muted) / 0.75);
}
</style>
