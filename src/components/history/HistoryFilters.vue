<template>
  <AppCard class="history-filters mb-4">
    <div role="group" :aria-label="t('history.filters.type')">
      <p class="mg-v2-group__label">{{ t('history.filters.type') }}</p>
      <div class="grid grid-cols-3 gap-2">
        <HistoryFilterButton
          v-for="option in typeOptions"
          :key="option.value"
          :icon="option.icon"
          :label="t(option.label)"
          :pressed="typeFilter === option.value"
          @click="typeFilter = option.value"
        />
      </div>
    </div>

    <div class="history-filters__secondary">
      <label class="history-filters__field">
        <span class="mg-v2-group__label">{{ t('history.filters.date') }}</span>
        <span class="history-filters__select">
          <select v-model="dateRange" class="mg-v2-button">
            <option v-for="option in dateOptions" :key="option.value" :value="option.value">
              {{ t(option.label) }}
            </option>
          </select>
          <AppIcon name="expand_more" />
        </span>
      </label>
      <label class="history-filters__field">
        <span class="mg-v2-group__label">{{ t('history.filters.sort') }}</span>
        <span class="history-filters__select">
          <select v-model="sortOrder" class="mg-v2-button">
            <option value="desc">{{ t('history.filters.newest') }}</option>
            <option value="asc">{{ t('history.filters.oldest') }}</option>
          </select>
          <AppIcon name="expand_more" />
        </span>
      </label>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import HistoryFilterButton from './HistoryFilterButton.vue'
import type { TypeFilter, DateRangeFilter, SortOrder } from '@/composables/useUnifiedEntries'
import { useT } from '@/composables/useT'

const { t } = useT()

const typeFilter = defineModel<TypeFilter>('typeFilter', { required: true })
const dateRange = defineModel<DateRangeFilter>('dateRange', { required: true })
const sortOrder = defineModel<SortOrder>('sortOrder', { required: true })

const typeOptions = [
  { value: 'all', label: 'history.filters.all', icon: 'history' },
  { value: 'journal', label: 'history.filters.journal', icon: 'menu_book' },
  { value: 'emotion-log', label: 'history.filters.emotions', icon: 'favorite' },
] as const

const dateOptions = [
  { value: 'all', label: 'history.filters.allTime' },
  { value: 'today', label: 'history.filters.today' },
  { value: 'week', label: 'history.filters.week' },
  { value: 'month', label: 'history.filters.month' },
] as const
</script>

<style scoped>
.history-filters {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--mg-space-4);
}
.history-filters [role='group'] {
  flex: 1 1 18rem;
  max-width: 25rem;
  display: grid;
  gap: var(--mg-space-2);
}
.history-filters__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-3);
}
.history-filters__field {
  display: grid;
  gap: var(--mg-space-1);
}
.history-filters__select {
  position: relative;
}
.history-filters__select select {
  appearance: none;
  padding-inline: var(--mg-space-3) var(--mg-space-6);
  min-height: 2rem;
  border-color: transparent;
  color: var(--mg-color-ink);
}
.history-filters__select .app-icon {
  position: absolute;
  right: var(--mg-space-2);
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  color: var(--mg-color-primary-strong);
}
</style>
