import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  UserProfile,
  CreateUserProfilePayload,
  UpdateUserProfilePayload,
  UserProfileScope,
  ProfileBuildLogEntry,
} from '@/domain/userProfile'
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'

export const useUserProfileStore = defineStore('userProfile', () => {
  // ---- State ----
  const profiles = ref<UserProfile[]>([])
  const buildLogs = ref<ProfileBuildLogEntry[]>([])
  const isLoading = ref(false)
  const isBuilding = ref(false)
  const error = ref<string | null>(null)

  // ---- Computed ----
  const sortedProfiles = computed(() =>
    [...profiles.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )

  const currentProfile = computed<UserProfile | undefined>(
    () => sortedProfiles.value[0],
  )

  const getById = computed(() => {
    return (id: string): UserProfile | undefined =>
      profiles.value.find((p) => p.id === id)
  })

  const hasProfiles = computed(() => profiles.value.length > 0)

  // ---- Actions ----

  async function loadProfiles(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      profiles.value = await userProfileDexieRepository.list()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load profiles'
      console.error('Error loading user profiles:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function loadBuildLogs(limit = 100): Promise<void> {
    try {
      buildLogs.value = await profileBuildLogDexieRepository.list(limit)
    } catch (err) {
      console.warn('Failed to load profile build logs:', err)
    }
  }

  async function createProfile(
    payload: CreateUserProfilePayload,
  ): Promise<UserProfile> {
    const created = await userProfileDexieRepository.create(payload)
    profiles.value = [created, ...profiles.value]
    return created
  }

  async function updateProfile(
    id: string,
    payload: UpdateUserProfilePayload,
  ): Promise<UserProfile> {
    const updated = await userProfileDexieRepository.update(id, payload)
    const idx = profiles.value.findIndex((p) => p.id === id)
    if (idx !== -1) profiles.value[idx] = updated
    return updated
  }

  async function deleteProfile(id: string): Promise<void> {
    // Protection rule: cannot delete the currently-latest profile
    // if other profiles exist. Story 6 will surface this in UI.
    const sorted = sortedProfiles.value
    if (sorted.length > 1 && sorted[0].id === id) {
      throw new Error(
        'Cannot delete the current (most recent) profile while older versions exist',
      )
    }
    await userProfileDexieRepository.delete(id)
    profiles.value = profiles.value.filter((p) => p.id !== id)
  }

  async function clearBuildLogs(): Promise<void> {
    await profileBuildLogDexieRepository.clearAll()
    buildLogs.value = []
  }

  /**
   * Story 4 will implement the full build pipeline. Story 1 leaves a stub
   * so other stories can compile against it and so tests can exercise
   * the contract. Signature is stable.
   */
  async function buildProfile(scope: UserProfileScope): Promise<UserProfile> {
    if (!scope || !Array.isArray(scope.dataTypes) || scope.dataTypes.length === 0) {
      throw new Error('Scope must include at least one data type')
    }
    throw new Error('buildProfile is not implemented yet (Story 4)')
  }

  return {
    // state
    profiles,
    buildLogs,
    isLoading,
    isBuilding,
    error,
    // computed
    sortedProfiles,
    currentProfile,
    getById,
    hasProfiles,
    // actions
    loadProfiles,
    loadBuildLogs,
    createProfile,
    updateProfile,
    deleteProfile,
    clearBuildLogs,
    buildProfile,
  }
})
