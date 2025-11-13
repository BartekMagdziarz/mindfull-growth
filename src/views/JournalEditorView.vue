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
import { useJournalStore } from '@/stores/journal.store'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { formatEntryDate } from '@/utils/dateFormat'
import type { JournalEntry } from '@/domain/journal'

const router = useRouter()
const route = useRoute()
const journalStore = useJournalStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const title = ref('')
const body = ref('')
const isSaving = ref(false)
const isLoading = ref(false)
const currentEntry = ref<JournalEntry | null>(null)

// Detect if we're in edit mode (has id param) or create mode
const isEditMode = computed(() => {
  return !!route.params.id && typeof route.params.id === 'string'
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

const loadEntry = async (id: string) => {
  isLoading.value = true
  try {
    // First check if entry exists in store (faster)
    const storeEntry = journalStore.entries.find((e) => e.id === id)
    if (storeEntry) {
      currentEntry.value = storeEntry
      title.value = storeEntry.title || ''
      body.value = storeEntry.body
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

    currentEntry.value = entry
    title.value = entry.title || ''
    body.value = entry.body
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

  try {
    if (isEditMode.value && currentEntry.value) {
      // Edit mode: update existing entry
      await journalStore.updateEntry({
        ...currentEntry.value,
        title: title.value.trim() || undefined,
        body: body.value.trim(),
      })
    } else {
      // Create mode: create new entry
      await journalStore.createEntry({
        title: title.value.trim() || undefined,
        body: body.value.trim(),
      })
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
  if (isEditMode.value && typeof route.params.id === 'string') {
    await loadEntry(route.params.id)
  } else {
    // Create mode: Auto-focus title input
    const titleInput = document.getElementById('title')
    if (titleInput) {
      titleInput.focus()
    }
  }
})
</script>

