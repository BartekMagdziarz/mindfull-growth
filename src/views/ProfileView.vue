<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
    <PageHeader :title="displayName || username || '—'">
      <template #leading>
        <span class="mg-v2-icon-board mg-v2-icon-board--sm profile-avatar" aria-hidden="true">
          {{ avatarInitial }}
        </span>
      </template>
      <template #meta>
        <p class="mg-v2-meta">
          <span v-if="username">@{{ username }}</span>
          <span>{{ t('profile.headerStrip.fallbackEmail') }}</span>
        </p>
      </template>
      <template #actions>
        <AppButton variant="text" @click="handleLogout">
          <AppIcon name="logout" class="text-base" />
          {{ t('common.buttons.signOut') }}
        </AppButton>
      </template>
    </PageHeader>

    <!-- Segmented tab switcher (real tabs: role + aria-selected) -->
    <nav
      class="mg-v2-segmented mb-6"
      role="tablist"
      :aria-label="t('profile.account.title')"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="`profile-tab-${tab.id}`"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        :aria-controls="`profile-panel-${tab.id}`"
        :tabindex="activeTab === tab.id ? 0 : -1"
        @click="setActiveTab(tab.id)"
      >
        {{ t(tab.labelKey) }}
      </button>
    </nav>

    <!-- Active panel -->
    <div
      :id="`profile-panel-${activeTab}`"
      role="tabpanel"
      :aria-labelledby="`profile-tab-${activeTab}`"
    >
      <ProfileTabAccount
        v-if="activeTab === 'account'"
        :show-snackbar="showSnackbar"
      />
      <ProfileTabPreferences
        v-else-if="activeTab === 'preferences'"
        :show-snackbar="showSnackbar"
      />
      <ProfileTabLifeAreas
        v-else-if="activeTab === 'lifeAreas'"
      />
      <ProfileTabPsychProfile
        v-else-if="activeTab === 'psychProfile'"
      />
      <ProfileTabAIAssistant
        v-else-if="activeTab === 'ai'"
        :show-snackbar="showSnackbar"
      />
    </div>

    <div v-if="isDev" class="mt-6 grid gap-4 md:grid-cols-2">
      <AppCard class="border-2 border-dashed border-outline/30">
        <h3 class="mb-1 text-xl font-semibold text-on-surface">Dev: AI Playground</h3>
        <p class="mb-4 text-sm text-on-surface-variant">
          Test prompts and compare reasoning, streaming, token usage, and generation speed.
        </p>
        <AppButton variant="filled" @click="router.push('/dev/ai-playground')">
          Open AI Playground
        </AppButton>
      </AppCard>

      <AppCard class="border-2 border-dashed border-outline/30">
        <h3 class="text-xl font-semibold text-on-surface mb-1">Dev: Chart test data</h3>
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
    </div>

    <!-- Snackbar lives at shell level so it survives tab switches -->
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import ProfileTabAccount from '@/components/profile/ProfileTabAccount.vue'
import ProfileTabPreferences from '@/components/profile/ProfileTabPreferences.vue'
import ProfileTabLifeAreas from '@/components/profile/ProfileTabLifeAreas.vue'
import ProfileTabPsychProfile from '@/components/profile/ProfileTabPsychProfile.vue'
import ProfileTabAIAssistant from '@/components/profile/ProfileTabAIAssistant.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useT } from '@/composables/useT'
import { seedChartTestData, deleteChartTestData } from '@/dev/chartTestSeed'

type TabId = 'account' | 'preferences' | 'lifeAreas' | 'psychProfile' | 'ai'

const { t } = useT()
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const userPreferencesStore = useUserPreferencesStore()
const userProfileStore = useUserProfileStore()

const tabs: Array<{ id: TabId; labelKey: string }> = [
  { id: 'account',       labelKey: 'profile.tabs.account' },
  { id: 'preferences',   labelKey: 'profile.tabs.preferences' },
  { id: 'lifeAreas',     labelKey: 'profile.tabs.lifeAreas' },
  { id: 'psychProfile',  labelKey: 'profile.tabs.psychProfile' },
  { id: 'ai',            labelKey: 'profile.tabs.aiAssistant' },
]

// Map URL hash → tab id. Mirrors the contract of the old single-page
// view (`#ai-settings`) so existing links into the AI section keep working.
const HASH_TO_TAB: Record<string, TabId> = {
  account: 'account',
  preferences: 'preferences',
  appearance: 'preferences',
  language: 'preferences',
  'life-areas': 'lifeAreas',
  lifeareas: 'lifeAreas',
  psychological: 'psychProfile',
  'psych-profile': 'psychProfile',
  'ai-settings': 'ai',
  ai: 'ai',
}

function resolveTabFromHash(hash: string): TabId | null {
  const trimmed = hash.startsWith('#') ? hash.slice(1) : hash
  if (!trimmed) return null
  return HASH_TO_TAB[trimmed] ?? null
}

const activeTab = ref<TabId>(resolveTabFromHash(route.hash) ?? 'preferences')

function setActiveTab(next: TabId) {
  activeTab.value = next
}

watch(
  () => route.hash,
  (next) => {
    const tab = resolveTabFromHash(next)
    if (tab) activeTab.value = tab
  },
)

const username = computed(() => authStore.user?.username ?? '')
const displayName = computed(() => authStore.user?.displayName ?? '')
const avatarInitial = computed(() => {
  const source = displayName.value || username.value
  return source ? source.charAt(0).toUpperCase() : '?'
})

const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
function showSnackbar(message: string) {
  snackbarRef.value?.show(message)
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}

const isDev = import.meta.env.DEV
const seedBusy = ref(false)

async function handleSeed() {
  seedBusy.value = true
  try {
    await seedChartTestData()
    showSnackbar('Chart test data seeded ✅')
  } catch (e) {
    console.error(e)
    showSnackbar('Seeding failed — check console')
  } finally {
    seedBusy.value = false
  }
}

async function handleUnseed() {
  seedBusy.value = true
  try {
    await deleteChartTestData()
    showSnackbar('Seeded data deleted ✅')
  } catch (e) {
    console.error(e)
    showSnackbar('Delete failed — check console')
  } finally {
    seedBusy.value = false
  }
}

onMounted(async () => {
  try {
    await userPreferencesStore.loadPreferences()
  } catch (error) {
    console.error('Error loading user preferences:', error)
  }

  try {
    await userProfileStore.loadProfiles()
  } catch (error) {
    console.error('Error loading psychological profiles:', error)
  }
})
</script>

<style scoped>
.profile-avatar {
  font-size: var(--mg-font-size-lg);
  font-weight: 900;
}
</style>
