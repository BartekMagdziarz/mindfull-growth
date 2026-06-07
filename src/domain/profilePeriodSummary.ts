/**
 * A cached, compact summary of one ISO period (week or month) of the user's
 * diary data, used by the profile build to represent older history as aggregates
 * instead of dumping (or dropping) every raw record (Pillar 3).
 *
 * Distinct from `aiSummary` on weekly/monthly reflections (a live, user-authored
 * field) — these are derived, invalidate-by-hash, profile-build artifacts.
 */
export type ProfilePeriodSummaryKind = 'deterministic' | 'narrative'

export interface ProfilePeriodSummary {
  id: string
  /** ISO week (`2026-W15`) or month (`2026-04`) ref — self-describes week vs month. */
  periodRef: string
  /** `deterministic` = offline rollup; `narrative` = LLM prose (Pillar 3b). */
  kind: ProfilePeriodSummaryKind
  /** 1 = weekly aggregate, 2 = monthly aggregate. */
  tier: 1 | 2
  /** Compact markdown digest rendered into the payload's [SUMMARIZED HISTORY] block. */
  content: string
  /**
   * Invalidation key: `cyrb53` over a format version + kind + periodRef + the
   * enabled diary-type mask + each source record's `id:updatedAt`. A mismatch
   * means the period changed → recompute.
   */
  inputHash: string
  /** How many source records were aggregated (0 ⇒ the period is omitted entirely). */
  recordCount: number
  /** Model id when `kind === 'narrative'`; absent for deterministic digests. */
  model?: string
  createdAt: string // ISO
}

export type CreateProfilePeriodSummaryPayload = Omit<
  ProfilePeriodSummary,
  'id' | 'createdAt'
>

/**
 * One summarized period as carried in the profile-build payload. `periodEndIso`
 * is used only for newest-first ordering + age-bucket attribution (never rendered);
 * `content` is the markdown digest shown under [SUMMARIZED HISTORY].
 */
export interface ProfilePayloadSummary {
  periodRef: string
  periodEndIso: string // ISO timestamp of the period's last day
  content: string
}
