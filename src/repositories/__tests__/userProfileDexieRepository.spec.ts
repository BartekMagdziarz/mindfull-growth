import { describe, it, expect, beforeEach } from 'vitest'
import { userProfileDexieRepository } from '../userProfileDexieRepository'
import { resetDatabase } from '@/__tests__/utils/dbTestUtils'
import { createEmptySections } from '@/domain/userProfile'
import type { CreateUserProfilePayload } from '@/domain/userProfile'

function makePayload(overrides: Partial<CreateUserProfilePayload> = {}): CreateUserProfilePayload {
  return {
    scope: {
      dataTypes: ['journal'],
      dateRange: { kind: 'preset', preset: 'last30' },
      includedObjectIds: {},
      approxTokenCount: 0,
      locale: 'en',
      grammaticalGender: 'masculine',
    },
    sections: createEmptySections(),
    rawResponse: 'raw',
    model: 'gpt-test',
    ...overrides,
  }
}

describe('userProfileDexieRepository', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  describe('create', () => {
    it('assigns id, createdAt, and updatedAt', async () => {
      const created = await userProfileDexieRepository.create(makePayload())

      expect(created.id).toBeTruthy()
      expect(typeof created.id).toBe('string')
      expect(created.id.length).toBeGreaterThan(0)
      expect(created.createdAt).toBeTruthy()
      expect(created.updatedAt).toBeTruthy()
      expect(new Date(created.createdAt).toString()).not.toBe('Invalid Date')
      expect(new Date(created.updatedAt).toString()).not.toBe('Invalid Date')
      expect(created.createdAt).toBe(created.updatedAt)
    })

    it('persists fields from the payload', async () => {
      const payload = makePayload({
        note: 'After Big Five',
        rawResponse: '## Summary\nHello',
        model: 'gpt-4o',
      })
      const created = await userProfileDexieRepository.create(payload)
      const fetched = await userProfileDexieRepository.getById(created.id)

      expect(fetched).toBeDefined()
      expect(fetched?.note).toBe('After Big Five')
      expect(fetched?.rawResponse).toBe('## Summary\nHello')
      expect(fetched?.model).toBe('gpt-4o')
      expect(fetched?.scope.dataTypes).toEqual(['journal'])
    })
  })

  describe('update', () => {
    it('bumps updatedAt and preserves createdAt', async () => {
      const created = await userProfileDexieRepository.create(makePayload())

      // wait briefly so updatedAt ISO differs
      await new Promise((r) => setTimeout(r, 5))

      const updated = await userProfileDexieRepository.update(created.id, { note: 'edited' })

      expect(updated.id).toBe(created.id)
      expect(updated.createdAt).toBe(created.createdAt)
      expect(updated.updatedAt).not.toBe(created.updatedAt)
      expect(updated.note).toBe('edited')
    })

    it('merges partial payloads without clobbering untouched fields', async () => {
      const created = await userProfileDexieRepository.create(
        makePayload({ note: 'initial', model: 'gpt-a' }),
      )

      const updated = await userProfileDexieRepository.update(created.id, { note: 'changed' })

      expect(updated.note).toBe('changed')
      expect(updated.model).toBe('gpt-a')
      expect(updated.scope).toEqual(created.scope)
    })

    it('throws when updating a non-existent profile', async () => {
      await expect(
        userProfileDexieRepository.update('does-not-exist', { note: 'x' }),
      ).rejects.toThrow(/not found/)
    })
  })

  describe('list', () => {
    it('returns profiles in reverse-chronological order by createdAt', async () => {
      const first = await userProfileDexieRepository.create(makePayload({ note: 'first' }))
      await new Promise((r) => setTimeout(r, 10))
      const second = await userProfileDexieRepository.create(makePayload({ note: 'second' }))
      await new Promise((r) => setTimeout(r, 10))
      const third = await userProfileDexieRepository.create(makePayload({ note: 'third' }))

      const list = await userProfileDexieRepository.list()

      expect(list.map((p) => p.id)).toEqual([third.id, second.id, first.id])
    })
  })

  describe('delete', () => {
    it('removes the row', async () => {
      const created = await userProfileDexieRepository.create(makePayload())
      await userProfileDexieRepository.delete(created.id)

      const fetched = await userProfileDexieRepository.getById(created.id)
      expect(fetched).toBeUndefined()
    })
  })

  describe('clearAll', () => {
    it('empties the table', async () => {
      await userProfileDexieRepository.create(makePayload())
      await userProfileDexieRepository.create(makePayload())
      await userProfileDexieRepository.clearAll()

      const list = await userProfileDexieRepository.list()
      expect(list).toEqual([])
    })
  })
})
