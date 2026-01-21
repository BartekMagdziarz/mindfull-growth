<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-3xl mx-auto">
      <!-- Filters Section -->
      <HistoryFilters
        v-model:type-filter="typeFilter"
        v-model:date-range="dateRange"
        v-model:sort-order="sortOrder"
      />

      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="text-on-surface-variant text-center py-8"
      >
        Loading entries...
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="bg-error-container text-on-error-container border border-error/30 rounded-lg p-4 space-y-3"
      >
        <div>
          <p class="font-semibold">Unable to load entries</p>
          <p class="text-sm">{{ error }}</p>
        </div>
        <div class="flex justify-center">
          <AppButton variant="outlined" @click="handleRetryLoad">
            Try again
          </AppButton>
        </div>
      </div>

      <!-- Content -->
      <div v-else>
        <!-- Empty State -->
        <div
          v-if="filteredEntries.length === 0"
          class="text-center py-12"
        >
          <p class="text-on-surface-variant mb-4">
            {{ emptyStateMessage }}
          </p>
          <div class="flex flex-wrap justify-center gap-3">
            <AppButton
              variant="outlined"
              @click="router.push('/journal')"
            >
              Write in journal
            </AppButton>
            <AppButton
              variant="outlined"
              @click="router.push('/emotions')"
            >
              Log emotion
            </AppButton>
          </div>
        </div>

        <!-- Entries List -->
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <HistoryEntryCard
            v-for="entry in filteredEntries"
            :key="`${entry.type}-${entry.id}`"
            :entry="entry"
            :is-deleting="isDeleting && deletingEntryId === entry.id"
            @click="handleEntryClick(entry)"
            @delete="handleDeleteClick(entry)"
            @view-chats="handleViewChats(entry)"
          />
        </div>
      </div>
    </div>

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
            <div
              v-if="selectedEntryChatSessions.length === 0"
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
                @view="handleChatSessionView(selectedEntryForChats!.id, session.id)"
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

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import ChatSessionCard from '@/components/ChatSessionCard.vue'
import HistoryFilters from '@/components/history/HistoryFilters.vue'
import HistoryEntryCard from '@/components/history/HistoryEntryCard.vue'
import { useUnifiedEntries, type TypeFilter } from '@/composables/useUnifiedEntries'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { UnifiedEntry } from '@/domain/unifiedEntry'

const router = useRouter()
const route = useRoute()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const {
  typeFilter,
  dateRange,
  sortOrder,
  filteredEntries,
  isLoading,
  error,
  loadAllEntries,
  deleteEntry,
} = useUnifiedEntries()

// Delete state
const showDeleteDialog = ref(false)
const entryToDelete = ref<UnifiedEntry | null>(null)
const isDeleting = ref(false)
const deletingEntryId = ref<string | null>(null)

// Chat history state
const showChatHistoryDialog = ref(false)
const selectedEntryForChats = ref<UnifiedEntry | null>(null)

const selectedEntryChatSessions = computed(() => {
  return selectedEntryForChats.value?.chatSessions ?? []
})

const emptyStateMessage = computed(() => {
  if (typeFilter.value === 'journal') {
    return 'No journal entries found'
  }
  if (typeFilter.value === 'emotion-log') {
    return 'No emotion logs found'
  }
  return 'No entries yet'
})

function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

function handleEntryClick(entry: UnifiedEntry) {
  if (entry.type === 'journal') {
    router.push(`/journal/${entry.id}/edit`)
  } else {
    router.push(`/emotions/${entry.id}/edit`)
  }
}

function handleDeleteClick(entry: UnifiedEntry) {
  entryToDelete.value = entry
  showDeleteDialog.value = true
}

function handleDeleteCancel() {
  entryToDelete.value = null
}

async function handleDeleteConfirm() {
  if (!entryToDelete.value) return

  const entry = entryToDelete.value
  isDeleting.value = true
  deletingEntryId.value = entry.id

  try {
    await deleteEntry(entry)
    showSnackbar(
      entry.type === 'journal'
        ? 'Journal entry deleted successfully.'
        : 'Emotion log deleted successfully.'
    )
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to delete entry. Please try again.'
    showSnackbar(message)
    console.error('Error deleting entry:', err)
  } finally {
    isDeleting.value = false
    deletingEntryId.value = null
    entryToDelete.value = null
  }
}

function handleViewChats(entry: UnifiedEntry) {
  if (!entry.chatSessions || entry.chatSessions.length === 0) return
  selectedEntryForChats.value = entry
  showChatHistoryDialog.value = true
}

function handleChatSessionView(entryId: string, sessionId: string) {
  router.push({
    name: 'journal-chat',
    params: { id: entryId },
    query: { sessionId },
  })
}

async function handleRetryLoad() {
  await loadAllEntries()
  if (error.value) {
    showSnackbar(error.value)
  } else {
    showSnackbar('Entries reloaded.')
  }
}

// Handle URL query param for type filter
watch(
  () => route.query.type,
  (type) => {
    if (type === 'journal' || type === 'emotion-log') {
      typeFilter.value = type as TypeFilter
    }
  },
  { immediate: true }
)

onMounted(async () => {
  const loadPromises: Promise<unknown>[] = [loadAllEntries()]

  if (!emotionStore.isLoaded) {
    loadPromises.push(emotionStore.loadEmotions())
  }

  if (tagStore.peopleTags.length === 0) {
    loadPromises.push(tagStore.loadPeopleTags())
  }

  if (tagStore.contextTags.length === 0) {
    loadPromises.push(tagStore.loadContextTags())
  }

  await Promise.all(loadPromises)

  if (error.value) {
    showSnackbar(error.value)
  }
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
