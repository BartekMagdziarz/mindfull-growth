<template>
  <div class="container mx-auto px-4 py-6 flex flex-col min-h-full">
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

    <!-- Snackbar for error messages -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { useJournalStore } from '@/stores/journal.store'

const router = useRouter()
const journalStore = useJournalStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const title = ref('')
const body = ref('')
const isSaving = ref(false)

const formattedTimestamp = computed(() => {
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
})

const handleSave = async () => {
  // Validation: body must not be empty
  if (!body.value.trim()) {
    snackbarRef.value?.show('Please enter some content for your journal entry.')
    return
  }

  isSaving.value = true

  try {
    await journalStore.createEntry({
      title: title.value.trim() || undefined,
      body: body.value.trim(),
    })
    // Navigate back to journal list on success
    router.push('/journal')
  } catch (error) {
    // Error handling: show error message and stay on page
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to save journal entry. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error creating journal entry:', error)
  } finally {
    isSaving.value = false
  }
}

const handleCancel = () => {
  router.push('/journal')
}

// Optional: Auto-focus title input on mount
onMounted(() => {
  const titleInput = document.getElementById('title')
  if (titleInput) {
    titleInput.focus()
  }
})
</script>

