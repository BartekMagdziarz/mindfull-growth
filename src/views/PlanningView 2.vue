<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <!-- Page Title -->
    <h1 class="text-2xl font-bold text-on-surface mb-2">{{ t('planning.hub.title') }}</h1>
    <p class="text-on-surface-variant mb-8">
      {{ t('planning.hub.subtitle') }}
    </p>

    <!-- Tab Navigation: Week | Month | Year -->
    <div class="mb-6">
      <div
        class="neo-segmented"
        role="tablist"
        aria-label="Planning horizon tabs"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`planning-panel-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Tab Content -->
    <!-- Week Calendar -->
    <WeekCalendarSection
      v-if="activeTab === 'week'"
      id="planning-panel-week"
      role="tabpanel"
      aria-label="Week planning panel"
    />

    <!-- Month Calendar -->
    <MonthCalendarSection
      v-if="activeTab === 'month'"
      id="planning-panel-month"
      role="tabpanel"
      aria-label="Month planning panel"
    />

    <!-- Year Calendar -->
    <YearCalendarSection
      v-if="activeTab === 'year'"
      id="planning-panel-year"
      role="tabpanel"
      aria-label="Year planning panel"
    />

    <!-- Management -->
    <div class="mt-10">
      <h2 class="text-lg font-semibold text-on-surface mb-2">{{ t('planning.hub.manage.title') }}</h2>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('planning.hub.manage.description') }}
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <router-link to="/planning/habits" class="block rounded-3xl neo-focus">
          <AppCard class="neo-raised h-full">
            <h3 class="text-base font-semibold text-on-surface">{{ t('planning.hub.manage.habits.title') }}</h3>
            <p class="text-sm text-on-surface-variant mt-1">
              {{ t('planning.hub.manage.habits.description') }}
            </p>
          </AppCard>
        </router-link>
        <router-link to="/planning/projects-trackers" class="block rounded-3xl neo-focus">
          <AppCard class="neo-raised h-full">
            <h3 class="text-base font-semibold text-on-surface">{{ t('planning.hub.manage.projectsAndTrackers.title') }}</h3>
            <p class="text-sm text-on-surface-variant mt-1">
              {{ t('planning.hub.manage.projectsAndTrackers.description') }}
            </p>
          </AppCard>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useT } from '@/composables/useT'
import YearCalendarSection from '@/components/planning/YearCalendarSection.vue'
import MonthCalendarSection from '@/components/planning/MonthCalendarSection.vue'
import WeekCalendarSection from '@/components/planning/WeekCalendarSection.vue'
import AppCard from '@/components/AppCard.vue'

const { t } = useT()

// Tab configuration
const tabs = computed(() => [
  { id: 'week' as const, label: t('planning.hub.tabs.week') },
  { id: 'month' as const, label: t('planning.hub.tabs.month') },
  { id: 'year' as const, label: t('planning.hub.tabs.year') },
])

type TabId = 'week' | 'month' | 'year'

// Default to Week section (most actionable horizon)
const activeTab = ref<TabId>('week')
</script>
