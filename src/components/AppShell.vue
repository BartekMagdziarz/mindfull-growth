<template>
  <div class="min-h-screen flex flex-col">
    <AppNavDock
      :pinned="userPreferencesStore.dockPinned"
      @update:pinned="userPreferencesStore.setDockPinned($event)"
    />
    <button
      v-if="showBackButton && backRoute"
      type="button"
      class="neo-back-btn neo-focus fixed top-4 z-30 p-2 text-neu-text"
      :class="userPreferencesStore.dockPinned ? 'left-[122px]' : 'left-10'"
      :aria-label="t('common.buttons.back')"
      @click="router.push(backRoute)"
    >
      <AppIcon name="arrow_back" class="text-xl" />
    </button>
    <main class="flex-1 overflow-y-auto" :class="mainClasses">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppNavDock from './AppNavDock.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { applyTheme, DEFAULT_THEME_ID } from '@/services/theme.service'
import { resetAppState } from '@/services/appStateReset'

const route = useRoute()
const router = useRouter()
const { t } = useT()
const authStore = useAuthStore()
const userPreferencesStore = useUserPreferencesStore()

// Pinned dock pushes content right via padding (not margin) so main's
// scrollbar stays at the viewport edge. The padding transition is gated on
// isLoaded — preferences arrive async from Dexie, and animating the initial
// 0 → 106px jump on every app boot would read as layout jank.
const mainClasses = computed(() => [
  userPreferencesStore.dockPinned ? 'pl-[106px]' : '',
  userPreferencesStore.isLoaded ? 'transition-[padding] duration-300' : '',
])

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
