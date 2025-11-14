<template>
  <div class="emotion-selector">
    <!-- Selected Emotions Section (always visible when emotions are selected) -->
    <div v-if="selectedEmotionIds.length > 0" class="mb-6">
      <h3 class="text-sm font-medium text-on-surface-variant mb-3">
        Selected Emotions ({{ selectedEmotionIds.length }})
      </h3>
      <div
        class="flex flex-wrap gap-2 overflow-x-auto pb-2"
        role="list"
        aria-label="Selected emotions"
      >
        <button
          v-for="emotion in selectedEmotions"
          :key="emotion.id"
          type="button"
          :aria-label="`Remove ${emotion.name} from selection`"
          class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-on-primary text-sm font-medium shadow-elevation-1 hover:shadow-elevation-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all duration-200 active:scale-[0.95]"
          @click="removeEmotion(emotion.id)"
        >
          <span>{{ emotion.name }}</span>
          <XMarkIcon class="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div
      v-else
      class="mb-6 p-4 rounded-lg bg-surface-variant/50 text-center text-on-surface-variant text-sm"
    >
      No emotions selected
    </div>

    <!-- Quadrant Selector (shown when no quadrant is selected) -->
    <div v-if="selectedQuadrant === null" class="quadrant-selector">
      <h2 class="text-lg font-semibold text-on-surface mb-4">
        Select an Emotion Quadrant
      </h2>
      <div
        class="grid grid-cols-2 gap-4"
        role="group"
        aria-label="Emotion quadrant selection"
      >
        <button
          v-for="quadrant in quadrants"
          :key="quadrant.value"
          type="button"
          :aria-label="`Select ${quadrant.label} quadrant`"
          :class="getQuadrantButtonClasses(quadrant.value, true)"
          @click="selectQuadrant(quadrant.value)"
        >
          <component
            :is="quadrant.icon"
            class="w-8 h-8 mb-2"
            aria-hidden="true"
          />
          <span class="text-base font-medium">{{ quadrant.label }}</span>
        </button>
      </div>
    </div>

    <!-- Quadrant Navigation and Emotion List (shown when quadrant is selected) -->
    <div v-else class="emotion-selection">
      <!-- Quadrant Navigation Bar -->
      <div class="mb-4">
        <h2 class="text-lg font-semibold text-on-surface mb-3">
          Select Emotions
        </h2>
        <div
          class="flex flex-wrap gap-2"
          role="tablist"
          aria-label="Quadrant navigation"
        >
          <button
            v-for="quadrant in quadrants"
            :key="quadrant.value"
            type="button"
            :aria-label="`Switch to ${quadrant.label} quadrant`"
            :aria-selected="selectedQuadrant === quadrant.value"
            :class="getQuadrantButtonClasses(quadrant.value, false, selectedQuadrant === quadrant.value)"
            @click="selectQuadrant(quadrant.value)"
          >
            <component
              :is="quadrant.icon"
              class="w-5 h-5"
              aria-hidden="true"
            />
            <span class="text-sm font-medium">{{ quadrant.shortLabel }}</span>
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="!emotionStore.isLoaded" class="text-center py-8">
        <p class="text-on-surface-variant">Loading emotions...</p>
      </div>

      <!-- Emotion List -->
      <div v-else-if="currentQuadrantEmotions.length > 0">
        <div
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
          role="list"
          :aria-label="`Emotions in ${getQuadrantLabel(selectedQuadrant)} quadrant`"
        >
          <button
            v-for="emotion in currentQuadrantEmotions"
            :key="emotion.id"
            type="button"
            :aria-label="`${isEmotionSelected(emotion.id) ? 'Deselect' : 'Select'} emotion ${emotion.name}`"
            :aria-pressed="isEmotionSelected(emotion.id)"
            :class="getEmotionChipClasses(emotion.id)"
            @click="toggleEmotion(emotion.id)"
          >
            {{ emotion.name }}
          </button>
        </div>
      </div>

      <!-- Empty Quadrant State -->
      <div
        v-else
        class="text-center py-8 rounded-lg bg-surface-variant/50 text-on-surface-variant"
      >
        No emotions in this quadrant
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Quadrant, Emotion } from '@/domain/emotion'
import { useEmotionStore } from '@/stores/emotion.store'
import {
  SunIcon,
  BoltIcon,
  LeafIcon,
  CloudIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const emotionStore = useEmotionStore()
const selectedQuadrant = ref<Quadrant | null>(null)
const selectedEmotionIds = ref<string[]>([])

// Quadrant configuration
const quadrants = [
  {
    value: 'high-energy-high-pleasantness' as Quadrant,
    label: 'High Energy / High Pleasantness',
    shortLabel: 'High / High',
    icon: SunIcon,
  },
  {
    value: 'high-energy-low-pleasantness' as Quadrant,
    label: 'High Energy / Low Pleasantness',
    shortLabel: 'High / Low',
    icon: BoltIcon,
  },
  {
    value: 'low-energy-high-pleasantness' as Quadrant,
    label: 'Low Energy / High Pleasantness',
    shortLabel: 'Low / High',
    icon: LeafIcon,
  },
  {
    value: 'low-energy-low-pleasantness' as Quadrant,
    label: 'Low Energy / Low Pleasantness',
    shortLabel: 'Low / Low',
    icon: CloudIcon,
  },
]

// Computed properties
const currentQuadrantEmotions = computed(() => {
  if (!selectedQuadrant.value) return []
  return emotionStore.getEmotionsByQuadrant(selectedQuadrant.value)
})

const selectedEmotions = computed(() => {
  return selectedEmotionIds.value
    .map((id) => emotionStore.getEmotionById(id))
    .filter((emotion): emotion is Emotion => emotion !== undefined)
})

// Methods
function selectQuadrant(quadrant: Quadrant) {
  selectedQuadrant.value = quadrant
}

function toggleEmotion(emotionId: string) {
  const index = selectedEmotionIds.value.indexOf(emotionId)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
  } else {
    selectedEmotionIds.value.push(emotionId)
  }
  emit('update:modelValue', [...selectedEmotionIds.value])
}

function removeEmotion(emotionId: string) {
  const index = selectedEmotionIds.value.indexOf(emotionId)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
    emit('update:modelValue', [...selectedEmotionIds.value])
  }
}

function isEmotionSelected(emotionId: string): boolean {
  return selectedEmotionIds.value.includes(emotionId)
}

function getQuadrantLabel(quadrant: Quadrant | null): string {
  if (!quadrant) return ''
  const quadrantConfig = quadrants.find((q) => q.value === quadrant)
  return quadrantConfig?.label || quadrant
}

function getQuadrantButtonClasses(
  quadrant: Quadrant,
  isLarge: boolean,
  isActive = false
): string {
  const baseClasses = isLarge
    ? 'flex flex-col items-center justify-center p-6 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98] shadow-elevation-1 hover:shadow-elevation-2'
    : 'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.98]'

  const quadrantColors = {
    'high-energy-high-pleasantness': isActive
      ? 'bg-amber-500 text-white shadow-elevation-2'
      : isLarge
        ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
        : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border-2 border-amber-300',
    'high-energy-low-pleasantness': isActive
      ? 'bg-red-500 text-white shadow-elevation-2'
      : isLarge
        ? 'bg-red-100 text-red-900 hover:bg-red-200'
        : 'bg-red-50 text-red-900 hover:bg-red-100 border-2 border-red-300',
    'low-energy-high-pleasantness': isActive
      ? 'bg-green-500 text-white shadow-elevation-2'
      : isLarge
        ? 'bg-green-100 text-green-900 hover:bg-green-200'
        : 'bg-green-50 text-green-900 hover:bg-green-100 border-2 border-green-300',
    'low-energy-low-pleasantness': isActive
      ? 'bg-blue-500 text-white shadow-elevation-2'
      : isLarge
        ? 'bg-blue-100 text-blue-900 hover:bg-blue-200'
        : 'bg-blue-50 text-blue-900 hover:bg-blue-100 border-2 border-blue-300',
  }

  return `${baseClasses} ${quadrantColors[quadrant]}`
}

function getEmotionChipClasses(emotionId: string): string {
  const isSelected = isEmotionSelected(emotionId)
  const baseClasses =
    'px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 active:scale-[0.95]'

  if (isSelected) {
    return `${baseClasses} bg-primary text-on-primary shadow-elevation-1 hover:shadow-elevation-2`
  } else {
    return `${baseClasses} bg-surface border-2 border-outline text-on-surface hover:bg-surface-variant`
  }
}

// Sync with modelValue prop
watch(
  () => props.modelValue,
  (newValue) => {
    // Filter out invalid emotion IDs
    const validIds = newValue.filter((id) => {
      const emotion = emotionStore.getEmotionById(id)
      if (!emotion && import.meta.env.DEV) {
        console.warn(`Invalid emotion ID in modelValue: ${id}`)
      }
      return emotion !== undefined
    })
    selectedEmotionIds.value = validIds
  },
  { immediate: true }
)

// Load emotions on mount
onMounted(async () => {
  if (!emotionStore.isLoaded) {
    await emotionStore.loadEmotions()
  }
})
</script>

<style scoped>
.emotion-selector {
  @apply w-full;
}
</style>

