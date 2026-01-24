<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <!-- Loading State -->
    <div
      v-if="isLoading"
      class="text-on-surface-variant text-center py-12"
    >
      Loading...
    </div>

    <template v-else>
      <!-- Weekly Review Banner (conditional) -->
      <WeeklyReviewBanner
        v-if="showWeeklyReviewBanner"
        :week-label="reviewWeekLabel"
        class="mb-6"
        @start-review="navigateToWeeklyReview"
      />

      <!-- Dashboard Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Left Column: Actions & Trackers -->
        <div class="flex flex-col items-center gap-6">
          <!-- Daily Intention from Journey -->
          <DailyIntentionCard />

          <!-- Tracker Dashboard -->
          <TrackerDashboard v-if="hasTrackers" />

          <DailyJournalCard
            :entry-count="todayJournalCount"
            :has-entry="hasTodayJournal"
            @action="navigateToJournal"
          />
          <EmotionProgressCard
            :logged="todayEmotionCount"
            :target="emotionTarget"
            @action="navigateToEmotionLog"
          />
        </div>

        <!-- Right Column: Context -->
        <div class="flex flex-col items-center gap-6">
          <WeekSummaryCard :summary="weekSummary" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import WeeklyReviewBanner from '@/components/today/WeeklyReviewBanner.vue'
import DailyJournalCard from '@/components/today/DailyJournalCard.vue'
import EmotionProgressCard from '@/components/today/EmotionProgressCard.vue'
import WeekSummaryCard from '@/components/today/WeekSummaryCard.vue'
import DailyIntentionCard from '@/components/today/DailyIntentionCard.vue'
import TrackerDashboard from '@/components/today/TrackerDashboard.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useGoalTrackerStore } from '@/stores/goalTracker.store'
import {
  getTodayJournalEntries,
  getTodayEmotionLogs,
  isWeeklyReviewDue,
  getReviewWeekLabel,
  getWeekSummary,
} from '@/utils/todayUtils'
import { getWeekRange, toISODateString } from '@/utils/periodUtils'

const router = useRouter()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const periodicEntryStore = usePeriodicEntryStore()
const emotionStore = useEmotionStore()
const userPreferencesStore = useUserPreferencesStore()
const goalTrackerStore = useGoalTrackerStore()

const isLoading = ref(true)

// Today's data
const todayJournalEntries = computed(() =>
  getTodayJournalEntries(journalStore.entries)
)
const todayEmotionLogs = computed(() =>
  getTodayEmotionLogs(emotionLogStore.logs)
)

// Counts
const todayJournalCount = computed(() => todayJournalEntries.value.length)
const todayEmotionCount = computed(() => todayEmotionLogs.value.length)
const hasTodayJournal = computed(() => todayJournalCount.value > 0)

// Preferences
const emotionTarget = computed(() => userPreferencesStore.dailyEmotionTarget)

// Trackers
const hasTrackers = computed(() => goalTrackerStore.dailyTrackers.length > 0)

// Weekly review
const showWeeklyReviewBanner = computed(() =>
  isWeeklyReviewDue(
    userPreferencesStore.weeklyReviewDay,
    periodicEntryStore.weeklyEntries
  )
)

const reviewWeekLabel = computed(() =>
  getReviewWeekLabel(userPreferencesStore.weeklyReviewDay)
)

// Week summary
const weekSummary = computed(() =>
  getWeekSummary(journalStore.entries, emotionLogStore.logs)
)

// Navigation handlers
function navigateToJournal() {
  router.push('/journal/edit')
}

function navigateToEmotionLog() {
  router.push('/emotions/edit')
}

function navigateToWeeklyReview() {
  // Navigate to create a new weekly entry for the review week
  const reviewDay = userPreferencesStore.weeklyReviewDay
  const today = new Date()
  const currentDayOfWeek = today.getDay()

  // Only create for the review week if we're on the review day
  if (currentDayOfWeek === reviewDay) {
    // Get the week to review
    let weekStart: Date
    if (reviewDay === 0) {
      // Sunday - review current Mon-Sun week
      weekStart = getWeekRange(today).start
    } else {
      // Other days - review previous week
      const prevWeek = new Date(today)
      prevWeek.setDate(prevWeek.getDate() - 7)
      weekStart = getWeekRange(prevWeek).start
    }

    // Navigate with the period start date as a query param so the editor knows which week
    router.push({
      path: '/periodic/new/weekly',
      query: { periodStart: toISODateString(weekStart) },
    })
  } else {
    // Fallback - just go to periodic new weekly
    router.push('/periodic/new/weekly')
  }
}

onMounted(async () => {
  try {
    // Load all required data in parallel
    await Promise.all([
      userPreferencesStore.loadPreferences(),
      journalStore.loadEntries(),
      emotionLogStore.loadLogs(),
      periodicEntryStore.loadEntries(),
      emotionStore.loadEmotions(),
      goalTrackerStore.loadAll(),
    ])
  } catch (error) {
    console.error('Failed to load Today view data:', error)
  } finally {
    isLoading.value = false
  }
})
</script>
