<template>
  <div class="container mx-auto px-4 py-6">
    <!-- Account Section -->
    <AppCard>
      <h2 class="text-2xl font-semibold text-on-surface mb-4">{{ t('profile.account.title') }}</h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-on-surface font-medium">
            {{ displayName || username }}
          </p>
          <p v-if="displayName" class="text-sm text-on-surface-variant">
            @{{ username }}
          </p>
        </div>
        <AppButton variant="outlined" @click="handleLogout">
          {{ t('common.buttons.signOut') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Life Areas Link -->
    <AppCard class="mt-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-xl font-semibold text-on-surface">{{ t('profile.lifeAreas.title') }}</h3>
          <p class="text-sm text-on-surface-variant">
            {{ t('profile.lifeAreas.description') }}
          </p>
        </div>
        <AppButton variant="outlined" @click="router.push('/areas')">
          {{ t('common.buttons.manage') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Appearance Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.appearance.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.appearance.description') }}
      </p>

      <div>
        <label for="themePreference" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.appearance.colorTheme') }}
        </label>
        <select
          id="themePreference"
          v-model="themePreference"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleThemePreferenceChange"
        >
          <option value="current">{{ t('profile.appearance.themes.current') }}</option>
          <option value="sky-mist">{{ t('profile.appearance.themes.skyMist') }}</option>
          <option value="sunrise-cloud">{{ t('profile.appearance.themes.sunriseCloud') }}</option>
        </select>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('profile.appearance.themeHint') }}
        </p>
      </div>
    </AppCard>

    <!-- Language Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.language.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.language.description') }}
      </p>

      <div>
        <label for="languagePreference" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.language.label') }}
        </label>
        <select
          id="languagePreference"
          v-model="languagePreference"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleLanguagePreferenceChange"
        >
          <option value="en">{{ t('profile.language.locales.en') }}</option>
          <option value="pl">{{ t('profile.language.locales.pl') }}</option>
        </select>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('profile.language.hint') }}
        </p>
      </div>
    </AppCard>

    <!-- AI Settings Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.aiSettings.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.aiSettings.description') }}
      </p>

      <!-- API Key Input -->
      <div class="mb-4">
        <label for="apiKey" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.aiSettings.apiKeyLabel') }}
        </label>
        <input
          id="apiKey"
          v-model="apiKey"
          type="password"
          :placeholder="t('profile.aiSettings.apiKeyPlaceholder')"
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
          {{ t('profile.aiSettings.apiKeyHint') }}
          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            {{ t('profile.aiSettings.apiKeyHintLink') }}
          </a>.
        </p>
      </div>

      <!-- Model Display -->
      <div class="mb-6">
        <p class="text-sm text-on-surface-variant">
          <span class="font-medium">{{ t('profile.aiSettings.model') }}:</span> gpt-4o-mini
          <span class="text-xs">{{ t('profile.aiSettings.modelNote') }}</span>
        </p>
      </div>

      <!-- Save Button -->
      <AppButton
        variant="filled"
        :disabled="!canSave"
        @click="handleSave"
      >
        <span v-if="isSaving">{{ t('common.saving') }}</span>
        <span v-else>{{ t('common.buttons.save') }}</span>
      </AppButton>
    </AppCard>

    <!-- Dev-only: Chart test data seed -->
    <AppCard v-if="isDev" class="mt-6 border-2 border-dashed border-outline/30">
      <h3 class="text-xl font-semibold text-on-surface mb-1">🛠 Dev: Chart test data</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        Creates/removes <code class="font-mono">[DEV SEED]</code> goals, KRs, habits and trackers
        with 6 months of history to test the Objects Library charts.
      </p>
      <div class="flex gap-3 flex-wrap">
        <AppButton variant="filled" :disabled="seedBusy" @click="handleSeed">
          {{ seedBusy ? 'Seeding…' : 'Seed chart data' }}
        </AppButton>
        <AppButton variant="outlined" :disabled="seedBusy" @click="handleUnseed">
          {{ seedBusy ? 'Deleting…' : 'Delete seeded data' }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Snackbar for feedback -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { seedChartTestData, deleteChartTestData } from '@/dev/chartTestSeed'
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useAuthStore } from '@/stores/auth.store'
import { applyTheme, type ThemeId } from '@/services/theme.service'
import type { LocaleId } from '@/services/locale.service'
import { useT } from '@/composables/useT'

const API_KEY_STORAGE_KEY = 'openaiApiKey'

const { t } = useT()
const router = useRouter()
const userPreferencesStore = useUserPreferencesStore()
const authStore = useAuthStore()

const username = computed(() => authStore.user?.username || '')
const displayName = computed(() => authStore.user?.displayName || '')

const apiKey = ref('')
const themePreference = ref<ThemeId>('current')
const languagePreference = ref<LocaleId>('en')
const apiKeyError = ref('')
const isSaving = ref(false)
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isDev = import.meta.env.DEV
const seedBusy = ref(false)

async function handleSeed() {
  seedBusy.value = true
  try {
    await seedChartTestData()
    snackbarRef.value?.show('Chart test data seeded ✅')
  } catch (e) {
    console.error(e)
    snackbarRef.value?.show('Seeding failed — check console')
  } finally {
    seedBusy.value = false
  }
}

async function handleUnseed() {
  seedBusy.value = true
  try {
    await deleteChartTestData()
    snackbarRef.value?.show('Seeded data deleted ✅')
  } catch (e) {
    console.error(e)
    snackbarRef.value?.show('Delete failed — check console')
  } finally {
    seedBusy.value = false
  }
}

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
    apiKeyError.value = t('profile.aiSettings.apiKeyError')
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
    snackbarRef.value?.show(t('profile.aiSettings.saved'))
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : t('profile.aiSettings.saveFailed')
    snackbarRef.value?.show(errorMessage)
    console.error('Error saving API key:', error)
  } finally {
    isSaving.value = false
  }
}

async function handleThemePreferenceChange() {
  const nextTheme = themePreference.value
  const previousTheme = userPreferencesStore.themePreference

  // Apply immediately for live preview, then persist.
  applyTheme(nextTheme)

  try {
    await userPreferencesStore.setThemePreference(nextTheme)
    snackbarRef.value?.show(t('profile.feedback.themeUpdated'))
  } catch (error) {
    console.error('Error saving theme preference:', error)
    themePreference.value = previousTheme
    applyTheme(previousTheme)
    snackbarRef.value?.show(t('profile.feedback.failedToSave'))
  }
}

async function handleLanguagePreferenceChange() {
  try {
    await userPreferencesStore.setLocale(languagePreference.value)
    snackbarRef.value?.show(t('profile.feedback.languageUpdated'))
  } catch (error) {
    console.error('Error saving language preference:', error)
    snackbarRef.value?.show(t('profile.feedback.failedToSave'))
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

// Load existing settings on mount
onMounted(async () => {
  try {
    // Load API key
    const existingKey = await userSettingsDexieRepository.get(API_KEY_STORAGE_KEY)
    if (existingKey) {
      apiKey.value = existingKey
      validateApiKey()
    }

    // Load user preferences
    await userPreferencesStore.loadPreferences()
    themePreference.value = userPreferencesStore.themePreference
    languagePreference.value = userPreferencesStore.locale
  } catch (error) {
    console.error('Error loading settings:', error)
    // Don't show error to user on load - just log it
  }
})
</script>
