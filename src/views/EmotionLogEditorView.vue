<template>
  <div class="mx-auto w-full max-w-6xl px-2 sm:px-4 md:px-6 py-6 flex flex-col gap-6 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">Loading emotion log...</p>
    </div>

    <!-- Editor Content -->
    <template v-else>
      <!-- Timestamp Display -->
      <div class="text-xs uppercase tracking-wide text-on-surface-variant">
        <p>{{ formattedTimestamp }}</p>
      </div>

      <!-- Emotions + Note Row -->
      <section class="space-y-3">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-[1.8fr_1fr] items-stretch">
          <!-- Emotions Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
          >
            <header class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Emotions
                </p>
                <div class="flex flex-wrap gap-2 min-h-[1.5rem]">
                  <button
                    v-for="emotion in selectedEmotionList"
                    :key="emotion.id"
                    type="button"
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${emotion.name} from selection`"
                    @click="removeEmotion(emotion.id)"
                  >
                    <span>{{ emotion.name }}</span>
                    <XMarkIcon class="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>
            <div
              v-if="isEmotionSectionLoading"
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
            >
              Loading emotions...
            </div>
            <div v-else class="pt-1">
              <EmotionSelector v-model="selectedEmotionIds" :show-selected-section="false" />
            </div>
          </section>

          <!-- Note Section -->
          <section
            class="rounded-[32px] border border-outline/40 bg-surface px-6 py-5 shadow-elevation-1 flex flex-col gap-3 self-stretch"
          >
            <label for="note" class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Note
            </label>
            <textarea
              id="note"
              v-model="note"
              placeholder="Quick reflection..."
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
            class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
          >
            <header>
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                People
              </p>
            </header>
            <div
              v-if="isPeopleSectionLoading"
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
            >
              Loading people tags...
            </div>
            <div v-else class="pt-1">
              <TagInput v-model="selectedPeopleTagIds" tag-type="people" />
            </div>
          </section>

          <!-- Context Tags Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
          >
            <header>
              <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                Context
              </p>
            </header>
            <div
              v-if="isContextSectionLoading"
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
            >
              Loading context tags...
            </div>
            <div v-else class="pt-1">
              <TagInput v-model="selectedContextTagIds" tag-type="context" />
            </div>
          </section>
        </div>
      </section>

      <!-- Bottom Action Bar -->
      <div
        class="sticky bottom-0 left-0 right-0 bg-background border-t border-outline/30 flex justify-end gap-3 px-2 sm:px-4 py-4"
      >
        <AppButton
          variant="text"
          @click="handleCancel"
          :disabled="isSaving"
        >
          Cancel
        </AppButton>
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="isSaving"
          class="min-w-[140px]"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </AppButton>
      </div>
    </template>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
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
import type { Emotion } from '@/domain/emotion'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const showSnackbarThenNavigate = async (message: string, path: string) => {
  snackbarRef.value?.show(message)
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 200))
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

const removeEmotion = (id: string) => {
  const index = selectedEmotionIds.value.indexOf(id)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
  }
}

const formattedTimestamp = computed(() => {
  if (isEditMode.value && currentLog.value) {
    return `Created on ${formatEntryDate(currentLog.value.createdAt)}`
  }

  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entryDate = new Date(now)
  entryDate.setHours(0, 0, 0, 0)

  const isToday = entryDate.getTime() === today.getTime()

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
      error instanceof Error ? error.message : 'Failed to load emotions. Please try again.'
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
      error instanceof Error ? error.message : 'Failed to load people tags. Please try again.'
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
      error instanceof Error ? error.message : 'Failed to load context tags. Please try again.'
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
      await showSnackbarThenNavigate('Emotion log not found.', '/emotions')
      return
    }

    syncLogToForm(log)
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to load emotion log. Please try again.'
    console.error('Error loading emotion log:', error)
    await showSnackbarThenNavigate(message, '/emotions')
  } finally {
    isLoading.value = false
  }
}

const handleSave = async () => {
  if (!isValid.value) {
    snackbarRef.value?.show('Please select at least one emotion.')
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
      await emotionLogStore.createLog(payload)
    }

    await showSnackbarThenNavigate('Emotion log saved successfully.', '/emotions')
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to save emotion log. Please try again.'
    snackbarRef.value?.show(message)
    console.error('Error saving emotion log:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
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
