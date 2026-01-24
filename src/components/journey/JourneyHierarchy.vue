<template>
  <div class="relative">
    <!-- Vertical connecting line -->
    <div
      v-if="showAllLevels"
      class="absolute left-[7px] top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-300 via-green-300 to-amber-300 opacity-50"
    ></div>

    <div class="space-y-4">
      <!-- Yearly Section -->
      <section v-if="yearlyEntries.length > 0 || showAllLevels" class="relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-100 z-10"></div>
          <h2 class="text-lg font-semibold text-on-surface">Yearly</h2>
          <span class="text-xs text-on-surface-variant">Vision & Themes</span>
        </div>

        <div v-if="yearlyEntries.length > 0" class="space-y-3 ml-7">
          <PeriodCard
            v-for="entry in yearlyEntries"
            :key="entry.id"
            :entry="entry"
            color-class="border-l-purple-500"
            @click="$emit('view-entry', 'yearly', entry.id)"
          />
        </div>

        <div v-else class="ml-7">
          <button
            @click="$emit('create-entry', 'yearly')"
            class="w-full p-4 border-2 border-dashed border-purple-300 rounded-xl text-on-surface-variant hover:border-purple-500 hover:bg-purple-50 hover:text-purple-600 transition-all group"
          >
            <span class="flex items-center justify-center gap-2">
              <PlusCircleIcon class="w-5 h-5 group-hover:scale-110 transition-transform" />
              Create your first yearly reflection
            </span>
            <span class="text-xs block mt-1 opacity-70">Set your vision and themes for the year</span>
          </button>
        </div>
      </section>

      <!-- Quarterly Section -->
      <section v-if="quarterlyEntries.length > 0 || showAllLevels" class="ml-4 relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-100 z-10"></div>
          <h2 class="text-lg font-semibold text-on-surface">Quarterly</h2>
          <span class="text-xs text-on-surface-variant">Priorities & Goals</span>
        </div>

        <div v-if="quarterlyEntries.length > 0" class="space-y-3 ml-7">
          <PeriodCard
            v-for="entry in quarterlyEntries.slice(0, expandedQuarterly ? undefined : 2)"
            :key="entry.id"
            :entry="entry"
            color-class="border-l-blue-500"
            @click="$emit('view-entry', 'quarterly', entry.id)"
          />

          <button
            v-if="quarterlyEntries.length > 2 && !expandedQuarterly"
            @click="expandedQuarterly = true"
            class="text-sm text-primary hover:text-primary-strong transition-colors ml-2"
          >
            Show {{ quarterlyEntries.length - 2 }} more...
          </button>
        </div>

        <div v-else class="ml-7">
          <button
            @click="$emit('create-entry', 'quarterly')"
            class="w-full p-4 border-2 border-dashed border-blue-300 rounded-xl text-on-surface-variant hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all group"
          >
            <span class="flex items-center justify-center gap-2">
              <PlusCircleIcon class="w-5 h-5 group-hover:scale-110 transition-transform" />
              Create quarterly review
            </span>
            <span class="text-xs block mt-1 opacity-70">Break yearly goals into quarterly priorities</span>
          </button>
        </div>
      </section>

      <!-- Weekly Section -->
      <section v-if="weeklyEntries.length > 0 || showAllLevels" class="ml-8 relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-4 h-4 rounded-full bg-green-500 ring-4 ring-green-100 z-10"></div>
          <h2 class="text-lg font-semibold text-on-surface">Weekly</h2>
          <span class="text-xs text-on-surface-variant">Intentions & Reflection</span>
        </div>

        <div v-if="weeklyEntries.length > 0" class="space-y-3 ml-7">
          <PeriodCard
            v-for="entry in weeklyEntries.slice(0, expandedWeekly ? undefined : 3)"
            :key="entry.id"
            :entry="entry"
            color-class="border-l-green-500"
            :is-current="isCurrentWeek(entry)"
            @click="$emit('view-entry', 'weekly', entry.id)"
          />

          <button
            v-if="weeklyEntries.length > 3 && !expandedWeekly"
            @click="expandedWeekly = true"
            class="text-sm text-primary hover:text-primary-strong transition-colors ml-2"
          >
            Show {{ weeklyEntries.length - 3 }} more...
          </button>
        </div>

        <div v-else class="ml-7">
          <button
            @click="$emit('create-entry', 'weekly')"
            class="w-full p-4 border-2 border-dashed border-green-300 rounded-xl text-on-surface-variant hover:border-green-500 hover:bg-green-50 hover:text-green-600 transition-all group"
          >
            <span class="flex items-center justify-center gap-2">
              <PlusCircleIcon class="w-5 h-5 group-hover:scale-110 transition-transform" />
              Create weekly review
            </span>
            <span class="text-xs block mt-1 opacity-70">Set intentions and reflect on your week</span>
          </button>
        </div>
      </section>

      <!-- Daily Section -->
      <section class="ml-12 relative">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-100 z-10"></div>
          <h2 class="text-lg font-semibold text-on-surface">Daily</h2>
          <span class="text-xs text-on-surface-variant">Check-ins & Trackers</span>
        </div>

      <!-- Today Card (always shown) -->
      <div class="space-y-3 ml-7">
        <div
          @click="$emit('create-entry', 'daily')"
          class="p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-amber-800">Today</p>
              <p class="text-sm text-amber-600">{{ todayFormatted }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="todayEntry" class="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded-full">
                In Progress
              </span>
              <ChevronRightIcon class="w-5 h-5 text-amber-600" />
            </div>
          </div>

          <!-- Today's trackers summary -->
          <div v-if="trackers.length > 0" class="mt-3 flex flex-wrap gap-2">
            <div
              v-for="tracker in trackers.slice(0, 4)"
              :key="tracker.id"
              :class="[
                'text-xs px-2 py-1 rounded-full',
                isTrackerComplete(tracker.id)
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              ]"
            >
              {{ tracker.name }}
            </div>
            <span v-if="trackers.length > 4" class="text-xs text-amber-600">
              +{{ trackers.length - 4 }} more
            </span>
          </div>
        </div>

        <!-- Recent daily entries -->
        <PeriodCard
          v-for="entry in recentDailyEntries"
          :key="entry.id"
          :entry="entry"
          color-class="border-l-amber-500"
          @click="$emit('view-entry', 'daily', entry.periodStartDate)"
        />

        <button
          v-if="dailyEntries.length > 5 && !expandedDaily"
          @click="expandedDaily = true"
          class="text-sm text-primary hover:text-primary-strong transition-colors"
        >
          Show {{ dailyEntries.length - 5 }} more...
        </button>
      </div>
    </section>

      <!-- Goals Section (if any active goals) -->
      <section v-if="goals.length > 0" class="mt-8 pt-6 border-t border-outline/30">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <FlagIcon class="w-5 h-5 text-primary" />
            <h2 class="text-lg font-semibold text-on-surface">Active Goals</h2>
          </div>
          <span class="text-sm text-on-surface-variant">{{ goals.length }} goals</span>
        </div>

        <div class="space-y-3">
          <div
            v-for="goal in goals.slice(0, 5)"
            :key="goal.id"
            class="p-4 bg-surface border border-outline/30 rounded-xl hover:shadow-sm transition-shadow"
          >
            <div class="flex items-start justify-between">
              <div>
                <p class="font-medium text-on-surface">{{ goal.title }}</p>
                <p v-if="goal.description" class="text-sm text-on-surface-variant mt-1 line-clamp-2">
                  {{ goal.description }}
                </p>
              </div>
              <span
                :class="[
                  'text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2',
                  getPeriodBadgeClass(goal.sourcePeriodType)
                ]"
              >
                {{ goal.sourcePeriodType }}
              </span>
            </div>
          </div>

          <button
            v-if="goals.length > 5"
            class="text-sm text-primary hover:text-primary-strong transition-colors"
          >
            View all {{ goals.length }} goals
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ChevronRightIcon, PlusCircleIcon, FlagIcon } from '@heroicons/vue/24/outline'
import PeriodCard from './PeriodCard.vue'
import type { PeriodicEntry, PeriodicEntryType } from '@/domain/periodicEntry'
import type { CascadingGoal, GoalTracker } from '@/domain/lifeSeasons'
import { getWeekRange, toISODateString } from '@/utils/periodUtils'
import { useGoalTrackerStore } from '@/stores/goalTracker.store'

interface Props {
  yearlyEntries: PeriodicEntry[]
  quarterlyEntries: PeriodicEntry[]
  weeklyEntries: PeriodicEntry[]
  dailyEntries: PeriodicEntry[]
  goals: CascadingGoal[]
  trackers: GoalTracker[]
}

const props = defineProps<Props>()

defineEmits<{
  'view-entry': [type: PeriodicEntryType, id: string]
  'create-entry': [type: PeriodicEntryType]
}>()

const goalTrackerStore = useGoalTrackerStore()

// Expansion states
const expandedQuarterly = ref(false)
const expandedWeekly = ref(false)
const expandedDaily = ref(false)

// Show all levels if we have any entries
const showAllLevels = computed(() => {
  return (
    props.yearlyEntries.length > 0 ||
    props.quarterlyEntries.length > 0 ||
    props.weeklyEntries.length > 0
  )
})

// Today's date
const today = new Date()
const todayStr = today.toISOString().split('T')[0]

const todayFormatted = computed(() => {
  return today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
})

// Check if we have a today entry
const todayEntry = computed(() => {
  return props.dailyEntries.find((e) => e.periodStartDate === todayStr)
})

// Recent daily entries (excluding today)
const recentDailyEntries = computed(() => {
  return props.dailyEntries
    .filter((e) => e.periodStartDate !== todayStr)
    .slice(0, expandedDaily.value ? undefined : 4)
})

// Check if entry is current week
function isCurrentWeek(entry: PeriodicEntry): boolean {
  const weekRange = getWeekRange(today)
  const currentWeekStart = toISODateString(weekRange.start)
  return entry.periodStartDate === currentWeekStart
}

// Check if tracker is complete today
function isTrackerComplete(trackerId: string): boolean {
  return goalTrackerStore.isTrackerCompleteToday(trackerId)
}

// Get badge class for period type
function getPeriodBadgeClass(type: PeriodicEntryType): string {
  switch (type) {
    case 'yearly':
      return 'bg-purple-100 text-purple-700'
    case 'quarterly':
      return 'bg-blue-100 text-blue-700'
    case 'weekly':
      return 'bg-green-100 text-green-700'
    case 'daily':
      return 'bg-amber-100 text-amber-700'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}
</script>
