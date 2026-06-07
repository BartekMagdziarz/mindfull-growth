import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resetDatabase } from '@/__tests__/utils/dbTestUtils'
import { profilePeriodSummaryDexieRepository } from '@/repositories/profilePeriodSummaryDexieRepository'
import {
  buildPeriodDigestContent,
  getPeriodDigest,
} from '../profilePeriodSummary.service'
import { getPeriodBounds } from '@/utils/periods'
import type { WeekRef } from '@/domain/period'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import type { ExerciseSessionBundle } from '@/services/reflectionDataQueries'

// Mutable store contents, reachable from the hoisted vi.mock factories.
const stores = vi.hoisted(() => ({
  journal: [] as JournalEntry[],
  logs: [] as EmotionLog[],
}))

vi.mock('@/stores/journal.store', () => ({
  useJournalStore: () => ({ sortedEntries: stores.journal }),
}))
vi.mock('@/stores/emotionLog.store', () => ({
  useEmotionLogStore: () => ({ sortedLogs: stores.logs }),
}))
vi.mock('@/stores/emotion.store', () => ({
  useEmotionStore: () => ({
    getEmotionById: (id: string) =>
      (
        ({
          e1: { id: 'e1', name: 'anxious', energy: 8, pleasantness: 3 }, // HE-LP
          e2: { id: 'e2', name: 'hopeful', energy: 7, pleasantness: 8 }, // HE-HP
          e3: { id: 'e3', name: 'tired', energy: 2, pleasantness: 4 }, // LE-LP
        }) as Record<string, unknown>
      )[id],
  }),
}))
vi.mock('@/stores/tag.store', () => ({
  useTagStore: () => ({
    getPeopleTagById: (id: string) =>
      (({ p1: { id: 'p1', name: 'Anna' }, p2: { id: 'p2', name: 'Marek' } }) as Record<string, unknown>)[id],
    getContextTagById: (id: string) =>
      (({ c1: { id: 'c1', name: 'work' }, c2: { id: 'c2', name: 'family' } }) as Record<string, unknown>)[id],
  }),
}))

const WEEK = '2026-W15' as WeekRef
const bounds = getPeriodBounds(WEEK)
const at = (day: string, h = '12:00:00.000Z') => `${day}T${h}`

function jEntry(
  id: string,
  createdAt: string,
  body: string,
  peopleTagIds: string[] = [],
  contextTagIds: string[] = [],
  updatedAt = createdAt,
): JournalEntry {
  return { id, createdAt, updatedAt, body, peopleTagIds, contextTagIds } as unknown as JournalEntry
}
function eLog(
  id: string,
  createdAt: string,
  emotionIds: string[],
  updatedAt = createdAt,
): EmotionLog {
  return { id, createdAt, updatedAt, emotionIds } as unknown as EmotionLog
}
function bundle(id: string, type: string, createdAt: string, updatedAt = createdAt): ExerciseSessionBundle {
  return { id, type, createdAt, raw: { id, createdAt, updatedAt } } as unknown as ExerciseSessionBundle
}

const ALL = { journal: true, emotionLogs: true, exerciseSessions: true }

describe('buildPeriodDigestContent', () => {
  it('renders a compact weekly digest (counts, top people/contexts, quadrants, leads, exercises)', () => {
    const records = {
      journal: [
        jEntry('j1', at(bounds.end), 'Tense 1:1 with my manager about scope', ['p1'], ['c1']),
        jEntry('j2', at(bounds.start, '09:00:00.000Z'), 'Long walk cleared my head today and I felt much better', ['p2'], ['c2']),
        jEntry('j3', at(bounds.start), 'third entry body text', [], []),
      ],
      logs: [eLog('l1', at(bounds.end), ['e1', 'e2']), eLog('l2', at(bounds.start), ['e1', 'e3'])],
      exercises: [
        bundle('x1', 'thoughtRecord', at(bounds.end)),
        bundle('x2', 'thoughtRecord', at(bounds.start)),
        bundle('x3', 'unblending', at(bounds.start)),
      ],
    }
    const content = buildPeriodDigestContent(WEEK, 1, records, ALL)!

    expect(content).toContain(`### Week ${WEEK} (${bounds.start} – ${bounds.end})`)
    expect(content).toContain('Journal: 3 entries')
    expect(content).toContain('People: Anna, Marek')
    expect(content).toContain('Contexts: work, family')
    expect(content).toContain('Tense 1:1 with my manager about scope')
    expect(content).toContain('Long walk cleared my head') // truncated lead
    expect(content).not.toContain('third entry') // beyond the weekly lead cap (2)
    expect(content).toContain('Emotions: 2 logs')
    expect(content).toContain('anxious 2') // e1 appears in both logs
    // e1 HE-LP ×2, e2 HE-HP ×1, e3 LE-LP ×1
    expect(content).toContain('HE-HP 1 / HE-LP 2 / LE-HP 0 / LE-LP 1')
    expect(content).toContain('Exercises: 3 — thoughtRecord 2, unblending 1')
  })

  it('quadrant tallies match getQuadrant on each emotion', () => {
    const records = {
      journal: [],
      logs: [eLog('l1', at(bounds.start), ['e2', 'e2', 'e3'])], // 2× HE-HP, 1× LE-LP
      exercises: [],
    }
    const content = buildPeriodDigestContent(WEEK, 1, records, ALL)!
    expect(content).toContain('HE-HP 2 / HE-LP 0 / LE-HP 0 / LE-LP 1')
  })

  it('suppresses journal content (incl. verbatim leads) when journal is disabled', () => {
    const records = {
      journal: [jEntry('j1', at(bounds.start), 'SECRET journal lead', ['p1'], ['c1'])],
      logs: [eLog('l1', at(bounds.start), ['e1'])],
      exercises: [],
    }
    const content = buildPeriodDigestContent(WEEK, 1, records, {
      journal: false,
      emotionLogs: true,
      exerciseSessions: true,
    })!
    expect(content).not.toContain('Journal:')
    expect(content).not.toContain('SECRET journal lead')
    expect(content).toContain('Emotions: 1 logs')
  })

  it('returns null for a period with no activity', () => {
    expect(
      buildPeriodDigestContent(WEEK, 1, { journal: [], logs: [], exercises: [] }, ALL),
    ).toBeNull()
  })

  it('compresses a large period ≥10× vs raw', () => {
    const journal = Array.from({ length: 30 }, (_, i) =>
      jEntry(`j${i}`, at(bounds.start), 'word '.repeat(120), ['p1'], ['c1']),
    )
    const rawChars = journal.reduce((s, e) => s + e.body.length, 0)
    const content = buildPeriodDigestContent(WEEK, 1, { journal, logs: [], exercises: [] }, ALL)!
    expect(content.length * 10).toBeLessThanOrEqual(rawChars)
  })
})

describe('getPeriodDigest (cache)', () => {
  beforeEach(async () => {
    await resetDatabase()
    stores.journal = []
    stores.logs = []
  })

  const ctx = { enabled: ALL, exerciseBundles: [] as ExerciseSessionBundle[] }

  it('computes and caches on a miss, reuses on a hit', async () => {
    stores.journal = [jEntry('j1', at(bounds.start), 'first body', ['p1'], ['c1'])]

    const first = await getPeriodDigest(WEEK, 'deterministic', 1, ctx)
    expect(first?.content).toContain('Journal: 1 entry')
    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(1)

    // Mutate the body WITHOUT bumping updatedAt → same hash → cached reused (stale).
    stores.journal = [jEntry('j1', at(bounds.start), 'changed body', ['p1'], ['c1'])]
    const second = await getPeriodDigest(WEEK, 'deterministic', 1, ctx)
    expect(second?.content).toBe(first?.content)
    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(1)
  })

  it('recomputes when a record changes (updatedAt bump)', async () => {
    stores.journal = [jEntry('j1', at(bounds.start), 'one entry', [], [])]
    const first = await getPeriodDigest(WEEK, 'deterministic', 1, ctx)

    // A real edit bumps updatedAt and adds an entry → hash changes → recompute.
    stores.journal = [
      jEntry('j1', at(bounds.start), 'one entry', [], [], at(bounds.end)),
      jEntry('j2', at(bounds.start), 'two entries now', [], []),
    ]
    const second = await getPeriodDigest(WEEK, 'deterministic', 1, ctx)
    expect(second?.content).not.toBe(first?.content)
    expect(second?.content).toContain('Journal: 2 entries')
    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(1) // upserted, not duplicated
  })

  it('returns null (and caches nothing) for an empty period', async () => {
    const out = await getPeriodDigest(WEEK, 'deterministic', 1, ctx)
    expect(out).toBeNull()
    expect(await profilePeriodSummaryDexieRepository.list()).toHaveLength(0)
  })
})
