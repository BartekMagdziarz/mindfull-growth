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

    <!-- Grammatical Gender Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.gender.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.gender.description') }}
      </p>

      <div>
        <label for="genderPreference" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.gender.label') }}
        </label>
        <select
          id="genderPreference"
          v-model="genderPreference"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleGenderPreferenceChange"
        >
          <option value="masculine">{{ t('profile.gender.options.masculine') }}</option>
          <option value="feminine">{{ t('profile.gender.options.feminine') }}</option>
        </select>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('profile.gender.hint') }}
        </p>
      </div>
    </AppCard>

    <!-- Psychological Profile Section -->
    <AppCard class="mt-6" padding="lg" variant="raised">
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <h3 class="text-xl font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.title') }}
          </h3>
          <p class="text-sm text-on-surface-variant mt-1">
            {{ t('profile.psychologicalProfile.shortDescription') }}
          </p>
          <p v-if="lastBuiltLabel" class="text-xs text-on-surface-variant mt-2">
            {{ t('profile.psychologicalProfile.lastBuiltAt', { at: lastBuiltLabel }) }}
          </p>
          <p v-else class="text-xs text-on-surface-variant mt-2">
            {{ t('profile.psychologicalProfile.notBuiltYet') }}
          </p>
        </div>
        <AppButton variant="filled" @click="goToPsychologicalProfile">
          {{ t('profile.psychologicalProfile.open') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- AI Settings Section -->
    <AppCard id="ai-settings" class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.aiSettings.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.aiSettings.description') }}
      </p>

      <!-- Provider Select -->
      <div class="mb-4">
        <label for="aiProvider" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.aiSettings.providerLabel') }}
        </label>
        <select
          id="aiProvider"
          v-model="aiProvider"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleProviderChange"
        >
          <option value="openai">{{ t('profile.aiSettings.providers.openai') }}</option>
          <option value="ollama">{{ t('profile.aiSettings.providers.ollama') }}</option>
          <option value="mlx">{{ t('profile.aiSettings.providers.mlx') }}</option>
          <option value="custom">{{ t('profile.aiSettings.providers.custom') }}</option>
        </select>
      </div>

      <!-- Base URL Input -->
      <div class="mb-4">
        <label for="baseUrl" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.aiSettings.baseUrlLabel') }}
        </label>
        <input
          id="baseUrl"
          v-model="baseUrl"
          type="url"
          :placeholder="t('profile.aiSettings.baseUrlPlaceholder')"
          :class="[
            'w-full px-4 py-3 rounded-xl border-2 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors',
            baseUrlError
              ? 'border-error focus:ring-error'
              : 'border-outline/30 focus:ring-focus'
          ]"
          @input="validateAISettings"
        />
        <p v-if="baseUrlError" class="mt-2 text-sm text-error">
          {{ baseUrlError }}
        </p>
      </div>

      <!-- Model Input -->
      <div class="mb-4">
        <label for="aiModel" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.aiSettings.modelLabel') }}
        </label>
        <input
          id="aiModel"
          v-model="aiModel"
          type="text"
          :placeholder="t('profile.aiSettings.modelPlaceholder')"
          :class="[
            'w-full px-4 py-3 rounded-xl border-2 bg-surface text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-focus transition-colors',
            modelError
              ? 'border-error focus:ring-error'
              : 'border-outline/30 focus:ring-focus'
          ]"
          @input="validateAISettings"
        />
        <p v-if="modelError" class="mt-2 text-sm text-error">
          {{ modelError }}
        </p>
      </div>

      <!-- API Key Input -->
      <div class="mb-6">
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
          @input="validateAISettings"
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
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { seedChartTestData, deleteChartTestData } from '@/dev/chartTestSeed'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { userSettingsDexieRepository } from '@/repositories/userSettingsDexieRepository'
import {
  AI_PROVIDER_PRESETS,
  AI_PROVIDER_SETTINGS_KEY,
  LEGACY_OPENAI_API_KEY,
  type AIProviderId,
  type AIProviderSettings,
} from '@/services/llmService'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useAuthStore } from '@/stores/auth.store'
import { applyTheme, type ThemeId } from '@/services/theme.service'
import type { LocaleId, GrammaticalGender } from '@/services/locale.service'
import { useT } from '@/composables/useT'

const { t, locale } = useT()
const router = useRouter()
const route = useRoute()
const userPreferencesStore = useUserPreferencesStore()
const userProfileStore = useUserProfileStore()
const authStore = useAuthStore()

const username = computed(() => authStore.user?.username || '')
const displayName = computed(() => authStore.user?.displayName || '')

const aiProvider = ref<AIProviderId>('openai')
const baseUrl = ref(AI_PROVIDER_PRESETS.openai.baseUrl)
const aiModel = ref(AI_PROVIDER_PRESETS.openai.model)
const apiKey = ref('')
const themePreference = ref<ThemeId>('current')
const languagePreference = ref<LocaleId>('en')
const genderPreference = ref<GrammaticalGender>('masculine')
const baseUrlError = ref('')
const modelError = ref('')
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
  return (
    aiProvider.value &&
    baseUrl.value.trim().length > 0 &&
    aiModel.value.trim().length > 0 &&
    (aiProvider.value !== 'openai' || apiKey.value.trim().length > 0) &&
    !baseUrlError.value &&
    !modelError.value &&
    !apiKeyError.value &&
    !isSaving.value
  )
})

function isAIProviderId(value: unknown): value is AIProviderId {
  return (
    value === 'openai' ||
    value === 'ollama' ||
    value === 'mlx' ||
    value === 'custom'
  )
}

function parseStoredAISettings(raw: string): AIProviderSettings | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AIProviderSettings>
    if (
      !isAIProviderId(parsed.provider) ||
      typeof parsed.baseUrl !== 'string' ||
      typeof parsed.model !== 'string'
    ) {
      return null
    }
    return {
      provider: parsed.provider,
      baseUrl: parsed.baseUrl,
      model: parsed.model,
      ...(typeof parsed.apiKey === 'string' ? { apiKey: parsed.apiKey } : {}),
    }
  } catch {
    return null
  }
}

function applyAISettings(settings: AIProviderSettings) {
  aiProvider.value = settings.provider
  baseUrl.value = settings.baseUrl
  aiModel.value = settings.model
  apiKey.value = settings.apiKey ?? ''
  validateAISettings()
}

function validateAISettings() {
  baseUrlError.value =
    baseUrl.value.trim().length === 0
      ? t('profile.aiSettings.baseUrlError')
      : ''
  modelError.value =
    aiModel.value.trim().length === 0
      ? t('profile.aiSettings.modelError')
      : ''
  apiKeyError.value =
    aiProvider.value === 'openai' && apiKey.value.trim().length === 0
      ? t('profile.aiSettings.apiKeyRequiredError')
      : ''
}

function handleProviderChange() {
  if (aiProvider.value === 'custom') {
    if (!baseUrl.value.trim()) baseUrl.value = AI_PROVIDER_PRESETS.mlx.baseUrl
    validateAISettings()
    return
  }

  const preset = AI_PROVIDER_PRESETS[aiProvider.value]
  baseUrl.value = preset.baseUrl
  aiModel.value = preset.model
  validateAISettings()
}

async function handleSave() {
  if (!canSave.value) {
    return
  }

  isSaving.value = true
  try {
    const settings: AIProviderSettings = {
      provider: aiProvider.value,
      baseUrl: baseUrl.value.trim(),
      model: aiModel.value.trim(),
      ...(apiKey.value.trim() ? { apiKey: apiKey.value.trim() } : {}),
    }
    await userSettingsDexieRepository.set(
      AI_PROVIDER_SETTINGS_KEY,
      JSON.stringify(settings),
    )
    if (settings.provider === 'openai' && settings.apiKey) {
      await userSettingsDexieRepository.set(
        LEGACY_OPENAI_API_KEY,
        settings.apiKey,
      )
    }
    snackbarRef.value?.show(t('profile.aiSettings.saved'))
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : t('profile.aiSettings.saveFailed')
    snackbarRef.value?.show(errorMessage)
    console.error('Error saving AI provider settings:', error)
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

async function handleGenderPreferenceChange() {
  try {
    await userPreferencesStore.setGrammaticalGender(genderPreference.value)
    snackbarRef.value?.show(t('profile.feedback.genderUpdated'))
  } catch (error) {
    console.error('Error saving gender preference:', error)
    snackbarRef.value?.show(t('profile.feedback.failedToSave'))
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

const lastBuiltLabel = computed(() => {
  const latest = userProfileStore.currentProfile
  if (!latest) return ''
  try {
    return new Intl.DateTimeFormat(locale.value, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(latest.createdAt))
  } catch {
    return latest.createdAt
  }
})

function goToPsychologicalProfile() {
  router.push({ name: 'profile-psychological' })
}

// Load existing settings on mount
onMounted(async () => {
  try {
    // Load AI provider settings, falling back to the legacy OpenAI key.
    const existingSettings = await userSettingsDexieRepository.get(
      AI_PROVIDER_SETTINGS_KEY,
    )
    const parsedSettings = existingSettings
      ? parseStoredAISettings(existingSettings)
      : null
    if (parsedSettings) {
      applyAISettings(parsedSettings)
    } else {
      const existingKey = await userSettingsDexieRepository.get(
        LEGACY_OPENAI_API_KEY,
      )
      applyAISettings({
        ...AI_PROVIDER_PRESETS.openai,
        ...(existingKey ? { apiKey: existingKey } : {}),
      })
    }

    // Load user preferences
    await userPreferencesStore.loadPreferences()
    themePreference.value = userPreferencesStore.themePreference
    languagePreference.value = userPreferencesStore.locale
    genderPreference.value = userPreferencesStore.grammaticalGender
  } catch (error) {
    console.error('Error loading settings:', error)
    // Don't show error to user on load - just log it
  }

  // Load psychological profiles for the "last built" label on the entry card.
  try {
    await userProfileStore.loadProfiles()
  } catch (error) {
    console.error('Error loading psychological profiles:', error)
  }

  // Handle an initial hash (e.g. arrived via `{ name: 'profile', hash: '#ai-settings' }`).
  // The router in this project has no custom scrollBehavior, so we do it ourselves.
  if (route.hash) {
    await scrollToHash(route.hash)
  }
})

async function scrollToHash(hash: string): Promise<void> {
  const id = hash.startsWith('#') ? hash.slice(1) : hash
  if (!id) return
  // Wait a tick so any freshly-mounted anchor targets are in the DOM.
  await nextTick()
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// React to subsequent hash changes (e.g. coming back from the build wizard).
watch(
  () => route.hash,
  async (next) => {
    if (next) await scrollToHash(next)
  },
)
</script>
