import { useT } from '@/composables/useT'
import { onScopeDispose, shallowRef, ref } from 'vue'
import type {
  MeasurementCriteriaChange,
  MeasurementEntryMode,
  PlanningCadence,
} from '@/domain/planning'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { MeasureableSubject } from '@/services/measurementProgress'
import {
  criteriaSignature,
  criteriaScoringSignature,
  retainReferencedChecklistItems,
} from '@/domain/measurementCriteria'
import { getUserDatabase } from '@/services/userDatabaseService'
import { captureUserSession } from '@/services/userSessionScope'

export interface CriteriaEditRequest {
  subjectType: MeasurementSubjectType
  subject: MeasureableSubject
  next: MeasureableSubject
}

/** An edit is held in memory until its application scope is explicitly chosen. */
export function useMeasurementCriteriaEditor() {
  const { t } = useT()
  const busy = ref(false)
  let disposed = false
  const request = shallowRef<CriteriaEditRequest | null>(null)
  let finish: ((change: MeasurementCriteriaChange | null) => void) | undefined
  function choose(change: MeasurementCriteriaChange | null) {
    const resolve = finish
    finish = undefined
    request.value = null
    resolve?.(change)
  }
  onScopeDispose(() => {
    disposed = true
    choose(null)
  })

  async function edit<
    T extends MeasureableSubject,
    P extends {
      criteriaChange?: MeasurementCriteriaChange
      entryMode?: MeasurementEntryMode
      cadence?: PlanningCadence
    },
  >(
    subjectType: MeasurementSubjectType,
    repo: {
      getById: (id: string) => Promise<T | undefined>
      update: (id: string, data: P) => Promise<T>
    },
    normalize: (data: P, existing: T) => Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    id: string,
    data: P
  ): Promise<T | undefined> {
    // Autosave events emitted while the dialog is open must not replace a pending edit.
    if (busy.value || disposed) return undefined
    busy.value = true
    try {
      const session = captureUserSession()
      const subject = await session.wait(repo.getById(id))
      if (disposed) return undefined
      if (!subject) throw new Error('Object not found')
      const entries = await session.wait(
        getUserDatabase()
          .dailyMeasurementEntries.where('[subjectType+subjectId]')
          .equals([subjectType, id])
          .toArray()
      )
      const hasEntries = entries.length > 0
      if (disposed) return undefined
      if (
        hasEntries &&
        ((data.entryMode !== undefined && data.entryMode !== subject.entryMode) ||
          (data.cadence !== undefined && data.cadence !== subject.cadence))
      )
        throw new Error(t('planning.criteria.shapeLocked'))
      const next = retainReferencedChecklistItems(
        subject,
        { ...subject, ...normalize(data, subject) },
        entries
      )
      const changed = criteriaScoringSignature(subject) !== criteriaScoringSignature(next)
      if (!changed) return session.wait(repo.update(id, data))
      if (!hasEntries && !subject.criteriaVersions) return session.wait(repo.update(id, data))
      const pending = new Promise<MeasurementCriteriaChange | null>(resolve => {
        finish = resolve
      })
      request.value = { subjectType, subject, next }
      const change = await pending
      session.assertCurrent()
      if (!change) return undefined
      return session.wait(
        repo.update(id, {
          ...data,
          criteriaChange: { ...change, expectedSignature: criteriaSignature(subject) },
        })
      )
    } finally {
      busy.value = false
    }
  }
  return { request, choose, edit }
}

export type MeasurementCriteriaEditor = ReturnType<typeof useMeasurementCriteriaEditor>
