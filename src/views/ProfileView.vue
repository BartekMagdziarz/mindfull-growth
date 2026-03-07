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

    <!-- Daily Habits Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.dailyHabits.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.dailyHabits.description') }}
      </p>

      <!-- Weekly Review Day -->
      <div class="mb-4">
        <label for="weeklyReviewDay" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.dailyHabits.weeklyReviewDay') }}
        </label>
        <select
          id="weeklyReviewDay"
          v-model.number="weeklyReviewDay"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleWeeklyReviewDayChange"
        >
          <option v-for="day in 7" :key="day - 1" :value="day - 1">
            {{ t(`common.days.${day - 1}`) }}
          </option>
        </select>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('profile.dailyHabits.weeklyReviewDayHint') }}
        </p>
      </div>

      <!-- Daily Emotion Target -->
      <div>
        <label for="emotionTarget" class="block text-sm font-medium text-on-surface mb-2">
          {{ t('profile.dailyHabits.dailyEmotionTarget') }}
        </label>
        <input
          id="emotionTarget"
          v-model.number="dailyEmotionTarget"
          type="number"
          min="1"
          max="10"
          class="w-full px-4 py-3 rounded-xl border-2 border-outline/30 bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-focus transition-colors"
          @change="handleEmotionTargetChange"
        />
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ t('profile.dailyHabits.dailyEmotionTargetHint') }}
        </p>
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

    <!-- Developer Tools Section -->
    <AppCard class="mt-6">
      <h3 class="text-xl font-semibold text-on-surface mb-2">{{ t('profile.devTools.title') }}</h3>
      <p class="text-sm text-on-surface-variant mb-4">
        {{ t('profile.devTools.description') }}
      </p>

      <!-- Data Management -->
      <div class="mb-6">
        <h4 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">{{ t('profile.devTools.dataManagement') }}</h4>
        <div class="flex flex-wrap gap-2">
          <AppButton
            variant="outlined"
            :disabled="isSeeding"
            @click="handleSeeder('clearAll')"
          >
            {{ t('profile.devTools.clearAll') }}
          </AppButton>
          <AppButton
            variant="outlined"
            :disabled="isSeeding"
            @click="handleSeeder('clearPlanning')"
          >
            {{ t('profile.devTools.clearPlanning') }}
          </AppButton>
        </div>
        <p class="mt-2 text-xs text-on-surface-variant">
          {{ t('profile.devTools.clearPlanningHint') }}
        </p>
      </div>

      <!-- Focused Seeders -->
      <div class="mb-6">
        <h4 class="text-sm font-semibold text-on-surface-variant uppercase tracking-wide mb-3">{{ t('profile.devTools.focusedSeeders') }}</h4>
        <p class="text-xs text-on-surface-variant mb-3">
          {{ t('profile.devTools.seedersHint') }}
        </p>
        <div class="space-y-3">
          <div>
            <AppButton variant="tonal" :disabled="isSeeding" @click="handleSeeder('foundation')">
              <span v-if="activeSeeder === 'foundation'">{{ t('profile.devTools.seeding') }}</span>
              <span v-else>{{ t('profile.devTools.foundation') }}</span>
            </AppButton>
            <span class="ml-2 text-xs text-on-surface-variant">{{ t('profile.devTools.foundationDesc') }}</span>
          </div>
          <div>
            <AppButton variant="tonal" :disabled="isSeeding" @click="handleSeeder('habits')">
              <span v-if="activeSeeder === 'habits'">{{ t('profile.devTools.seeding') }}</span>
              <span v-else>{{ t('profile.devTools.habits') }}</span>
            </AppButton>
            <span class="ml-2 text-xs text-on-surface-variant">{{ t('profile.devTools.habitsDesc') }}</span>
          </div>
          <div>
            <AppButton variant="tonal" :disabled="isSeeding" @click="handleSeeder('projects')">
              <span v-if="activeSeeder === 'projects'">{{ t('profile.devTools.seeding') }}</span>
              <span v-else>{{ t('profile.devTools.projectsKRs') }}</span>
            </AppButton>
            <span class="ml-2 text-xs text-on-surface-variant">{{ t('profile.devTools.projectsDesc') }}</span>
          </div>
          <div>
            <AppButton variant="tonal" :disabled="isSeeding" @click="handleSeeder('weeklyPlanning')">
              <span v-if="activeSeeder === 'weeklyPlanning'">{{ t('profile.devTools.seeding') }}</span>
              <span v-else>{{ t('profile.devTools.weeklyPlanning') }}</span>
            </AppButton>
            <span class="ml-2 text-xs text-on-surface-variant">{{ t('profile.devTools.weeklyPlanningDesc') }}</span>
          </div>
          <div>
            <AppButton variant="tonal" :disabled="isSeeding" @click="handleSeeder('fullTimeline')">
              <span v-if="activeSeeder === 'fullTimeline'">{{ t('profile.devTools.seeding') }}</span>
              <span v-else>{{ t('profile.devTools.fullTimeline') }}</span>
            </AppButton>
            <span class="ml-2 text-xs text-on-surface-variant">{{ t('profile.devTools.fullTimelineDesc') }}</span>
          </div>
        </div>
      </div>

    </AppCard>

    <!-- Snackbar for feedback -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
import {
  seedFoundation,
  seedHabitsScenario,
  seedProjectsScenario,
  seedWeeklyPlanningScenario,
  seedFullTimeline,
  clearAllData,
  clearPlanningData,
} from '@/utils/seedScenarios'

const API_KEY_STORAGE_KEY = 'openaiApiKey'

const { t } = useT()
const router = useRouter()
const userPreferencesStore = useUserPreferencesStore()
const authStore = useAuthStore()

const username = computed(() => authStore.user?.username || '')
const displayName = computed(() => authStore.user?.displayName || '')

const apiKey = ref('')
const isSeeding = ref(false)
const activeSeeder = ref<string | null>(null)
const weeklyReviewDay = ref(0)
const dailyEmotionTarget = ref(3)
const themePreference = ref<ThemeId>('current')
const languagePreference = ref<LocaleId>('en')
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

const seederMap: Record<string, () => Promise<{ summary: string } | void>> = {
  clearAll: async () => clearAllData(),
  clearPlanning: async () => clearPlanningData(),
  foundation: async () => seedFoundation(),
  habits: async () => seedHabitsScenario(),
  projects: async () => seedProjectsScenario(),
  weeklyPlanning: async () => seedWeeklyPlanningScenario(),
  fullTimeline: async () => seedFullTimeline(),
}

async function handleSeeder(key: string) {
  isSeeding.value = true
  activeSeeder.value = key
  try {
    const fn = seederMap[key]
    if (!fn) throw new Error(`Unknown seeder: ${key}`)
    const result = await fn()
    const message = result && 'summary' in result
      ? result.summary
      : 'Done!'
    snackbarRef.value?.show(message)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Seeder failed.'
    snackbarRef.value?.show(errorMessage)
    console.error(`Error running seeder "${key}":`, error)
  } finally {
    isSeeding.value = false
    activeSeeder.value = null
  }
}

async function handleWeeklyReviewDayChange() {
  try {
    await userPreferencesStore.setWeeklyReviewDay(weeklyReviewDay.value)
    snackbarRef.value?.show(t('profile.feedback.weeklyReviewUpdated'))
  } catch (error) {
    console.error('Error saving weekly review day:', error)
    snackbarRef.value?.show(t('profile.feedback.failedToSave'))
  }
}

async function handleEmotionTargetChange() {
  // Clamp value to valid range
  if (dailyEmotionTarget.value < 1) dailyEmotionTarget.value = 1
  if (dailyEmotionTarget.value > 10) dailyEmotionTarget.value = 10

  try {
    await userPreferencesStore.setDailyEmotionTarget(dailyEmotionTarget.value)
    snackbarRef.value?.show(t('profile.feedback.emotionTargetUpdated'))
  } catch (error) {
    console.error('Error saving emotion target:', error)
    snackbarRef.value?.show(t('profile.feedback.failedToSave'))
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
    weeklyReviewDay.value = userPreferencesStore.weeklyReviewDay
    dailyEmotionTarget.value = userPreferencesStore.dailyEmotionTarget
    themePreference.value = userPreferencesStore.themePreference
    languagePreference.value = userPreferencesStore.locale
  } catch (error) {
    console.error('Error loading settings:', error)
    // Don't show error to user on load - just log it
  }
})
</script>
