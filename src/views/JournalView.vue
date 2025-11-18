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
                  class="flex-shrink-0 p-2 rounded-xl text-on-surface-variant hover:bg-section hover:text-error transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
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
              <!-- Date + Chat indicator row -->
              <div class="flex items-center justify-between text-sm text-on-surface-variant">
                <p>
                  {{ formatEntryDate(entry.createdAt) }}
                </p>
                <button
                  v-if="entry.chatSessions && entry.chatSessions.length > 0"
                  type="button"
                  class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary-soft text-primary-strong text-xs font-medium hover:bg-primary-soft/80 focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
                  @click.stop="handleViewChats(entry)"
                  :aria-label="`View ${entry.chatSessions.length} chat session(s)`"
                >
                  <span class="text-base leading-none">💬</span>
                  <span>
                    {{ entry.chatSessions.length }}
                    chat{{ entry.chatSessions.length > 1 ? 's' : '' }}
                  </span>
                </button>
              </div>
              <p class="text-on-surface-variant line-clamp-2 mt-2">
                {{ entry.body }}
              </p>
              <!-- Tags Section -->
              <div
                v-if="hasTags(entry)"
                class="flex flex-wrap gap-2 mt-3"
              >
                <!-- Emotion Chips -->
                <template
                  v-for="emotionId in entry.emotionIds ?? []"
                  :key="`emotion-${emotionId}`"
                >
                  <span
                    v-if="getEmotionName(emotionId)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-section-strong text-primary-strong border border-chip-border shadow-elevation-1"
                  >
                    {{ getEmotionName(emotionId) }}
                  </span>
                </template>
                <!-- People Tag Chips -->
                <template
                  v-for="peopleTagId in entry.peopleTagIds ?? []"
                  :key="`people-${peopleTagId}`"
                >
                  <span
                    v-if="getPeopleTagName(peopleTagId)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-chip text-chip-text border border-chip-border shadow-elevation-1"
                  >
                    {{ getPeopleTagName(peopleTagId) }}
                  </span>
                </template>
                <!-- Context Tag Chips -->
                <template
                  v-for="contextTagId in entry.contextTagIds ?? []"
                  :key="`context-${contextTagId}`"
                >
                  <span
                    v-if="getContextTagName(contextTagId)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-soft text-primary-strong border border-chip-border shadow-elevation-1"
                  >
                    {{ getContextTagName(contextTagId) }}
                  </span>
                </template>
              </div>
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

    <!-- Chat history dialog -->
    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="showChatHistoryDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="showChatHistoryDialog = false"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>

          <!-- Dialog Card -->
          <div
            class="relative z-10 bg-surface rounded-xl shadow-elevation-3 p-6 max-w-lg w-full mx-4 border border-outline/20"
            role="dialog"
            aria-modal="true"
          >
            <h2 class="text-xl font-semibold text-on-surface mb-4">
              Chat history
            </h2>
            <p
              v-if="!selectedEntryForChats"
              class="text-on-surface-variant text-sm"
            >
              No entry selected.
            </p>
            <div
              v-else-if="selectedEntryChatSessions.length === 0"
              class="text-on-surface-variant text-sm"
            >
              No chat sessions yet for this entry.
            </div>
            <div
              v-else
              class="space-y-3 max-h-[60vh] overflow-y-auto"
            >
              <ChatSessionCard
                v-for="session in selectedEntryChatSessions"
                :key="session.id"
                :chat-session="session"
                @view="handleChatSessionView(selectedEntryForChats.id, session.id)"
                @delete.stop
              />
            </div>
            <div class="flex justify-end mt-6">
              <AppButton variant="text" @click="showChatHistoryDialog = false">
                Close
              </AppButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppButton from '@/components/AppButton.vue'
import ChatSessionCard from '@/components/ChatSessionCard.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { formatEntryDate } from '@/utils/dateFormat'
import {
  PencilIcon,
  LightBulbIcon,
  CalendarIcon,
  TrashIcon,
} from '@heroicons/vue/24/outline'
import type { JournalEntry } from '@/domain/journal'

const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isDeleting = ref(false)
const deleteEntryId = ref<string | null>(null)
const showDeleteDialog = ref(false)
const entryToDelete = ref<JournalEntry | null>(null)

const showChatHistoryDialog = ref(false)
const selectedEntryForChats = ref<JournalEntry | null>(null)

const selectedEntryChatSessions = computed(() => {
  return selectedEntryForChats.value?.chatSessions ?? []
})

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

const handleViewChats = (entry: JournalEntry) => {
  if (!entry.chatSessions || entry.chatSessions.length === 0) {
    return
  }
  selectedEntryForChats.value = entry
  showChatHistoryDialog.value = true
}

const handleChatSessionView = (entryId: string, sessionId: string) => {
  router.push({
    name: 'journal-chat',
    params: { id: entryId },
    query: { sessionId },
  })
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

// Helper functions to resolve IDs to names
const getEmotionName = (id: string): string | undefined => {
  return emotionStore.getEmotionById(id)?.name
}

const getPeopleTagName = (id: string): string | undefined => {
  return tagStore.getPeopleTagById(id)?.name
}

const getContextTagName = (id: string): string | undefined => {
  return tagStore.getContextTagById(id)?.name
}

// Helper to check if entry has any tags/emotions
const hasTags = (entry: JournalEntry): boolean => {
  const hasEmotions = (entry.emotionIds ?? []).length > 0
  const hasPeopleTags = (entry.peopleTagIds ?? []).length > 0
  const hasContextTags = (entry.contextTagIds ?? []).length > 0
  return hasEmotions || hasPeopleTags || hasContextTags
}

onMounted(async () => {
  // Load stores in parallel for efficiency
  const loadPromises = [journalStore.loadEntries()]

  // Load emotions if not already loaded
  if (!emotionStore.isLoaded) {
    loadPromises.push(emotionStore.loadEmotions())
  }

  // Load people tags if empty
  if (tagStore.peopleTags.length === 0) {
    loadPromises.push(tagStore.loadPeopleTags())
  }

  // Load context tags if empty
  if (tagStore.contextTags.length === 0) {
    loadPromises.push(tagStore.loadContextTags())
  }

  await Promise.all(loadPromises)
})
</script>

<style scoped>
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .bg-surface,
.dialog-leave-active .bg-surface {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .bg-surface,
.dialog-leave-to .bg-surface {
  transform: scale(0.95);
  opacity: 0;
}
</style>
