import { userDatabaseOperation } from './userDatabaseOperation'
import type {
  CreateProgramEnrollmentPayload,
  ProgramEnrollment,
  UpdateProgramEnrollmentPayload,
} from '@/domain/program'
import type { ProgramEnrollmentRepository } from './programEnrollmentRepository'
import {
  createPlanningRecord,
  requireRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

/**
 * Deliberately does NOT call `invalidatePlanningQueryCache()`: program
 * enrollments are not part of the Zone B planning pipeline (design D5) —
 * their only reactive consumer is `programEnrollment.store`, which
 * patches its own cache on every write. The `toPlain()` round-trip also
 * strips reactivity from the nested `completedSteps` array before Dexie
 * sees it.
 */
class ProgramEnrollmentDexieRepository implements ProgramEnrollmentRepository {
  async getById(id: string): Promise<ProgramEnrollment | undefined> {
    return userDatabaseOperation('r', ['programEnrollments'], async db => {
      try {
        return await db.programEnrollments.get(id)
      } catch (error) {
        console.error(`Failed to get program enrollment with id ${id}:`, error)
        throw new Error(`Failed to retrieve program enrollment with id ${id}`)
      }
    })
  }

  async listAll(): Promise<ProgramEnrollment[]> {
    return userDatabaseOperation('r', ['programEnrollments'], async db => {
      try {
        return await db.programEnrollments.toArray()
      } catch (error) {
        console.error('Failed to list program enrollments:', error)
        throw new Error('Failed to retrieve program enrollments from database')
      }
    })
  }

  async create(payload: CreateProgramEnrollmentPayload): Promise<ProgramEnrollment> {
    return userDatabaseOperation('rw', ['programEnrollments'], async db => {
      try {
        const enrollment = createPlanningRecord<ProgramEnrollment>({
          programSlug: payload.programSlug,
          status: 'active',
          startedAt: payload.startedAt ?? new Date().toISOString(),
          currentStepIndex: 0,
          completedSteps: [],
          ...(payload.contentVersion !== undefined && { contentVersion: payload.contentVersion }),
        })
        await db.programEnrollments.add(toPlain(enrollment))
        return enrollment
      } catch (error) {
        console.error('Failed to create program enrollment:', error)
        throw new Error('Failed to create program enrollment in database')
      }
    })
  }

  async update(id: string, patch: UpdateProgramEnrollmentPayload): Promise<ProgramEnrollment> {
    return userDatabaseOperation('rw', ['programEnrollments'], async db => {
      try {
        const existing = requireRecord(
          await db.programEnrollments.get(id),
          `Program enrollment with id ${id} not found`
        )
        const updated = updatePlanningRecord(existing, { ...existing, ...patch })
        await db.programEnrollments.put(toPlain(updated))
        return updated
      } catch (error) {
        console.error(`Failed to update program enrollment with id ${id}:`, error)
        throw new Error(`Failed to update program enrollment with id ${id}`)
      }
    })
  }
}

export const programEnrollmentDexieRepository = new ProgramEnrollmentDexieRepository()
