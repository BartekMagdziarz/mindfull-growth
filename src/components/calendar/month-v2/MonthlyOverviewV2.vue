<template>
  <section class="month-v2 neo-raised" :aria-label="t('planning.calendar.monthV2.overview')">
    <p class="month-v2__eyebrow">{{ t('planning.calendar.monthV2.experimentBadge') }}</p>
    <p class="month-v2__placeholder">{{ monthRef }} · {{ chartMode }} · {{ density }}</p>
  </section>
</template>

<script setup lang="ts">
import type { MonthRef } from '@/domain/period'
import { useT } from '@/composables/useT'
import type { MonthChartMode, MonthDensity } from './monthV2Types'

// Skeleton shell for the experimental month renderer (?layout=v2). The rail,
// week axis and sections land here in later steps; V1 stays the default.
withDefaults(
  defineProps<{
    monthRef: MonthRef
    chartMode?: MonthChartMode
    density?: MonthDensity
  }>(),
  { chartMode: 'hybrid', density: 'comfortable' }
)

const { t } = useT()
</script>

<style scoped>
.month-v2 {
  border-radius: 27px;
  padding: 17px;
}

.month-v2__eyebrow {
  color: var(--neo-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-v2__placeholder {
  color: var(--neo-text);
  font-size: 13px;
  margin-top: 8px;
}
</style>
