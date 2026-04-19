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
    <AppCard v-if="!userProfileStore.hasProfiles" padding="lg" variant="raised" class="text-center">
      <div class="neo-icon-circle mx-auto mb-4 flex items-center justify-center w-16 h-16 rounded-full">
        <AppIcon name="auto_awesome" class="text-3xl text-primary" />
      </div>
      <h2 class="text-lg font-semibold text-on-surface">
        {{ t('profile.psychologicalProfile.emptyState.title') }}
      </h2>
      <p class="text-sm text-on-surface-variant mt-2">
        {{ t('profile.psychologicalProfile.emptyState.body') }}
      </p>
      <div class="mt-4 flex flex-col items-center gap-2">
        <AppButton variant="filled" @click="startBuild">
          {{ t('profile.psychologicalProfile.emptyState.cta') }}
        </AppButton>
      </div>
    </AppCard>

    <!-- Has profiles -->
    <div v-else class="space-y-6">
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

      <!-- Delete button for non-current versions -->
      <div v-if="canDeleteDisplayed" class="flex justify-end">
        <AppButton variant="text" @click="confirmDelete">
          {{ t('profile.psychologicalProfile.deleteVersion') }}
        </AppButton>
      </div>
    </div>

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
import { useRouter } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppDialog from '@/components/AppDialog.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import AppIcon from '@/components/shared/AppIcon.vue'
import ProfileSectionList from '@/components/profile/ProfileSectionList.vue'
import { useUserProfileStore } from '@/stores/userProfile.store'
import { useT } from '@/composables/useT'
import type { UserProfile } from '@/domain/userProfile'

const router = useRouter()
const userProfileStore = useUserProfileStore()
const { t, locale } = useT()

const selectedVersionId = ref<string | null>(null)
const showDeleteDialog = ref(false)
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

onMounted(async () => {
  await userProfileStore.loadProfiles()
  if (userProfileStore.currentProfile) {
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
