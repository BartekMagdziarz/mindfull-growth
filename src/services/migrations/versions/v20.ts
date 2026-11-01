import type { DexieMigration } from './types'

export const v20: DexieMigration = {
  version: 20,
  stores: {
    shadowBeliefs: 'id',
  },
  upgrade: async trans => {
    // Shadow beliefs restructured: the two flat lists (selfSabotagingBeliefs +
    // reframedBeliefs) become one list of per-belief entries (so a reframe is
    // tied to its belief and each belief can carry an evidence review), and
    // adviceToOthers becomes objects that also capture whether the user
    // follows the advice themselves.
    await trans
      .table('shadowBeliefs')
      .toCollection()
      .modify((record: Record<string, unknown>) => {
        const oldBeliefs = Array.isArray(record.selfSabotagingBeliefs)
          ? (record.selfSabotagingBeliefs as unknown[]).filter(
              (b): b is string => typeof b === 'string' && b.trim().length > 0
            )
          : []
        const oldReframes = Array.isArray(record.reframedBeliefs)
          ? (record.reframedBeliefs as unknown[]).filter(
              (r): r is string => typeof r === 'string' && r.trim().length > 0
            )
          : []
        // Pair belief↔reframe by position — best-effort, since the old UI
        // presented them as two parallel lists with no explicit link.
        // Surplus reframes (more reframes than beliefs) become their own entries.
        const beliefs: Array<{ belief: string; reframe?: string }> = oldBeliefs.map((belief, i) =>
          oldReframes[i] ? { belief, reframe: oldReframes[i] } : { belief }
        )
        for (let i = oldBeliefs.length; i < oldReframes.length; i++) {
          beliefs.push({ belief: '', reframe: oldReframes[i] })
        }
        record.beliefs = beliefs
        delete record.selfSabotagingBeliefs
        delete record.reframedBeliefs

        const oldAdvice = Array.isArray(record.adviceToOthers)
          ? (record.adviceToOthers as unknown[]).filter(
              (a): a is string => typeof a === 'string' && a.trim().length > 0
            )
          : []
        // Old advice was plain strings; self-application was never captured.
        record.adviceToOthers = oldAdvice.map(advice => ({ advice }))
      })
  },
}
