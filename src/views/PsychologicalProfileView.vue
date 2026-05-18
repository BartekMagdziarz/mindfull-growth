<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-28">
    <!-- Header -->
    <div class="flex items-center gap-4 mb-6">
      <button
        type="button"
        class="neo-back-btn p-2 text-neu-text neo-focus"
        :aria-label="t('common.buttons.back')"
        @click="goBack"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div class="min-w-0">
        <h1 class="text-xl font-bold text-on-surface">
          {{ t('profile.psychologicalProfile.title') }}
        </h1>
        <p class="text-sm text-on-surface-variant">
          {{ t('profile.psychologicalProfile.description') }}
        </p>
      </div>
    </div>

    <!-- Empty state -->
    <PsychologicalProfileFoundationView
      v-if="!userProfileStore.hasProfiles"
      embedded
      :load-on-mount="false"
    />

    <!-- Has profiles -->
    <div v-else class="space-y-6">
      <FoundationRefreshBanner
        v-if="showRefreshBanner"
        :outdated-count="outdatedCount"
        @open="goToFoundation"
        @dismiss="dismissFoundationRefreshBanner"
      />

      <!-- Header action row -->
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <p class="text-xs text-on-surface-variant uppercase tracking-wide">
            {{ t('profile.psychologicalProfile.currentVersion') }}
          </p>
          <p class="text-sm text-on-surface mt-1">
            {{ formatTimestamp(displayedProfile.createdAt, locale) }}
          </p>
          <p
            v-if="displayedProfile.note"
            class="text-xs text-on-surface-variant mt-1 italic"
          >
            {{ displayedProfile.note }}
          </p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <AppButton variant="filled" @click="startBuild">
            {{ t('profile.psychologicalProfile.buildNew') }}
          </AppButton>
        </div>
      </div>

      <!-- Version switcher -->
      <div v-if="userProfileStore.sortedProfiles.length > 1">
        <label for="profileVersionSelect" class="block text-xs text-on-surface-variant mb-1">
          {{ t('profile.psychologicalProfile.versionPicker.label') }}
        </label>
        <select
          id="profileVersionSelect"
          v-model="selectedVersionId"
          class="neo-input w-full p-3 text-sm"
        >
          <option
            v-for="p in userProfileStore.sortedProfiles"
            :key="p.id"
            :value="p.id"
          >
            {{ formatVersionOption(p) }}
          </option>
        </select>
      </div>

      <!-- Displayed profile sections -->
      <AppCard padding="lg" variant="raised">
        <ProfileSectionList :profile="displayedProfile" />
      </AppCard>

      <!-- Per-version actions: Edit (always) + Delete (disabled when current
           version is protected by siblings, with helper text). -->
      <div class="flex flex-col items-end gap-1">
        <div class="flex items-center gap-2">
          <AppButton
            variant="text"
            data-test-edit-version
            @click="editVersion(displayedProfile)"
          >
            <AppIcon name="edit" class="text-base mr-1" />
            {{ t('profile.psychologicalProfile.editVersion') }}
          </AppButton>
          <AppButton
            variant="text"
            :disabled="!canDeleteDisplayed"
            data-test-delete-version
            @click="confirmDelete"
          >
            {{ t('profile.psychologicalProfile.deleteVersion') }}
          </AppButton>
        </div>
        <p
          v-if="!canDeleteDisplayed"
          class="text-xs text-on-surface-variant text-right max-w-md"
          data-test-delete-blocked
        >
          {{ t('profile.psychologicalProfile.cannotDeleteCurrent') }}
        </p>
      </div>
    </div>

    <!-- Profile context defaults: each AI button has a per-call toggle, but
         these defaults seed the initial state. Always visible so the user
         can flip them before they have built a profile; a hint appears
         when a default is on but no profile exists yet. -->
    <AppCard class="mt-6" padding="md" variant="raised">
      <div class="space-y-4">
        <div class="min-w-0">
          <h3 class="text-base font-semibold text-on-surface">
            {{ t('profile.psychologicalProfile.profileContextDefaults.title') }}
          </h3>
          <p class="text-sm text-on-surface-variant mt-1">
            {{ t('profile.psychologicalProfile.profileContextDefaults.description') }}
          </p>
          <p
            v-if="(profileContextDefault || profileContextDefaultJournal) && !userProfileStore.currentProfile"
            class="text-xs text-on-surface-variant mt-2"
            data-test-profile-context-no-profile
          >
            {{ t('profile.psychologicalProfile.profileContextDefaults.noProfileWarning') }}
          </p>
        </div>

        <!-- General default -->
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm text-on-surface flex-1 min-w-0">
            {{ t('profile.psychologicalProfile.profileContextDefaults.general') }}
          </p>
          <button
            type="button"
            role="switch"
            :aria-checked="profileContextDefault"
            :aria-label="t('profile.psychologicalProfile.profileContextDefaults.general')"
            :class="[
              'neo-toggle-track',
              profileContextDefault ? 'neo-toggle-track--on' : 'neo-toggle-track--off',
            ]"
            data-test-profile-context-default-toggle
            @click="toggleProfileContextDefault"
          >
            <span
              class="neo-toggle-thumb"
              :style="{
                transform: profileContextDefault
                  ? 'translateX(1.25rem)'
                  : 'translateX(0.1rem)',
              }"
            />
          </button>
        </div>

        <!-- Journal default -->
        <div class="flex items-center justify-between gap-4">
          <p class="text-sm text-on-surface flex-1 min-w-0">
            {{ t('profile.psychologicalProfile.profileContextDefaults.journal') }}
          </p>
          <button
            type="button"
            role="switch"
            :aria-checked="profileContextDefaultJournal"
            :aria-label="t('profile.psychologicalProfile.profileContextDefaults.journal')"
            :class="[
              'neo-toggle-track',
              profileContextDefaultJournal ? 'neo-toggle-track--on' : 'neo-toggle-track--off',
            ]"
            data-test-profile-context-default-journal-toggle
            @click="toggleProfileContextDefaultJournal"
          >
            <span
              class="neo-toggle-thumb"
              :style="{
                transform: profileContextDefaultJournal
                  ? 'translateX(1.25rem)'
                  : 'translateX(0.1rem)',
              }"
            />
          </button>
        </div>
      </div>
    </AppCard>

    <!-- Dev-only: build log inspector (hidden in production builds) -->
    <ProfileBuildLogPanel v-if="isDev" />

    <!-- Delete confirmation -->
    <AppDialog
      v-model="showDeleteDialog"
      :title="t('profile.psychologicalProfile.deleteDialog.title')"
      :message="t('profile.psychologicalProfile.deleteDialog.message')"
      :confirm-text="t('common.buttons.delete')"
      :cancel-text="t('common.buttons.cancel')"
      confirm-variant="filled"
      @confirm="handleDelete"
    />

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ProfileSectionList from '@/components/profile/ProfileSectionList.vue'
import ProfileBuildLogPanel from '@/components/profile/ProfileBuildLogPanel.vue'
import FoundationRefreshBanner from '@/components/profile/FoundationRefreshBanner.vue'
import PsychologicalProfileFoundationView from '@/views/PsychologicalProfileFoundationView.vue'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'
import { useT } from '@/composables/useT'
import type { UserProfile } from '@/domain/userProfile'
import {
  computeFoundationStatuses,
  isFoundationOutdated,
  loadFoundationSourceData,
} from '@/services/foundationCompleteness'

const router = useRouter()
const route = useRoute()
const userProfileStore = useUserProfileStore()
const userPreferencesStore = useUserPreferencesStore()
const { t, locale } = useT()

// Compile-time gate. Tree-shaken out of production bundles by Vite.
const isDev = import.meta.env.DEV

// Hand-off key written by `editVersion()` and consumed by the wizard's
// `loadDraft()` to seed the editor with an existing version's content.
const EDIT_SOURCE_SESSION_KEY = 'profile-build-edit-source'
const BANNER_RESHOW_DAYS = 30

const selectedVersionId = ref<string | null>(null)
const showDeleteDialog = ref(false)
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)
const dismissedFoundationRefreshThisSession = ref(false)

const profileContextDefault = computed(
  () => userPreferencesStore.profileContextDefault,
)
const profileContextDefaultJournal = computed(
  () => userPreferencesStore.profileContextDefaultJournal,
)

const foundationStatuses = computed(() => computeFoundationStatuses())
const outdatedCount = computed(() =>
  foundationStatuses.value.filter((status) => status.state === 'outdated').length,
)

const dismissedRecently = computed(() => {
  const at = userPreferencesStore.foundationRefreshDismissedAt
  if (!at) return false

  const timestamp = Date.parse(at)
  if (Number.isNaN(timestamp)) return false

  const days = (Date.now() - timestamp) / 86_400_000
  return days < BANNER_RESHOW_DAYS
})

const showRefreshBanner = computed(() =>
  userProfileStore.hasProfiles &&
  isFoundationOutdated(foundationStatuses.value) &&
  !dismissedRecently.value &&
  !dismissedFoundationRefreshThisSession.value,
)

async function toggleProfileContextDefault() {
  try {
    await userPreferencesStore.setProfileContextDefault(
      !userPreferencesStore.profileContextDefault,
    )
    snackbarRef.value?.show(
      t('profile.psychologicalProfile.profileContextDefaults.toggleFeedback'),
    )
  } catch (err) {
    snackbarRef.value?.show(
      t('profile.psychologicalProfile.profileContextDefaults.toggleError'),
    )
    console.error('Failed to toggle profile context default:', err)
  }
}

async function toggleProfileContextDefaultJournal() {
  try {
    await userPreferencesStore.setProfileContextDefaultJournal(
      !userPreferencesStore.profileContextDefaultJournal,
    )
    snackbarRef.value?.show(
      t('profile.psychologicalProfile.profileContextDefaults.toggleFeedback'),
    )
  } catch (err) {
    snackbarRef.value?.show(
      t('profile.psychologicalProfile.profileContextDefaults.toggleError'),
    )
    console.error('Failed to toggle profile context default (journal):', err)
  }
}

onMounted(async () => {
  await Promise.all([
    userProfileStore.loadProfiles(),
    userPreferencesStore.loadPreferences(),
    loadFoundationSourceData(),
  ])
  // If we arrived from the wizard with `?versionId=<id>`, preselect that
  // version (e.g. just-saved profile). Otherwise fall back to the current.
  const queryId = typeof route.query.versionId === 'string'
    ? route.query.versionId
    : undefined
  if (queryId && userProfileStore.getById(queryId)) {
    selectedVersionId.value = queryId
  } else if (userProfileStore.currentProfile) {
    selectedVersionId.value = userProfileStore.currentProfile.id
  }
})

// Keep the selection valid when the store changes (e.g. after delete/seed).
watch(
  () => userProfileStore.sortedProfiles,
  (list) => {
    if (list.length === 0) {
      selectedVersionId.value = null
      return
    }
    if (!selectedVersionId.value) {
      selectedVersionId.value = list[0].id
      return
    }
    if (!list.some((p) => p.id === selectedVersionId.value)) {
      selectedVersionId.value = list[0].id
    }
  },
  { deep: true },
)

const displayedProfile = computed<UserProfile>(() => {
  const id = selectedVersionId.value
  const match = id ? userProfileStore.getById(id) : undefined
  // `hasProfiles` gate in the template ensures `currentProfile` is defined here.
  return match ?? (userProfileStore.currentProfile as UserProfile)
})

const canDeleteDisplayed = computed(() => {
  const list = userProfileStore.sortedProfiles
  if (list.length === 0) return false
  // Sole version: deletion allowed (store permits it).
  if (list.length === 1) return true
  // 2+ versions: only non-current (non-latest) may be deleted.
  return displayedProfile.value.id !== list[0].id
})

function goBack() {
  router.push({ name: 'profile' })
}

function startBuild() {
  router.push({ name: 'profile-psychological-build' })
}

function goToFoundation() {
  router.push({ name: 'profile-psychological-foundation' })
}

async function dismissFoundationRefreshBanner() {
  dismissedFoundationRefreshThisSession.value = true
  try {
    await userPreferencesStore.setFoundationRefreshDismissedAt(
      new Date().toISOString(),
    )
  } catch (err) {
    dismissedFoundationRefreshThisSession.value = false
    console.error('Failed to dismiss foundation refresh banner:', err)
  }
}

// Fork an existing version: stash its id in sessionStorage and route to the
// build wizard. The wizard's `loadDraft()` reads the key, hydrates from the
// source profile, and jumps to the Review step. This always creates a NEW
// version on save (immutable history); the source is never mutated.
function editVersion(profile: UserProfile) {
  try {
    sessionStorage.setItem(EDIT_SOURCE_SESSION_KEY, profile.id)
  } catch {
    // Private mode / quota — fall back to a fresh build (no fork).
  }
  router.push({ name: 'profile-psychological-build' })
}

function confirmDelete() {
  showDeleteDialog.value = true
}

async function handleDelete() {
  const id = displayedProfile.value.id
  try {
    await userProfileStore.deleteProfile(id)
    snackbarRef.value?.show(t('profile.psychologicalProfile.deleteDialog.success'))
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    snackbarRef.value?.show(msg)
  }
}

function formatTimestamp(iso: string, localeId: string): string {
  try {
    return new Intl.DateTimeFormat(localeId, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatVersionOption(p: UserProfile): string {
  const when = formatTimestamp(p.createdAt, locale.value)
  return p.note ? `${when} — ${p.note}` : when
}
</script>
