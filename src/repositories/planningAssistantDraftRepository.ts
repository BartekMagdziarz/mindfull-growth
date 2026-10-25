import {
  createPlanningAssistantDraft,
  type PlanningAssistantDraft,
} from '@/domain/planningAssistant'
import { parsePlanningDraft } from '@/services/ai/planning/contracts'
import { userDatabaseOperation } from './userDatabaseOperation'

export const PLANNING_ASSISTANT_DRAFT_KEY = 'planning-assistant.v1'
export class PlanningDraftConflict extends Error {
  constructor() {
    super('Szkic zmienił się w innym oknie. Wczytaj go ponownie.')
    this.name = 'PlanningDraftConflict'
  }
}
export const planningAssistantDraftRepository = {
  async open(): Promise<PlanningAssistantDraft> {
    return userDatabaseOperation('rw', ['drafts'], async db => {
      const row = await db.drafts.get(PLANNING_ASSISTANT_DRAFT_KEY)
      if (row) return parsePlanningDraft(row.data)
      const draft = createPlanningAssistantDraft()
      await db.drafts.put({
        key: PLANNING_ASSISTANT_DRAFT_KEY,
        data: JSON.stringify(draft),
        updatedAt: new Date().toISOString(),
      })
      return draft
    })
  },
  async save(draft: PlanningAssistantDraft, expectedRevision: number): Promise<number> {
    return userDatabaseOperation('rw', ['drafts'], async db => {
      const row = await db.drafts.get(PLANNING_ASSISTANT_DRAFT_KEY)
      if (!row) throw new PlanningDraftConflict()
      const current = parsePlanningDraft(row.data)
      if (current.id !== draft.id || current.revision !== expectedRevision || current.receipt)
        throw new PlanningDraftConflict()
      const next = { ...draft, revision: expectedRevision + 1 }
      const data = JSON.stringify(next)
      parsePlanningDraft(data)
      await db.drafts.put({
        key: PLANNING_ASSISTANT_DRAFT_KEY,
        data,
        updatedAt: new Date().toISOString(),
      })
      return next.revision
    })
  },
  async reset(id: string, expectedRevision: number): Promise<PlanningAssistantDraft> {
    return userDatabaseOperation('rw', ['drafts'], async db => {
      const row = await db.drafts.get(PLANNING_ASSISTANT_DRAFT_KEY)
      if (!row) throw new PlanningDraftConflict()
      const current = parsePlanningDraft(row.data)
      if (current.id !== id || current.revision !== expectedRevision)
        throw new PlanningDraftConflict()
      const next = createPlanningAssistantDraft()
      await db.drafts.put({
        key: PLANNING_ASSISTANT_DRAFT_KEY,
        data: JSON.stringify(next),
        updatedAt: new Date().toISOString(),
      })
      return next
    })
  },
}
