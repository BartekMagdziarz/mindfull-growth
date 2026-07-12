<template>
  <aside
    class="month-rail neo-raised"
    data-testid="month-v2-summary-rail"
    :aria-label="t('planning.calendar.monthV2.overview')"
  >
    <p class="month-rail__eyebrow">{{ t('planning.calendar.monthV2.overview') }}</p>

    <section v-if="rail.compass" class="month-rail__section">
      <p class="month-rail__label">{{ t('planning.calendar.monthV2.compass') }}</p>
      <MonthCompassChart :compass="rail.compass" />
    </section>

    <section class="month-rail__section">
      <p class="month-rail__label">{{ t('planning.calendar.monthV2.activity') }}</p>
      <MonthMiniCalendar :days="rail.activity.days" />
      <div class="month-rail__metrics">
        <div
          class="month-rail__metric"
          :title="t('planning.calendar.wellness.emotions')"
        >
          <AppIcon name="mood" class="month-rail__metric-icon" />
          <span class="month-rail__metric-value">{{ rail.activity.totals.emotionSessions }}</span>
          <span class="month-rail__metric-label">{{ t('planning.calendar.wellness.emotions') }}</span>
        </div>
        <div class="month-rail__metric" :title="t('planning.calendar.wellness.journal')">
          <AppIcon name="menu_book" class="month-rail__metric-icon" />
          <span class="month-rail__metric-value">{{ rail.activity.totals.journalEntries }}</span>
          <span class="month-rail__metric-label">{{ t('planning.calendar.wellness.journal') }}</span>
        </div>
        <div class="month-rail__metric" :title="t('planning.calendar.wellness.exercises')">
          <AppIcon name="self_improvement" class="month-rail__metric-icon" />
          <span class="month-rail__metric-value">{{ rail.activity.totals.exercises }}</span>
          <span class="month-rail__metric-label">{{ t('planning.calendar.wellness.exercises') }}</span>
        </div>
      </div>
    </section>
  </aside>
</template>

<script setup lang="ts">
import type { MonthV2Rail } from '@/services/monthV2Overview'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import MonthCompassChart from './MonthCompassChart.vue'
import MonthMiniCalendar from './MonthMiniCalendar.vue'

defineProps<{
  rail: MonthV2Rail
}>()

const { t } = useT()
</script>

<style scoped>
.month-rail {
  border-radius: 27px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 17px;
}

.month-rail__eyebrow {
  color: rgb(var(--neo-muted));
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-rail__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.month-rail__label {
  color: rgb(var(--neo-muted));
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.month-rail__metrics {
  display: grid;
  gap: 7px;
  grid-template-columns: repeat(3, 1fr);
}

.month-rail__metric {
  align-items: center;
  border-radius: 13px;
  box-shadow:
    inset 1px 1px 3px rgb(var(--neo-inset-dark) / 0.28),
    inset -1px -1px 3px rgb(var(--neo-inset-light) / 0.6);
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: 8px 4px;
}

.month-rail__metric-icon {
  color: rgb(var(--color-primary-strong));
  font-size: 15px;
}

.month-rail__metric-value {
  color: rgb(var(--neo-text));
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.month-rail__metric-label {
  color: rgb(var(--neo-muted));
  font-size: 8px;
  max-width: 100%;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
