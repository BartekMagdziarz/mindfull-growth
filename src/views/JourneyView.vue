<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-semibold text-on-surface">Journey</h1>
      <button
        @click="showNewEntryMenu = !showNewEntryMenu"
        class="relative flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-medium hover:bg-primary-strong transition-colors"
      >
        <PlusIcon class="w-5 h-5" />
        <span>New Entry</span>

        <!-- Dropdown menu -->
        <div
          v-if="showNewEntryMenu"
          class="absolute top-full right-0 mt-2 w-48 bg-surface rounded-xl shadow-elevation-2 border border-outline/30 py-2 z-10"
          @click.stop
        >
          <button
            @click="createNewEntry('yearly')"
            class="w-full px-4 py-2 text-left text-on-surface hover:bg-section transition-colors flex items-center gap-3"
          >
            <div class="w-3 h-3 rounded-full bg-purple-500"></div>
            <span>Yearly Review</span>
          </button>
          <button
            @click="createNewEntry('quarterly')"
            class="w-full px-4 py-2 text-left text-on-surface hover:bg-section transition-colors flex items-center gap-3"
          >
            <div class="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Quarterly Review</span>
          </button>
          <button
            @click="createNewEntry('weekly')"
            class="w-full px-4 py-2 text-left text-on-surface hover:bg-section transition-colors flex items-center gap-3"
          >
            <div class="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Weekly Review</span>
          </button>
          <button
            @click="createNewEntry('daily')"
            class="w-full px-4 py-2 text-left text-on-surface hover:bg-section transition-colors flex items-center gap-3"
          >
            <div class="w-3 h-3 rounded-full bg-amber-500"></div>
            <span>Daily Check-in</span>
          </button>
        </div>
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-on-surface-variant text-center py-12">
      Loading your journey...
    </div>

    <!-- Journey Hierarchy -->
    <template v-else>
      <JourneyHierarchy
        :yearly-entries="yearlyEntries"
        :quarterly-entries="quarterlyEntries"
        :weekly-entries="weeklyEntries"
        :daily-entries="dailyEntries"
        :goals="activeGoals"
        :trackers="dailyTrackers"
        @view-entry="navigateToEntry"
        @create-entry="createNewEntry"
      />

      <!-- Empty State -->
      <div
        v-if="!hasAnyEntries"
        class="text-center py-12"
      >
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-section flex items-center justify-center">
          <SparklesIcon class="w-8 h-8 text-primary" />
        </div>
        <h2 class="text-lg font-semibold text-on-surface mb-2">
          Start Your Journey
        </h2>
        <p class="text-on-surface-variant mb-6 max-w-md mx-auto">
          Begin with a yearly reflection to set your vision, then let it cascade through quarters, weeks, and days.
        </p>
        <button
          @click="createNewEntry('yearly')"
          class="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-strong transition-colors"
        >
          Create Yearly Review
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { PlusIcon, SparklesIcon } from '@heroicons/vue/24/outline'
import JourneyHierarchy from '@/components/journey/JourneyHierarchy.vue'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useCascadingGoalStore } from '@/stores/cascadingGoal.store'
import { useGoalTrackerStore } from '@/stores/goalTracker.store'
import type { PeriodicEntryType } from '@/domain/periodicEntry'

const router = useRouter()
const periodicEntryStore = usePeriodicEntryStore()
const cascadingGoalStore = useCascadingGoalStore()
const goalTrackerStore = useGoalTrackerStore()

const isLoading = ref(true)
const showNewEntryMenu = ref(false)

// Computed properties for entries by type
const yearlyEntries = computed(() => periodicEntryStore.yearlyEntries)
const quarterlyEntries = computed(() => periodicEntryStore.quarterlyEntries)
const weeklyEntries = computed(() => periodicEntryStore.weeklyEntries)
const dailyEntries = computed(() =>
  periodicEntryStore.sortedEntries.filter(e => e.type === 'daily')
)

const activeGoals = computed(() => cascadingGoalStore.activeGoals)
const dailyTrackers = computed(() => goalTrackerStore.dailyTrackers)

const hasAnyEntries = computed(() => {
  return (
    yearlyEntries.value.length > 0 ||
    quarterlyEntries.value.length > 0 ||
    weeklyEntries.value.length > 0 ||
    dailyEntries.value.length > 0
  )
})

// Navigation handlers
function navigateToEntry(type: PeriodicEntryType, id: string) {
  if (type === 'daily') {
    router.push({ name: 'journey-daily', params: { date: id } })
  } else {
    router.push({ name: `journey-${type}`, params: { id } })
  }
}

function createNewEntry(type: PeriodicEntryType) {
  showNewEntryMenu.value = false

  if (type === 'daily') {
    const today = new Date().toISOString().split('T')[0]
    router.push({ name: 'journey-daily', params: { date: today } })
  } else if (type === 'yearly') {
    router.push({ name: 'journey-yearly-new' })
  } else {
    router.push({ path: `/periodic/new/${type}` })
  }
}

// Close menu when clicking outside
function handleClickOutside(_event: MouseEvent) {
  if (showNewEntryMenu.value) {
    showNewEntryMenu.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    await Promise.all([
      periodicEntryStore.loadEntries(),
      cascadingGoalStore.loadGoals(),
      goalTrackerStore.loadAll(),
    ])
  } catch (error) {
    console.error('Failed to load Journey data:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>
