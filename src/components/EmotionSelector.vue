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
            class="neo-emotion-chip inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
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

    <!-- Animated swap container: 4 quadrants <-> emotion pill grid -->
    <div class="selector-swap" :class="{ 'selector-swap--expanded': quadrantModel }">
      <Transition
        enter-active-class="es-enter-active"
        leave-active-class="es-leave-active"
        enter-from-class="es-from"
        leave-to-class="es-to"
        mode="out-in"
      >
        <!-- Quadrant Selector view -->
        <div
          v-if="!quadrantModel"
          key="quadrants"
          class="quadrant-selector"
        >
          <div
            class="grid grid-cols-2 gap-3"
            role="group"
            aria-label="Emotion quadrant selection"
          >
            <button
              v-for="quadrant in quadrants"
              :key="quadrant.value"
              type="button"
              :data-testid="`emotion-quadrant-${quadrant.value}`"
              :aria-label="`Select ${quadrant.label} quadrant`"
              :class="getQuadrantButtonClasses()"
              :style="getQuadrantButtonStyle(quadrant.value)"
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

        <!-- Emotion Grid view -->
        <div
          v-else
          key="pills"
          class="emotion-selection"
        >
          <div v-if="!emotionStore.isLoaded" class="text-center py-4 text-sm">
            <p class="text-on-surface-variant">{{ t('emotionViews.selector.loadingEmotions') }}</p>
          </div>
          <template v-else-if="quadrantGrid.length > 0">
            <TransitionGroup
              tag="div"
              class="emotion-grid"
              role="grid"
              :aria-label="`Emotions in ${getQuadrantLabel(quadrantModel)} quadrant`"
              enter-active-class="pill-enter-active"
              enter-from-class="pill-enter-from"
              leave-active-class="pill-leave-active"
              leave-to-class="pill-leave-to"
            >
              <button
                v-for="(emotion, i) in quadrantGrid"
                :key="emotion.id"
                type="button"
                role="gridcell"
                :data-testid="`emotion-option-${emotion.id}`"
                :aria-label="`${isEmotionSelected(emotion.id) ? 'Deselect' : 'Select'} emotion ${emotion.name}`"
                :aria-pressed="isEmotionSelected(emotion.id)"
                :class="getEmotionCellClasses(emotion.id)"
                :style="getEmotionCellInlineStyle(emotion.id, i)"
                @click="toggleEmotion(emotion.id)"
                @pointerenter="hoveredEmotionId = emotion.id"
                @pointerleave="hoveredEmotionId = null"
              >
                {{ emotion.name }}
              </button>
            </TransitionGroup>
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
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useT } from '@/composables/useT'
import type { Quadrant, Emotion } from '@/domain/emotion'
import { getQuadrant, getQuadrantDisplayConfig, QUADRANTS_IN_ORDER } from '@/domain/emotion'
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

// Two-way binding for the active quadrant — parents can listen to changes
// or programmatically reset to null (e.g. from the EmotionQuadrantSuffix click).
const quadrantModel = defineModel<Quadrant | null>('quadrant', { default: null })

const emotionStore = useEmotionStore()
const { t } = useT()
const hoveredEmotionId = ref<string | null>(null)
const hasManualQuadrantCollapse = ref(false)
const selectedEmotionIds = ref<string[]>([])

// Quadrant configuration (ordered: unpleasant on left, pleasant on right)
const quadrants = computed(() =>
  QUADRANTS_IN_ORDER.map((value) => getQuadrantDisplayConfig(value, t))
)

const quadrantButtonStyles: Record<
  Quadrant,
  {
    backgroundColor: string
    borderColor: string
    activeBackgroundColor: string
    selectedBackgroundColor: string
    textColor: string
  }
> = {
  'high-energy-high-pleasantness': {
    backgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness)',
    borderColor: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-high-energy-high-pleasantness-selected)',
    textColor: 'var(--color-quadrant-high-energy-high-pleasantness-text)',
  },
  'high-energy-low-pleasantness': {
    backgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness)',
    borderColor: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-high-energy-low-pleasantness-selected)',
    textColor: 'var(--color-quadrant-high-energy-low-pleasantness-text)',
  },
  'low-energy-high-pleasantness': {
    backgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness)',
    borderColor: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-low-energy-high-pleasantness-selected)',
    textColor: 'var(--color-quadrant-low-energy-high-pleasantness-text)',
  },
  'low-energy-low-pleasantness': {
    backgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness)',
    borderColor: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
    activeBackgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
    selectedBackgroundColor: 'var(--color-quadrant-low-energy-low-pleasantness-selected)',
    textColor: 'var(--color-quadrant-low-energy-low-pleasantness-text)',
  },
}

// Computed properties
const currentQuadrantEmotions = computed(() => {
  if (!quadrantModel.value) return []
  return emotionStore.getEmotionsByQuadrant(quadrantModel.value)
})

// Build a grid sorted by energy (high→low) then pleasantness (low→high)
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
  if (quadrantModel.value === quadrant) {
    quadrantModel.value = null
    hasManualQuadrantCollapse.value = true
  } else {
    quadrantModel.value = quadrant
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

function getQuadrantButtonClasses(): string {
  return 'flex items-center justify-center px-4 py-3 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background neo-quadrant-btn'
}

function getQuadrantButtonStyle(quadrant: Quadrant): Record<string, string> {
  const styles = quadrantButtonStyles[quadrant]
  if (!styles) return {}
  return { backgroundColor: styles.backgroundColor, color: styles.textColor }
}

function getEmotionCellClasses(emotionId: string): string {
  const base = 'emotion-cell focus:outline-none focus:ring-1 focus:ring-focus'
  if (isEmotionSelected(emotionId)) {
    return `${base} emotion-cell--selected`
  }
  return base
}

function getEmotionCellInlineStyle(
  emotionId: string,
  index: number
): Record<string, string> {
  const base: Record<string, string> = {
    '--stagger': `${Math.min(index * 18, 200)}ms`,
  }
  if (!quadrantModel.value) return base
  const styles = quadrantButtonStyles[quadrantModel.value]
  if (!styles) return base
  base.backgroundColor = isEmotionSelected(emotionId)
    ? styles.selectedBackgroundColor
    : styles.backgroundColor
  base.color = styles.textColor
  return base
}

function getQuadrantLabel(quadrant: Quadrant | null): string {
  if (!quadrant) return ''
  return getQuadrantDisplayConfig(quadrant, t).label
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
    color: styles.textColor,
  }
}

function syncQuadrantFromSelection(ids: string[]) {
  if (ids.length === 0) {
    quadrantModel.value = null
    hasManualQuadrantCollapse.value = false
    return
  }

  if (hasManualQuadrantCollapse.value) {
    return
  }

  const hasCurrentQuadrantEmotion = ids.some((id) => {
    const emotion = emotionStore.getEmotionById(id)
    if (!emotion) return false
    return getQuadrant(emotion) === quadrantModel.value
  })

  if (!hasCurrentQuadrantEmotion) {
    const first = emotionStore.getEmotionById(ids[0])
    if (first) {
      quadrantModel.value = getQuadrant(first)
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

// When the parent clears the quadrant via v-model:quadrant (e.g. the user
// clicks the EmotionQuadrantSuffix) WHILE emotions are still selected, treat
// it as a manual collapse so `syncQuadrantFromSelection` (which can run later
// in the same tick as the parent's prop update) does not snap us straight
// back into the previous quadrant.
//
// `flush: 'sync'` is critical: without it, the `modelValue` watcher (also
// triggered when the parent re-renders) runs first and re-asserts a quadrant
// before this guard fires.
//
// The `selectedEmotionIds.length > 0` check prevents clobbering the
// `hasManualQuadrantCollapse = false` reset that `syncQuadrantFromSelection`
// performs when the emotion list becomes empty.
watch(
  quadrantModel,
  (newVal, oldVal) => {
    if (newVal === null && oldVal !== null && selectedEmotionIds.value.length > 0) {
      hasManualQuadrantCollapse.value = true
    }
  },
  { flush: 'sync' }
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

.selector-swap {
  position: relative;
  min-height: 0;
  transition: min-height 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

/* When a quadrant is selected, reserve space for the pill grid so the layout
   does not jump during the out-in swap animation. The 240px value covers most
   quadrants (3-5 rows × 40px + gaps + description strip); the 6-row quadrant
   may grow slightly past this, which is OK — the change happens during the
   enter animation and reads as a natural reveal. */
.selector-swap--expanded {
  min-height: 240px;
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

.neo-quadrant-btn:hover {
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

/* === Swap animation: 4 quadrants <-> pill grid === */
.es-enter-active {
  transition: opacity 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.es-leave-active {
  transition: opacity 160ms cubic-bezier(0.4, 0, 1, 1),
    transform 160ms cubic-bezier(0.4, 0, 1, 1);
}
.es-from {
  opacity: 0;
  transform: scale(0.96);
}
.es-to {
  opacity: 0;
  transform: scale(1.02);
}

/* === Pill stagger animation === */
.pill-enter-active {
  transition: opacity 220ms ease-out,
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
  transition-delay: var(--stagger, 0ms);
}
.pill-enter-from {
  opacity: 0;
  transform: translateY(4px) scale(0.94);
}
.pill-leave-active {
  transition: opacity 100ms ease-in;
}
.pill-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .selector-swap {
    transition: none !important;
  }
  .es-enter-active,
  .es-leave-active,
  .pill-enter-active,
  .pill-leave-active {
    transition: opacity 120ms linear !important;
    transform: none !important;
    transition-delay: 0ms !important;
  }
  .es-from,
  .es-to,
  .pill-enter-from {
    transform: none;
  }
}
</style>
