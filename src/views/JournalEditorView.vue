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
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${emotion.name} from selection`"
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
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
            >
              Loading emotions...
            </div>
            <div v-else class="pt-1">
              <EmotionSelector v-model="selectedEmotionIds" :show-selected-section="false" />
            </div>
          </section>

          <!-- People Tags Section -->
          <section
            class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
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
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${tag.name} from selection`"
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
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
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
            class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
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
                    class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary text-on-primary text-[0.7rem] font-medium focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background transition-all duration-200 active:scale-[0.95]"
                    :aria-label="`Remove ${tag.name} from selection`"
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
              class="rounded-xl border border-dashed border-outline/40 bg-surface p-3 text-center text-xs text-on-surface-variant"
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

      <!-- Chat sessions section (edit mode only) -->
      <section
        v-if="isEditMode && hasChatSessions"
        class="rounded-3xl border border-outline/30 bg-section px-5 py-4 shadow-elevation-2 flex flex-col gap-4"
      >
        <header class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Chat Sessions
            </p>
            <p class="text-sm text-on-surface-variant">
              {{ chatSessionsForEntry.length }} conversation{{ chatSessionsForEntry.length > 1 ? 's' : '' }}
            </p>
          </div>
        </header>
        <div class="space-y-3">
          <ChatSessionCard
            v-for="session in chatSessionsForEntry"
            :key="session.id"
            :chat-session="session"
            @view="handleViewChatSession(session.id)"
            @delete="() => { chatSessionToDelete = session; showDeleteChatDialog = true }"
          />
        </div>
      </section>

      <!-- Bottom Action Bar -->
      <div
        class="sticky bottom-0 left-0 right-0 bg-background border-t border-outline/30 flex justify-end gap-3 px-2 sm:px-4 py-4"
      >
        <!-- Chat Button with Dropdown -->
        <div v-if="!isLoading" class="relative" ref="chatDropdownContainerRef">
          <AppButton
            variant="text"
            @click="openChatDropdown"
            :disabled="!canStartChat"
            aria-label="Start chat about this entry"
          >
            {{ isStartingChat ? 'Starting...' : 'Chat' }}
          </AppButton>

          <!-- Dropdown Menu -->
          <div
            v-if="showChatDropdown"
            class="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-outline/30 bg-surface shadow-elevation-3 p-2 z-50"
            role="menu"
            aria-label="Choose what you’d like help with for this entry"
            @click.stop
          >
            <p class="px-4 py-2 text-xs text-on-surface-variant">
              Choose what you’d like help with for this entry.
            </p>
            <button
              v-for="option in chatIntentionOptions"
              :key="option.value"
              @click="handleIntentionSelection(option.value)"
              class="w-full text-left px-4 py-3 rounded-lg hover:bg-surface-variant transition-colors focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2"
              role="menuitem"
            >
              <div class="font-medium text-on-surface">{{ option.label }}</div>
              <div class="text-sm text-on-surface-variant">{{ option.description }}</div>
            </button>
          </div>
        </div>

        <AppButton
          variant="text"
          @click="handleCancel"
          :disabled="isSaving || isStartingChat"
        >
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

    <!-- Delete Chat Session Dialog -->
    <AppDialog
      v-model="showDeleteChatDialog"
      title="Delete chat session?"
      message="Are you sure you want to delete this conversation? This action cannot be undone."
      confirm-text="Delete"
      cancel-text="Cancel"
      confirm-variant="tonal"
      @confirm="handleConfirmDeleteChatSession"
      @cancel="handleCancelDeleteChatSession"
    />

    <!-- Custom Prompt Dialog -->
    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="showCustomPromptDialog"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @click.self="closeCustomPromptDialog"
        >
          <!-- Backdrop -->
          <div class="fixed inset-0 bg-black/50" aria-hidden="true"></div>

          <!-- Dialog Card -->
          <div
            ref="customPromptDialogRef"
            role="dialog"
            aria-labelledby="custom-prompt-title"
            class="relative z-10 bg-surface rounded-xl shadow-elevation-3 p-6 max-w-md w-full mx-4 border border-outline/20"
          >
            <!-- Title -->
            <h2 id="custom-prompt-title" class="text-xl font-semibold text-on-surface mb-4">
              Custom Chat Prompt
            </h2>

            <!-- Textarea -->
            <label for="custom-prompt-input" class="sr-only">Enter your custom prompt</label>
            <textarea
              id="custom-prompt-input"
              v-model="customPromptInput"
              placeholder="E.g., Help me understand why I feel anxious about this situation..."
              class="w-full min-h-[120px] p-3 border border-outline/30 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 resize-y"
            />

            <!-- Actions -->
            <div class="flex gap-3 justify-end mt-6">
              <AppButton variant="text" @click="closeCustomPromptDialog">Cancel</AppButton>
              <AppButton
                variant="filled"
                @click="handleCustomPromptConfirm"
                :disabled="!customPromptInput.trim()"
              >
                Start Chat
              </AppButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import EmotionSelector from '@/components/EmotionSelector.vue'
import TagInput from '@/components/TagInput.vue'
import ChatSessionCard from '@/components/ChatSessionCard.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { useChatStore } from '@/stores/chat.store'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { formatEntryDate } from '@/utils/dateFormat'
import type { JournalEntry } from '@/domain/journal'
import type { Emotion } from '@/domain/emotion'
import type { ChatIntention, ChatSession } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import { XMarkIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const route = useRoute()
const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const chatStore = useChatStore()
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
const showChatDropdown = ref(false)
const isStartingChat = ref(false)
const showCustomPromptDialog = ref(false)
const customPromptInput = ref('')
const chatDropdownContainerRef = ref<HTMLElement | null>(null)
const customPromptDialogRef = ref<HTMLElement | null>(null)
const showDeleteChatDialog = ref(false)
const chatSessionToDelete = ref<ChatSession | null>(null)

// Detect if we're in edit mode (has id param) or create mode
const isEditMode = computed(() => {
  return !!route.params.id && typeof route.params.id === 'string'
})

const isEmotionSectionLoading = computed(() => {
  return isEmotionDataLoading.value || !emotionStore.isLoaded
})

const canSaveEntry = computed(() => {
  return body.value.trim().length > 0 && !isSaving.value && !isStartingChat.value
})

const canStartChat = computed(() => {
  return body.value.trim().length > 0 && !isSaving.value && !isStartingChat.value
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

const hasChatSessions = computed(() => {
  return (
    !!currentEntry.value &&
    Array.isArray(currentEntry.value.chatSessions) &&
    currentEntry.value.chatSessions.length > 0
  )
})

const chatSessionsForEntry = computed(() => {
  return currentEntry.value?.chatSessions ?? []
})

// Chat intention options for dropdown
const chatIntentionOptions = [
  {
    value: CHAT_INTENTIONS.REFLECT,
    label: 'Reflect',
    description: 'Explore deeper meanings and patterns',
  },
  {
    value: CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
    label: 'Help see differently',
    description: 'Consider alternative perspectives',
  },
  {
    value: CHAT_INTENTIONS.PROACTIVE,
    label: 'Help to be proactive',
    description: 'Identify actionable steps',
  },
  {
    value: CHAT_INTENTIONS.THINKING_TRAPS,
    label: 'Thinking traps',
    description: 'Identify cognitive distortions',
  },
  {
    value: CHAT_INTENTIONS.CUSTOM,
    label: 'Custom',
    description: 'Use your own prompt',
  },
] as const

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

/**
 * Extracted save logic that can be reused by both Save and Chat flows.
 * Validates, constructs payload, and saves the entry (create or update).
 * Returns the saved entry with ID.
 */
const saveEntry = async (): Promise<JournalEntry> => {
  // Validation: body must not be empty
  if (!body.value.trim()) {
    throw new Error('Please enter some content for your journal entry.')
  }

  const payload = {
    title: title.value.trim() || undefined,
    body: body.value.trim(),
    emotionIds: [...selectedEmotionIds.value],
    peopleTagIds: [...selectedPeopleTagIds.value],
    contextTagIds: [...selectedContextTagIds.value],
  }

  if (isEditMode.value && currentEntry.value) {
    // Edit mode: update existing entry
    return await journalStore.updateEntry({
      ...currentEntry.value,
      ...payload,
    })
  } else {
    // Create mode: create new entry
    return await journalStore.createEntry(payload)
  }
}

const handleSave = async () => {
  isSaving.value = true

  try {
    await saveEntry()
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

// Chat dropdown functions
const openChatDropdown = () => {
  showChatDropdown.value = true
}

const closeChatDropdown = () => {
  showChatDropdown.value = false
}

// Custom prompt dialog functions
const closeCustomPromptDialog = () => {
  showCustomPromptDialog.value = false
  customPromptInput.value = ''
}

// Intention selection handler
const handleIntentionSelection = async (intention: ChatIntention) => {
  closeChatDropdown()

  if (intention === CHAT_INTENTIONS.CUSTOM) {
    showCustomPromptDialog.value = true
  } else {
    await startChat(intention)
  }
}

// Custom prompt confirmation
const handleCustomPromptConfirm = async () => {
  if (!customPromptInput.value.trim()) {
    snackbarRef.value?.show('Please enter a custom prompt.')
    return
  }

  const prompt = customPromptInput.value.trim()
  closeCustomPromptDialog()
  await startChat(CHAT_INTENTIONS.CUSTOM, prompt)
}

// Start chat flow: save entry and navigate to chat view
const startChat = async (intention: ChatIntention, customPrompt?: string) => {
  // Validation: body must not be empty
  if (!body.value.trim()) {
    snackbarRef.value?.show('Please enter some content before starting a chat.')
    return
  }

  isStartingChat.value = true

  try {
    // Save entry first
    const savedEntry = await saveEntry()

    // Start chat session
    await chatStore.startChatSession(savedEntry.id, intention, customPrompt)

    // Navigate to chat view
    router.push(`/journal/${savedEntry.id}/chat`)
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to start chat. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error starting chat:', error)
  } finally {
    isStartingChat.value = false
  }
}

// Chat session view/delete handlers
const handleViewChatSession = (sessionId: string) => {
  if (!currentEntry.value) return
  router.push({
    name: 'journal-chat',
    params: { id: currentEntry.value.id },
    query: { sessionId },
  })
}

const handleConfirmDeleteChatSession = async () => {
  if (!currentEntry.value || !chatSessionToDelete.value) return

  try {
    await chatStore.deleteChatSession(
      currentEntry.value.id,
      chatSessionToDelete.value.id
    )
    const updatedEntry = await journalStore.getEntryById(currentEntry.value.id)
    if (updatedEntry) {
      currentEntry.value = updatedEntry
    }
    snackbarRef.value?.show('Chat session deleted')
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to delete chat session. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error deleting chat session:', error)
  } finally {
    showDeleteChatDialog.value = false
    chatSessionToDelete.value = null
  }
}

const handleCancelDeleteChatSession = () => {
  showDeleteChatDialog.value = false
  chatSessionToDelete.value = null
}

// Click outside handler for dropdown
const handleClickOutside = (event: MouseEvent) => {
  if (
    showChatDropdown.value &&
    chatDropdownContainerRef.value &&
    !chatDropdownContainerRef.value.contains(event.target as Node)
  ) {
    closeChatDropdown()
  }
}

// Escape key handler for dropdown
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showChatDropdown.value) {
      closeChatDropdown()
    }
    if (showCustomPromptDialog.value) {
      closeCustomPromptDialog()
    }
  }
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

  // Add event listeners for dropdown
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('keydown', handleEscapeKey)
})

onUnmounted(() => {
  // Clean up event listeners
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscapeKey)
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
