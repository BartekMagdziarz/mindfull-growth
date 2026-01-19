<template>
  <div
    :class="[
      'mx-auto w-full px-2 sm:px-4 md:px-6 py-6 pb-24',
      isWeekly ? 'max-w-[83rem]' : 'max-w-6xl',
    ]"
  >
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="p-2 rounded-xl text-on-surface-variant hover:bg-section transition-colors"
        @click="handleCancel"
        aria-label="Go back"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">
          {{ pageTitle }}
        </h1>
        <p v-if="!isWeekly" class="text-sm text-on-surface-variant">{{ periodDateRange }}</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-on-surface-variant text-center py-8">
      Loading...
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-error bg-error-container p-4 rounded-xl">
      <p class="font-semibold mb-2">Error</p>
      <p class="text-sm">{{ error }}</p>
    </div>

    <!-- Editor Content -->
    <div v-else class="space-y-6">
      <!-- Previous Intention Reflection (if applicable) -->
      <IntentionSection
        v-if="showPreviousIntention"
        :previous-intention="previousIntention"
        v-model:reflection="form.intentionReflection"
        mode="reflection"
      />

      <template v-if="isWeekly">
        <!-- Week Range Picker (only for new entries) -->
        <WeekRangePicker
          v-if="isNewEntry"
          :model-value="selectedWeekRange"
          @update:model-value="handleWeekRangeChange"
        />

        <WeeklyTimeline :day-summaries="weeklyDaySummaries" />

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <ListInputSection
            v-model="form.wins"
            title="Wins"
            icon="trophy"
            placeholder="Add a win..."
            empty-message="What went well?"
            class="bg-section/30 border border-outline/40"
          />
          <ListInputSection
            v-model="form.challenges"
            title="Challenges"
            icon="mountain"
            placeholder="Add a challenge..."
            empty-message="What was difficult?"
            class="bg-section/30 border border-outline/40"
          />
          <ListInputSection
            v-model="form.learnings"
            title="Learnings"
            icon="lightbulb"
            placeholder="Add a learning..."
            empty-message="What did you learn?"
            class="bg-section/30 border border-outline/40"
          />
        </div>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <GratitudeSection v-model="form.gratitude" class="bg-section/30 border border-outline/40" />
          <IntentionSection
            v-model:intention="form.intention"
            :period-label="nextPeriodLabel"
            mode="set"
            class="bg-section/30 border border-outline/40"
          />
        </div>

        <AppCard padding="lg" class="space-y-4 bg-section/20 border border-outline/40">
          <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
            <PencilIcon class="w-5 h-5 text-primary" />
            Free Writing
          </h2>
          <textarea
            v-model="form.freeWriting"
            class="w-full min-h-[150px] p-4 rounded-xl border border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
          />
        </AppCard>

      </template>

      <template v-else>
        <!-- Emotion Cloud Section -->
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
            <SparklesIcon class="w-5 h-5 text-primary" />
            Your {{ periodTypeLabel }} in Emotions
          </h2>
          <EmotionCloud
            :emotion-frequency="aggregatedData.emotionFrequency"
            :empty-message="`No emotions logged this ${periodTypeLabel.toLowerCase()}`"
          />
        </AppCard>

        <!-- Tags & Emotions Section -->
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
            <TagIcon class="w-5 h-5 text-primary" />
            Tags & Emotions
          </h2>
          <TagEmotionList
            :associations="aggregatedData.tagEmotionAssociations"
            :empty-message="`No tags used this ${periodTypeLabel.toLowerCase()}`"
          />
        </AppCard>

        <!-- Wins Section -->
        <ListInputSection
          v-model="form.wins"
          title="Wins"
          icon="trophy"
          placeholder="Add a win..."
          empty-message="What went well?"
        />

        <!-- Challenges Section -->
        <ListInputSection
          v-model="form.challenges"
          title="Challenges"
          icon="mountain"
          placeholder="Add a challenge..."
          empty-message="What was difficult?"
        />

        <!-- Learnings Section -->
        <ListInputSection
          v-model="form.learnings"
          title="Learnings"
          icon="lightbulb"
          placeholder="Add a learning..."
          empty-message="What did you learn?"
        />

        <!-- Gratitude Section -->
        <GratitudeSection v-model="form.gratitude" />

        <!-- Free Writing Section -->
        <AppCard padding="lg" class="space-y-4">
          <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
            <PencilIcon class="w-5 h-5 text-primary" />
            Free Writing
          </h2>
          <textarea
            v-model="form.freeWriting"
            class="w-full min-h-[150px] p-4 rounded-xl border border-outline/30 bg-surface text-on-surface placeholder:text-on-surface-variant resize-y focus:outline-none focus:ring-2 focus:ring-focus focus:border-transparent"
          />
        </AppCard>

        <!-- Intention for Next Period -->
        <IntentionSection
          v-model:intention="form.intention"
          :period-label="nextPeriodLabel"
          mode="set"
        />

      </template>

      <!-- Action Buttons -->
      <div class="flex gap-4 justify-end pt-4">
        <AppButton variant="text" @click="handleCancel">
          Cancel
        </AppButton>
        <AppButton variant="filled" @click="handleSave" :disabled="isSaving">
          {{ isSaving ? 'Saving...' : 'Save' }}
        </AppButton>
      </div>
    </div>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeftIcon,
  SparklesIcon,
  TagIcon,
  PencilIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import EmotionCloud from '@/components/periodic/EmotionCloud.vue'
import TagEmotionList from '@/components/periodic/TagEmotionList.vue'
import WeeklyTimeline from '@/components/periodic/WeeklyTimeline.vue'
import WeekRangePicker from '@/components/periodic/WeekRangePicker.vue'
import ListInputSection from '@/components/periodic/ListInputSection.vue'
import GratitudeSection from '@/components/periodic/GratitudeSection.vue'
import IntentionSection from '@/components/periodic/IntentionSection.vue'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { aggregatePeriodData } from '@/services/periodAggregation'
import { buildWeeklyDaySummaries } from '@/services/periodTimeline'
import {
  getPeriodRange,
  formatDateRange,
  getTypeLabel,
  toISODateString,
} from '@/utils/periodUtils'
import type {
  PeriodicEntry,
  PeriodicEntryType,
  PeriodAggregatedData,
} from '@/domain/periodicEntry'
import type { PeriodRange } from '@/utils/periodUtils'

const route = useRoute()
const router = useRouter()
const periodicEntryStore = usePeriodicEntryStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

// State
const isLoading = ref(true)
const isSaving = ref(false)
const error = ref<string | null>(null)
const existingEntry = ref<PeriodicEntry | null>(null)
const previousEntry = ref<PeriodicEntry | null>(null)
const selectedWeekRange = ref<PeriodRange>(getPeriodRange('weekly'))

// Determine if creating new or editing existing
const isNewEntry = computed(() => route.path.includes('/new/'))
const entryId = computed(() => route.params.id as string | undefined)
const periodType = computed<PeriodicEntryType>(() => {
  if (isNewEntry.value) {
    return route.params.type as PeriodicEntryType
  }
  return existingEntry.value?.type ?? 'weekly'
})

// Period info
const periodRange = computed(() => getPeriodRange(periodType.value))
const periodTypeLabel = computed(() => getTypeLabel(periodType.value))
const periodDateRange = computed(() =>
  formatDateRange(periodRange.value.start, periodRange.value.end, periodType.value)
)
const pageTitle = computed(() => {
  if (isWeekly.value) {
    return 'Weekly Review'
  }
  return `${periodTypeLabel.value} Review: ${periodDateRange.value}`
})
const nextPeriodLabel = computed(() => `next ${periodTypeLabel.value.toLowerCase()}`)

const isWeekly = computed(() => periodType.value === 'weekly')

const weeklyRange = computed<PeriodRange>(() => {
  if (!isNewEntry.value && aggregatedData.value.periodStartDate && aggregatedData.value.periodEndDate) {
    const start = parseISODate(aggregatedData.value.periodStartDate)
    const end = parseISODate(aggregatedData.value.periodEndDate)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }
  return selectedWeekRange.value
})

const weeklyDaySummaries = computed(() => {
  if (!isWeekly.value) return []
  return buildWeeklyDaySummaries({
    journalEntries: journalStore.entries,
    emotionLogs: emotionLogStore.logs,
    range: weeklyRange.value,
  })
})

// Aggregated data
const aggregatedData = ref<PeriodAggregatedData>({
  periodStartDate: '',
  periodEndDate: '',
  journalEntryIds: [],
  emotionLogIds: [],
  emotionFrequency: [],
  tagEmotionAssociations: [],
})

// Form state
const form = reactive({
  wins: [] as string[],
  challenges: [] as string[],
  learnings: [] as string[],
  gratitude: ['', '', ''] as string[],
  freeWriting: '',
  intention: '',
  intentionReflection: '',
})

// Previous intention
const showPreviousIntention = computed(() => {
  return previousEntry.value?.intention && previousEntry.value.intention.trim() !== ''
})
const previousIntention = computed(() => previousEntry.value?.intention ?? '')

// Load data
async function loadData() {
  isLoading.value = true
  error.value = null

  try {
    // Load all required stores
    const loadPromises = [periodicEntryStore.loadEntries()]

    if (journalStore.entries.length === 0) {
      loadPromises.push(journalStore.loadEntries())
    }
    if (emotionLogStore.logs.length === 0) {
      loadPromises.push(emotionLogStore.loadLogs())
    }
    if (!emotionStore.isLoaded) {
      loadPromises.push(emotionStore.loadEmotions())
    }
    if (tagStore.peopleTags.length === 0) {
      loadPromises.push(tagStore.loadPeopleTags())
    }
    if (tagStore.contextTags.length === 0) {
      loadPromises.push(tagStore.loadContextTags())
    }

    await Promise.all(loadPromises)

    if (isNewEntry.value) {
      // Creating new entry - aggregate data
      const range = isWeekly.value ? selectedWeekRange.value : getPeriodRange(periodType.value)
      aggregatedData.value = aggregatePeriodData({
        journalEntries: journalStore.entries,
        emotionLogs: emotionLogStore.logs,
        periodRange: range,
      })

      // Check for previous period's entry
      const prevEntry = await periodicEntryStore.getPreviousEntry(
        periodType.value,
        toISODateString(range.start)
      )
      previousEntry.value = prevEntry ?? null
    } else if (entryId.value) {
      // Editing existing entry
      const entry = await periodicEntryStore.getEntryById(entryId.value)
      if (!entry) {
        throw new Error('Entry not found')
      }
      existingEntry.value = entry
      aggregatedData.value = entry.aggregatedData

      // Load form values from existing entry
      form.wins = [...entry.wins]
      form.challenges = [...entry.challenges]
      form.learnings = [...entry.learnings]
      form.gratitude = [...entry.gratitude]
      if (form.gratitude.length < 3) {
        form.gratitude = [...form.gratitude, ...Array(3 - form.gratitude.length).fill('')]
      }
      form.freeWriting = entry.freeWriting
      form.intention = entry.intention ?? ''
      form.intentionReflection = entry.intentionReflection ?? ''

      // Load previous entry if there's a reference
      if (entry.previousEntryId) {
        const prevEntry = await periodicEntryStore.getEntryById(entry.previousEntryId)
        previousEntry.value = prevEntry ?? null
      }
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load data'
    console.error('Error loading periodic entry data:', err)
  } finally {
    isLoading.value = false
  }
}

// Save entry
async function handleSave() {
  isSaving.value = true

  try {
    // Filter out empty strings from arrays
    const cleanWins = form.wins.filter((w) => w.trim() !== '')
    const cleanChallenges = form.challenges.filter((c) => c.trim() !== '')
    const cleanLearnings = form.learnings.filter((l) => l.trim() !== '')
    const cleanGratitude = form.gratitude.filter((g) => g.trim() !== '')

    if (isNewEntry.value) {
      // Create new entry
      const range = isWeekly.value ? selectedWeekRange.value : getPeriodRange(periodType.value)
      await periodicEntryStore.createEntry({
        type: periodType.value,
        periodStartDate: toISODateString(range.start),
        periodEndDate: toISODateString(range.end),
        wins: cleanWins,
        challenges: cleanChallenges,
        learnings: cleanLearnings,
        gratitude: cleanGratitude,
        freeWriting: form.freeWriting.trim(),
        intention: form.intention.trim() || undefined,
        intentionReflection: form.intentionReflection.trim() || undefined,
        aggregatedData: aggregatedData.value,
        previousEntryId: previousEntry.value?.id,
      })
      snackbarRef.value?.show('Entry created successfully')
    } else if (existingEntry.value) {
      // Update existing entry
      await periodicEntryStore.updateEntry(existingEntry.value.id, {
        wins: cleanWins,
        challenges: cleanChallenges,
        learnings: cleanLearnings,
        gratitude: cleanGratitude,
        freeWriting: form.freeWriting.trim(),
        intention: form.intention.trim() || undefined,
        intentionReflection: form.intentionReflection.trim() || undefined,
      })
      snackbarRef.value?.show('Entry updated successfully')
    }

    // Navigate back after short delay
    setTimeout(() => {
      router.push('/periodic')
    }, 500)
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to save entry'
    snackbarRef.value?.show(errorMessage)
    console.error('Error saving periodic entry:', err)
  } finally {
    isSaving.value = false
  }
}

function handleCancel() {
  router.push('/periodic')
}

function handleWeekRangeChange(newRange: PeriodRange) {
  selectedWeekRange.value = newRange
  // Re-aggregate data for the new week range
  aggregatedData.value = aggregatePeriodData({
    journalEntries: journalStore.entries,
    emotionLogs: emotionLogStore.logs,
    periodRange: newRange,
  })
}

function parseISODate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day)
}

onMounted(() => {
  loadData()
})
</script>
