<template>
  <div class="flex flex-col h-screen bg-background">
    <!-- Top App Bar -->
    <div class="flex items-center gap-4 px-4 py-3 border-b border-neu-border/30 bg-background">
      <AppButton
        variant="text"
        @click="handleBack"
        :aria-label="t('chat.goBack')"
        class="p-2"
      >
        <AppIcon name="arrow_back" class="text-xl" />
      </AppButton>
      <h1 class="text-xl font-medium text-on-surface flex-1">
        {{ chatTitle }}
      </h1>
      <!-- Action Buttons -->
      <div class="flex gap-2">
        <AppButton
          variant="filled"
          @click="handleSave"
          :disabled="!canSave || isSaving"
          :aria-label="t('chat.saveConversation')"
        >
          <span v-if="isSaving">{{ t('chat.saving') }}</span>
          <span v-else-if="isSaved">{{ t('chat.saved') }}</span>
          <span v-else>{{ t('chat.saveConversation') }}</span>
        </AppButton>
        <AppButton
          variant="text"
          @click="handleLeave"
          :aria-label="t('chat.leaveWithoutSaving')"
        >
          {{ t('chat.leaveWithoutSaving') }}
        </AppButton>
      </div>
    </div>

    <!-- Entry Context Display -->
    <div class="px-4 py-4 space-y-3">
      <p
        class="text-xs text-on-surface-variant"
        aria-label="Info about how this chat works"
      >
        {{ t('chat.disclaimer') }}
      </p>
      <AppCard v-if="isLoadingEntry" padding="md">
        <div class="animate-pulse space-y-3">
          <div class="h-6 bg-surface-variant rounded w-3/4"></div>
          <div class="h-4 bg-surface-variant rounded w-full"></div>
          <div class="h-4 bg-surface-variant rounded w-5/6"></div>
        </div>
      </AppCard>

      <AppCard v-else-if="entryError" padding="md">
        <div class="text-error space-y-2">
          <p class="font-semibold">{{ entryError }}</p>
          <AppButton variant="text" @click="handleBack" size="sm">
            {{ t('chat.goBack') }}
          </AppButton>
        </div>
      </AppCard>

      <AppCard v-else-if="entry" padding="md" class="space-y-4">
        <!-- Entry Title -->
        <h2 class="text-lg font-semibold text-on-surface">
          {{ entry.title || t('chat.untitledEntry') }}
        </h2>

        <!-- Emotions -->
        <div v-if="emotionNames.length > 0" class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('chat.emotions') }}
          </p>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="emotionName in emotionNames"
              :key="emotionName"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-soft text-primary text-xs font-medium"
            >
              {{ emotionName }}
            </span>
          </div>
        </div>

        <!-- Tags -->
        <div v-if="peopleTagNames.length > 0 || contextTagNames.length > 0" class="space-y-3">
          <!-- People Tags -->
          <div v-if="peopleTagNames.length > 0" class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('chat.people') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tagName in peopleTagNames"
                :key="`people-${tagName}`"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-chip border border-chip-border text-chip-text text-xs font-medium"
              >
                {{ tagName }}
              </span>
            </div>
          </div>

          <!-- Context Tags -->
          <div v-if="contextTagNames.length > 0" class="space-y-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('chat.context') }}
            </p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="tagName in contextTagNames"
                :key="`context-${tagName}`"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full bg-chip border border-chip-border text-chip-text text-xs font-medium"
              >
                {{ tagName }}
              </span>
            </div>
          </div>
        </div>

        <!-- Entry Body Preview -->
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {{ t('chat.preview') }}
          </p>
          <p class="text-sm text-on-surface-variant line-clamp-3">
            {{ entryBodyPreview }}
          </p>
        </div>
      </AppCard>
    </div>

    <!-- Message Area -->
    <div
      ref="messageContainer"
      class="flex-1 overflow-y-auto px-4 py-2 space-y-4"
      role="log"
      aria-label="Chat messages"
    >
      <div v-if="!hasMessages" class="text-center text-on-surface-variant py-8">
        <p>{{ t('chat.startConversation') }}</p>
      </div>

      <!-- Messages -->
      <div
        v-for="(message, index) in messages"
        :key="`${message.timestamp}-${index}`"
        :class="[
          'flex',
          message.role === 'user' ? 'justify-end' : 'justify-start',
        ]"
      >
        <div
          :class="[
            'max-w-[80%] rounded-lg px-4 py-2',
            message.role === 'user'
              ? 'bg-gradient-to-br from-primary to-primary-strong text-on-primary'
              : 'bg-surface-variant text-on-surface-variant',
          ]"
        >
          <p class="whitespace-pre-wrap break-words">{{ message.content }}</p>
          <p class="text-xs mt-1 opacity-70">
            {{ formatMessageTimestamp(message.timestamp) }}
          </p>
        </div>
      </div>

      <!-- Loading Indicator -->
      <div v-if="isLoading" class="flex justify-start">
        <div
          class="max-w-[80%] rounded-lg px-4 py-2 bg-surface-variant text-on-surface-variant"
        >
          <div class="flex items-center gap-2">
            <div
              class="animate-spin w-4 h-4 border-2 border-on-surface-variant border-t-transparent rounded-full"
            ></div>
            <span>{{ t('chat.aiThinking') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="border-t border-neu-border/30 p-4 bg-background">
      <div class="flex gap-2 items-end">
        <textarea
          ref="messageInputRef"
          v-model="messageInput"
          :placeholder="t('chat.placeholder')"
          :disabled="isLoading"
          class="neo-input flex-1 p-3 resize-none min-h-[44px] max-h-[120px] disabled:opacity-60 disabled:cursor-not-allowed"
          rows="1"
          @keydown.enter.exact.prevent="handleSend"
          @input="handleTextareaInput"
        />
        <AppButton
          variant="filled"
          @click="handleSend"
          :disabled="!canSend"
          :aria-label="t('chat.send')"
          class="min-w-[80px]"
        >
          <span v-if="isLoading">{{ t('chat.sending') }}</span>
          <span v-else>{{ t('chat.send') }}</span>
        </AppButton>
      </div>
    </div>

    <!-- Error Snackbar -->
    <AppSnackbar ref="snackbarRef" />

    <!-- Discard Confirmation Dialog -->
    <AppDialog
      v-model="showDiscardDialog"
      :title="t('chat.discardTitle')"
      :message="t('chat.discardMessage')"
      :confirm-text="t('chat.discardConfirm')"
      :cancel-text="t('chat.discardCancel')"
      confirm-variant="filled"
      @confirm="handleDiscard"
      @cancel="handleDiscardCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useChatStore } from '@/stores/chat.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { JournalEntry } from '@/domain/journal'
import type { ChatIntention } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import { formatMessageTimestamp } from '@/utils/dateFormat'
import { useT } from '@/composables/useT'

const route = useRoute()
const router = useRouter()
const chatStore = useChatStore()
const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const { t } = useT()

// Use storeToRefs to maintain reactivity
const { currentChatSession, isLoading, isSaving, error } = storeToRefs(chatStore)

const entryId = computed(() => route.params.id as string)
const sessionIdFromRoute = computed(() => route.query.sessionId as string | undefined)
const entry = ref<JournalEntry | null>(null)
const isLoadingEntry = ref(false)
const entryError = ref<string | null>(null)
const messageInput = ref('')
const messageInputRef = ref<HTMLTextAreaElement | null>(null)
const messageContainer = ref<HTMLDivElement | null>(null)
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const showDiscardDialog = ref(false)
let pendingNavigation: (() => void) | null = null

// Intention label mapping (matching JournalEditorView)
const intentionLabels = computed<Record<ChatIntention, string>>(() => ({
  [CHAT_INTENTIONS.REFLECT]: t('chat.intentions.reflect'),
  [CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY]: t('chat.intentions.helpSeeDifferently'),
  [CHAT_INTENTIONS.PROACTIVE]: t('chat.intentions.proactive'),
  [CHAT_INTENTIONS.THINKING_TRAPS]: t('chat.intentions.thinkingTraps'),
  [CHAT_INTENTIONS.CUSTOM]: t('chat.intentions.custom'),
}))

const chatTitle = computed(() => {
  if (!currentChatSession.value) {
    return t('chat.title')
  }
  const intention = currentChatSession.value.intention
  const label = intentionLabels.value[intention] || intention
  return t('chat.titleWithIntention', { label })
})

const emotionNames = computed(() => {
  if (!entry.value?.emotionIds || entry.value.emotionIds.length === 0) {
    return []
  }
  return entry.value.emotionIds
    .map((id) => emotionStore.getEmotionById(id)?.name)
    .filter((name): name is string => Boolean(name))
})

const peopleTagNames = computed(() => {
  if (!entry.value?.peopleTagIds || entry.value.peopleTagIds.length === 0) {
    return []
  }
  return entry.value.peopleTagIds
    .map((id) => tagStore.getPeopleTagById(id)?.name)
    .filter((name): name is string => Boolean(name))
})

const contextTagNames = computed(() => {
  if (!entry.value?.contextTagIds || entry.value.contextTagIds.length === 0) {
    return []
  }
  return entry.value.contextTagIds
    .map((id) => tagStore.getContextTagById(id)?.name)
    .filter((name): name is string => Boolean(name))
})

const entryBodyPreview = computed(() => {
  if (!entry.value?.body) {
    return ''
  }
  const maxLength = 150
  if (entry.value.body.length <= maxLength) {
    return entry.value.body
  }
  return entry.value.body.substring(0, maxLength) + '...'
})

const messages = computed(() => {
  return currentChatSession.value?.messages || []
})

const hasMessages = computed(() => {
  return messages.value.length > 0
})

const canSend = computed(() => {
  return messageInput.value.trim().length > 0 && !isLoading.value && !isHistoricalView.value
})

// Save/discard computed properties
const isHistoricalView = computed(() => {
  return !!sessionIdFromRoute.value
})
const isSaved = computed(() => {
  const session = currentChatSession.value
  if (!session || !entry.value?.chatSessions) return false
  return entry.value.chatSessions.some((cs) => cs.id === session.id)
})

const canSave = computed(() => {
  if (!currentChatSession.value || isSaving.value || isSaved.value) return false
  if (isHistoricalView.value) return false
  const messages = currentChatSession.value.messages
  const hasUser = messages.some((m) => m.role === 'user')
  const hasAssistant = messages.some((m) => m.role === 'assistant')
  return hasUser && hasAssistant
})

const hasUnsavedMessages = computed(() => {
  return !isHistoricalView.value && canSave.value && !isSaved.value
})

async function loadEntry() {
  isLoadingEntry.value = true
  entryError.value = null

  try {
    const loadedEntry = await journalStore.getEntryById(entryId.value)
    if (!loadedEntry) {
      entryError.value = t('chat.entryNotFound')
      return
    }
    entry.value = loadedEntry
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : t('chat.loadEntryError')
    entryError.value = errorMessage
    console.error('Error loading journal entry:', error)
  } finally {
    isLoadingEntry.value = false
  }
}

function handleBack() {
  // Navigate back to journal editor if entry exists, otherwise to journal list
  if (entry.value) {
    router.push(`/journal/${entryId.value}/edit`)
  } else {
    router.push('/journal')
  }
}

async function handleSave() {
  if (isHistoricalView.value) return
  if (!canSave.value) return

  try {
    await chatStore.saveChatSession()
    if (snackbarRef.value) {
      snackbarRef.value.show(t('chat.savedSuccess'))
    }
    await router.push(`/journal/${entryId.value}/edit`)
  } catch (err) {
    // Error is already set in chat store and displayed via watcher
    // Show additional error feedback if needed
    if (snackbarRef.value && error.value) {
      snackbarRef.value.show(error.value)
    }
    console.error('Error saving conversation:', err)
  }
}

function handleLeave() {
  if (isHistoricalView.value) {
    handleBack()
    return
  }
  if (hasUnsavedMessages.value) {
    showDiscardDialog.value = true
  } else {
    handleDiscard()
  }
}

function handleDiscardCancel() {
  showDiscardDialog.value = false
  // Clear pending navigation if user cancels
  pendingNavigation = null
}

async function handleDiscard() {
  chatStore.discardChatSession()
  showDiscardDialog.value = false
  
  // If there's a pending navigation, execute it
  if (pendingNavigation) {
    pendingNavigation()
    pendingNavigation = null
  } else {
    // Otherwise navigate normally
    if (entry.value) {
      await router.push(`/journal/${entryId.value}/edit`)
    } else {
      await router.push('/journal')
    }
  }
}

async function handleSend() {
  const text = messageInput.value.trim()
  if (!text || isLoading.value || isHistoricalView.value) return

  try {
    await chatStore.sendMessage(text)
    messageInput.value = ''
    // Reset textarea height
    if (messageInputRef.value) {
      messageInputRef.value.style.height = 'auto'
    }
    await nextTick()
    scrollToBottom()
    messageInputRef.value?.focus()
  } catch (err) {
    // Error is handled by chat store, message remains in input
    console.error('Error sending message:', err)
  }
}

function handleTextareaInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement
  // Auto-resize textarea
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
}

function scrollToBottom() {
  if (messageContainer.value) {
    // Check if user is near bottom (within 50px)
    const { scrollTop, scrollHeight, clientHeight } = messageContainer.value
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50

    if (isNearBottom) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  }
}

// Watch for new messages and auto-scroll
watch(messages, async () => {
  await nextTick()
  scrollToBottom()
}, { deep: true })

// Watch for loading state changes and auto-scroll
watch(isLoading, async (newValue) => {
  if (newValue) {
    await nextTick()
    scrollToBottom()
  }
})

// Watch for error state and display via snackbar
watch(error, (newError) => {
  if (newError) {
    nextTick(() => {
      if (snackbarRef.value) {
        snackbarRef.value.show(newError)
      }
    })
  }
})

// Clear error when user starts typing
watch(messageInput, () => {
  if (error.value) {
    error.value = null
  }
})

// Navigation guard for unsaved messages
onBeforeRouteLeave((to, from, next) => {
  void to
  void from
  if (hasUnsavedMessages.value) {
    // Store the navigation callback
    pendingNavigation = () => next()
    // Show confirmation dialog
    showDiscardDialog.value = true
    // Don't call next() yet - wait for user confirmation
  } else {
    // No unsaved messages, allow navigation
    next()
  }
})

onMounted(async () => {
  const sessionId = sessionIdFromRoute.value

  if (sessionId) {
    // Historical view: load an existing saved session
    try {
      const loadedSession = await chatStore.loadChatSession(
        entryId.value,
        sessionId
      )

      if (!loadedSession) {
        // Session not found
        if (snackbarRef.value) {
          snackbarRef.value.show(t('chat.sessionNotFound'))
        }
        router.push(`/journal/${entryId.value}/edit`)
        return
      }
    } catch {
      // Error is already handled in the store; navigate back to editor
      router.push(`/journal/${entryId.value}/edit`)
      return
    }
  } else {
    // Live chat view: require an in-memory session
    if (!currentChatSession.value) {
      router.push(`/journal/${entryId.value}/edit`)
      return
    }
  }

  // Load journal entry
  await loadEntry()

  // Auto-focus input only for live chat (not historical view)
  await nextTick()
  if (!isHistoricalView.value) {
    messageInputRef.value?.focus()
  }

  // Scroll to bottom if there are existing messages
  if (hasMessages.value) {
    await nextTick()
    scrollToBottom()
  }
})
</script>
