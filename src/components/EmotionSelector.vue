<template>
  <div class="emotion-selector">
    <!-- Selected Emotions Section (always visible when enabled) -->
    <template v-if="props.showSelectedSection">
      <div v-if="selectedEmotionIds.length > 0" class="mb-4">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">
          {{ t('emotionViews.selector.selectedCount', { count: selectedEmotionIds.length }) }}
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
            :style="getEmotionChipStyle(emotion.id)"
            class="neo-emotion-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-on-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
            @click="removeEmotion(emotion.id)"
          >
            <span>{{ emotion.name }}</span>
            <AppIcon name="close" class="text-base" />
          </button>
        </div>
      </div>
      <div
        v-else
        class="mb-4 p-3 rounded-2xl bg-section text-center text-on-surface-variant text-xs border border-neu-border/30"
      >
        {{ t('emotionViews.selector.noSelection') }}
      </div>
    </template>

    <!-- Quadrant Selector -->
    <div class="quadrant-selector">
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
          <div class="flex items-center gap-2.5">
            <AppIcon
              :name="quadrant.icon"
              class="text-xl flex-shrink-0"
            />
            <div class="flex flex-col items-start">
              <span class="text-sm font-semibold leading-snug">
                {{ quadrant.energyLabel }}
              </span>
              <span class="text-sm font-semibold leading-snug">
                {{ quadrant.pleasantnessLabel }}
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- Emotion Grid -->
    <div v-if="selectedQuadrant" class="emotion-selection mt-4">
      <div v-if="!emotionStore.isLoaded" class="text-center py-4 text-sm">
        <p class="text-on-surface-variant">{{ t('emotionViews.selector.loadingEmotions') }}</p>
      </div>
      <template v-else-if="currentQuadrantEmotions.length > 0">
        <div
          class="emotion-grid"
          role="grid"
          :aria-label="`Emotions in ${getQuadrantLabel(selectedQuadrant)} quadrant`"
        >
          <button
            v-for="emotion in quadrantGrid"
            :key="emotion.id"
            type="button"
            role="gridcell"
            :aria-label="`${isEmotionSelected(emotion.id) ? 'Deselect' : 'Select'} emotion ${emotion.name}`"
            :aria-pressed="isEmotionSelected(emotion.id)"
            :class="getEmotionCellClasses(emotion.id)"
            :style="getEmotionCellStyle(emotion.id)"
            @click="toggleEmotion(emotion.id)"
            @pointerenter="hoveredEmotionId = emotion.id"
            @pointerleave="hoveredEmotionId = null"
          >
            {{ emotion.name }}
          </button>
        </div>
        <!-- Emotion description strip -->
        <div class="emotion-description-strip">
          <Transition
            enter-active-class="transition-opacity duration-200 ease-out"
            leave-active-class="transition-opacity duration-150 ease-in"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
            mode="out-in"
          >
            <span v-if="hoveredEmotionDescription" :key="hoveredEmotionDescription.name">
              <span class="font-semibold">{{ hoveredEmotionDescription.name }}</span>
              <span class="mx-1.5 text-on-surface-variant/40">&mdash;</span>
              <span class="text-on-surface-variant">{{ hoveredEmotionDescription.description }}</span>
            </span>
            <span v-else>&nbsp;</span>
          </Transition>
        </div>
      </template>
      <div
        v-else
        class="text-center py-4 rounded-2xl bg-section text-on-surface-variant text-sm"
      >
        {{ t('emotionViews.selector.noEmotionsInQuadrant') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useT } from '@/composables/useT'
import type { Quadrant, Emotion } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import { useEmotionStore } from '@/stores/emotion.store'
import AppIcon from '@/components/shared/AppIcon.vue'

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
const { t } = useT()
const hoveredEmotionId = ref<string | null>(null)
const selectedQuadrant = ref<Quadrant | null>(null)
const hasManualQuadrantCollapse = ref(false)
const selectedEmotionIds = ref<string[]>([])

// Quadrant configuration (ordered: unpleasant on left, pleasant on right)
const quadrants = computed(() => [
  {
    value: 'high-energy-low-pleasantness' as Quadrant,
    label: t('emotionViews.selector.quadrants.highEnergyUnpleasant'),
    energyLabel: t('emotionViews.selector.energyLabels.high'),
    pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.unpleasant'),
    icon: 'bolt',
  },
  {
    value: 'high-energy-high-pleasantness' as Quadrant,
    label: t('emotionViews.selector.quadrants.highEnergyPleasant'),
    energyLabel: t('emotionViews.selector.energyLabels.high'),
    pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.pleasant'),
    icon: 'wb_sunny',
  },
  {
    value: 'low-energy-low-pleasantness' as Quadrant,
    label: t('emotionViews.selector.quadrants.lowEnergyUnpleasant'),
    energyLabel: t('emotionViews.selector.energyLabels.low'),
    pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.unpleasant'),
    icon: 'cloud',
  },
  {
    value: 'low-energy-high-pleasantness' as Quadrant,
    label: t('emotionViews.selector.quadrants.lowEnergyPleasant'),
    energyLabel: t('emotionViews.selector.energyLabels.low'),
    pleasantnessLabel: t('emotionViews.selector.pleasantnessLabels.pleasant'),
    icon: 'auto_awesome',
  },
])

const quadrantButtonStyles: Record<
  Quadrant,
  { backgroundColor: string; borderColor: string; activeBackgroundColor: string; selectedBackgroundColor: string }
> = {
  'high-energy-high-pleasantness': {
    backgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness)',
    borderColor: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness-selected)',
  },
  'high-energy-low-pleasantness': {
    backgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness)',
    borderColor: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness-selected)',
  },
  'low-energy-high-pleasantness': {
    backgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness)',
    borderColor: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness-selected)',
  },
  'low-energy-low-pleasantness': {
    backgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness)',
    borderColor: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness-selected)',
  },
}

// Computed properties
const currentQuadrantEmotions = computed(() => {
  if (!selectedQuadrant.value) return []
  return emotionStore.getEmotionsByQuadrant(selectedQuadrant.value)
})

// Build a 6x6 grid sorted by energy (high→low) then pleasantness (low→high)
const quadrantGrid = computed(() => {
  return [...currentQuadrantEmotions.value].sort((a, b) => {
    if (a.energy !== b.energy) return b.energy - a.energy
    return a.pleasantness - b.pleasantness
  })
})

const hoveredEmotionDescription = computed(() => {
  if (!hoveredEmotionId.value) return null
  const emotion = emotionStore.getEmotionById(hoveredEmotionId.value)
  if (!emotion?.description) return null
  return { name: emotion.name, description: emotion.description }
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
    'flex items-center justify-center px-4 py-3 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background text-on-surface neo-quadrant-btn'

  return `${baseClasses}${isActive ? ' neo-quadrant-btn--active' : ''}`
}

function getQuadrantButtonStyle(
  quadrant: Quadrant,
  isActive = false
): Record<string, string> {
  const styles = quadrantButtonStyles[quadrant]
  if (!styles) return {}
  
  if (isActive) {
    return {
      backgroundColor: styles.activeBackgroundColor,
    }
  }
  return {
    backgroundColor: styles.backgroundColor,
  }
}

function getEmotionCellClasses(emotionId: string): string {
  const base = 'emotion-cell transition-all duration-150 focus:outline-none focus:ring-1 focus:ring-focus'
  if (isEmotionSelected(emotionId)) {
    return `${base} emotion-cell--selected`
  }
  return base
}

function getEmotionCellStyle(emotionId: string): Record<string, string> {
  if (!selectedQuadrant.value) return {}
  const styles = quadrantButtonStyles[selectedQuadrant.value]
  if (!styles) return {}
  const isSelected = isEmotionSelected(emotionId)
  return {
    backgroundColor: isSelected ? styles.selectedBackgroundColor : styles.backgroundColor
  }
}

function getQuadrantLabel(quadrant: Quadrant | null): string {
  if (!quadrant) return ''
  const quadrantConfig = quadrants.value.find((q) => q.value === quadrant)
  return quadrantConfig?.label || quadrant
}

function getEmotionChipStyle(emotionId: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return {}
  const quadrant = getQuadrant(emotion)
  const styles = quadrantButtonStyles[quadrant]
  if (!styles) return {}
  return {
    backgroundColor: styles.selectedBackgroundColor,
    border: `1.5px solid ${styles.borderColor}`,
  }
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

.emotion-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
}

.emotion-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.15;
  padding: 6px 2px;
  border-radius: 10px;
  cursor: pointer;
  word-break: break-word;
  min-height: 40px;
  color: rgb(var(--color-on-surface));
  border: 1px solid rgb(var(--neo-border) / 0.2);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.7),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease;
}

.emotion-cell:hover:not(.emotion-cell--selected) {
  transform: translateY(-1px);
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.3);
}

.emotion-cell--selected {
  font-weight: 600;
  border-color: rgb(var(--neo-border) / 0.35);
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
  transform: translateY(0);
}

.neo-emotion-chip {
  border: 1px solid rgb(var(--neo-border) / 0.25);
  box-shadow:
    -3px -3px 6px rgb(var(--neo-shadow-light) / 0.7),
    3px 3px 6px rgb(var(--neo-shadow-dark) / 0.25);
}

.neo-emotion-chip:hover {
  transform: translateY(-1px);
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.3);
}

.neo-emotion-chip:active {
  transform: translateY(0);
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.25);
}

.neo-quadrant-btn {
  border: 1px solid rgb(var(--neo-border) / 0.25);
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
}

.neo-quadrant-btn:hover:not(.neo-quadrant-btn--active) {
  transform: translateY(-1px);
  box-shadow:
    -5px -5px 10px rgb(var(--neo-shadow-light) / 0.85),
    5px 5px 10px rgb(var(--neo-shadow-dark) / 0.36);
}

.emotion-description-strip {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.4;
  text-align: center;
  color: rgb(var(--neo-text));
  background: rgb(var(--neo-surface-base));
  border: 1px solid rgb(var(--neo-border) / 0.2);
  box-shadow:
    inset -2px -2px 4px rgb(var(--neo-inset-light) / 0.7),
    inset 2px 2px 4px rgb(var(--neo-inset-dark) / 0.2);
}

.neo-quadrant-btn--active {
  box-shadow:
    inset -3px -3px 6px rgb(var(--neo-inset-light) / 0.8),
    inset 3px 3px 6px rgb(var(--neo-inset-dark) / 0.33);
  border-color: rgb(var(--neo-border) / 0.4);
}
</style>
