<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Action Cards Section -->
    <div class="flex flex-col items-center justify-center gap-6 mt-8 mb-8">
      <!-- Free form Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handleFreeFormClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <PencilIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Free form</h3>
            <p class="text-on-surface-variant">
              Write freely about what comes to your mind
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Guided Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handleGuidedClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <LightBulbIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Guided</h3>
            <p class="text-on-surface-variant">
              Follow prompts and questions
            </p>
          </div>
        </div>
      </AppCard>

      <!-- Periodic Card -->
      <AppCard
        padding="lg"
        class="w-full max-w-md cursor-pointer transition-all duration-200 hover:shadow-elevation-2 active:scale-[0.98]"
        @click="handlePeriodicClick"
      >
        <div class="flex items-start gap-4">
          <div class="flex-shrink-0 mt-1">
            <CalendarIcon class="w-8 h-8 text-primary" />
          </div>
          <div class="flex-1">
            <h3 class="text-xl font-semibold text-on-surface mb-2">Periodic</h3>
            <p class="text-on-surface-variant">
              Scheduled reflection moments
            </p>
          </div>
        </div>
      </AppCard>
    </div>

    <!-- Journal Entries Display (existing functionality) -->
    <div class="mt-8">
      <div v-if="journalStore.isLoading" class="text-on-surface-variant text-center">
        Loading journal entries...
      </div>
      <div
        v-else-if="journalStore.error"
        class="text-error bg-error-container p-4 rounded"
      >
        <p class="font-semibold mb-2">Unable to load journal entries</p>
        <p class="text-sm">{{ journalStore.error }}</p>
        <p class="text-sm mt-2">Please refresh the page.</p>
      </div>
      <div v-else>
        <!-- Empty State -->
        <p
          v-if="journalStore.sortedEntries.length === 0"
          class="text-on-surface-variant text-center"
        >
          No entries yet
        </p>
        <!-- Entries List -->
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <AppCard
            v-for="entry in journalStore.sortedEntries"
            :key="entry.id"
            :elevation="1"
            padding="none"
            class="py-3 px-4 cursor-pointer transition-all duration-200 hover:shadow-elevation-2"
            @click="() => handleCardClick(entry.id)"
          >
            <div class="space-y-1">
              <!-- Title Row with Delete Button -->
              <div class="flex items-start justify-between gap-2 mb-1">
                <h3 class="text-lg font-semibold text-on-surface flex-1">
                  {{ entry.title || 'Untitled entry' }}
                </h3>
                <button
                  @click.stop="handleDeleteClick(entry)"
                  :disabled="isDeleting && deleteEntryId === entry.id"
                  :aria-label="`Delete entry: ${entry.title || 'Untitled entry'}`"
                  class="flex-shrink-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-variant hover:text-error transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <TrashIcon
                    v-if="!(isDeleting && deleteEntryId === entry.id)"
                    class="w-5 h-5"
                  />
                  <span
                    v-else
                    class="text-sm"
                  >Deleting...</span>
                </button>
              </div>
              <p class="text-sm text-on-surface-variant">
                {{ formatEntryDate(entry.createdAt) }}
              </p>
              <p class="text-on-surface-variant line-clamp-2 mt-2">
                {{ entry.body }}
              </p>
            </div>
          </AppCard>
        </div>
      </div>
    </div>

    <!-- Snackbar -->
    <AppSnackbar ref="snackbarRef" />

    <!-- Delete Confirmation Dialog -->
    <AppDialog
      v-model="showDeleteDialog"
      title="Delete Entry"
      message="Are you sure you want to delete this entry? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-variant="tonal"
      @confirm="handleDeleteConfirm"
      @cancel="handleDeleteCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppDialog from '@/components/AppDialog.vue'
import { useJournalStore } from '@/stores/journal.store'
import { formatEntryDate } from '@/utils/dateFormat'
import {
  PencilIcon,
  LightBulbIcon,
  CalendarIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { JournalEntry } from '@/domain/journal'

const journalStore = useJournalStore()
const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isDeleting = ref(false)
const deleteEntryId = ref<string | null>(null)
const showDeleteDialog = ref(false)
const entryToDelete = ref<JournalEntry | null>(null)

const handleFreeFormClick = () => {
  router.push('/journal/edit')
}

const handleGuidedClick = () => {
  snackbarRef.value?.show('Coming soon')
}

const handlePeriodicClick = () => {
  snackbarRef.value?.show('Coming soon')
}

const handleCardClick = (entryId: string) => {
  router.push(`/journal/${entryId}/edit`)
}

const handleDeleteClick = (entry: JournalEntry) => {
  entryToDelete.value = entry
  showDeleteDialog.value = true
}

const handleDeleteConfirm = async () => {
  if (!entryToDelete.value) return

  const entryId = entryToDelete.value.id
  isDeleting.value = true
  deleteEntryId.value = entryId

  try {
    await journalStore.deleteEntry(entryId)
    snackbarRef.value?.show('Entry deleted successfully.')
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to delete entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error deleting journal entry:', error)
  } finally {
    isDeleting.value = false
    deleteEntryId.value = null
    entryToDelete.value = null
  }
}

const handleDeleteCancel = () => {
  entryToDelete.value = null
}

onMounted(() => {
  journalStore.loadEntries()
})
</script>

