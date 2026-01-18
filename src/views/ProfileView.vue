<template>
  <div class="container mx-auto px-4 py-6">
    <AppCard>
      <h2 class="text-2xl font-semibold text-on-surface mb-4">Profile</h2>
      <p class="text-on-surface-variant mb-6">
        This view will contain profile and browsing functionality.
      </p>
    </AppCard>

    <!-- AI Settings Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">AI Settings</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        Connect your own OpenAI API key so the assistant can respond to your journal chats. Your key stays on this device and is never shared.
      </p>

      <!-- API Key Input -->
      <div class="mb-4">
        <label for="apiKey" class="block text-sm font-medium text-on-surface mb-2">
          OpenAI API Key
        </label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          placeholder="sk-..."
          :class="[
            'w-full px-4 py-3 rounded-xl border-2 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors',
            apiKeyError
              ? 'border-error focus:ring-error'
              : 'border-outline/30 focus:ring-focus'
          ]"
          @input="validateApiKey"
        />
        <p v-if="apiKeyError" class="mt-2 text-sm text-error">
          {{ apiKeyError }}
        </p>
        <p v-else class="mt-2 text-sm text-on-surface-variant">
          Your API key is stored locally in your browser. Get a key from
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            OpenAI's website
          </a>
          .
        </p>
      </div>

      <!-- Model Display -->
      <div class="mb-6">
        <p class="text-sm text-on-surface-variant">
          <span class="font-medium">Model:</span> gpt-4o-mini
          <span class="text-xs">(can be changed in the future)</span>
        </p>
      </div>

      <!-- Save Button -->
      <AppButton
        variant="filled"
        :disabled="!canSave"
        @click="handleSave"
      >
        <span v-if="isSaving">Saving...</span>
        <span v-else>Save</span>
      </AppButton>
    </AppCard>

    <!-- Developer Tools Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">Developer Tools</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        Tools for testing and development. These will be removed in production.
      </p>

      <AppButton
        variant="tonal"
        :disabled="isSeeding"
        @click="handleSeedMockData"
      >
        <span v-if="isSeeding">Seeding data...</span>
        <span v-else>Seed Mock Data (Jan 12-18)</span>
      </AppButton>
      <p class="mt-2 text-xs text-on-surface-variant">
        Creates sample journal entries and emotion logs for testing the periodic entries feature.
      </p>
    </AppCard>

    <!-- Snackbar for feedback -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { seedMockData } from '@/utils/seedMockData'

const API_KEY_STORAGE_KEY = 'openaiApiKey'

const apiKey = ref('')
const isSeeding = ref(false)
const apiKeyError = ref('')
const isSaving = ref(false)
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const canSave = computed(() => {
  return apiKey.value.trim().length > 0 && !apiKeyError.value && !isSaving.value
})

function validateApiKey() {
  const trimmedKey = apiKey.value.trim()
  if (trimmedKey.length === 0) {
    apiKeyError.value = ''
    return
  }
  if (!trimmedKey.startsWith('sk-')) {
    apiKeyError.value = "API key must start with 'sk-'"
  } else {
    apiKeyError.value = ''
  }
}

async function handleSave() {
  if (!canSave.value) {
    return
  }

  isSaving.value = true
  try {
    await userSettingsDexieRepository.set(API_KEY_STORAGE_KEY, apiKey.value.trim())
    snackbarRef.value?.show('API key saved successfully.')
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to save API key. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error saving API key:', error)
  } finally {
    isSaving.value = false
  }
}

async function handleSeedMockData() {
  isSeeding.value = true
  try {
    await seedMockData()
    snackbarRef.value?.show('Mock data seeded successfully! Check Journal and Emotions views.')
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to seed mock data. Please try again.'
    snackbarRef.value?.show(errorMessage)
    console.error('Error seeding mock data:', error)
  } finally {
    isSeeding.value = false
  }
}

// Load existing API key on mount
onMounted(async () => {
  try {
    const existingKey = await userSettingsDexieRepository.get(API_KEY_STORAGE_KEY)
    if (existingKey) {
      apiKey.value = existingKey
      validateApiKey()
    }
  } catch (error) {
    console.error('Error loading API key:', error)
    // Don't show error to user on load - just log it
  }
})
</script>

