<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <button
          @click="goBack"
          class="p-2 rounded-xl text-on-surface hover:bg-section transition-colors"
          aria-label="Go back"
        >
          <ArrowLeftIcon class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-xl font-semibold text-on-surface">Daily Check-in</h1>
          <p class="text-sm text-on-surface-variant">{{ formattedDate }}</p>
        </div>
      </div>

      <!-- Date navigation -->
      <div class="flex items-center gap-2">
        <button
          @click="navigateToPreviousDay"
          class="p-2 rounded-lg text-on-surface-variant hover:bg-section transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeftIcon class="w-5 h-5" />
        </button>
        <button
          v-if="!isToday"
          @click="navigateToToday"
          class="px-3 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          @click="navigateToNextDay"
          :disabled="isToday"
          :class="[
            'p-2 rounded-lg transition-colors',
            isToday
              ? 'text-on-surface-variant/30 cursor-not-allowed'
              : 'text-on-surface-variant hover:bg-section'
          ]"
          aria-label="Next day"
        >
          <ChevronRightIcon class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-on-surface-variant text-center py-12">
      Loading...
    </div>

    <template v-else>
      <!-- Weekly Intention (if available) -->
      <div
        v-if="weeklyIntention"
        class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl"
      >
        <div class="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
          <SparklesIcon class="w-4 h-4" />
          <span>This Week's Intention</span>
        </div>
        <p class="text-green-800">{{ weeklyIntention }}</p>
      </div>

      <!-- Linked Goals from Weekly Entry -->
      <section v-if="linkedGoals.length > 0" class="mb-6">
        <h2 class="text-sm font-medium text-on-surface mb-3">Weekly Goals Progress</h2>
        <div class="space-y-2">
          <div
            v-for="goal in linkedGoals"
            :key="goal.id"
            class="p-3 bg-surface border border-outline/30 rounded-xl flex items-center gap-3"
          >
            <div
              :class="[
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                goal.status === 'completed' ? 'bg-green-100' : 'bg-blue-100'
              ]"
            >
              <CheckIcon v-if="goal.status === 'completed'" class="w-4 h-4 text-green-600" />
              <FlagIcon v-else class="w-4 h-4 text-blue-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-medium text-on-surface truncate">{{ goal.title }}</p>
              <p class="text-xs text-on-surface-variant">
                {{ goal.sourcePeriodType }} goal
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Morning Intention -->
      <section class="mb-6">
        <label class="block text-sm font-medium text-on-surface mb-2">
          <SunIcon class="w-4 h-4 inline-block mr-1 text-amber-500" />
          Morning Intention
        </label>
        <textarea
          v-model="morningIntention"
          placeholder="What's your focus for today?"
          rows="3"
          class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
        />
      </section>

      <!-- Trackers -->
      <section v-if="dailyTrackers.length > 0" class="mb-6">
        <h2 class="text-sm font-medium text-on-surface mb-3">Today's Trackers</h2>
        <div class="space-y-3">
          <div
            v-for="tracker in dailyTrackers"
            :key="tracker.id"
            class="flex items-center justify-between p-4 bg-surface border border-outline/30 rounded-xl"
          >
            <div class="flex items-center gap-3">
              <div
                :class="[
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isTrackerComplete(tracker.id) ? 'bg-green-100' : 'bg-section'
                ]"
              >
                <CheckIcon
                  v-if="isTrackerComplete(tracker.id)"
                  class="w-5 h-5 text-green-600"
                />
                <span v-else class="text-on-surface-variant">{{ getTrackerEmoji(tracker.type) }}</span>
              </div>
              <div>
                <p class="font-medium text-on-surface">{{ tracker.name }}</p>
                <p v-if="tracker.targetValue" class="text-sm text-on-surface-variant">
                  Target: {{ tracker.targetValue }} {{ tracker.unit }}
                </p>
              </div>
            </div>

            <!-- Tracker Input -->
            <div v-if="tracker.type === 'boolean'">
              <button
                @click="toggleBooleanTracker(tracker.id)"
                :class="[
                  'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                  getTrackerValue(tracker.id) === true
                    ? 'bg-green-500 text-white'
                    : 'bg-section text-on-surface-variant hover:bg-section-strong'
                ]"
              >
                <CheckIcon class="w-6 h-6" />
              </button>
            </div>
            <div v-else class="flex items-center gap-2">
              <input
                type="number"
                :value="getTrackerValue(tracker.id) || 0"
                @input="updateCountTracker(tracker.id, ($event.target as HTMLInputElement).value)"
                class="w-20 px-3 py-2 bg-surface border border-outline/30 rounded-xl text-center text-on-surface focus:outline-none focus:ring-2 focus:ring-focus"
              />
              <span v-if="tracker.unit" class="text-sm text-on-surface-variant">
                {{ tracker.unit }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Evening Reflection -->
      <section class="mb-6">
        <label class="block text-sm font-medium text-on-surface mb-2">
          <MoonIcon class="w-4 h-4 inline-block mr-1 text-indigo-500" />
          Evening Reflection
        </label>
        <textarea
          v-model="eveningReflection"
          placeholder="How did the day go?"
          rows="3"
          class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus resize-none"
        />
      </section>

      <!-- Quick Win -->
      <section class="mb-6">
        <label class="block text-sm font-medium text-on-surface mb-2">
          <TrophyIcon class="w-4 h-4 inline-block mr-1 text-yellow-500" />
          Quick Win
        </label>
        <input
          v-model="quickWin"
          type="text"
          placeholder="One thing that went well"
          class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </section>

      <!-- Gratitude -->
      <section class="mb-8">
        <label class="block text-sm font-medium text-on-surface mb-2">
          <HeartIcon class="w-4 h-4 inline-block mr-1 text-pink-500" />
          Gratitude
        </label>
        <input
          v-model="gratitudeText"
          type="text"
          placeholder="What are you grateful for today?"
          class="w-full px-4 py-3 bg-surface border border-outline/30 rounded-xl text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus"
        />
      </section>

      <!-- Save Button -->
      <div class="flex gap-3">
        <button
          @click="saveEntry"
          :disabled="isSaving"
          class="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Saving...' : (existingEntry ? 'Update Check-in' : 'Save Check-in') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  CheckIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FlagIcon,
  SunIcon,
  MoonIcon,
  TrophyIcon,
  HeartIcon,
} from '@heroicons/vue/24/outline'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useGoalTrackerStore } from '@/stores/goalTracker.store'
import { useCascadingGoalStore } from '@/stores/cascadingGoal.store'
import { getWeekRange, toISODateString } from '@/utils/periodUtils'

const route = useRoute()
const router = useRouter()
const periodicEntryStore = usePeriodicEntryStore()
const goalTrackerStore = useGoalTrackerStore()
const cascadingGoalStore = useCascadingGoalStore()

const isLoading = ref(true)
const isSaving = ref(false)

// Form state
const morningIntention = ref('')
const eveningReflection = ref('')
const quickWin = ref('')
const gratitudeText = ref('')
const trackerValues = ref<Record<string, number | boolean>>({})

// Current date from route or today
const currentDate = computed(() => {
  const dateParam = route.params.date as string
  return dateParam || new Date().toISOString().split('T')[0]
})

const formattedDate = computed(() => {
  const date = new Date(currentDate.value + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

const isToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return currentDate.value === today
})

// Find existing entry for this date
const existingEntry = computed(() => {
  return periodicEntryStore.entries.find(
    (e) => e.type === 'daily' && e.periodStartDate === currentDate.value
  )
})

// Get current week's entry
const currentWeekEntry = computed(() => {
  const date = new Date(currentDate.value + 'T00:00:00')
  const weekRange = getWeekRange(date)
  const weekStart = toISODateString(weekRange.start)

  return periodicEntryStore.weeklyEntries.find(
    (e) => e.periodStartDate === weekStart
  )
})

// Get weekly intention from current week's entry
const weeklyIntention = computed(() => currentWeekEntry.value?.intention)

// Get linked goals from the weekly entry
const linkedGoals = computed(() => {
  const linkedIds = currentWeekEntry.value?.linkedGoalIds || []
  return cascadingGoalStore.goals.filter(g => linkedIds.includes(g.id))
})

// Daily trackers
const dailyTrackers = computed(() => goalTrackerStore.dailyTrackers)

// Helper functions for trackers
function getTrackerValue(trackerId: string): number | boolean | undefined {
  return trackerValues.value[trackerId]
}

function isTrackerComplete(trackerId: string): boolean {
  const tracker = dailyTrackers.value.find((t) => t.id === trackerId)
  if (!tracker) return false

  const value = trackerValues.value[trackerId]
  if (value === undefined) return false

  if (tracker.type === 'boolean') {
    return value === true
  }

  if (tracker.targetValue !== undefined) {
    return (value as number) >= tracker.targetValue
  }

  return true
}

function getTrackerEmoji(type: string): string {
  switch (type) {
    case 'boolean':
      return '✓'
    case 'count':
      return '#'
    case 'scale':
      return '★'
    default:
      return '•'
  }
}

function toggleBooleanTracker(trackerId: string) {
  const current = trackerValues.value[trackerId]
  trackerValues.value[trackerId] = current === true ? false : true
}

function updateCountTracker(trackerId: string, value: string) {
  const numValue = parseInt(value, 10)
  trackerValues.value[trackerId] = isNaN(numValue) ? 0 : numValue
}

// Load existing tracker entries for this date
async function loadTrackerEntries() {
  for (const tracker of dailyTrackers.value) {
    const entry = goalTrackerStore.getEntryByTrackerAndDate(tracker.id, currentDate.value)
    if (entry) {
      trackerValues.value[tracker.id] = entry.value
    } else {
      // Initialize with default value
      trackerValues.value[tracker.id] = tracker.type === 'boolean' ? false : 0
    }
  }
}

// Navigation
function goBack() {
  router.push({ name: 'journey' })
}

function navigateToPreviousDay() {
  const current = new Date(currentDate.value + 'T00:00:00')
  current.setDate(current.getDate() - 1)
  const newDate = toISODateString(current)
  router.push({ name: 'journey-daily', params: { date: newDate } })
}

function navigateToNextDay() {
  if (isToday.value) return
  const current = new Date(currentDate.value + 'T00:00:00')
  current.setDate(current.getDate() + 1)
  const newDate = toISODateString(current)
  router.push({ name: 'journey-daily', params: { date: newDate } })
}

function navigateToToday() {
  const today = new Date().toISOString().split('T')[0]
  router.push({ name: 'journey-daily', params: { date: today } })
}

// Save entry
async function saveEntry() {
  isSaving.value = true

  try {
    // Save tracker entries
    for (const tracker of dailyTrackers.value) {
      const value = trackerValues.value[tracker.id]
      if (value !== undefined) {
        await goalTrackerStore.createEntry({
          trackerId: tracker.id,
          date: currentDate.value,
          value,
        })
      }
    }

    // Create or update periodic entry
    const gratitudeArray = gratitudeText.value ? [gratitudeText.value] : []

    if (existingEntry.value) {
      await periodicEntryStore.updateEntry(existingEntry.value.id, {
        morningIntention: morningIntention.value || undefined,
        eveningReflection: eveningReflection.value || undefined,
        quickWin: quickWin.value || undefined,
        gratitude: gratitudeArray.length > 0 ? gratitudeArray : existingEntry.value.gratitude,
      })
    } else {
      await periodicEntryStore.createEntry({
        type: 'daily',
        periodStartDate: currentDate.value,
        periodEndDate: currentDate.value,
        morningIntention: morningIntention.value || undefined,
        eveningReflection: eveningReflection.value || undefined,
        quickWin: quickWin.value || undefined,
        gratitude: gratitudeArray,
        aggregatedData: {
          periodStartDate: currentDate.value,
          periodEndDate: currentDate.value,
          journalEntryIds: [],
          emotionLogIds: [],
          emotionFrequency: [],
          tagEmotionAssociations: [],
        },
      })
    }

    router.push({ name: 'journey' })
  } catch (error) {
    console.error('Failed to save daily check-in:', error)
  } finally {
    isSaving.value = false
  }
}

// Load form data from existing entry
function loadFormData() {
  if (existingEntry.value) {
    morningIntention.value = existingEntry.value.morningIntention || ''
    eveningReflection.value = existingEntry.value.eveningReflection || ''
    quickWin.value = existingEntry.value.quickWin || ''
    gratitudeText.value = existingEntry.value.gratitude?.[0] || ''
  } else {
    morningIntention.value = ''
    eveningReflection.value = ''
    quickWin.value = ''
    gratitudeText.value = ''
  }
}

// Load data on mount
onMounted(async () => {
  try {
    await Promise.all([
      periodicEntryStore.loadEntries(),
      goalTrackerStore.loadAll(),
      cascadingGoalStore.loadGoals(),
    ])

    loadFormData()
    await loadTrackerEntries()
  } catch (error) {
    console.error('Failed to load daily check-in data:', error)
  } finally {
    isLoading.value = false
  }
})

// Reload data when date changes
watch(currentDate, async () => {
  loadFormData()
  await loadTrackerEntries()
})
</script>
