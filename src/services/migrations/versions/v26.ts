import type { DexieMigration } from './types'
import type { PriorityLink, StoredPriorityLinkSubjectType } from '@/domain/planning'

// Priority creator ritual (ideas/html-plans/2026-07-23-priority-creator-port.html):
// first-class object↔priority links. The upgrade backfills one 'active'
// link per (object, priorityId) pair from the legacy priorityIds[] arrays;
// the arrays stay authoritative for existing readers (dual-write) until a
// later phase migrates them. Ritual drafts reuse the generic `drafts`
// key-value table, so no extra table here.
export const v26: DexieMigration = {
  version: 26,
  stores: {
    priorityLinks: 'id, priorityId, status, [subjectRef.subjectType+subjectRef.subjectId]',
  },
  upgrade: async trans => {
    const priorityIds = new Set<string>(
      (await trans.table('priorities').toArray()).map(priority => String(priority.id))
    )

    // Initiatives were still a live entity at v26; the backfill keeps
    // producing their links so the upgrade stays deterministic.
    const sources: Array<{ table: string; subjectType: StoredPriorityLinkSubjectType }> = [
      { table: 'goals', subjectType: 'goal' },
      { table: 'habits', subjectType: 'habit' },
      { table: 'trackers', subjectType: 'tracker' },
      { table: 'weeklyIntentions', subjectType: 'weeklyIntention' },
      { table: 'initiatives', subjectType: 'initiative' },
    ]

    const now = new Date().toISOString()
    const links: PriorityLink[] = []
    const seenPairs = new Set<string>()

    for (const source of sources) {
      for (const record of await trans.table(source.table).toArray()) {
        // Defensive per-record skips: malformed rows must not strand the
        // user at a failed DB open.
        if (typeof record.id !== 'string' || !Array.isArray(record.priorityIds)) continue
        for (const priorityId of record.priorityIds) {
          if (typeof priorityId !== 'string') continue
          // Stale ids (e.g. weekly intentions never unlinked on priority
          // delete) are dropped instead of becoming dangling links.
          if (!priorityIds.has(priorityId)) continue
          const pairKey = `${priorityId}:${source.subjectType}:${record.id}`
          if (seenPairs.has(pairKey)) continue
          seenPairs.add(pairKey)
          links.push({
            id: crypto.randomUUID(),
            createdAt: now,
            updatedAt: now,
            priorityId,
            status: 'active',
            subjectRef: { subjectType: source.subjectType, subjectId: record.id },
            contribution: '',
            expectedSignal: '',
            validFrom:
              typeof record.createdAt === 'string' && record.createdAt ? record.createdAt : now,
            needsEnrichment: true,
          })
        }
      }
    }

    await trans.table('priorityLinks').bulkAdd(links)
  },
}
