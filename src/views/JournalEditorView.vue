<template>
  <div class="container mx-auto px-4 py-6 flex flex-col min-h-full">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">Loading entry...</p>
    </div>

    <!-- Editor Content -->
    <template v-else>
      <!-- Timestamp Display -->
      <div class="mb-4">
        <p class="text-sm text-on-surface-variant">{{ formattedTimestamp }}</p>
      </div>

      <!-- Title Input -->
      <div class="mb-6">
        <label for="title" class="block mb-2 text-on-surface font-medium">
          Title
        </label>
        <input
          id="title"
          v-model="title"
          type="text"
          placeholder="Optional title for your entry"
          class="w-full px-4 py-3 rounded-lg border-2 border-outline text-on-surface bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200"
        />
      </div>

      <!-- Body Textarea -->
      <div class="mb-6 flex-1">
        <label for="body" class="block mb-2 text-on-surface font-medium">
          Journal Entry
        </label>
        <textarea
          id="body"
          v-model="body"
          placeholder="Write freely about what comes to your mind..."
          rows="12"
          class="w-full px-4 py-3 rounded-lg border-2 border-outline text-on-surface bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none transition-all duration-200 resize-y min-h-[200px] leading-relaxed"
        />
      </div>

      <!-- Emotions Section -->
      <section class="mb-6 border-t border-outline/40 pt-6">
        <header class="mb-4 space-y-1">
          <h2 class="text-lg font-semibold text-on-surface">Emotions</h2>
          <p class="text-sm text-on-surface-variant">
            Capture the feelings that best describe this entry. Selecting emotions is
            optional but helps spot patterns over time.
          </p>
        </header>
        <div
          v-if="isEmotionSectionLoading"
          class="rounded-lg border-2 border-dashed border-outline/60 p-4 text-center text-on-surface-variant text-sm"
        >
          Loading emotions...
        </div>
        <EmotionSelector v-else v-model="selectedEmotionIds" />
      </section>

      <!-- People Tags Section -->
      <section class="mb-6 border-t border-outline/40 pt-6">
        <header class="mb-4 space-y-1">
          <h2 class="text-lg font-semibold text-on-surface">People</h2>
          <p class="text-sm text-on-surface-variant">
            Tag people who were involved. Reusing an existing name keeps your history tidy, but
            this step is optional.
          </p>
        </header>
        <div
          v-if="arePeopleTagsLoading"
          class="rounded-lg border-2 border-dashed border-outline/60 p-4 text-center text-on-surface-variant text-sm"
        >
          Loading people tags...
        </div>
        <TagInput v-else v-model="selectedPeopleTagIds" tag-type="people" />
      </section>

      <!-- Context Tags Section -->
      <section class="mb-6 border-t border-outline/40 pt-6">
        <header class="mb-4 space-y-1">
          <h2 class="text-lg font-semibold text-on-surface">Context</h2>
          <p class="text-sm text-on-surface-variant">
            Add any situational tags (location, activity, vibe). These are also optional and
            separate from people tags.
          </p>
        </header>
        <div
          v-if="areContextTagsLoading"
          class="rounded-lg border-2 border-dashed border-outline/60 p-4 text-center text-on-surface-variant text-sm"
        >
          Loading context tags...
        </div>
        <TagInput v-else v-model="selectedContextTagIds" tag-type="context" />
      </section>

      <!-- Bottom Action Bar -->
      <div class="mt-auto pt-4 pb-6 flex gap-3">
        <AppButton variant="text" @click="handleCancel" :disabled="isSaving">
          Cancel
        </AppButton>
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="isSaving"
          class="flex-1"
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

