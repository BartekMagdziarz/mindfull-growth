<template>
  <div class="container mx-auto px-4 py-6 flex flex-col min-h-full">
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">Loading emotion log...</p>
    </div>

    <template v-else>
      <div class="mb-4">
        <p class="text-sm text-on-surface-variant">{{ formattedTimestamp }}</p>
      </div>

      <section class="mb-6 rounded-3xl bg-section border border-outline/30 px-4 py-5 shadow-elevation-2">
        <header class="mb-4 space-y-1">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-on-surface">Emotions</h2>
            <span class="text-xs font-medium uppercase tracking-wide text-error">
              Required
            </span>
          </div>
          <p class="text-sm text-on-surface-variant">
            Select the feelings that best match this moment. Pick at least one to continue.
          </p>
        </header>
        <div
          v-if="isEmotionSectionLoading"
          class="rounded-2xl border-2 border-dashed border-outline/50 bg-surface p-4 text-center text-on-surface-variant text-sm"
        >
          Loading emotions...
        </div>
        <EmotionSelector v-else v-model="selectedEmotionIds" />
      </section>

      <section class="mb-6 rounded-3xl bg-section border border-outline/30 px-4 py-5 shadow-elevation-2">
        <header class="mb-4 space-y-1">
          <label
            for="note"
            class="text-lg font-semibold text-on-surface leading-tight"
          >
            Note <span class="text-sm font-normal text-on-surface-variant">(optional)</span>
          </label>
          <p class="text-sm text-on-surface-variant">
            Capture a quick reflection about what was happening or how you responded.
          </p>
        </header>
        <textarea
          id="note"
          v-model="note"
          rows="5"
          placeholder="Add a brief note about this emotion log (optional)"
          class="w-full px-4 py-3 rounded-lg border-2 border-outline text-on-surface bg-surface focus:border-primary focus:ring-2 focus:ring-focus focus:outline-none transition-all duration-200 resize-y min-h-[140px] leading-relaxed"
        />
      </section>

      <section class="mb-6 rounded-3xl bg-section border border-outline/30 px-4 py-5 shadow-elevation-2">
        <header class="mb-4 space-y-1">
          <h2 class="text-lg font-semibold text-on-surface">People</h2>
          <p class="text-sm text-on-surface-variant">
            Tag anyone who influenced this experience. This helps surface patterns later and is optional.
          </p>
        </header>
        <div
          v-if="isPeopleSectionLoading"
          class="rounded-2xl border-2 border-dashed border-outline/50 bg-surface p-4 text-center text-on-surface-variant text-sm"
        >
          Loading people tags...
        </div>
        <TagInput v-else v-model="selectedPeopleTagIds" tag-type="people" />
      </section>

      <section class="mb-6 rounded-3xl bg-section border border-outline/30 px-4 py-5 shadow-elevation-2">
        <header class="mb-4 space-y-1">
          <h2 class="text-lg font-semibold text-on-surface">Context</h2>
          <p class="text-sm text-on-surface-variant">
            Add situational context such as location or activity. Optional but useful for trends.
          </p>
        </header>
        <div
          v-if="isContextSectionLoading"
          class="rounded-2xl border-2 border-dashed border-outline/50 bg-surface p-4 text-center text-on-surface-variant text-sm"
        >
          Loading context tags...
        </div>
        <TagInput v-else v-model="selectedContextTagIds" tag-type="context" />
      </section>

      <div class="mt-auto pt-4 pb-6 flex flex-col gap-3 sm:flex-row">
        <AppButton
          variant="text"
          @click="handleCancel"
          :disabled="isSaving"
          class="sm:flex-1"
        >
          Cancel
        </AppButton>
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="isSaving"
          class="sm:flex-1"
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
