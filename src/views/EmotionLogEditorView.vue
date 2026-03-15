<template>
  <div class="mx-auto w-full max-w-6xl px-2 sm:px-4 md:px-6 py-6 flex flex-col gap-6 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">{{ t('emotionViews.editor.loading') }}</p>
    </div>

    <!-- Editor Content -->
    <template v-else>
      <!-- Timestamp Display/Edit -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="text-xs uppercase tracking-wide text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
          @click="showDateTimePicker = true"
          aria-label="Edit date and time"
        >
          <AppIcon name="calendar_today" class="text-base" />
          <span>{{ formattedTimestamp }}</span>
          <AppIcon name="edit_note" class="text-sm opacity-60" />
        </button>
      </div>

      <!-- Date/Time Picker Modal -->
      <Teleport to="body">
        <Transition name="dialog">
          <div
            v-if="showDateTimePicker"
            class="fixed inset-0 z-50 flex items-center justify-center"
            @click.self="showDateTimePicker = false"
          >
            <div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>
            <div
              class="relative z-10 neo-raised-strong rounded-2xl p-6 max-w-sm w-full mx-4"
              role="dialog"
              aria-modal="true"
            >
              <h2 class="text-lg font-semibold text-on-surface mb-4">{{ t('emotionViews.editor.dateTimeTitle') }}</h2>
              <div class="space-y-4">
                <div>
                  <label for="log-date" class="block text-sm font-medium text-on-surface-variant mb-1">
                    {{ t('emotionViews.editor.dateLabel') }}
                  </label>
                  <input
                    id="log-date"
                    type="date"
                    v-model="selectedDate"
                    class="neo-input w-full p-3 text-on-surface"
                  />
                </div>
                <div>
                  <label for="log-time" class="block text-sm font-medium text-on-surface-variant mb-1">
                    {{ t('emotionViews.editor.timeLabel') }}
                  </label>
                  <input
                    id="log-time"
                    type="time"
                    v-model="selectedTime"
                    class="neo-input w-full p-3 text-on-surface"
                  />
                </div>
              </div>
              <div class="flex gap-3 justify-end mt-6">
                <AppButton variant="text" @click="showDateTimePicker = false">{{ t('emotionViews.editor.cancel') }}</AppButton>
                <AppButton variant="filled" @click="applyDateTime">{{ t('emotionViews.editor.apply') }}</AppButton>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Emotions + Note Row -->
      <section class="space-y-3">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-[1.8fr_1fr] items-stretch">
          <!-- Emotions Section -->
          <section
            class="neo-card px-5 py-4 flex flex-col gap-4"
          >
            <header class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {{ t('emotionViews.editor.emotions') }}
                </p>
                <div class="flex flex-wrap gap-2 min-h-[1.5rem]">
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
              </div>
            </header>
            <div
              v-if="isEmotionSectionLoading"
              class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
            >
              {{ t('emotionViews.loadingEmotions') }}
            </div>
            <div v-else class="pt-1">
              <EmotionSelector v-model="selectedEmotionIds" :show-selected-section="false" />
            </div>
          </section>

          <!-- Note Section -->
          <section
            class="neo-inset rounded-[32px] px-6 py-5 flex flex-col gap-3 self-stretch"
          >
            <label for="note" class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('emotionViews.editor.note') }}
            </label>
            <textarea
              id="note"
              v-model="note"
              :placeholder="t('emotionViews.editor.notePlaceholder')"
              class="w-full h-full bg-transparent text-sm leading-relaxed text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0 resize-none flex-1"
            />
          </section>
        </div>
      </section>

      <!-- People + Context Row -->
      <section class="space-y-3">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 items-start">
          <!-- People Tags Section -->
          <section
            class="neo-card px-5 py-4 flex flex-col gap-4"
          >
            <header>
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('emotionViews.editor.people') }}
              </p>
            </header>
            <div
              v-if="isPeopleSectionLoading"
              class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
            >
              {{ t('emotionViews.editor.loadingPeopleTags') }}
            </div>
            <div v-else class="pt-1">
              <TagInput v-model="selectedPeopleTagIds" tag-type="people" />
            </div>
          </section>

          <!-- Context Tags Section -->
          <section
            class="neo-card px-5 py-4 flex flex-col gap-4"
          >
            <header>
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                {{ t('emotionViews.editor.context') }}
              </p>
            </header>
            <div
              v-if="isContextSectionLoading"
              class="rounded-xl border border-dashed border-neu-border/40 bg-neu-base p-3 text-center text-xs text-on-surface-variant"
            >
              {{ t('emotionViews.editor.loadingContextTags') }}
            </div>
            <div v-else class="pt-1">
              <TagInput v-model="selectedContextTagIds" tag-type="context" />
            </div>
          </section>
        </div>
      </section>

      <!-- Bottom Action Bar -->
      <div
        class="border-t border-neu-border/20 flex justify-end gap-3 px-2 sm:px-4 py-4"
      >
        <AppButton
          variant="text"
          @click="handleCancel"
          :disabled="isSaving"
        >
          {{ t('emotionViews.editor.cancel') }}
        </AppButton>
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="isSaving"
          class="min-w-[140px]"
        >
          {{ isSaving ? t('emotionViews.editor.saving') : t('emotionViews.editor.save') }}
        </AppButton>
      </div>
    </template>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import TagInput from '@/components/TagInput.vue'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { emotionLogDexieRepository } from '@/repositories/emotionLogDexieRepository'
import { formatEntryDate } from '@/utils/dateFormat'
import type { EmotionLog } from '@/domain/emotionLog'
import type { Emotion, Quadrant } from '@/domain/emotion'
import { getQuadrant } from '@/domain/emotion'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'

const router = useRouter()
const route = useRoute()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const { t } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const showSnackbarThenNavigate = async (message: string, path: string) => {
  snackbarRef.value?.show(message)
  await nextTick()
  // Keep the snackbar visible long enough for the user to perceive the message
  // before the route change unmounts the current view.
  await new Promise((resolve) => setTimeout(resolve, 500))
  await router.push(path)
}

const selectedEmotionIds = ref<string[]>([])
const note = ref('')
const selectedPeopleTagIds = ref<string[]>([])
const selectedContextTagIds = ref<string[]>([])
const isSaving = ref(false)
const isLoading = ref(false)
const currentLog = ref<EmotionLog | null>(null)
const isEmotionDataLoading = ref(false)
const arePeopleTagsLoading = ref(false)
const areContextTagsLoading = ref(false)
const hasLoadedPeopleTags = ref(tagStore.peopleTags.length > 0)
const hasLoadedContextTags = ref(tagStore.contextTags.length > 0)

// Date/time picker state
const showDateTimePicker = ref(false)
const customCreatedAt = ref<Date | null>(null)
const selectedDate = ref('')
const selectedTime = ref('')

function resetForm() {
  selectedEmotionIds.value = []
  note.value = ''
  selectedPeopleTagIds.value = []
  selectedContextTagIds.value = []
  currentLog.value = null
  customCreatedAt.value = null
}

// Initialize date/time picker values
function initDateTimePicker() {
  let date = new Date() // Default to now

  if (customCreatedAt.value && !isNaN(customCreatedAt.value.getTime())) {
    date = customCreatedAt.value
  } else if (isEditMode.value && currentLog.value) {
    const parsedDate = new Date(currentLog.value.createdAt)
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate
    }
  }

  selectedDate.value = date.toISOString().split('T')[0]
  selectedTime.value = date.toTimeString().slice(0, 5)
}

function applyDateTime() {
  if (selectedDate.value && selectedTime.value) {
    const dateParts = selectedDate.value.split('-').map(Number)
    const timeParts = selectedTime.value.split(':').map(Number)

    // Validate that all parts are valid numbers
    if (
      dateParts.length === 3 &&
      timeParts.length >= 2 &&
      dateParts.every((n) => !isNaN(n)) &&
      timeParts.every((n) => !isNaN(n))
    ) {
      const [year, month, day] = dateParts
      const [hours, minutes] = timeParts
      const newDate = new Date(year, month - 1, day, hours, minutes)

      // Only apply if the resulting date is valid
      if (!isNaN(newDate.getTime())) {
        customCreatedAt.value = newDate
      } else {
        console.warn('applyDateTime: Created invalid date from inputs', { selectedDate: selectedDate.value, selectedTime: selectedTime.value })
      }
    } else {
      console.warn('applyDateTime: Invalid date/time input format', { selectedDate: selectedDate.value, selectedTime: selectedTime.value })
    }
  }
  showDateTimePicker.value = false
}

// Initialize picker values when modal opens
watch(showDateTimePicker, (isOpen) => {
  if (isOpen) {
    initDateTimePicker()
  }
})

const isEditMode = computed(() => {
  return !!route.params.id && typeof route.params.id === 'string'
})

const isEmotionSectionLoading = computed(() => {
  return isEmotionDataLoading.value || !emotionStore.isLoaded
})

const isPeopleSectionLoading = computed(() => {
  return arePeopleTagsLoading.value || (!hasLoadedPeopleTags.value && tagStore.peopleTags.length === 0)
})

const isContextSectionLoading = computed(() => {
  return (
    areContextTagsLoading.value ||
    (!hasLoadedContextTags.value && tagStore.contextTags.length === 0)
  )
})

const isValid = computed(() => selectedEmotionIds.value.length > 0)

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

const removeEmotion = (id: string) => {
  const index = selectedEmotionIds.value.indexOf(id)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
  }
}

const formattedTimestamp = computed(() => {
  // Use custom date if set and valid
  if (customCreatedAt.value && !isNaN(customCreatedAt.value.getTime())) {
    return formatEntryDate(customCreatedAt.value.toISOString())
  }

  // Use log date if in edit mode and date is valid
  if (isEditMode.value && currentLog.value) {
    const logDate = new Date(currentLog.value.createdAt)
    if (!isNaN(logDate.getTime())) {
      return formatEntryDate(logDate.toISOString())
    }
    // Invalid date - show "Unknown date" to allow user to fix it
    return t('emotionViews.editor.unknownDate')
  }

  // In create mode with no custom date, show current date
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entryDay = new Date(now)
  entryDay.setHours(0, 0, 0, 0)

  const isToday = entryDay.getTime() === today.getTime()

  if (isToday) {
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return `Today, ${hours}:${minutes}`
  }

  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
})

const syncLogToForm = (log: EmotionLog) => {
  currentLog.value = log
  selectedEmotionIds.value = [...log.emotionIds]
  note.value = log.note ?? ''
  selectedPeopleTagIds.value = [...(log.peopleTagIds ?? [])]
  selectedContextTagIds.value = [...(log.contextTagIds ?? [])]
}

const ensureEmotionData = async () => {
  if (emotionStore.isLoaded) {
    return
  }

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

const ensurePeopleTags = async () => {
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
    if (tagStore.error) {
      snackbarRef.value?.show(tagStore.error)
      tagStore.error = null
    }
  }
}

const ensureContextTags = async () => {
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
    if (tagStore.error) {
      snackbarRef.value?.show(tagStore.error)
      tagStore.error = null
    }
  }
}

const loadLog = async (id: string) => {
  isLoading.value = true
  try {
    const storeLog = emotionLogStore.logs.find((log) => log.id === id)
    if (storeLog) {
      syncLogToForm(storeLog)
      return
    }

    const log = await emotionLogDexieRepository.getById(id)
    if (!log) {
      await showSnackbarThenNavigate(t('emotionViews.editor.notFound'), '/emotions')
      return
    }

    syncLogToForm(log)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : t('emotionViews.editor.loadError')
    console.error('Error loading emotion log:', error)
    await showSnackbarThenNavigate(message, '/emotions')
  } finally {
    isLoading.value = false
  }
}

const handleSave = async () => {
  if (!isValid.value) {
    snackbarRef.value?.show(t('emotionViews.editor.selectAtLeastOne'))
    return
  }

  isSaving.value = true

  const payload = {
    emotionIds: [...selectedEmotionIds.value],
    note: note.value.trim() || undefined,
    peopleTagIds:
      selectedPeopleTagIds.value.length > 0 ? [...selectedPeopleTagIds.value] : undefined,
    contextTagIds:
      selectedContextTagIds.value.length > 0 ? [...selectedContextTagIds.value] : undefined,
  }

  try {
    if (isEditMode.value && currentLog.value) {
      await emotionLogStore.updateLog({
        ...currentLog.value,
        ...payload,
      })
    } else {
      // Create mode: include optional custom date
      await emotionLogStore.createLog({
        ...payload,
        createdAt: customCreatedAt.value?.toISOString(),
      })
    }

    await showSnackbarThenNavigate(t('emotionViews.editor.savedSuccess'), '/emotions')
    resetForm()
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : t('emotionViews.editor.saveError')
    snackbarRef.value?.show(message)
    console.error('Error saving emotion log:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  resetForm()
  router.push('/emotions')
}

onMounted(async () => {
  const dataPromises = [ensureEmotionData(), ensurePeopleTags(), ensureContextTags()]

  if (isEditMode.value && typeof route.params.id === 'string') {
    await loadLog(route.params.id)
  }

  await Promise.all(dataPromises)
})
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .neo-raised-strong,
.dialog-leave-active .neo-raised-strong {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .neo-raised-strong,
.dialog-leave-to .neo-raised-strong {
  transform: scale(0.95);
  opacity: 0;
}
</style>
