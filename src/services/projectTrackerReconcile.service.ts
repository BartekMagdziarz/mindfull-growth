import type { Tracker } from '@/domain/planning'
import { getUserDatabase } from '@/services/userDatabase.service'

export interface ReconcileProjectTrackersInput {
  projectId: string
  snapshotTrackers: Tracker[]
  draftTrackers: Partial<Tracker>[]
}

export interface ReconcileProjectTrackersResult {
  upsertedTrackers: Tracker[]
  deletedTrackerIds: string[]
}

function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

function sanitizeTypeSpecificFields(tracker: Tracker): Tracker {
  if (tracker.type === 'count') {
    return {
      ...tracker,
      targetCount: undefined,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      rollup: undefined,
    }
  }

  if (tracker.type === 'adherence') {
    return {
      ...tracker,
      targetCount: isValidNumber(tracker.targetCount) && tracker.targetCount > 0 ? tracker.targetCount : 1,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      rollup: undefined,
    }
  }

  if (tracker.type === 'value') {
    return {
      ...tracker,
      targetCount: undefined,
      ratingScaleMin: undefined,
      ratingScaleMax: undefined,
      direction: tracker.direction ?? 'increase',
      rollup: tracker.rollup === 'average' || tracker.rollup === 'last' ? tracker.rollup : 'last',
    }
  }

  if (tracker.type === 'rating') {
    const min = isValidNumber(tracker.ratingScaleMin) ? tracker.ratingScaleMin : 1
    const max = isValidNumber(tracker.ratingScaleMax) ? tracker.ratingScaleMax : 10
    const hasValidScale = min < max
    return {
      ...tracker,
      targetCount: undefined,
      targetValue: undefined,
      baselineValue: undefined,
      unit: undefined,
      direction: undefined,
      ratingScaleMin: hasValidScale ? min : 1,
      ratingScaleMax: hasValidScale ? max : 10,
      rollup: tracker.rollup === 'last' ? 'last' : 'average',
    }
  }

  return tracker
}

function normalizeDraftTracker(draft: Partial<Tracker>, fallbackId: string): Tracker {
  if (!draft.name?.trim()) {
    throw new Error('Key Result name is required.')
  }
  if (!draft.type) {
    throw new Error(`Key Result "${draft.name}" is missing a type.`)
  }
  if (!draft.cadence) {
    throw new Error(`Key Result "${draft.name}" is missing a cadence.`)
  }

  const now = new Date().toISOString()

  return sanitizeTypeSpecificFields({
    id: draft.id || fallbackId,
    createdAt: draft.createdAt || now,
    updatedAt: now,
    parentType: 'project',
    parentId: '',
    lifeAreaIds: Array.isArray(draft.lifeAreaIds) ? [...draft.lifeAreaIds] : [],
    priorityIds: Array.isArray(draft.priorityIds) ? [...draft.priorityIds] : [],
    name: draft.name.trim(),
    type: draft.type,
    cadence: draft.cadence,
    unit: draft.unit,
    targetCount: draft.targetCount,
    baselineValue: draft.baselineValue,
    targetValue: draft.targetValue,
    direction: draft.direction,
    ratingScaleMin: draft.ratingScaleMin,
    ratingScaleMax: draft.ratingScaleMax,
    hasPeriodicTargets: draft.hasPeriodicTargets,
    rollup: draft.rollup,
    notePrompt: draft.notePrompt,
    tickLabels: Array.isArray(draft.tickLabels) ? [...draft.tickLabels] : undefined,
    sortOrder: draft.sortOrder ?? 0,
    isActive: draft.isActive ?? true,
  })
}

function cloneTracker(tracker: Tracker): Tracker {
  return {
    ...tracker,
    lifeAreaIds: [...tracker.lifeAreaIds],
    priorityIds: [...tracker.priorityIds],
    tickLabels: tracker.tickLabels ? [...tracker.tickLabels] : undefined,
  }
}

export async function reconcileProjectTrackersAtomically(
  input: ReconcileProjectTrackersInput
): Promise<ReconcileProjectTrackersResult> {
  const db = getUserDatabase()
  const snapshotById = new Map(input.snapshotTrackers.map((tracker) => [tracker.id, tracker]))
  const draftById = new Map(
    input.draftTrackers
      .filter((tracker): tracker is Partial<Tracker> & { id: string } => Boolean(tracker.id))
      .map((tracker) => [tracker.id, tracker])
  )

  const snapshotIds = new Set(snapshotById.keys())
  const draftIds = new Set(draftById.keys())

  const deletedTrackerIds = Array.from(snapshotIds).filter((id) => !draftIds.has(id))
  const now = new Date().toISOString()

  const upsertedTrackers: Tracker[] = []

  await db.transaction('rw', db.trackers, db.trackerPeriods, async () => {
    const dbTrackers = await db.trackers
      .where('[parentType+parentId]')
      .equals(['project', input.projectId])
      .toArray()

    const dbTrackerById = new Map(dbTrackers.map((tracker) => [tracker.id, tracker]))

    for (const trackerId of deletedTrackerIds) {
      if (!dbTrackerById.has(trackerId)) continue

      const periods = await db.trackerPeriods.where('trackerId').equals(trackerId).toArray()
      if (periods.length > 0) {
        await db.trackerPeriods.bulkDelete(periods.map((period) => period.id))
      }
      await db.trackers.delete(trackerId)
    }

    for (const [index, draftTracker] of input.draftTrackers.entries()) {
      const fallbackId = globalThis.crypto.randomUUID()
      const normalized = normalizeDraftTracker(draftTracker, fallbackId)
      normalized.parentId = input.projectId
      normalized.sortOrder = index

      const snapshot = draftTracker.id ? snapshotById.get(draftTracker.id) : undefined
      const existing = draftTracker.id ? dbTrackerById.get(draftTracker.id) : undefined

      if (snapshot && existing) {
        const updated: Tracker = {
          ...existing,
          ...normalized,
          id: existing.id,
          parentType: 'project',
          parentId: input.projectId,
          createdAt: existing.createdAt,
          updatedAt: now,
        }
        await db.trackers.put(updated)
        upsertedTrackers.push(cloneTracker(updated))
        continue
      }

      const created: Tracker = {
        ...normalized,
        id: normalized.id || fallbackId,
        createdAt: now,
        updatedAt: now,
        parentType: 'project',
        parentId: input.projectId,
        lifeAreaIds: [],
        priorityIds: [],
      }

      await db.trackers.add(created)
      upsertedTrackers.push(cloneTracker(created))
    }
  })

  return {
    upsertedTrackers,
    deletedTrackerIds,
  }
}
