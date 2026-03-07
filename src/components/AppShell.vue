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
  return isJournalEditorRoute.value || isEmotionEditorRoute.value
})

const backRoute = computed(() => {
  if (isJournalEditorRoute.value) {
    return '/journal'
  }

  if (isEmotionEditorRoute.value) {
    return '/emotions'
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

watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (!isAuthenticated) {
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
