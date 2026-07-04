<template>
  <section class="month-grid neo-raised">
    <header class="month-grid__head">
      <span class="month-grid__label">{{ t('planning.today.overview.title') }}</span>
      <div class="month-grid__segmented">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          type="button"
          class="month-segmented__item"
          :class="filter === opt.value ? 'month-segmented__item--active' : ''"
          @click="filter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </header>

    <div v-if="filteredItems.length > 0" class="month-grid__grid">
      <MonthObjectTile
        v-for="item in filteredItems"
        :key="item.key"
        :subject="item.subject"
        :subject-type="item.subjectType"
        :planning="item.planning"
        :measurement="item.measurement"
        :raw-entries="rawEntries"
        :month-ref="monthRef"
        :today-day-ref="todayDayRef"
        :parent-goal-icon="item.parentGoalIcon"
      />
    </div>
    <!-- Quiet empty state — the create-plan CTA lives in the Summary panel. -->
    <p v-else class="month-grid__empty">
      {{ emptyText }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MonthObjectTile from '@/components/calendar/MonthObjectTile.vue'
import { useT } from '@/composables/useT'
import type { DayRef, MonthRef } from '@/domain/period'
import type { DailyMeasurementEntry } from '@/domain/planningState'
import type { MonthObjectItem } from '@/services/reflectionDataQueries'

type FilterValue = 'all' | 'goals' | 'habits' | 'trackers'

const props = defineProps<{
  items: MonthObjectItem[]
  rawEntries: DailyMeasurementEntry[]
  monthRef: MonthRef
  todayDayRef: DayRef
  hasPlan: boolean
}>()

const { t } = useT()

const filter = ref<FilterValue>('all')

const filterOptions = computed<{ value: FilterValue; label: string }[]>(() => [
  { value: 'all', label: t('planning.today.overview.filters.all') },
  { value: 'goals', label: t('planning.today.overview.filters.goals') },
  { value: 'habits', label: t('planning.today.overview.filters.habits') },
  { value: 'trackers', label: t('planning.today.overview.filters.trackers') },
])

const filteredItems = computed<MonthObjectItem[]>(() => {
  switch (filter.value) {
    case 'goals':
      return props.items.filter((item) => item.subjectType === 'keyResult')
    case 'habits':
      return props.items.filter((item) => item.subjectType === 'habit')
    case 'trackers':
      return props.items.filter((item) => item.subjectType === 'tracker')
    case 'all':
    default:
      return props.items
  }
})

const emptyText = computed(() => {
  if (props.items.length > 0) {
    return t('planning.today.overview.empty')
  }
  return props.hasPlan
    ? t('planning.reflection.review.planVsExecution.noObjects')
    : t('planning.reflection.review.planVsExecution.gridEmptyNoPlanMonth')
})
</script>

<style scoped>
.month-grid {
  width: 100%;
  padding: 14px;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.month-grid__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.month-grid__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  color: rgb(var(--neo-muted));
  text-transform: uppercase;
}

.month-grid__segmented {
  display: inline-flex;
  padding: 4px;
  background: rgb(var(--neo-surface-base));
  border-radius: 9999px;
  box-shadow:
    inset -3px -3px 6px rgb(var(--neo-inset-light) / 0.85),
    inset 3px 3px 6px rgb(var(--neo-inset-dark) / 0.33);
}

.month-segmented__item {
  padding: 6px 14px;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: rgb(var(--neo-muted));
  font-size: 12px;
  cursor: pointer;
  transition: color 200ms ease, background 200ms ease, box-shadow 200ms ease;
}

.month-segmented__item:hover {
  color: rgb(var(--neo-text));
}

.month-segmented__item--active {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  color: rgb(var(--neo-text));
  font-weight: 500;
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.28);
}

.month-grid__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}

.month-grid__empty {
  padding: 18px 8px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(var(--neo-muted));
  text-align: center;
}

@media (max-width: 640px) {
  .month-grid__head {
    align-items: flex-start;
    flex-direction: column;
  }

  .month-grid__segmented {
    width: 100%;
    overflow-x: auto;
  }

  .month-segmented__item {
    flex: 1 0 auto;
    padding-inline: 10px;
  }
}
</style>
