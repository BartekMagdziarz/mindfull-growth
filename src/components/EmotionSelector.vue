<template>
  <div class="emotion-selector">
    <!-- Selected Emotions Section (always visible when enabled) -->
    <template v-if="props.showSelectedSection">
      <div v-if="selectedEmotionIds.length > 0" class="mb-4">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
          Selected Emotions ({{ selectedEmotionIds.length }})
        </h3>
        <div
          class="flex flex-wrap gap-2 overflow-x-auto pb-1"
          role="list"
          aria-label="Selected emotions"
        >
          <button
            v-for="emotion in selectedEmotions"
            :key="emotion.id"
            type="button"
            :aria-label="`Remove ${emotion.name} from selection`"
            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-medium shadow-elevation-1 hover:shadow-elevation-2 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
            @click="removeEmotion(emotion.id)"
          >
            <span>{{ emotion.name }}</span>
            <XMarkIcon class="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        v-else
        class="mb-4 p-3 rounded-2xl bg-section text-center text-on-surface-variant text-xs border border-outline/30"
      >
        No emotions selected
      </div>
    </template>

    <!-- Quadrant Selector -->
    <div class="quadrant-selector space-y-3">
      <div class="space-y-1">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface">
          Select an Emotion Quadrant
        </h2>
        <p class="text-[0.8rem] text-on-surface-variant">
          Tap a quadrant to explore matching emotions.
        </p>
      </div>
      <div
        class="grid grid-cols-2 gap-3"
        role="group"
        aria-label="Emotion quadrant selection"
      >
        <button
          v-for="quadrant in quadrants"
          :key="quadrant.value"
          type="button"
          :aria-label="`Select ${quadrant.label} quadrant`"
          :aria-pressed="selectedQuadrant === quadrant.value"
          :class="getQuadrantButtonClasses(quadrant.value, selectedQuadrant === quadrant.value)"
          :style="getQuadrantButtonStyle(quadrant.value, selectedQuadrant === quadrant.value)"
          @click="selectQuadrant(quadrant.value)"
        >
          <component
            :is="quadrant.icon"
            class="w-4 h-4 text-on-surface"
            aria-hidden="true"
          />
          <span class="text-sm font-semibold leading-tight">
            {{ quadrant.energyLabel }}
          </span>
          <span class="text-sm font-semibold leading-tight text-on-surface-variant">
            {{ quadrant.pleasantnessLabel }}
          </span>
        </button>
      </div>
    </div>

    <!-- Emotion List -->
    <div class="emotion-selection mt-4">
      <div v-if="!selectedQuadrant" class="text-xs text-on-surface-variant">
        Choose a quadrant above to see matching emotions.
      </div>
      <template v-else>
        <h2 class="text-xs font-semibold uppercase tracking-wide text-on-surface mb-2">
          Select Emotions
        </h2>
        <div v-if="!emotionStore.isLoaded" class="text-center py-4 text-sm">
          <p class="text-on-surface-variant">Loading emotions...</p>
        </div>
        <div
          v-else-if="currentQuadrantEmotions.length > 0"
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
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
        <div
          v-else
          class="text-center py-4 rounded-2xl bg-section text-on-surface-variant text-sm border border-outline/30"
        >
          No emotions in this quadrant
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Quadrant, Emotion } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import { useEmotionStore } from '@/stores/emotion.store'
import {
  SunIcon,
  BoltIcon,
  SparklesIcon,
  CloudIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'

interface Props {
  modelValue: string[]
  showSelectedSection?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => [],
  showSelectedSection: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const emotionStore = useEmotionStore()
const selectedQuadrant = ref<Quadrant | null>(null)
const hasManualQuadrantCollapse = ref(false)
const selectedEmotionIds = ref<string[]>([])

// Quadrant configuration
const quadrants = [
  {
    value: 'high-energy-high-pleasantness' as Quadrant,
    label: 'High Energy / High Pleasantness',
    energyLabel: 'High Energy',
    pleasantnessLabel: 'Pleasant',
    icon: SunIcon,
  },
  {
    value: 'high-energy-low-pleasantness' as Quadrant,
    label: 'High Energy / Low Pleasantness',
    energyLabel: 'High Energy',
    pleasantnessLabel: 'Unpleasant',
    icon: BoltIcon,
  },
  {
    value: 'low-energy-high-pleasantness' as Quadrant,
    label: 'Low Energy / High Pleasantness',
    energyLabel: 'Low Energy',
    pleasantnessLabel: 'Pleasant',
    icon: SparklesIcon,
  },
  {
    value: 'low-energy-low-pleasantness' as Quadrant,
    label: 'Low Energy / Low Pleasantness',
    energyLabel: 'Low Energy',
    pleasantnessLabel: 'Unpleasant',
    icon: CloudIcon,
  },
]

const quadrantButtonStyles: Record<
  Quadrant,
  { backgroundColor: string; borderColor: string }
> = {
  'high-energy-high-pleasantness': {
    backgroundColor:
      'var(--color-quadrant-high-energy-high-pleasantness)',
    borderColor:
      'var(--color-quadrant-high-energy-high-pleasantness-border)',
  },
  'high-energy-low-pleasantness': {
    backgroundColor:
      'var(--color-quadrant-high-energy-low-pleasantness)',
    borderColor:
      'var(--color-quadrant-high-energy-low-pleasantness-border)',
  },
  'low-energy-high-pleasantness': {
    backgroundColor:
      'var(--color-quadrant-low-energy-high-pleasantness)',
    borderColor:
      'var(--color-quadrant-low-energy-high-pleasantness-border)',
  },
  'low-energy-low-pleasantness': {
    backgroundColor:
      'var(--color-quadrant-low-energy-low-pleasantness)',
    borderColor:
      'var(--color-quadrant-low-energy-low-pleasantness-border)',
  },
}

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
  if (selectedQuadrant.value === quadrant) {
    selectedQuadrant.value = null
    hasManualQuadrantCollapse.value = true
  } else {
    selectedQuadrant.value = quadrant
    hasManualQuadrantCollapse.value = false
  }
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

function getQuadrantButtonClasses(_quadrant: Quadrant, isActive = false): string {
  const baseClasses =
    'flex flex-col items-start gap-1 px-3 py-2 rounded-2xl text-left transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background active:scale-[0.98] border shadow-elevation-1'

  const activeClasses =
    'bg-primary text-on-primary border-transparent shadow-elevation-2'

  return `${baseClasses} ${
    isActive ? activeClasses : 'text-on-surface hover:shadow-elevation-2'
  }`
}

function getQuadrantButtonStyle(
  quadrant: Quadrant,
  isActive = false
): Record<string, string> {
  if (isActive) {
    return {}
  }
  return quadrantButtonStyles[quadrant] ?? {}
}

function getEmotionChipClasses(emotionId: string): string {
  const isSelected = isEmotionSelected(emotionId)
  const baseClasses =
    'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background active:scale-[0.95]'

  if (isSelected) {
    return `${baseClasses} bg-primary text-on-primary shadow-elevation-1 hover:shadow-elevation-2`
  } else {
    return `${baseClasses} bg-chip border border-chip-border text-chip-text hover:bg-section`
  }
}

function getQuadrantLabel(quadrant: Quadrant | null): string {
  if (!quadrant) return ''
  const quadrantConfig = quadrants.find((q) => q.value === quadrant)
  return quadrantConfig?.label || quadrant
}

function syncQuadrantFromSelection(ids: string[]) {
  if (ids.length === 0) {
    selectedQuadrant.value = null
    hasManualQuadrantCollapse.value = false
    return
  }

  if (hasManualQuadrantCollapse.value) {
    return
  }

  const hasCurrentQuadrantEmotion = ids.some((id) => {
    const emotion = emotionStore.getEmotionById(id)
    if (!emotion) return false
    return getQuadrant(emotion) === selectedQuadrant.value
  })

  if (!hasCurrentQuadrantEmotion) {
    const first = emotionStore.getEmotionById(ids[0])
    if (first) {
      selectedQuadrant.value = getQuadrant(first)
    }
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
    syncQuadrantFromSelection(validIds)
  },
  { immediate: true }
)

watch(
  selectedEmotionIds,
  (ids) => {
    syncQuadrantFromSelection(ids)
  },
  { deep: true }
)

watch(
  () => emotionStore.isLoaded,
  (loaded) => {
    if (loaded) {
      syncQuadrantFromSelection(selectedEmotionIds.value)
    }
  }
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
