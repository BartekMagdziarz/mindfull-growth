import { describe, it, expect, beforeEach } from 'vitest'
import { profilePeriodSummaryDexieRepository } from '../profilePeriodSummaryDexieRepository'
import { resetDatabase } from '@/__tests__/utils/dbTestUtils'
import type { CreateProfilePeriodSummaryPayload } from '@/domain/profilePeriodSummary'

function makePayload(
  over: Partial<CreateProfilePeriodSummaryPayload> = {},
): CreateProfilePeriodSummaryPayload {
  return {
    periodRef: '2026-W15',
    kind: 'deterministic',
    tier: 1,
    content: '### Week 2026-W15\nJournal: 2 entries.',
    inputHash: 'hash-1',
    recordCount: 2,
    ...over,
  }
}

describe('profilePeriodSummaryDexieRepository', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('returns undefined for an unknown period', async () => {
    expect(
      await profilePeriodSummaryDexieRepository.getByPeriod('2026-W15', 'deterministic'),
    ).toBeUndefined()
  })

  it('upserts and reads back by [periodRef+kind]', async () => {
    const created = await profilePeriodSummaryDexieRepository.upsert(makePayload())
    expect(created.id).toBeTruthy()
    expect(created.createdAt).toBeTruthy()

    const fetched = await profilePeriodSummaryDexieRepository.getByPeriod(
      '2026-W15',
      'deterministic',
    )
    expect(fetched?.content).toContain('2 entries')
    expect(fetched?.inputHash).toBe('hash-1')
  })

  it('replaces the existing row on re-upsert (same id, no duplicate)', async () => {
    const first = await profilePeriodSummaryDexieRepository.upsert(makePayload())
    const second = await profilePeriodSummaryDexieRepository.upsert(
      makePayload({ content: 'updated', inputHash: 'hash-2', recordCount: 3 }),
    )

    expect(second.id).toBe(first.id)
    expect(second.createdAt).toBe(first.createdAt)
    const all = await profilePeriodSummaryDexieRepository.list()
    expect(all).toHaveLength(1)
    expect(all[0].content).toBe('updated')
    expect(all[0].inputHash).toBe('hash-2')
  })

  it('keeps deterministic and narrative summaries for the same period separate', async () => {
    await profilePeriodSummaryDexieRepository.upsert(makePayload({ kind: 'deterministic' }))
    await profilePeriodSummaryDexieRepository.upsert(
      makePayload({ kind: 'narrative', content: 'prose', model: 'gemma' }),
    )

    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(2)
    const narrative = await profilePeriodSummaryDexieRepository.getByPeriod(
      '2026-W15',
      'narrative',
    )
    expect(narrative?.model).toBe('gemma')
  })

  it('clearAll empties the table', async () => {
    await profilePeriodSummaryDexieRepository.upsert(makePayload())
    await profilePeriodSummaryDexieRepository.clearAll()
    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(0)
  })
})
