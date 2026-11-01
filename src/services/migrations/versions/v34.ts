import type { DexieMigration } from './types'

export const v34: DexieMigration = {
  version: 34,
  stores: {
    assessmentResponses: 'id, attemptId, itemId, &[attemptId+itemId]',
    exercisePlanItems: 'id, exerciseSlug, dayRef, status, source, &pendingProgramKey',
    exerciseCompletions: 'id, exerciseSlug, dayRef, completedAt, &eventId',
  },
}
