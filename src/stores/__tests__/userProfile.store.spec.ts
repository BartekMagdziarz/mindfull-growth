import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useUserProfileStore } from '../userProfile.store'
import { createEmptySections } from '@/domain/userProfile'
import type { UserProfile, UserProfileScope } from '@/domain/userProfile'

// Mock the repositories
vi.mock('@/repositories/userProfileDexieRepository', () => ({
  userProfileDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
  },
}))

vi.mock('@/repositories/profileBuildLogDexieRepository', () => ({
  profileBuildLogDexieRepository: {
    list: vi.fn(),
    getById: vi.fn(),
    add: vi.fn(),
    clearAll: vi.fn(),
  },
}))

// Access the mocked repositories
import { userProfileDexieRepository } from '@/repositories/userProfileDexieRepository'
import { profileBuildLogDexieRepository } from '@/repositories/profileBuildLogDexieRepository'

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  const base: UserProfile = {
    id: overrides.id ?? 'profile-' + Math.random().toString(36).slice(2, 10),
    createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-01-01T00:00:00.000Z',
    note: overrides.note,
    scope:
      overrides.scope ??
      ({
        dataTypes: ['journal'],
        dateRange: { kind: 'preset', preset: 'last30' },
        includedObjectIds: {},
        approxTokenCount: 0,
        locale: 'en',
        grammaticalGender: 'masculine',
      } satisfies UserProfileScope),
    sections: overrides.sections ?? createEmptySections(),
    rawResponse: overrides.rawResponse ?? '',
    model: overrides.model ?? 'gpt-test',
  }
  return base
}

describe('useUserProfileStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('loadProfiles', () => {
    it('populates profiles from the repository', async () => {
      const a = makeProfile({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' })
      const b = makeProfile({ id: 'b', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([b, a])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(userProfileDexieRepository.list).toHaveBeenCalledOnce()
      expect(store.profiles).toEqual([b, a])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('captures error message on repository failure', async () => {
      vi.mocked(userProfileDexieRepository.list).mockRejectedValue(new Error('boom'))
      const store = useUserProfileStore()
      await store.loadProfiles()
      expect(store.error).toBe('boom')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createProfile', () => {
    it('prepends the created profile to the profiles array', async () => {
      const existing = makeProfile({ id: 'existing', createdAt: '2026-01-01T00:00:00.000Z' })
      const created = makeProfile({ id: 'new', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([existing])
      vi.mocked(userProfileDexieRepository.create).mockResolvedValue(created)

      const store = useUserProfileStore()
      await store.loadProfiles()

      const result = await store.createProfile({
        scope: created.scope,
        sections: created.sections,
        rawResponse: created.rawResponse,
        model: created.model,
      })

      expect(result).toEqual(created)
      expect(store.profiles[0]).toEqual(created)
      expect(store.profiles[1]).toEqual(existing)
      expect(store.profiles).toHaveLength(2)
    })
  })

  describe('updateProfile', () => {
    it('replaces the matching record and returns the updated profile', async () => {
      const original = makeProfile({ id: 'p1', note: 'first' })
      const updated = makeProfile({ id: 'p1', note: 'edited' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([original])
      vi.mocked(userProfileDexieRepository.update).mockResolvedValue(updated)

      const store = useUserProfileStore()
      await store.loadProfiles()

      const result = await store.updateProfile('p1', { note: 'edited' })

      expect(userProfileDexieRepository.update).toHaveBeenCalledWith('p1', { note: 'edited' })
      expect(result).toEqual(updated)
      expect(store.profiles[0]).toEqual(updated)
      expect(store.profiles).toHaveLength(1)
    })
  })

  describe('deleteProfile', () => {
    it('removes a non-current profile', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const current = makeProfile({ id: 'current', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([current, older])
      vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)

      const store = useUserProfileStore()
      await store.loadProfiles()

      await store.deleteProfile('older')

      expect(userProfileDexieRepository.delete).toHaveBeenCalledWith('older')
      expect(store.profiles.map((p) => p.id)).toEqual(['current'])
    })

    it('throws when called on the current profile while older versions exist', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const current = makeProfile({ id: 'current', createdAt: '2026-02-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([current, older])

      const store = useUserProfileStore()
      await store.loadProfiles()

      await expect(store.deleteProfile('current')).rejects.toThrow(
        'Cannot delete the current (most recent) profile while older versions exist',
      )
      expect(userProfileDexieRepository.delete).not.toHaveBeenCalled()
      expect(store.profiles).toHaveLength(2)
    })

    it('succeeds when there is only one profile (even though it is the current)', async () => {
      const only = makeProfile({ id: 'only' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([only])
      vi.mocked(userProfileDexieRepository.delete).mockResolvedValue(undefined)

      const store = useUserProfileStore()
      await store.loadProfiles()

      await store.deleteProfile('only')

      expect(userProfileDexieRepository.delete).toHaveBeenCalledWith('only')
      expect(store.profiles).toEqual([])
    })
  })

  describe('buildProfile stub', () => {
    it('throws when dataTypes is empty', async () => {
      const store = useUserProfileStore()
      await expect(
        store.buildProfile({
          dataTypes: [],
          dateRange: { kind: 'preset', preset: 'last30' },
          includedObjectIds: {},
          approxTokenCount: 0,
          locale: 'en',
          grammaticalGender: 'masculine',
        }),
      ).rejects.toThrow('Scope must include at least one data type')
    })

    it('throws "not implemented yet" when scope is valid', async () => {
      const store = useUserProfileStore()
      await expect(
        store.buildProfile({
          dataTypes: ['journal'],
          dateRange: { kind: 'preset', preset: 'last30' },
          includedObjectIds: {},
          approxTokenCount: 0,
          locale: 'en',
          grammaticalGender: 'masculine',
        }),
      ).rejects.toThrow('buildProfile is not implemented yet (Story 4)')
    })
  })

  describe('computed getters', () => {
    it('sortedProfiles is reverse-chronological regardless of input order', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const middle = makeProfile({ id: 'middle', createdAt: '2026-02-01T00:00:00.000Z' })
      const newest = makeProfile({ id: 'newest', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([middle, older, newest])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.sortedProfiles.map((p) => p.id)).toEqual(['newest', 'middle', 'older'])
    })

    it('currentProfile returns the newest', async () => {
      const older = makeProfile({ id: 'older', createdAt: '2026-01-01T00:00:00.000Z' })
      const newest = makeProfile({ id: 'newest', createdAt: '2026-03-01T00:00:00.000Z' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([older, newest])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.currentProfile?.id).toBe('newest')
    })

    it('hasProfiles reflects current state', async () => {
      const store = useUserProfileStore()
      expect(store.hasProfiles).toBe(false)

      const p = makeProfile()
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([p])
      await store.loadProfiles()
      expect(store.hasProfiles).toBe(true)
    })

    it('getById finds a profile by id', async () => {
      const p = makeProfile({ id: 'target' })
      vi.mocked(userProfileDexieRepository.list).mockResolvedValue([p])

      const store = useUserProfileStore()
      await store.loadProfiles()

      expect(store.getById('target')?.id).toBe('target')
      expect(store.getById('missing')).toBeUndefined()
    })
  })

  describe('build logs', () => {
    it('loadBuildLogs populates buildLogs', async () => {
      const log = {
        id: 'log1',
        timestamp: '2026-01-01T00:00:00.000Z',
        scope: {
          dataTypes: ['journal' as const],
          dateRange: { kind: 'preset' as const, preset: 'last30' as const },
          includedObjectIds: {},
          approxTokenCount: 0,
          locale: 'en' as const,
          grammaticalGender: 'masculine' as const,
        },
        model: 'gpt-test',
        requestBody: '{}',
        responseBody: '{}',
        latencyMs: 0,
        success: true,
      }
      vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([log])

      const store = useUserProfileStore()
      await store.loadBuildLogs()

      expect(profileBuildLogDexieRepository.list).toHaveBeenCalledWith(100)
      expect(store.buildLogs).toEqual([log])
    })

    it('clearBuildLogs empties the buildLogs ref', async () => {
      const store = useUserProfileStore()
      // seed
      vi.mocked(profileBuildLogDexieRepository.list).mockResolvedValue([])
      await store.loadBuildLogs()
      vi.mocked(profileBuildLogDexieRepository.clearAll).mockResolvedValue(undefined)

      await store.clearBuildLogs()

      expect(profileBuildLogDexieRepository.clearAll).toHaveBeenCalledOnce()
      expect(store.buildLogs).toEqual([])
    })

    it('loadBuildLogs swallows errors with a warn', async () => {
      vi.mocked(profileBuildLogDexieRepository.list).mockRejectedValue(new Error('log fail'))
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const store = useUserProfileStore()
      await store.loadBuildLogs()

      expect(warn).toHaveBeenCalled()
      warn.mockRestore()
    })
  })
})
