<template>
  <div class="mg-design-v2 journal-v2 container mx-auto px-4 py-6 flex flex-col gap-4 min-h-screen">
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center min-h-[200px]">
      <p class="text-on-surface-variant">{{ t('journal.editor.loadingEntry') }}</p>
    </div>

    <!-- Editor Content -->
    <template v-else>
      <details v-if="!isEditMode && savedDrafts.length" class="mg-v2-surface p-3">
        <summary>Zachowane szkice ({{ savedDrafts.length }})</summary>
        <div
          v-for="savedDraft in savedDrafts"
          :key="savedDraft.id"
          class="flex flex-wrap gap-2 py-2"
        >
          <button
            type="button"
            class="mg-v2-button mg-v2-button--quiet"
            @click="resumeDraft(savedDraft.id)"
          >
            {{
              savedDraft.content.title ||
              savedDraft.content.body.slice(0, 60) ||
              'Rozmowa przy pustym szkicu'
            }}
          </button>
          <button
            type="button"
            class="mg-v2-button mg-v2-button--quiet"
            @click="removeDraft(savedDraft.id)"
          >
            Usuń szkic
          </button>
        </div>
      </details>
      <p v-if="draftError" role="alert">{{ draftError }}</p>
      <!-- Rząd nagłówka: data po lewej, przełącznik sekcji panelu po prawej
           (wariant D z Labu, 2026-10-27: żaden rząd panelu nie idzie na przełącznik). -->
      <div class="flex items-center justify-between gap-3">
        <button
          type="button"
          class="text-xs uppercase tracking-wide text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
          @click="showDateTimePicker = true"
          :aria-label="t('journal.editor.editDateTimeLabel')"
        >
          <AppIcon name="calendar_today" class="text-base" />
          <span>{{ formattedTimestamp }}</span>
          <AppIcon name="edit_note" class="text-sm opacity-60" />
        </button>
        <DsSegmentedControl
          v-model="sideSection"
          :label="t('journal.editor.sectionsLabel')"
          :options="sideSectionOptions"
          class="journal-v2__sections"
        />
      </div>

      <!-- Date/Time Picker Modal -->
      <Teleport to="body">
        <Transition name="dialog">
          <div
            v-if="showDateTimePicker"
            class="mg-design-v2 mg-v2-overlay"
            @click.self="showDateTimePicker = false"
          >
            <div class="mg-v2-overlay__scrim" aria-hidden="true"></div>
            <div
              class="dialog-panel mg-v2-surface mg-v2-surface--raised relative z-10 p-6 max-w-sm w-full mx-4"
              role="dialog"
              aria-modal="true"
            >
              <h2 class="text-lg font-semibold text-on-surface mb-4">
                {{ t('journal.editor.setDateTime') }}
              </h2>
              <div class="space-y-4">
                <div>
                  <label
                    for="entry-date"
                    class="block text-sm font-medium text-on-surface-variant mb-1"
                  >
                    {{ t('journal.editor.date') }}
                  </label>
                  <input
                    id="entry-date"
                    type="date"
                    v-model="selectedDate"
                    class="mg-v2-field w-full text-on-surface"
                  />
                </div>
                <div>
                  <label
                    for="entry-time"
                    class="block text-sm font-medium text-on-surface-variant mb-1"
                  >
                    {{ t('journal.editor.time') }}
                  </label>
                  <input
                    id="entry-time"
                    type="time"
                    v-model="selectedTime"
                    class="mg-v2-field w-full text-on-surface"
                  />
                </div>
              </div>
              <div class="flex gap-3 justify-end mt-6">
                <DsButton variant="quiet" @click="showDateTimePicker = false">{{
                  t('common.buttons.cancel')
                }}</DsButton>
                <DsButton @click="applyDateTime">{{ t('journal.editor.apply') }}</DsButton>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- Main Editor Grid: pisanie (bohater) po lewej, zwijany panel boczny
           (picker emocji + tagi) po prawej — chevron w środkowej kolumnie -->
      <div
        :class="[
          'grid grid-cols-1 gap-4 md:items-stretch md:gap-2 min-h-[60vh] md:min-h-0 md:h-[78vh]',
          'md:transition-[grid-template-columns] md:duration-500 md:ease-[cubic-bezier(0.22,1,0.36,1)]',
          isSidePanelOpen ? 'md:grid-cols-[3fr_auto_2fr]' : 'md:grid-cols-[1fr_auto_0fr]',
        ]"
      >
        <!-- Left: Title + Body textarea (full height) -->
        <section class="mg-v2-surface mg-v2-surface--raised-sm p-3 flex flex-col min-h-0">
          <div class="mg-v2-editor-canvas flex flex-1 flex-col gap-4 px-6 py-5 min-h-0">
            <label for="title" class="sr-only">{{ t('journal.editor.titleLabel') }}</label>
            <input
              id="title"
              v-model="title"
              type="text"
              :placeholder="t('journal.editor.titlePlaceholder')"
              class="w-full bg-transparent text-2xl font-semibold text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0"
            />

            <label for="body" class="sr-only">{{ t('journal.editor.bodyLabel') }}</label>
            <textarea
              id="body"
              v-model="body"
              :placeholder="t('journal.editor.bodyPlaceholder')"
              class="w-full flex-1 bg-transparent text-base leading-relaxed text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-0 resize-none min-h-[240px]"
            />
            <!-- Jedyna wypełniona kontrolka w widoku, tuż za treścią. Wyjście = strzałka
                 wstecz powłoki (pyta o niezapisane zmiany). -->
            <div class="journal-v2__canvas-foot">
              <DsButton @click="handleSave" :disabled="!canSaveEntry" class="min-w-[140px]">
                {{ isSaving ? t('common.saving') : t('common.buttons.save') }}
              </DsButton>
            </div>
          </div>
        </section>

        <!-- Side panel toggle (desktop only) -->
        <div class="hidden md:flex items-center justify-center">
          <button
            type="button"
            class="mg-v2-button mg-v2-button--icon mg-v2-button--quiet flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant/70 hover:-translate-y-px hover:text-on-surface transition-all duration-200"
            :aria-label="
              isSidePanelOpen
                ? t('journal.editor.collapseSidePanel')
                : t('journal.editor.expandSidePanel')
            "
            :aria-expanded="isSidePanelOpen"
            @click="toggleSidePanel"
          >
            <AppIcon
              name="chevron_right"
              :class="[
                'text-sm transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
                isSidePanelOpen ? '' : 'rotate-180',
              ]"
            />
          </button>
        </div>

        <!-- Right: zwijany panel — picker emocji + tagi. Paddingi dają miejsce cieniom
             wewnątrz scrollportu (overflow-y-auto inaczej by je przycinał); pr-4/-mr-4
             znosi się nawzajem, więc karty sięgają krawędzi kontenera i prawy margines
             strony jest równy lewemu. -->
        <aside
          :class="[
            'journal-aside flex flex-col gap-4 min-h-0 md:min-w-0 md:overflow-x-hidden md:overflow-y-auto md:py-4 md:pl-5 md:pr-4 md:-mr-4',
            'md:transition md:duration-500 md:ease-[cubic-bezier(0.22,1,0.36,1)]',
            isSidePanelOpen
              ? 'md:opacity-100 md:translate-x-0'
              : 'md:opacity-0 md:translate-x-4 md:pointer-events-none',
          ]"
        >
          <ReflectionCompanionPanel
            v-if="sideSection === 'ai' && draftReady"
            ref="companionPanel"
            :key="companionId + ':' + companionDay"
            surface="journal"
            :conversation-id="companionId"
            :journal-entry-id="currentEntry?.id"
            :period-ref="companionDay"
            :draft="body"
            :ritual-context="companionEntryContext"
            @insert="insertCompanionText"
          >
            <!-- Drugie wejście do AI mieszka przy pierwszym: osobny czat z intencją. -->
            <template #intro>
              <div class="journal-v2__chat-entry">
                <!-- Chmura, nie wypełnienie: jedyna wypełniona kontrolka widoku to „Zapisz”. -->
                <button
                  type="button"
                  class="mg-v2-button"
                  :disabled="!canStartChat"
                  :aria-label="t('journal.editor.startChatLabel')"
                  :aria-expanded="showChatIntents"
                  @click="showChatIntents = !showChatIntents"
                >
                  <AppIcon name="forum" />
                  {{
                    isStartingChat ? t('journal.editor.starting') : t('journal.editor.chatSeparate')
                  }}
                </button>
                <div
                  v-if="showChatIntents"
                  class="journal-v2__chat-intents"
                  role="group"
                  :aria-label="t('journal.editor.chatDropdownPrompt')"
                >
                  <button
                    v-for="option in chatIntentionOptions"
                    :key="option.value"
                    type="button"
                    class="mg-v2-pill"
                    :title="option.description"
                    @click="handleIntentionSelection(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </template>
          </ReflectionCompanionPanel>
          <div v-show="sideSection === 'emotions'" class="flex flex-col gap-4">
            <section
              class="mg-v2-surface mg-v2-surface--raised-sm px-5 py-4 flex flex-col gap-3"
              :style="emotionCardStyle"
            >
              <div
                v-if="isEmotionSectionLoading"
                class="journal-v2__placeholder p-3 text-center text-xs text-on-surface-variant"
              >
                {{ t('journal.editor.loadingEmotions') }}
              </div>
              <div v-else class="pt-1">
                <EmotionGroupPicker
                  :label="t('journal.editor.emotions')"
                  v-model="wheelSelections"
                  v-model:quadrant="activeEmotionQuadrant"
                />
              </div>
            </section>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Context Tags Section -->
              <section class="mg-v2-surface mg-v2-surface--raised-sm px-5 py-4 flex flex-col gap-3">
                <header>
                  <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {{ t('journal.editor.context') }}
                  </p>
                </header>
                <div
                  v-if="areContextTagsLoading"
                  class="journal-v2__placeholder p-3 text-center text-xs text-on-surface-variant"
                >
                  {{ t('journal.editor.loadingContext') }}
                </div>
                <div v-else class="pt-1">
                  <TagInput v-model="selectedContextTagIds" tag-type="context" :visible-limit="6" />
                </div>
              </section>

              <!-- People Tags Section -->
              <section class="mg-v2-surface mg-v2-surface--raised-sm px-5 py-4 flex flex-col gap-3">
                <header>
                  <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {{ t('journal.editor.people') }}
                  </p>
                </header>
                <div
                  v-if="arePeopleTagsLoading"
                  class="journal-v2__placeholder p-3 text-center text-xs text-on-surface-variant"
                >
                  {{ t('journal.editor.loadingPeople') }}
                </div>
                <div v-else class="pt-1">
                  <TagInput v-model="selectedPeopleTagIds" tag-type="people" :visible-limit="6" />
                </div>
              </section>
            </div>
          </div>
        </aside>
      </div>

      <!-- Chat sessions section (edit mode only) -->
      <section
        v-if="isEditMode && hasChatSessions"
        class="mg-v2-surface mg-v2-surface--raised-sm px-5 py-4 flex flex-col gap-4"
      >
        <header class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              {{ t('journal.editor.chatSessions') }}
            </p>
            <p class="text-sm text-on-surface-variant">
              {{
                t(
                  chatSessionsForEntry.length === 1
                    ? 'journal.editor.conversationCount'
                    : 'journal.editor.conversationsCount',
                  { count: chatSessionsForEntry.length }
                )
              }}
            </p>
          </div>
        </header>
        <div class="space-y-3">
          <ChatSessionCard
            v-for="session in chatSessionsForEntry"
            :key="session.id"
            :chat-session="session"
            :show-actions="true"
            @view="handleViewChatSession(session.id)"
            @delete="
              () => {
                chatSessionToDelete = session
                showDeleteChatDialog = true
              }
            "
          />
        </div>
      </section>
    </template>

    <!-- Snackbar for error messages -->
    <AppSnackbar ref="snackbarRef" />

    <!-- Delete Chat Session Dialog -->
    <AppDialog
      v-model="showDeleteChatDialog"
      :title="t('journal.editor.deleteChatTitle')"
      :message="t('journal.editor.deleteChatMessage')"
      :confirm-text="t('common.buttons.delete')"
      :cancel-text="t('common.buttons.cancel')"
      confirm-variant="tonal"
      panel-class="mg-v2-surface mg-v2-surface--raised"
      @confirm="handleConfirmDeleteChatSession"
      @cancel="handleCancelDeleteChatSession"
    />

    <!-- Wyjście z niezapisanymi zmianami: szkic (nowy wpis) albo zmiany (edycja). -->
    <AppDialog
      v-model="showLeaveDialog"
      :title="t('journal.editor.leaveTitle')"
      size="lg"
      panel-class="mg-v2-surface mg-v2-surface--raised"
      @cancel="stayWriting"
    >
      <p class="text-sm text-on-surface-variant mb-6">
        {{
          isEditMode ? t('journal.editor.leaveEditMessage') : t('journal.editor.leaveDraftMessage')
        }}
      </p>
      <div class="flex gap-3 justify-end">
        <DsButton variant="quiet" @click="stayWriting">
          {{ t('journal.editor.stayWriting') }}
        </DsButton>
        <DsButton variant="quiet" @click="discardAndLeave">
          {{ isEditMode ? t('journal.editor.discardChanges') : t('journal.editor.discardDraft') }}
        </DsButton>
        <DsButton @click="keepAndLeave">
          {{ isEditMode ? t('journal.editor.saveChanges') : t('journal.editor.keepDraft') }}
        </DsButton>
      </div>
    </AppDialog>

    <!-- Custom Prompt Dialog -->
    <Teleport to="body">
      <Transition name="dialog">
        <div
          v-if="showCustomPromptDialog"
          class="mg-design-v2 mg-v2-overlay"
          @click.self="closeCustomPromptDialog"
        >
          <!-- Backdrop -->
          <div class="mg-v2-overlay__scrim" aria-hidden="true"></div>

          <!-- Dialog Card -->
          <div
            ref="customPromptDialogRef"
            role="dialog"
            aria-labelledby="custom-prompt-title"
            class="dialog-panel mg-v2-surface mg-v2-surface--raised relative z-10 p-6 max-w-md w-full mx-4"
          >
            <!-- Title -->
            <h2 id="custom-prompt-title" class="text-xl font-semibold text-on-surface mb-4">
              {{ t('journal.editor.customPromptTitle') }}
            </h2>

            <!-- Textarea -->
            <label for="custom-prompt-input" class="sr-only">{{
              t('journal.editor.customPromptLabel')
            }}</label>
            <textarea
              id="custom-prompt-input"
              v-model="customPromptInput"
              :placeholder="t('journal.editor.customPromptPlaceholder')"
              class="mg-v2-field w-full min-h-[120px] text-on-surface placeholder:text-on-surface-variant resize-y"
            />

            <!-- Actions -->
            <div class="flex gap-3 justify-end mt-6">
              <DsButton variant="quiet" @click="closeCustomPromptDialog">{{
                t('common.buttons.cancel')
              }}</DsButton>
              <DsButton @click="handleCustomPromptConfirm" :disabled="!customPromptInput.trim()">
                {{ t('journal.editor.startChat') }}
              </DsButton>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import ReflectionCompanionPanel from '@/features/ai-companion/ReflectionCompanionPanel.vue'
import { journalDraftRepository } from '@/repositories/journalDraftRepository'
import type { JournalDraft } from '@/domain/journalDraft'
import { getUserDatabase } from '@/services/userDatabaseService'
import { getPeriodRefsForDate } from '@/utils/periods'
import { entryDateFromDay } from '@/utils/relativeDay'
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { DsButton, DsSegmentedControl } from '@/design-system/components'
import EmotionGroupPicker from '@/components/emotion/EmotionGroupPicker.vue'
import TagInput from '@/components/TagInput.vue'
import ChatSessionCard from '@/components/ChatSessionCard.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { useChatStore } from '@/stores/chat.store'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { formatEntryDate } from '@/utils/dateFormat'
import type { JournalEntry } from '@/domain/journal'
import type { Quadrant } from '@/domain/emotion'
import { getQuadrantTintStyle } from '@/domain/emotion'
import type { EmotionGroupSelection as EmotionSelection } from '@/domain/emotionGroups'
import { legacyToGroupSelections, groupSelectionsToFamilyIds } from '@/domain/emotionGroups'
import type { ChatIntention, ChatSession } from '@/domain/chatSession'
import { CHAT_INTENTIONS } from '@/domain/chatSession'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { reportError } from '@/utils/reportError'

const router = useRouter()
const route = useRoute()
const journalStore = useJournalStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()
const chatStore = useChatStore()
const { t, locale } = useT()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const title = ref('')
const body = ref('')
const isSaving = ref(false)
const isLoading = ref(false)
const currentEntry = ref<JournalEntry | null>(null)
const wheelSelections = ref<EmotionSelection[]>([])
const activeEmotionQuadrant = ref<Quadrant | null>(null)
const emotionCardStyle = computed(() => getQuadrantTintStyle(activeEmotionQuadrant.value))
const selectedPeopleTagIds = ref<string[]>([])
const selectedContextTagIds = ref<string[]>([])
const isEmotionDataLoading = ref(false)
const arePeopleTagsLoading = ref(false)
const areContextTagsLoading = ref(false)
const showChatIntents = ref(false)
const isStartingChat = ref(false)
const showCustomPromptDialog = ref(false)
const customPromptInput = ref('')
const customPromptDialogRef = ref<HTMLElement | null>(null)
const showDeleteChatDialog = ref(false)
const chatSessionToDelete = ref<ChatSession | null>(null)

// Date/time picker state
const showDateTimePicker = ref(false)
const customCreatedAt = ref<Date | null>(null)
// Zwijany panel boczny (emocje / kontekst / osoby) — tylko md+; na mobile zawsze widoczny.
const isSidePanelOpen = ref(true)
const toggleSidePanel = () => {
  isSidePanelOpen.value = !isSidePanelOpen.value
}

const selectedDate = ref('')
const selectedTime = ref('')

// Initialize date/time picker values
function initDateTimePicker() {
  let date = new Date() // Default to now

  if (customCreatedAt.value && !isNaN(customCreatedAt.value.getTime())) {
    date = customCreatedAt.value
  } else if (isEditMode.value && currentEntry.value) {
    const parsedDate = new Date(currentEntry.value.createdAt)
    if (!isNaN(parsedDate.getTime())) {
      date = parsedDate
    }
  }

  selectedDate.value = date.toISOString().split('T')[0]
  selectedTime.value = date.toTimeString().slice(0, 5)
}

function applyDateTime() {
  if (selectedDate.value && selectedTime.value) {
    const dateParts = selectedDate.value.split('-').map(Number)
    const timeParts = selectedTime.value.split(':').map(Number)

    // Validate that all parts are valid numbers
    if (
      dateParts.length === 3 &&
      timeParts.length >= 2 &&
      dateParts.every(n => !isNaN(n)) &&
      timeParts.every(n => !isNaN(n))
    ) {
      const [year, month, day] = dateParts
      const [hours, minutes] = timeParts
      const newDate = new Date(year, month - 1, day, hours, minutes)

      // Only apply if the resulting date is valid
      if (!isNaN(newDate.getTime())) {
        customCreatedAt.value = newDate
      } else {
        console.warn('applyDateTime: Created invalid date from inputs', {
          selectedDate: selectedDate.value,
          selectedTime: selectedTime.value,
        })
      }
    } else {
      console.warn('applyDateTime: Invalid date/time input format', {
        selectedDate: selectedDate.value,
        selectedTime: selectedTime.value,
      })
    }
  }
  showDateTimePicker.value = false
}

// Initialize picker values when modal opens
watch(showDateTimePicker, isOpen => {
  if (isOpen) {
    initDateTimePicker()
  }
})

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
  // Use custom date if set and valid
  if (customCreatedAt.value && !isNaN(customCreatedAt.value.getTime())) {
    return formatEntryDate(customCreatedAt.value.toISOString(), locale.value)
  }

  // Use entry date if in edit mode and date is valid
  if (isEditMode.value && currentEntry.value) {
    const entryDate = new Date(currentEntry.value.createdAt)
    if (!isNaN(entryDate.getTime())) {
      return formatEntryDate(entryDate.toISOString(), locale.value)
    }
    // Invalid date - show "Unknown date" to allow user to fix it
    return t('journal.editor.unknownDate')
  }

  // In create mode with no custom date, show current date
  const now = new Date()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const entryDay = new Date(now)
  entryDay.setHours(0, 0, 0, 0)

  const isToday = entryDay.getTime() === today.getTime()

  if (isToday) {
    const hours = now.getHours().toString().padStart(2, '0')
    const minutes = now.getMinutes().toString().padStart(2, '0')
    return t('journal.editor.todayTime', { time: `${hours}:${minutes}` })
  } else {
    return now.toLocaleDateString(locale.value, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
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
const chatIntentionOptions = computed(() => [
  {
    value: CHAT_INTENTIONS.REFLECT,
    label: t('journal.editor.intentions.reflect'),
    description: t('journal.editor.intentions.reflectDescription'),
  },
  {
    value: CHAT_INTENTIONS.HELP_SEE_DIFFERENTLY,
    label: t('journal.editor.intentions.helpSeeDifferently'),
    description: t('journal.editor.intentions.helpSeeDifferentlyDescription'),
  },
  {
    value: CHAT_INTENTIONS.PROACTIVE,
    label: t('journal.editor.intentions.proactive'),
    description: t('journal.editor.intentions.proactiveDescription'),
  },
  {
    value: CHAT_INTENTIONS.THINKING_TRAPS,
    label: t('journal.editor.intentions.thinkingTraps'),
    description: t('journal.editor.intentions.thinkingTrapsDescription'),
  },
  {
    value: CHAT_INTENTIONS.CUSTOM,
    label: t('journal.editor.intentions.custom'),
    description: t('journal.editor.intentions.customDescription'),
  },
])

const syncEntryToForm = (entry: JournalEntry) => {
  currentEntry.value = entry
  title.value = entry.title || ''
  body.value = entry.body
  // Adapter historii: wpisy sprzed koła (słowa/rodziny) → promienie ± natężenie
  wheelSelections.value = legacyToGroupSelections(entry)
  selectedPeopleTagIds.value = [...(entry.peopleTagIds ?? [])]
  selectedContextTagIds.value = [...(entry.contextTagIds ?? [])]
  customCreatedAt.value = null
  entrySnapshot.value = formSnapshot.value
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
      error instanceof Error ? error.message : 'Failed to load emotions. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.ensureEmotionData', error)
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
      error instanceof Error ? error.message : 'Failed to load people tags. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.ensurePeopleTags', error)
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
      error instanceof Error ? error.message : 'Failed to load context tags. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.ensureContextTags', error)
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
    const storeEntry = journalStore.entries.find(e => e.id === id)
    if (storeEntry) {
      syncEntryToForm(storeEntry)
      return
    }

    // If not in store, load from repository
    const entry = await journalDexieRepository.getById(id)
    if (!entry) {
      // Entry doesn't exist
      snackbarRef.value?.show(t('journal.editor.entryNotFound'))
      router.push('/journal')
      return
    }

    syncEntryToForm(entry)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.loadEntry', error)
    router.push('/journal')
  } finally {
    isLoading.value = false
  }
}

function getQueryStringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return ''
}

function decodePromptSeed(seed: string): string {
  try {
    return decodeURIComponent(seed)
  } catch {
    return seed
  }
}

function applyGuidedPromptSeedForCreateMode() {
  if (isEditMode.value) return
  if (body.value.trim().length > 0) return

  const promptSeedRaw = getQueryStringValue(route.query?.promptSeed)
  if (!promptSeedRaw) return

  const decodedSeed = decodePromptSeed(promptSeedRaw).trim()
  if (!decodedSeed) return

  body.value = decodedSeed
}

/**
 * Extracted save logic that can be reused by both Save and Chat flows.
 * Validates, constructs payload, and saves the entry (create or update).
 * Returns the saved entry with ID.
 */
const saveEntry = async (): Promise<JournalEntry> => {
  // Validation: body must not be empty
  if (!body.value.trim()) {
    throw new Error(t('journal.editor.emptyContentError'))
  }

  // Koło zapisuje wybory w `emotions`; `emotionFamilyIds` = mostek zgodności
  // (slugi promieni == slugi rodzin). Edycja starego wpisu nadpisuje dawne
  // słowa (`emotionIds`) — świadoma strata przy spłaszczonym katalogu.
  const payload = {
    companionConversationId: companionId.value,
    title: title.value.trim() || undefined,
    body: body.value.trim(),
    emotionIds: [],
    emotionFamilyIds: groupSelectionsToFamilyIds(wheelSelections.value),
    emotions: wheelSelections.value.map(s => ({ ...s })),
    peopleTagIds: [...selectedPeopleTagIds.value],
    contextTagIds: [...selectedContextTagIds.value],
  }

  if (isEditMode.value && currentEntry.value) {
    // Edit mode: update existing entry
    // Include createdAt if user changed the date, or if original was invalid
    const updatedEntry = {
      ...currentEntry.value,
      ...payload,
    }
    if (customCreatedAt.value && !isNaN(customCreatedAt.value.getTime())) {
      updatedEntry.createdAt = customCreatedAt.value.toISOString()
    }
    return await journalStore.updateEntry(updatedEntry)
  } else {
    // Create mode: create new entry with optional custom date
    return await journalStore.createEntry({
      ...payload,
      createdAt: customCreatedAt.value?.toISOString(),
    })
  }
}

const resetCreateForm = () => {
  leaveApproved.value = false
  draftReady.value = false
  clearTimeout(draftTimer)
  companionPanel.value?.cancel()
  draftId.value = crypto.randomUUID()
  sideSection.value = 'emotions'
  title.value = ''
  body.value = ''
  wheelSelections.value = []
  selectedPeopleTagIds.value = []
  selectedContextTagIds.value = []
  customCreatedAt.value = null
  currentEntry.value = null
  draftReady.value = true
  void refreshDrafts()
}

const handleSave = async () => {
  isSaving.value = true

  try {
    companionPanel.value?.cancel()
    clearTimeout(draftTimer)
    await persistDraft()
    draftReady.value = false
    await saveEntry()
    // In create mode, /journal redirects to /journal/edit (the route we're on),
    // so the component is not remounted. Reset the form for a fresh entry.
    if (!isEditMode.value) {
      resetCreateForm()
    }
    // Navigate back to journal (redirects to /journal/edit)
    leaveApproved.value = true
    router.push('/journal')
  } catch (error) {
    // Error handling: show error message and stay on page
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to save journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.handleSave', error)
  } finally {
    draftReady.value = true
    isSaving.value = false
  }
}

// Wyjście z edytora (strzałka wstecz powłoki, dok, wstecz przeglądarki): przy
// niezapisanych zmianach pytamy. Nowy wpis = szkic lokalny (zachowaj / odrzuć),
// edycja = zmiany we wpisie (zapisz / odrzuć). Zapis i start czatu zwalniają guard.
const showLeaveDialog = ref(false)
const leaveApproved = ref(false)
let pendingLeavePath: string | null = null
const entrySnapshot = ref('')
const formSnapshot = computed(() =>
  JSON.stringify({
    title: title.value,
    body: body.value,
    emotions: wheelSelections.value,
    people: selectedPeopleTagIds.value,
    contexts: selectedContextTagIds.value,
    createdAt: customCreatedAt.value?.toISOString() ?? null,
  })
)
const hasUnsavedChanges = computed(() => {
  if (isEditMode.value) return !!currentEntry.value && formSnapshot.value !== entrySnapshot.value
  return (
    title.value.trim().length > 0 ||
    body.value.trim().length > 0 ||
    wheelSelections.value.length > 0 ||
    selectedPeopleTagIds.value.length > 0 ||
    selectedContextTagIds.value.length > 0
  )
})
onBeforeRouteLeave(to => {
  if (leaveApproved.value || isLoading.value || !hasUnsavedChanges.value) return true
  pendingLeavePath = to.fullPath
  showLeaveDialog.value = true
  return false
})
const stayWriting = () => {
  showLeaveDialog.value = false
  pendingLeavePath = null
}
const continueLeaving = () => {
  showLeaveDialog.value = false
  leaveApproved.value = true
  const target = pendingLeavePath ?? '/journal'
  pendingLeavePath = null
  router.push(target)
}
const keepAndLeave = async () => {
  try {
    companionPanel.value?.cancel()
    clearTimeout(draftTimer)
    if (isEditMode.value) {
      draftReady.value = false
      await saveEntry()
    } else {
      await persistDraft()
    }
    continueLeaving()
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to save journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.keepAndLeave', error)
  } finally {
    draftReady.value = true
  }
}
const discardAndLeave = async () => {
  companionPanel.value?.cancel()
  clearTimeout(draftTimer)
  // Blokada autosave: onUnmounted nie może odtworzyć odrzuconego szkicu.
  draftReady.value = false
  if (!isEditMode.value) {
    await draftWrite
    await removeDraft(draftId.value)
  }
  continueLeaving()
}

const closeChatIntents = () => {
  showChatIntents.value = false
}

// Custom prompt dialog functions
const closeCustomPromptDialog = () => {
  showCustomPromptDialog.value = false
  customPromptInput.value = ''
}

// Intention selection handler
const handleIntentionSelection = async (intention: ChatIntention) => {
  closeChatIntents()

  if (intention === CHAT_INTENTIONS.CUSTOM) {
    showCustomPromptDialog.value = true
  } else {
    await startChat(intention)
  }
}

// Custom prompt confirmation
const handleCustomPromptConfirm = async () => {
  if (!customPromptInput.value.trim()) {
    snackbarRef.value?.show(t('journal.editor.customPromptRequired'))
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
    snackbarRef.value?.show(t('journal.editor.contentBeforeChat'))
    return
  }

  isStartingChat.value = true

  try {
    // Preserve the draft and bind the new companion alongside the legacy chat.
    companionPanel.value?.cancel()
    clearTimeout(draftTimer)
    await persistDraft()
    draftReady.value = false
    const savedEntry = await saveEntry()

    // Start chat session
    await chatStore.startChatSession(savedEntry.id, intention, customPrompt)

    // Navigate to chat view
    leaveApproved.value = true
    router.push(`/journal/${savedEntry.id}/chat`)
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to start chat. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.startChat', error)
  } finally {
    draftReady.value = true
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
    await chatStore.deleteChatSession(currentEntry.value.id, chatSessionToDelete.value.id)
    const updatedEntry = await journalStore.getEntryById(currentEntry.value.id)
    if (updatedEntry) {
      currentEntry.value = updatedEntry
    }
    snackbarRef.value?.show(t('journal.editor.chatDeleted'))
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to delete chat session. Please try again.'
    snackbarRef.value?.show(errorMessage)
    reportError('JournalEditorView.handleConfirmDeleteChatSession', error)
  } finally {
    showDeleteChatDialog.value = false
    chatSessionToDelete.value = null
  }
}

const handleCancelDeleteChatSession = () => {
  showDeleteChatDialog.value = false
  chatSessionToDelete.value = null
}

// Escape key handler for dropdown
const handleEscapeKey = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (showChatIntents.value) {
      closeChatIntents()
    }
    if (showCustomPromptDialog.value) {
      closeCustomPromptDialog()
    }
  }
}

const sideSection = ref<'emotions' | 'ai'>('emotions')
const sideSectionOptions = computed(() => [
  { value: 'emotions' as const, label: t('journal.editor.emotions') },
  { value: 'ai' as const, label: 'AI' },
])
// Wybór sekcji w nagłówku otwiera zwinięty panel — kapsułka jest też wejściem.
watch(sideSection, () => {
  isSidePanelOpen.value = true
})
const companionPanel = ref<InstanceType<typeof ReflectionCompanionPanel> | null>(null)
const draftRepo = journalDraftRepository()
const draftId = ref(crypto.randomUUID() as string)
const draftReady = ref(false),
  draftError = ref('')
const savedDrafts = ref<JournalDraft[]>([])
const companionId = computed(
  () =>
    currentEntry.value?.companionConversationId ??
    `journal:${currentEntry.value?.id ?? draftId.value}`
)
const companionDay = computed(
  () =>
    getPeriodRefsForDate(customCreatedAt.value ?? currentEntry.value?.createdAt ?? new Date()).day
)
const companionEntryContext = computed(() =>
  JSON.stringify({
    title: title.value,
    entryDate: companionDay.value,
    emotions: wheelSelections.value,
    people: selectedPeopleTagIds.value.map(id => ({
      id,
      name: tagStore.peopleTags.find(t => t.id === id)?.name ?? id,
    })),
    contexts: selectedContextTagIds.value.map(id => ({
      id,
      name: tagStore.contextTags.find(t => t.id === id)?.name ?? id,
    })),
  })
)
let draftTimer: ReturnType<typeof setTimeout> | undefined
let draftWrite: Promise<void> = Promise.resolve()
function insertCompanionText(text: string) {
  body.value += `${body.value ? '\n\n' : ''}${text}\n`
}
async function refreshDrafts() {
  try {
    savedDrafts.value = (await draftRepo.list()).filter(d => d.id !== draftId.value)
  } catch {
    draftError.value = 'Nie udało się wczytać zachowanych szkiców.'
  }
}
function persistDraft() {
  if (
    !draftReady.value ||
    currentEntry.value ||
    (!body.value && !title.value && sideSection.value !== 'ai')
  )
    return draftWrite
  const row: JournalDraft = {
    id: draftId.value,
    content: {
      title: title.value,
      body: body.value,
      emotions: wheelSelections.value.map(e => ({ ...e })),
      peopleTagIds: [...selectedPeopleTagIds.value],
      contextTagIds: [...selectedContextTagIds.value],
    },
    entryDate: customCreatedAt.value?.toISOString(),
    updatedAt: new Date().toISOString(),
  }
  draftWrite = draftWrite
    .then(() => draftRepo.save(row))
    .catch(() => {
      draftError.value =
        'Nie udało się zachować szkicu lokalnie. Zapisz wpis przed opuszczeniem strony.'
    })
  return draftWrite
}
async function initializeDraft() {
  const id =
    typeof route.query?.draft === 'string' && /^[a-zA-Z0-9_-]{1,200}$/.test(route.query.draft)
      ? route.query.draft
      : draftId.value
  draftId.value = id
  const saved = await draftRepo.load(id)
  if (saved) {
    title.value = saved.content.title ?? ''
    body.value = saved.content.body
    wheelSelections.value = saved.content.emotions ?? []
    selectedPeopleTagIds.value = saved.content.peopleTagIds ?? []
    selectedContextTagIds.value = saved.content.contextTagIds ?? []
    customCreatedAt.value = saved.entryDate ? new Date(saved.entryDate) : null
  }
}
async function resumeDraft(id: string) {
  companionPanel.value?.cancel()
  clearTimeout(draftTimer)
  await persistDraft()
  draftReady.value = false
  await router.replace({ query: { ...route.query, draft: id } })
  await initializeDraft()
  draftReady.value = true
  sideSection.value = 'ai'
  await refreshDrafts()
}
async function removeDraft(id: string) {
  try {
    await draftRepo.remove(id)
    // Unsaved drafts have no independent historical source; remove their local dialogue too.
    await getUserDatabase().companionConversations.delete(`journal:${id}`)
    await refreshDrafts()
  } catch {
    draftError.value = 'Nie udało się usunąć szkicu.'
  }
}
watch(
  [
    title,
    body,
    wheelSelections,
    selectedPeopleTagIds,
    selectedContextTagIds,
    customCreatedAt,
    sideSection,
  ],
  () => {
    if (!draftReady.value || isEditMode.value) return
    clearTimeout(draftTimer)
    // The URL keeps the draft identity over reloads without creating an empty journal entry.
    if (route.query?.draft !== draftId.value)
      void router.replace({ query: { ...route.query, draft: draftId.value } })
    draftTimer = setTimeout(() => {
      void persistDraft()
    }, 400)
  },
  { deep: true }
)
watch(
  () => route.params.id,
  async id => {
    clearTimeout(draftTimer)
    companionPanel.value?.cancel()
    await persistDraft()
    draftReady.value = false
    if (typeof id === 'string') await loadEntry(id)
    else {
      resetCreateForm()
      draftReady.value = false
      await initializeDraft()
    }
    draftReady.value = true
  }
)

// Load entry data if in edit mode
onMounted(async () => {
  document.addEventListener('keydown', handleEscapeKey)
  applyGuidedPromptSeedForCreateMode()
  if (!isEditMode.value) customCreatedAt.value = entryDateFromDay(route.query?.day)
  const dataPromises = [ensureEmotionData(), ensurePeopleTags(), ensureContextTags()]

  if (isEditMode.value && typeof route.params.id === 'string') {
    await loadEntry(route.params.id)
  } else {
    await initializeDraft()
    applyGuidedPromptSeedForCreateMode()

    // Create mode: Auto-focus title input
    const titleInput = document.getElementById('title')
    if (titleInput) {
      titleInput.focus()
    }
  }

  draftReady.value = true
  await refreshDrafts()
  await Promise.all(dataPromises)
})

onUnmounted(() => {
  clearTimeout(draftTimer)
  void persistDraft()
  // Clean up event listeners
  document.removeEventListener('keydown', handleEscapeKey)
})
</script>

<style scoped>
:global(main:has(.journal-v2)) {
  min-width: 0;
}
/* The v2 root's min-width/canvas background are meant for full-viewport
   workspaces; this view is a centered column inside AppShell. */
.journal-v2 {
  min-width: 0;
  background: transparent;
}

.journal-v2__placeholder {
  border: 1px dashed var(--mg-color-border);
  border-radius: var(--mg-radius-md);
  background: var(--mg-color-mist);
}

.journal-v2__canvas-foot {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: var(--mg-space-2);
}

.journal-v2__sections {
  width: 9.5rem;
}

.journal-v2__chat-entry {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--mg-space-2);
  padding-bottom: var(--mg-space-2);
  border-bottom: 1px solid var(--mg-color-border-subtle);
}

.journal-v2__chat-intents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--mg-space-2);
}

.journal-v2__chat-intents .mg-v2-pill {
  cursor: pointer;
}

.journal-v2__chat-intents .mg-v2-pill:hover {
  background: var(--mg-color-paper);
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.2s ease;
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: scale(0.95);
  opacity: 0;
}

/* Scrollbar panelu bocznego: chowanie do czasu interakcji — kciuk jest
   przezroczysty, pojawia się dopiero gdy kursor jest nad panelem
   (desktop-only; scrollowanie kółkiem implikuje hover). */
/* Dół scrollportu gaśnie we mgle zamiast kończyć się kreską (wariant D, 2026-10-27). */
.journal-aside {
  scrollbar-color: transparent transparent;
  mask-image: linear-gradient(to bottom, black calc(100% - var(--mg-space-8)), transparent);
}
.journal-aside:hover {
  scrollbar-color: color-mix(in srgb, var(--mg-color-border) 55%, transparent) transparent;
}
.journal-aside::-webkit-scrollbar-thumb {
  background-color: transparent;
}
.journal-aside:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--mg-color-border) 45%, transparent);
}
.journal-aside:hover::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in srgb, var(--mg-color-border) 70%, transparent);
}
</style>
