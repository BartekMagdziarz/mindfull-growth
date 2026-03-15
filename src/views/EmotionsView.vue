<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Inline Emotion Logging Form -->
      <AppCard padding="lg">
        <h2 class="text-lg font-semibold text-on-surface mb-4">{{ t('emotionViews.logTitle') }}</h2>

        <div class="space-y-4">
          <!-- Selected Emotions Display -->
          <div
            v-if="selectedEmotionIds.length > 0"
            class="flex flex-wrap gap-2 mb-2"
          >
            <button
              v-for="emotion in selectedEmotionList"
              :key="emotion.id"
              type="button"
              :style="getEmotionChipStyle(emotion.id)"
              class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-on-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200"
              :aria-label="`Remove ${emotion.name} from selection`"
              @click="removeEmotion(emotion.id)"
            >
              <span>{{ emotion.name }}</span>
              <AppIcon name="close" class="text-sm" />
            </button>
          </div>

          <!-- Emotion Selector -->
          <div
            v-if="isEmotionSectionLoading"
            class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
          >
            {{ t('emotionViews.loadingEmotions') }}
          </div>
          <div v-else>
            <EmotionSelector v-model="selectedEmotionIds" :show-selected-section="false" />
          </div>

          <!-- Quick Note -->
          <div class="mt-4">
            <label
              for="quick-note"
              class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
            >
              {{ t('emotionViews.quickNoteLabel') }}
            </label>
            <textarea
              id="quick-note"
              v-model="note"
              :placeholder="t('emotionViews.quickNotePlaceholder')"
              class="neo-input w-full mt-2 p-3 text-on-surface resize-none"
              rows="2"
            />
          </div>

          <!-- Collapsible Tags Section -->
          <details class="mt-4 group">
            <summary
              class="text-sm text-on-surface-variant cursor-pointer hover:text-on-surface transition-colors list-none flex items-center gap-2"
            >
              <AppIcon
                name="chevron_right"
                class="text-base transition-transform group-open:rotate-90"
              />
              {{ t('emotionViews.addTagsLabel') }}
            </summary>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-neu-border/20">
              <!-- People Tags -->
              <div class="space-y-2">
                <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {{ t('emotionViews.people') }}
                </label>
                <div
                  v-if="isPeopleSectionLoading"
                  class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
                >
                  {{ t('emotionViews.loadingPeopleTags') }}
                </div>
                <TagInput v-else v-model="selectedPeopleTagIds" tag-type="people" />
              </div>

              <!-- Context Tags -->
              <div class="space-y-2">
                <label class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {{ t('emotionViews.context') }}
                </label>
                <div
                  v-if="isContextSectionLoading"
                  class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
                >
                  {{ t('emotionViews.loadingContextTags') }}
                </div>
                <TagInput v-else v-model="selectedContextTagIds" tag-type="context" />
              </div>
            </div>
          </details>

          <!-- Save Button -->
          <div class="flex justify-end mt-6">
            <AppButton
              variant="filled"
              :disabled="selectedEmotionIds.length === 0 || isSaving"
              @click="handleSave"
              class="min-w-[120px]"
            >
              {{ isSaving ? t('emotionViews.saving') : t('emotionViews.save') }}
            </AppButton>
          </div>
        </div>
      </AppCard>

      <!-- Link to History -->
      <div class="text-center">
        <router-link
          to="/history?type=emotion-log"
          class="text-primary hover:underline inline-flex items-center gap-1"
        >
          {{ t('emotionViews.viewHistory') }}
          <AppIcon name="arrow_forward" class="text-base" />
        </router-link>
      </div>
    </div>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import TagInput from '@/components/TagInput.vue'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { Emotion, Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

// Form state
const selectedEmotionIds = ref<string[]>([])
const note = ref('')
const selectedPeopleTagIds = ref<string[]>([])
const selectedContextTagIds = ref<string[]>([])
const isSaving = ref(false)

// Loading states
const isEmotionDataLoading = ref(false)
const arePeopleTagsLoading = ref(false)
const areContextTagsLoading = ref(false)
const hasLoadedPeopleTags = ref(tagStore.peopleTags.length > 0)
const hasLoadedContextTags = ref(tagStore.contextTags.length > 0)

const isEmotionSectionLoading = computed(() => {
  return isEmotionDataLoading.value || !emotionStore.isLoaded
})

const isPeopleSectionLoading = computed(() => {
  return arePeopleTagsLoading.value || (!hasLoadedPeopleTags.value && tagStore.peopleTags.length === 0)
})

const isContextSectionLoading = computed(() => {
  return areContextTagsLoading.value || (!hasLoadedContextTags.value && tagStore.contextTags.length === 0)
})

const selectedEmotionList = computed(() => {
  return selectedEmotionIds.value
    .map((id) => emotionStore.getEmotionById(id))
    .filter((emotion): emotion is Emotion => Boolean(emotion))
})

const quadrantChipColors: Record<Quadrant, { bg: string; border: string }> = {
  'high-energy-high-pleasantness': {
    bg: 'var(--color-quadrant-high-energy-high-pleasantness-selected)',
    border: 'var(--color-quadrant-high-energy-high-pleasantness-border)',
  },
  'high-energy-low-pleasantness': {
    bg: 'var(--color-quadrant-high-energy-low-pleasantness-selected)',
    border: 'var(--color-quadrant-high-energy-low-pleasantness-border)',
  },
  'low-energy-high-pleasantness': {
    bg: 'var(--color-quadrant-low-energy-high-pleasantness-selected)',
    border: 'var(--color-quadrant-low-energy-high-pleasantness-border)',
  },
  'low-energy-low-pleasantness': {
    bg: 'var(--color-quadrant-low-energy-low-pleasantness-selected)',
    border: 'var(--color-quadrant-low-energy-low-pleasantness-border)',
  },
}

function getEmotionChipStyle(emotionId: string): Record<string, string> {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return {}
  const quadrant = getQuadrant(emotion)
  const colors = quadrantChipColors[quadrant]
  if (!colors) return {}
  return {
    backgroundColor: colors.bg,
    border: `1.5px solid ${colors.border}`,
  }
}

function removeEmotion(id: string) {
  const index = selectedEmotionIds.value.indexOf(id)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
  }
}

function resetForm() {
  selectedEmotionIds.value = []
  note.value = ''
  selectedPeopleTagIds.value = []
  selectedContextTagIds.value = []
}

async function handleSave() {
  if (selectedEmotionIds.value.length === 0) {
    snackbarRef.value?.show(t('emotionViews.selectAtLeastOne'))
    return
  }

  isSaving.value = true

  const payload = {
    emotionIds: [...selectedEmotionIds.value],
    note: note.value.trim() || undefined,
    peopleTagIds: selectedPeopleTagIds.value.length > 0 ? [...selectedPeopleTagIds.value] : undefined,
    contextTagIds: selectedContextTagIds.value.length > 0 ? [...selectedContextTagIds.value] : undefined,
    createdAt: undefined, // Let the repository auto-generate the timestamp
  }

  try {
    await emotionLogStore.createLog(payload)
    snackbarRef.value?.show(t('emotionViews.loggedSuccess'))
    resetForm()
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : t('emotionViews.saveError')
    snackbarRef.value?.show(message)
    console.error('Error saving emotion log:', error)
  } finally {
    isSaving.value = false
  }
}

async function ensureEmotionData() {
  if (emotionStore.isLoaded) return

  isEmotionDataLoading.value = true
  try {
    await emotionStore.loadEmotions()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('emotionViews.loadEmotionsError')
    snackbarRef.value?.show(message)
    console.error('Error loading emotions:', error)
  } finally {
    isEmotionDataLoading.value = false
  }
}

async function ensurePeopleTags() {
  if (tagStore.peopleTags.length > 0) {
    hasLoadedPeopleTags.value = true
    return
  }

  arePeopleTagsLoading.value = true
  try {
    await tagStore.loadPeopleTags()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('emotionViews.loadPeopleError')
    snackbarRef.value?.show(message)
    console.error('Error loading people tags:', error)
  } finally {
    arePeopleTagsLoading.value = false
    hasLoadedPeopleTags.value = true
  }
}

async function ensureContextTags() {
  if (tagStore.contextTags.length > 0) {
    hasLoadedContextTags.value = true
    return
  }

  areContextTagsLoading.value = true
  try {
    await tagStore.loadContextTags()
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t('emotionViews.loadContextError')
    snackbarRef.value?.show(message)
    console.error('Error loading context tags:', error)
  } finally {
    areContextTagsLoading.value = false
    hasLoadedContextTags.value = true
  }
}

onMounted(async () => {
  await Promise.all([ensureEmotionData(), ensurePeopleTags(), ensureContextTags()])
})
</script>
