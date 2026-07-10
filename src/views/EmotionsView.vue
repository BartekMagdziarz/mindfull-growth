<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Dwie kolumny: szerokie koło (potrzebuje niemal kwadratu) + notatka/tagi -->
    <div class="max-w-6xl mx-auto space-y-6">
      <!-- Inline Emotion Logging Form -->
      <AppCard padding="lg" :style="emotionCardStyle">
        <h2 class="text-lg font-semibold text-on-surface mb-4">{{ t('emotionViews.logTitle') }}</h2>

        <div class="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 items-stretch">
          <!-- Lewa kolumna: koło emocji -->
          <div
            v-if="isEmotionSectionLoading"
            class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
          >
            {{ t('emotionViews.loadingEmotions') }}
          </div>
          <div v-else class="min-w-0">
            <EmotionGroupPicker
              :label="t('emotionViews.editor.emotions')"
              v-model="wheelSelections"
              v-model:quadrant="activeEmotionQuadrant"
            />
          </div>

          <!-- Prawa kolumna: notatka + tagi (zwinięte do kilku rzędów) + zapis -->
          <div class="flex flex-col gap-4 min-w-0">
            <div>
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
                rows="3"
              />
            </div>

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
              <TagInput v-else v-model="selectedPeopleTagIds" tag-type="people" :visible-limit="8" />
            </div>

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
              <TagInput v-else v-model="selectedContextTagIds" tag-type="context" :visible-limit="8" />
            </div>

            <div class="mt-auto flex justify-end pt-2">
              <AppButton
                variant="filled"
                :disabled="wheelSelections.length === 0 || isSaving"
                @click="handleSave"
                class="min-w-[120px]"
              >
                {{ isSaving ? t('emotionViews.saving') : t('emotionViews.save') }}
              </AppButton>
            </div>
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
import EmotionGroupPicker from '@/components/emotion/EmotionGroupPicker.vue'
import TagInput from '@/components/TagInput.vue'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrantTintStyle } from '@/domain/emotion'
import type { EmotionGroupSelection as EmotionSelection } from '@/domain/emotionGroups'
import { groupSelectionsToFamilyIds } from '@/domain/emotionGroups'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

// Form state
const wheelSelections = ref<EmotionSelection[]>([])
const activeEmotionQuadrant = ref<Quadrant | null>(null)
const emotionCardStyle = computed(() => getQuadrantTintStyle(activeEmotionQuadrant.value))
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

function resetForm() {
  wheelSelections.value = []
  note.value = ''
  selectedPeopleTagIds.value = []
  selectedContextTagIds.value = []
}

async function handleSave() {
  if (wheelSelections.value.length === 0) {
    snackbarRef.value?.show(t('emotionViews.selectAtLeastOne'))
    return
  }

  isSaving.value = true

  // Koło zapisuje wybory w `emotions`; `emotionFamilyIds` = mostek zgodności
  // (slugi promieni == slugi rodzin), dzięki któremu historia/rollupy działają.
  const payload = {
    emotionIds: [],
    emotionFamilyIds: groupSelectionsToFamilyIds(wheelSelections.value),
    emotions: wheelSelections.value.map((s) => ({ ...s })),
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
