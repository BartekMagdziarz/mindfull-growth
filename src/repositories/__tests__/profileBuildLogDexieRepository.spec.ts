import { describe, it, expect, beforeEach } from 'vitest'
import { profileBuildLogDexieRepository } from '../profileBuildLogDexieRepository'
import { resetDatabase } from '@/__tests__/utils/dbTestUtils'
import type { CreateProfileBuildLogPayload } from '@/domain/userProfile'

function makePayload(
  overrides: Partial<CreateProfileBuildLogPayload> = {},
): CreateProfileBuildLogPayload {
  return {
    scope: {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    model: 'gpt-test',
    requestBody: '{"prompt":"hi"}',
    responseBody: '{"content":"ok"}',
    latencyMs: 100,
    success: true,
    ...overrides,
  }
}

describe('profileBuildLogDexieRepository', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe('add', () => {
    it('assigns id and timestamp', async () => {
      const added = await profileBuildLogDexieRepository.add(makePayload())

      expect(added.id).toBeTruthy()
      expect(typeof added.id).toBe('string')
      expect(added.timestamp).toBeTruthy()
      expect(new Date(added.timestamp).toString()).not.toBe('Invalid Date')
    })

    it('persists all payload fields', async () => {
      const added = await profileBuildLogDexieRepository.add(
        makePayload({
          success: false,
          errorMessage: 'boom',
          latencyMs: 250,
          tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          resultProfileId: undefined,
        }),
      )

      const fetched = await profileBuildLogDexieRepository.getById(added.id)
      expect(fetched).toBeDefined()
      expect(fetched?.success).toBe(false)
      expect(fetched?.errorMessage).toBe('boom')
      expect(fetched?.latencyMs).toBe(250)
      expect(fetched?.tokenUsage?.totalTokens).toBe(30)
    })
  })

  describe('list', () => {
    it('returns entries in reverse-chronological order by timestamp', async () => {
      const first = await profileBuildLogDexieRepository.add(makePayload({ model: 'm1' }))
      await new Promise((r) => setTimeout(r, 10))
      const second = await profileBuildLogDexieRepository.add(makePayload({ model: 'm2' }))
      await new Promise((r) => setTimeout(r, 10))
      const third = await profileBuildLogDexieRepository.add(makePayload({ model: 'm3' }))

      const list = await profileBuildLogDexieRepository.list()

      expect(list.map((l) => l.id)).toEqual([third.id, second.id, first.id])
    })

    it('respects the limit parameter', async () => {
      await profileBuildLogDexieRepository.add(makePayload({ model: 'a' }))
      await new Promise((r) => setTimeout(r, 5))
      await profileBuildLogDexieRepository.add(makePayload({ model: 'b' }))
      await new Promise((r) => setTimeout(r, 5))
      await profileBuildLogDexieRepository.add(makePayload({ model: 'c' }))

      const list = await profileBuildLogDexieRepository.list(2)
      expect(list).toHaveLength(2)
    })

    it('defaults to a limit of 100 when no argument is passed', async () => {
      await profileBuildLogDexieRepository.add(makePayload())
      const list = await profileBuildLogDexieRepository.list()
      expect(list).toHaveLength(1)
    })
  })

  describe('update', () => {
    it('updates an existing log entry with the supplied patch', async () => {
      const added = await profileBuildLogDexieRepository.add(
        makePayload({ resultProfileId: undefined }),
      )

      const updated = await profileBuildLogDexieRepository.update(added.id, {
        resultProfileId: 'profile-123',
      })

      expect(updated.resultProfileId).toBe('profile-123')
      expect(updated.id).toBe(added.id)
      // Other fields are preserved unchanged.
      expect(updated.model).toBe(added.model)
      expect(updated.success).toBe(added.success)

      const refetched = await profileBuildLogDexieRepository.getById(added.id)
      expect(refetched?.resultProfileId).toBe('profile-123')
    })

    it('throws a "not found" error for an unknown id', async () => {
      await expect(
        profileBuildLogDexieRepository.update('does-not-exist', {
          resultProfileId: 'x',
        }),
      ).rejects.toThrow('Build log does-not-exist not found')
    })
  })

  describe('clearAll', () => {
    it('empties the table', async () => {
      await profileBuildLogDexieRepository.add(makePayload())
      await profileBuildLogDexieRepository.add(makePayload())
      await profileBuildLogDexieRepository.clearAll()

      const list = await profileBuildLogDexieRepository.list()
      expect(list).toEqual([])
    })
  })
})
