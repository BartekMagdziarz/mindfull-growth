<template>
  <section class="overview-section neo-raised">
    <header class="overview-section__head">
      <span class="overview-section__label">{{ t('planning.today.overview.title') }}</span>
      <div class="overview-section__segmented">
        <button
          v-for="opt in filterOptions"
          :key="opt.value"
          type="button"
          class="overview-segmented__item"
          :class="filter === opt.value ? 'overview-segmented__item--active' : ''"
          @click="filter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </header>

    <div v-if="filteredItems.length > 0" class="overview-section__grid">
      <TodayOverviewTile
        v-for="item in filteredItems"
        :key="item.key"
        :item="item"
        :today-day-ref="todayDayRef"
        :raw-entries="rawEntries"
        :all-day-assignments="allDayAssignments"
      />
    </div>
    <p v-else class="overview-section__empty">
      {{ t('planning.today.overview.empty') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import TodayOverviewTile from '@/components/today/TodayOverviewTile.vue'
import { useT } from '@/composables/useT'
import type { DayRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementDayAssignment,
} from '@/domain/planningState'
import type { TodayItem } from '@/services/todayViewQueries'

type FilterValue = 'all' | 'goals' | 'habits' | 'trackers'

const props = defineProps<{
  goalItems: TodayItem[]
  habitItems: TodayItem[]
  trackerItems: TodayItem[]
  todayDayRef: DayRef
  rawEntries: DailyMeasurementEntry[]
  allDayAssignments: MeasurementDayAssignment[]
}>()

const { t } = useT()

const filter = ref<FilterValue>('all')

const filterOptions = computed<{ value: FilterValue; label: string }[]>(() => [
  { value: 'all', label: t('planning.today.overview.filters.all') },
  { value: 'goals', label: t('planning.today.overview.filters.goals') },
  { value: 'habits', label: t('planning.today.overview.filters.habits') },
  { value: 'trackers', label: t('planning.today.overview.filters.trackers') },
])

const filteredItems = computed<TodayItem[]>(() => {
  switch (filter.value) {
    case 'goals':
      return props.goalItems
    case 'habits':
      return props.habitItems
    case 'trackers':
      return props.trackerItems
    case 'all':
    default:
      return [...props.goalItems, ...props.habitItems, ...props.trackerItems]
  }
})
</script>

<style scoped>
.overview-section {
  padding: 14px 16px 14px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.overview-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.overview-section__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.10em;
  color: rgb(var(--neo-muted));
  text-transform: uppercase;
}

/* Segmented control: inset well + lifted active pill */
.overview-section__segmented {
  display: inline-flex;
  padding: 4px;
  background: rgb(var(--neo-surface-base));
  border-radius: 9999px;
  box-shadow:
    inset -3px -3px 6px rgb(var(--neo-inset-light) / 0.85),
    inset 3px 3px 6px rgb(var(--neo-inset-dark) / 0.33);
}

.overview-segmented__item {
  padding: 6px 14px;
  border-radius: 9999px;
  border: 0;
  background: transparent;
  font-size: 12px;
  color: rgb(var(--neo-muted));
  cursor: pointer;
  transition: color 200ms ease, background 200ms ease, box-shadow 200ms ease;
}

.overview-segmented__item:hover {
  color: rgb(var(--neo-text));
}

.overview-segmented__item--active {
  background: linear-gradient(145deg, rgb(var(--neo-surface-top)), rgb(var(--neo-surface-bottom)));
  color: rgb(var(--neo-text));
  font-weight: 500;
  box-shadow:
    -2px -2px 5px rgb(var(--neo-shadow-light) / 0.85),
    2px 2px 5px rgb(var(--neo-shadow-dark) / 0.28);
}

.overview-section__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1340px) {
  .overview-section__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .overview-section__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.overview-section__empty {
  padding: 24px 0;
  text-align: center;
  font-size: 12px;
  color: rgb(var(--neo-muted) / 0.7);
}
</style>
