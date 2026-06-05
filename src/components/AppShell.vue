<template>
  <div class="min-h-screen flex flex-col">
    <AppTopAppBar :show-back="showBackButton" :back-route="backRoute" />
    <main class="flex-1 overflow-y-auto">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppTopAppBar from './AppTopAppBar.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { applyTheme, DEFAULT_THEME_ID } from '@/services/theme.service'
import { resetAppState } from '@/services/appStateReset'

const route = useRoute()
const authStore = useAuthStore()
const userPreferencesStore = useUserPreferencesStore()

const isJournalEditorRoute = computed(() => {
  return (
    route.path === '/journal/edit' ||
    /^\/journal\/[^/]+\/edit$/.test(route.path)
  )
})

const isEmotionEditorRoute = computed(() => {
  return (
    route.path === '/emotions/edit' ||
    /^\/emotions\/[^/]+\/edit$/.test(route.path)
  )
})

const showBackButton = computed(() => {
  return (
    isJournalEditorRoute.value ||
    isEmotionEditorRoute.value ||
    route.path === '/dev/ai-playground'
  )
})

const backRoute = computed(() => {
  if (isJournalEditorRoute.value) {
    return '/journal'
  }

  if (isEmotionEditorRoute.value) {
    return '/emotions'
  }

  if (route.path === '/dev/ai-playground') {
    return '/profile'
  }

  return undefined
})

async function syncThemeFromPreferences(): Promise<void> {
  if (!authStore.isAuthenticated) {
    applyTheme(DEFAULT_THEME_ID, { persistCache: false })
    return
  }

  await userPreferencesStore.loadPreferences()
  applyTheme(userPreferencesStore.themePreference)
}

onMounted(async () => {
  await syncThemeFromPreferences()
})

// REGISTRATION ORDER MATTERS: this reset watcher MUST be registered
// before the theme watcher below. Vue runs sync watchers in the order
// they were registered, so we want `resetAppState()` (which sets
// `userPreferencesStore.isLoaded = false`) to fire before
// `syncThemeFromPreferences()` calls `loadPreferences()` for the new
// user. Otherwise the new user would briefly see the previous user's
// theme until `loadPreferences()` overwrites it.
//
// No `immediate: true` — on first boot the user transitions from
// `null` → `<id>`, the watcher fires, and `resetAppState()` runs
// against already-default refs (no-op). Acceptable.
watch(
  () => authStore.user?.id,
  (newId, oldId) => {
    if (newId === oldId) return
    resetAppState()
  },
)

// Theme follows the user. Source switched from `isAuthenticated`
// (boolean — wouldn't fire on user A → user B because it stays true)
// to `user?.id` so an in-place user switch also re-applies the new
// user's theme preference.
watch(
  () => authStore.user?.id,
  async () => {
    if (!authStore.isAuthenticated) {
      applyTheme(DEFAULT_THEME_ID, { persistCache: false })
      return
    }
    await syncThemeFromPreferences()
  },
  { immediate: true },
)

watch(
  () => userPreferencesStore.themePreference,
  (theme) => {
    if (!authStore.isAuthenticated) return
    applyTheme(theme)
  },
)
</script>
