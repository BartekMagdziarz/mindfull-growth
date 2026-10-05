import { userDatabaseOperation } from './userDatabaseOperation'
import type {
  CreateInitiativePayload,
  Initiative,
  UpdateInitiativePayload,
} from '@/domain/planning'
import { normalizeInitiativePayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import type { InitiativeRepository } from './initiativeRepository'
import {
  createPlanningRecord,
  requireRecord,
  retirePriorityLinksForSubject,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class InitiativeDexieRepository implements InitiativeRepository {
  async getById(id: string): Promise<Initiative | undefined> {
    return userDatabaseOperation('r', ['initiatives', 'priorityLinks'], async db => {
      try {
        return await db.initiatives.get(id)
      } catch (error) {
        console.error(`Failed to get initiative with id ${id}:`, error)
        throw new Error(`Failed to retrieve initiative with id ${id}`)
      }
    })
  }

  async listAll(): Promise<Initiative[]> {
    return userDatabaseOperation('r', ['initiatives', 'priorityLinks'], async db => {
      try {
        return await db.initiatives.toArray()
      } catch (error) {
        console.error('Failed to list initiatives:', error)
        throw new Error('Failed to retrieve initiatives from database')
      }
    })
  }

  async create(data: CreateInitiativePayload): Promise<Initiative> {
    return userDatabaseOperation('rw', ['initiatives', 'priorityLinks'], async db => {
      try {
        const initiative = createPlanningRecord<Initiative>(normalizeInitiativePayload(data))
        await db.initiatives.add(toPlain(initiative))
        invalidatePlanningQueryCache()
        return initiative
      } catch (error) {
        console.error('Failed to create initiative:', error)
        throw new Error('Failed to create initiative in database')
      }
    })
  }

  async update(id: string, data: UpdateInitiativePayload): Promise<Initiative> {
    return userDatabaseOperation('rw', ['initiatives', 'priorityLinks'], async db => {
      try {
        const existing = requireRecord(
          await db.initiatives.get(id),
          `Initiative with id ${id} not found`
        )
        const updated = updatePlanningRecord(existing, normalizeInitiativePayload(data, existing))
        await db.initiatives.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update initiative with id ${id}:`, error)
        throw new Error(`Failed to update initiative with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['initiatives', 'priorityLinks'], async db => {
      try {
        await db.transaction('rw', [db.initiatives, db.priorityLinks], async () => {
          await db.initiatives.delete(id)
          await retirePriorityLinksForSubject(db.priorityLinks, {
            subjectType: 'initiative',
            subjectId: id,
          })
        })
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete initiative with id ${id}:`, error)
        throw new Error(`Failed to delete initiative with id ${id}`)
      }
    })
  }
}

export const initiativeDexieRepository = new InitiativeDexieRepository()
