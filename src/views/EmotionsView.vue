<template>
  <div class="container mx-auto px-4 py-6">
    <div class="max-w-3xl mx-auto space-y-6">
      <!-- Primary action -->
      <div class="flex justify-center">
        <AppButton
          variant="filled"
          class="w-full sm:w-auto text-lg"
          @click="handleLogEmotionClick"
        >
          Log emotion
        </AppButton>
      </div>

      <!-- Loading state -->
      <div
        v-if="emotionLogStore.isLoading"
        class="text-on-surface-variant text-center"
      >
        Loading emotion logs...
      </div>

      <!-- Error state -->
      <div
        v-else-if="emotionLogStore.error"
        class="bg-error-container text-on-error-container border border-error/30 rounded-lg p-4 space-y-3"
      >
        <div>
          <p class="font-semibold">Unable to load emotion logs</p>
          <p class="text-sm">{{ emotionLogStore.error }}</p>
        </div>
        <div class="flex justify-center">
          <AppButton variant="outlined" @click="handleRetryLoad">
            Try again
          </AppButton>
        </div>
      </div>

      <!-- Content -->
      <div v-else>
        <p
          v-if="emotionLogStore.sortedLogs.length === 0"
          class="text-on-surface-variant text-center"
        >
          No emotion logs yet. Tap "Log emotion" to get started.
        </p>

        <div
          v-else
          class="flex flex-col gap-4"
        >
          <AppCard
            v-for="log in emotionLogStore.sortedLogs"
            :key="log.id"
            :elevation="1"
            padding="none"
            class="py-3 px-4 cursor-pointer transition-all duration-200 hover:shadow-elevation-2"
            @click="() => handleLogCardClick(log.id)"
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <div class="space-y-1">
                  <p class="text-sm text-on-surface-variant">
                    {{ formatEntryDate(log.createdAt) }}
                  </p>
                </div>
                <button
                  @click.stop="handleDeleteClick(log)"
                  :disabled="isDeleting && deletingLogId === log.id"
                  :aria-label="`Delete emotion log recorded on ${formatEntryDate(log.createdAt)}`"
                  class="flex-shrink-0 p-2 rounded-xl text-on-surface-variant hover:bg-section hover:text-error transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  <TrashIcon
                    v-if="!(isDeleting && deletingLogId === log.id)"
                    class="w-5 h-5"
                  />
                  <span v-else class="text-sm">Deleting...</span>
                </button>
              </div>

              <!-- Emotions -->
              <div
                v-if="hasEmotionChips(log)"
                class="flex flex-wrap gap-2"
              >
                <template
                  v-for="emotionId in log.emotionIds ?? []"
                  :key="`emotion-${log.id}-${emotionId}`"
                >
                  <span
                    v-if="getEmotionName(emotionId)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-section-strong text-primary-strong border border-chip-border shadow-elevation-1"
                  >
                    {{ getEmotionName(emotionId) }}
                  </span>
                </template>
              </div>

              <!-- Note preview -->
              <p
                v-if="log.note && getNotePreview(log.note)"
                class="text-on-surface-variant"
              >
                {{ getNotePreview(log.note) }}
              </p>

              <!-- Tags -->
              <div
                v-if="hasTags(log)"
                class="flex flex-wrap gap-2"
              >
                <template
                  v-for="peopleTagId in log.peopleTagIds ?? []"
                  :key="`people-${log.id}-${peopleTagId}`"
                >
                  <span
                    v-if="getPeopleTagName(peopleTagId)"
                    class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-chip text-chip-text border border-chip-border shadow-elevation-1"
                  >
                    {{ getPeopleTagName(peopleTagId) }}
                  </span>
                </template>

                <template
                  v-for="contextTagId in log.contextTagIds ?? []"
                  :key="`context-${log.id}-${contextTagId}`"
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

    <AppSnackbar ref="snackbarRef" />

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
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { formatEntryDate } from '@/utils/dateFormat'
import type { EmotionLog } from '@/domain/emotionLog'
import { TrashIcon } from '@heroicons/vue/24/outline'

const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()
const tagStore = useTagStore()

const showDeleteDialog = ref(false)
const logToDelete = ref<EmotionLog | null>(null)
const isDeleting = ref(false)
const deletingLogId = ref<string | null>(null)

const showSnackbar = (message: string) => {
  if (message) {
    snackbarRef.value?.show(message)
  }
}

const handleLogEmotionClick = async () => {
  try {
    await router.push('/emotions/edit')
  } catch (error) {
    console.error('Navigation to /emotions/edit failed:', error)
    showSnackbar('Coming soon')
  }
}

const handleLogCardClick = async (logId: string) => {
  try {
    await router.push(`/emotions/${logId}/edit`)
  } catch (error) {
    console.error(`Navigation to /emotions/${logId}/edit failed:`, error)
    showSnackbar('Coming soon')
  }
}

const handleRetryLoad = async () => {
  await emotionLogStore.loadLogs()
  if (emotionLogStore.error) {
    showSnackbar(emotionLogStore.error)
  } else {
    showSnackbar('Emotion logs reloaded.')
  }
}

const handleDeleteClick = (log: EmotionLog) => {
  logToDelete.value = log
  showDeleteDialog.value = true
}

const handleDeleteCancel = () => {
  logToDelete.value = null
}

const handleDeleteConfirm = async () => {
  if (!logToDelete.value) {
    return
  }

  const logId = logToDelete.value.id
  isDeleting.value = true
  deletingLogId.value = logId

  try {
    await emotionLogStore.deleteLog(logId)
    showSnackbar('Emotion log deleted successfully.')
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to delete emotion log. Please try again.'
    showSnackbar(message)
    console.error('Error deleting emotion log:', error)
  } finally {
    isDeleting.value = false
    deletingLogId.value = null
    logToDelete.value = null
  }
}

const getEmotionName = (id: string): string | undefined => {
  return emotionStore.getEmotionById(id)?.name
}

const getPeopleTagName = (id: string): string | undefined => {
  return tagStore.getPeopleTagById(id)?.name
}

const getContextTagName = (id: string): string | undefined => {
  return tagStore.getContextTagById(id)?.name
}

const hasEmotionChips = (log: EmotionLog): boolean => {
  return (log.emotionIds ?? []).some((id) => Boolean(getEmotionName(id)))
}

const hasTags = (log: EmotionLog): boolean => {
  const hasPeople = (log.peopleTagIds ?? []).some((id) =>
    Boolean(getPeopleTagName(id))
  )
  const hasContext = (log.contextTagIds ?? []).some((id) =>
    Boolean(getContextTagName(id))
  )
  return hasPeople || hasContext
}

const getNotePreview = (note?: string): string => {
  if (!note) {
    return ''
  }

  return note.length > 100 ? `${note.slice(0, 100)}...` : note
}

onMounted(async () => {
  const loadPromises: Promise<unknown>[] = [emotionLogStore.loadLogs()]

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

  if (emotionLogStore.error) {
    showSnackbar(emotionLogStore.error)
  }
})

watch(
  () => emotionLogStore.error,
  (newError) => {
    if (newError) {
      showSnackbar(newError)
    }
  }
)

watch(
  () => tagStore.error,
  (newError) => {
    if (newError) {
      showSnackbar(newError)
    }
  }
)
</script>
