<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <!-- Header -->
    <div class="flex items-center gap-3 mb-6">
      <button
        @click="goBack"
        class="p-2 rounded-xl text-on-surface hover:bg-section transition-colors"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-5 h-5" />
      </button>
      <div class="flex-1">
        <h1 class="text-xl font-semibold text-on-surface">
          {{ isEditing ? 'Edit Yearly Review' : 'New Yearly Review' }}
        </h1>
        <p class="text-sm text-on-surface-variant">{{ yearLabel }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-on-surface-variant text-center py-12">
      Loading...
    </div>

    <template v-else>
      <!-- Tabs -->
      <div class="flex gap-2 mb-6 border-b border-outline/30">
        <button
          @click="activeTab = 'reflection'"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'reflection'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          ]"
        >
          Looking Back
        </button>
        <button
          @click="activeTab = 'planning'"
          :class="[
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'planning'
              ? 'border-purple-500 text-purple-600'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          ]"
        >
          Looking Forward
        </button>
      </div>

      <!-- Reflection Tab -->
      <div v-show="activeTab === 'reflection'">
        <YearlyReflectionForm v-model="reflectionData" />
      </div>

      <!-- Planning Tab -->
      <div v-show="activeTab === 'planning'">
        <YearlyPlanningForm v-model="planningData" />
      </div>

      <!-- Save Button -->
      <div class="mt-8 flex gap-3">
        <button
          @click="saveEntry"
          :disabled="isSaving"
          class="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-strong transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {{ isSaving ? 'Saving...' : (isEditing ? 'Update Review' : 'Save Review') }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import YearlyReflectionForm, {
  type YearlyReflectionData,
} from '@/components/journey/YearlyReflectionForm.vue'
import YearlyPlanningForm, {
  type YearlyPlanningData,
} from '@/components/journey/YearlyPlanningForm.vue'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useCascadingGoalStore } from '@/stores/cascadingGoal.store'
import { getYearRange, toISODateString } from '@/utils/periodUtils'

const route = useRoute()
const router = useRouter()
const periodicEntryStore = usePeriodicEntryStore()
const cascadingGoalStore = useCascadingGoalStore()

const isLoading = ref(true)
const isSaving = ref(false)
const activeTab = ref<'reflection' | 'planning'>('reflection')

// Get entry ID from route if editing
const entryId = computed(() => route.params.id as string | undefined)
const isEditing = computed(() => !!entryId.value)

// Get year from route query or use current year
const year = computed(() => {
  const yearParam = route.query.year as string
  return yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()
})

const yearLabel = computed(() => `${year.value}`)

// Form data
const reflectionData = ref<YearlyReflectionData>({
  yearOverview: '',
  whatWentWell: [],
  challengesFaced: [],
  lessonsLearned: [],
  sourcesOfJoy: [],
  gratitude: [],
})

const planningData = ref<YearlyPlanningData>({
  theme: '',
  vision: '',
  highLevelGoals: [],
  areasOfFocus: [],
  flexibleIntentions: '',
})

// Existing entry reference
const existingEntry = ref<Awaited<ReturnType<typeof periodicEntryStore.getEntryById>> | null>(null)

// Navigation
function goBack() {
  router.push({ name: 'journey' })
}

// Load existing entry data
async function loadExistingEntry() {
  if (!entryId.value) return

  const entry = await periodicEntryStore.getEntryById(entryId.value)
  if (!entry) return

  existingEntry.value = entry

  // Populate reflection data from existing entry
  reflectionData.value = {
    yearOverview: entry.freeWriting || '',
    whatWentWell: entry.wins || [],
    challengesFaced: entry.challenges || [],
    lessonsLearned: entry.learnings || [],
    sourcesOfJoy: [], // Not in base entry, would be in customSections
    gratitude: entry.gratitude || [],
  }

  // Populate planning data
  planningData.value = {
    theme: entry.yearlyTheme || '',
    vision: entry.yearlyVision || '',
    highLevelGoals: [], // Would need to load from cascading goals
    areasOfFocus: [],
    flexibleIntentions: entry.intention || '',
  }

  // Load custom sections if available
  if (entry.customSections) {
    const custom = entry.customSections as Record<string, unknown>
    if (Array.isArray(custom.sourcesOfJoy)) {
      reflectionData.value.sourcesOfJoy = custom.sourcesOfJoy as string[]
    }
    if (Array.isArray(custom.areasOfFocus)) {
      planningData.value.areasOfFocus = custom.areasOfFocus as string[]
    }
    if (Array.isArray(custom.highLevelGoals)) {
      planningData.value.highLevelGoals = custom.highLevelGoals as string[]
    }
  }
}

// Save entry
async function saveEntry() {
  isSaving.value = true

  try {
    const yearRange = getYearRange(new Date(year.value, 0, 1))
    const periodStartDate = toISODateString(yearRange.start)
    const periodEndDate = toISODateString(yearRange.end)

    const entryData = {
      // Standard fields (mapped from reflection)
      wins: reflectionData.value.whatWentWell,
      challenges: reflectionData.value.challengesFaced,
      learnings: reflectionData.value.lessonsLearned,
      gratitude: reflectionData.value.gratitude,
      freeWriting: reflectionData.value.yearOverview,
      intention: planningData.value.flexibleIntentions,
      // Yearly-specific fields
      yearlyTheme: planningData.value.theme,
      yearlyVision: planningData.value.vision,
      // Custom sections for data not in base schema
      customSections: {
        sourcesOfJoy: reflectionData.value.sourcesOfJoy,
        areasOfFocus: planningData.value.areasOfFocus,
        highLevelGoals: planningData.value.highLevelGoals,
      },
    }

    if (isEditing.value && existingEntry.value) {
      // Update existing entry
      await periodicEntryStore.updateEntry(existingEntry.value.id, entryData)
    } else {
      // Create new entry
      const newEntry = await periodicEntryStore.createEntry({
        type: 'yearly',
        periodStartDate,
        periodEndDate,
        ...entryData,
        aggregatedData: {
          periodStartDate,
          periodEndDate,
          journalEntryIds: [],
          emotionLogIds: [],
          emotionFrequency: [],
          tagEmotionAssociations: [],
        },
      })

      // Create cascading goals from high-level goals
      for (const goalTitle of planningData.value.highLevelGoals) {
        if (goalTitle.trim()) {
          await cascadingGoalStore.createGoal({
            title: goalTitle,
            sourceEntryId: newEntry.id,
            sourcePeriodType: 'yearly',
          })
        }
      }
    }

    router.push({ name: 'journey' })
  } catch (error) {
    console.error('Failed to save yearly entry:', error)
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  try {
    await periodicEntryStore.loadEntries()
    await cascadingGoalStore.loadGoals()

    if (isEditing.value) {
      await loadExistingEntry()
    }
  } catch (error) {
    console.error('Failed to load data:', error)
  } finally {
    isLoading.value = false
  }
})
</script>
