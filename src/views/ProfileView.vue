<template>
  <div class="profile-shell mx-auto px-4 py-6">
    <!-- Slim ID strip -->
    <header class="id-strip">
      <span
        class="avatar-bubble"
        aria-hidden="true"
        :style="{ width: '42px', height: '42px', fontSize: '18px' }"
      >{{ avatarInitial }}</span>
      <div class="flex-1 min-w-0">
        <div
          class="text-base font-bold truncate"
          style="color: rgb(var(--neo-text))"
        >{{ displayName || username || '—' }}</div>
        <div
          class="text-[12px] truncate"
          style="color: rgb(var(--neo-muted))"
        >
          <span v-if="username">@{{ username }}</span>
          <span v-if="username"> · </span>
          <span>{{ t('profile.headerStrip.fallbackEmail') }}</span>
        </div>
      </div>
      <button
        type="button"
        class="neo-pill px-3 py-2 text-[12px] font-semibold gap-[6px]"
        @click="handleLogout"
      >
        <span class="material-symbols-outlined text-[16px]">logout</span>
        {{ t('common.buttons.signOut') }}
      </button>
    </header>

    <!-- Segmented tab switcher -->
    <nav
      class="neo-segmented w-full mb-[14px]"
      role="tablist"
      :aria-label="t('profile.account.title')"
    >
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :id="`profile-tab-${tab.id}`"
        type="button"
        role="tab"
        class="neo-segmented__item flex-1 text-[12px] sm:text-[13px]"
        :class="{ 'neo-segmented__item--active': activeTab === tab.id }"
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

    <!-- Dev-only: Chart test data seed (kept outside tabs to avoid noise) -->
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
.profile-shell {
  max-width: 880px;
}

.id-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 8px 16px;
}

.avatar-bubble {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 9999px;
  background: linear-gradient(
    145deg,
    rgb(var(--neo-surface-top)),
    rgb(var(--neo-surface-bottom))
  );
  box-shadow:
    -4px -4px 8px rgb(var(--neo-shadow-light) / 0.8),
    4px 4px 8px rgb(var(--neo-shadow-dark) / 0.33);
  color: rgb(var(--neo-focus));
  font-weight: 700;
}
</style>
