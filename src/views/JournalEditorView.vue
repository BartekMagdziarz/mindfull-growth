<template>
  <div class="mx-auto w-full max-w-6xl px-2 sm:px-4 md:px-6 py-6 flex flex-col gap-8 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">Loading entry...</p>
    </div>

    <!-- Editor Content -->
    <template v-else>
      <!-- Timestamp Display -->
      <div class="text-xs uppercase tracking-wide text-on-surface-variant">
        <p>{{ formattedTimestamp }}</p>
      </div>

      <!-- Unified Journal Sheet -->
      <section
        class="rounded-[32px] border border-outline/40 bg-surface px-6 py-5 shadow-elevation-1 flex flex-col gap-4"
      >
        <label for="title" class="sr-only">Title</label>
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="Title"
          class="w-full bg-transparent text-2xl font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0"
        />

        <label for="body" class="sr-only">Journal Entry</label>
        <textarea
          id="body"
          v-model="body"
          placeholder="Write freely about what comes to your mind..."
          rows="8"
          class="w-full bg-transparent text-base leading-relaxed text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0 resize-y min-h-[160px] md:min-h-[220px]"
        />
      </section>

      <!-- Tag + context panels -->
      <section class="space-y-3">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-[1.8fr_1fr_1fr] items-start">
          <!-- Emotions Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-surface px-5 py-4 shadow-sm flex flex-col gap-4 transition-shadow hover:shadow-elevation-2"
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
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${emotion.name}`"
                    @click="removeEmotion(emotion.id)"
                  >
                    <span>{{ emotion.name }}</span>
                    <XMarkIcon class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>
            <div
              v-if="isEmotionSectionLoading"
              class="rounded-xl border border-dashed border-outline/40 p-3 text-center text-xs text-on-surface-variant"
            >
              Loading emotions...
            </div>
            <div v-else class="pt-1">
              <EmotionSelector v-model="selectedEmotionIds" :show-selected-section="false" />
            </div>
          </section>

          <!-- People Tags Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-surface px-5 py-4 shadow-sm flex flex-col gap-4 transition-shadow hover:shadow-elevation-2"
          >
            <header class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  People
                </p>
                <div class="flex flex-wrap gap-2 min-h-[1.5rem]">
                  <button
                    v-for="tag in selectedPeopleList"
                    :key="tag.id"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${tag.name}`"
                    @click="removePeopleTag(tag.id)"
                  >
                    <span>{{ tag.name }}</span>
                    <XMarkIcon class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>
            <div
              v-if="arePeopleTagsLoading"
              class="rounded-xl border border-dashed border-outline/40 p-3 text-center text-xs text-on-surface-variant"
            >
              Loading people tags...
            </div>
            <div v-else class="pt-1">
              <TagInput
                v-model="selectedPeopleTagIds"
                tag-type="people"
                compact
                hide-selected-section
              />
            </div>
          </section>

          <!-- Context Tags Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-surface px-5 py-4 shadow-sm flex flex-col gap-4 transition-shadow hover:shadow-elevation-2"
          >
            <header class="space-y-2">
              <div class="flex flex-wrap items-center gap-3">
                <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  Context
                </p>
                <div class="flex flex-wrap gap-2 min-h-[1.5rem]">
                  <button
                    v-for="tag in selectedContextList"
                    :key="tag.id"
                    type="button"
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-primary/60 focus:ring-offset-2 transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${tag.name}`"
                    @click="removeContextTag(tag.id)"
                  >
                    <span>{{ tag.name }}</span>
                    <XMarkIcon class="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </header>
            <div
              v-if="areContextTagsLoading"
              class="rounded-xl border border-dashed border-outline/40 p-3 text-center text-xs text-on-surface-variant"
            >
              Loading context tags...
            </div>
            <div v-else class="pt-1">
              <TagInput
                v-model="selectedContextTagIds"
                tag-type="context"
                compact
                hide-selected-section
              />
            </div>
          </section>
        </div>
      </section>

      <!-- Bottom Action Bar -->
      <div
        class="sticky bottom-0 left-0 right-0 bg-surface/90 backdrop-blur border-t border-outline/30 flex justify-end gap-3 px-2 sm:px-4 py-4"
      >
        <AppButton variant="text" @click="handleCancel" :disabled="isSaving">
          Cancel
        </AppButton>
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="!canSaveEntry"
          class="min-w-[140px]"
        >
          {{ isSaving ? 'Saving...' : 'Save' }}
        </AppButton>
      </div>
    </template>

    <!-- Snackbar for error messages -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import TagInput from '@/components/TagInput.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { formatEntryDate } from '@/utils/dateFormat'
import type { JournalEntry } from '@/domain/journal'
import type { Emotion } from '@/domain/emotion'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const title = ref('')
const body = ref('')
const isSaving = ref(false)
const isLoading = ref(false)
const currentEntry = ref<JournalEntry | null>(null)
const selectedEmotionIds = ref<string[]>([])
const selectedPeopleTagIds = ref<string[]>([])
const selectedContextTagIds = ref<string[]>([])
const isEmotionDataLoading = ref(false)
const arePeopleTagsLoading = ref(false)
const areContextTagsLoading = ref(false)
// Detect if we're in edit mode (has id param) or create mode
const isEditMode = computed(() => {
  return !!route.params.id && typeof route.params.id === 'string'
})

const isEmotionSectionLoading = computed(() => {
  return isEmotionDataLoading.value || !emotionStore.isLoaded
})

const canSaveEntry = computed(() => {
  return body.value.trim().length > 0 && !isSaving.value
})

const formattedTimestamp = computed(() => {
  if (isEditMode.value && currentEntry.value) {
    // In edit mode, show the entry's createdAt date
    return formatEntryDate(currentEntry.value.createdAt)
  } else {
    // In create mode, show current date
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
    } else {
      return now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }
})

const selectedEmotionList = computed(() => {
  return selectedEmotionIds.value
    .map((id) => emotionStore.getEmotionById(id))
    .filter((emotion): emotion is Emotion => Boolean(emotion))
})

const selectedPeopleList = computed(() => {
  return selectedPeopleTagIds.value
    .map((id) => tagStore.getPeopleTagById(id))
    .filter((tag): tag is { id: string; name: string } => Boolean(tag))
})

const selectedContextList = computed(() => {
  return selectedContextTagIds.value
    .map((id) => tagStore.getContextTagById(id))
    .filter((tag): tag is { id: string; name: string } => Boolean(tag))
})

const removeEmotion = (id: string) => {
  const index = selectedEmotionIds.value.indexOf(id)
  if (index > -1) {
    selectedEmotionIds.value.splice(index, 1)
  }
}

const removePeopleTag = (id: string) => {
  const index = selectedPeopleTagIds.value.indexOf(id)
  if (index > -1) {
    selectedPeopleTagIds.value.splice(index, 1)
  }
}

const removeContextTag = (id: string) => {
  const index = selectedContextTagIds.value.indexOf(id)
  if (index > -1) {
    selectedContextTagIds.value.splice(index, 1)
  }
}

const syncEntryToForm = (entry: JournalEntry) => {
  currentEntry.value = entry
  title.value = entry.title || ''
  body.value = entry.body
  selectedEmotionIds.value = [...(entry.emotionIds ?? [])]
  selectedPeopleTagIds.value = [...(entry.peopleTagIds ?? [])]
  selectedContextTagIds.value = [...(entry.contextTagIds ?? [])]
}

const ensureEmotionData = async () => {
  if (emotionStore.isLoaded) {
    return
  }

  isEmotionDataLoading.value = true
  try {
    await emotionStore.loadEmotions()
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load emotions. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error loading emotions:', error)
  } finally {
    isEmotionDataLoading.value = false
  }
}

const ensurePeopleTags = async () => {
  if (tagStore.peopleTags.length > 0) {
    return
  }

  arePeopleTagsLoading.value = true
  try {
    await tagStore.loadPeopleTags()
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load people tags. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error loading people tags:', error)
  } finally {
    arePeopleTagsLoading.value = false
    if (tagStore.error) {
      snackbarRef.value?.show(tagStore.error)
      tagStore.error = null
    }
  }
}

const ensureContextTags = async () => {
  if (tagStore.contextTags.length > 0) {
    return
  }

  areContextTagsLoading.value = true
  try {
    await tagStore.loadContextTags()
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load context tags. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error loading context tags:', error)
  } finally {
    areContextTagsLoading.value = false
    if (tagStore.error) {
      snackbarRef.value?.show(tagStore.error)
      tagStore.error = null
    }
  }
}

const loadEntry = async (id: string) => {
  isLoading.value = true
  try {
    // First check if entry exists in store (faster)
    const storeEntry = journalStore.entries.find((e) => e.id === id)
    if (storeEntry) {
      syncEntryToForm(storeEntry)
      return
    }

    // If not in store, load from repository
    const entry = await journalDexieRepository.getById(id)
    if (!entry) {
      // Entry doesn't exist
      snackbarRef.value?.show('Entry not found.')
      router.push('/journal')
      return
    }

    syncEntryToForm(entry)
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to load journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error loading journal entry:', error)
    router.push('/journal')
  } finally {
    isLoading.value = false
  }
}

const handleSave = async () => {
  // Validation: body must not be empty
  if (!body.value.trim()) {
    snackbarRef.value?.show('Please enter some content for your journal entry.')
    return
  }

  isSaving.value = true

  const payload = {
    title: title.value.trim() || undefined,
    body: body.value.trim(),
    emotionIds: [...selectedEmotionIds.value],
    peopleTagIds: [...selectedPeopleTagIds.value],
    contextTagIds: [...selectedContextTagIds.value],
  }

  try {
    if (isEditMode.value && currentEntry.value) {
      // Edit mode: update existing entry
      await journalStore.updateEntry({
        ...currentEntry.value,
        ...payload,
      })
    } else {
      // Create mode: create new entry
      await journalStore.createEntry(payload)
    }
    // Navigate back to journal list on success
    router.push('/journal')
  } catch (error) {
    // Error handling: show error message and stay on page
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to save journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error saving journal entry:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  router.push('/journal')
}

// Load entry data if in edit mode
onMounted(async () => {
  const dataPromises = [
    ensureEmotionData(),
    ensurePeopleTags(),
    ensureContextTags(),
  ]

  if (isEditMode.value && typeof route.params.id === 'string') {
    await loadEntry(route.params.id)
  } else {
    // Create mode: Auto-focus title input
    const titleInput = document.getElementById('title')
    if (titleInput) {
      titleInput.focus()
    }
  }

  await Promise.all(dataPromises)
})
</script>
