import { userDatabaseOperation } from './userDatabaseOperation'
import type { CreateTrackerPayload, Tracker, UpdateTrackerPayload } from '@/domain/planning'
import { normalizeTrackerPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import type { TrackerRepository } from './trackerRepository'
import {
  createPlanningRecord,
  requireRecord,
  retirePriorityLinksForSubject,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class TrackerDexieRepository implements TrackerRepository {
  async getById(id: string): Promise<Tracker | undefined> {
    return userDatabaseOperation('r', ['trackers', 'priorityLinks'], async db => {
      try {
        return await db.trackers.get(id)
      } catch (error) {
        console.error(`Failed to get tracker with id ${id}:`, error)
        throw new Error(`Failed to retrieve tracker with id ${id}`)
      }
    })
  }

  async listAll(): Promise<Tracker[]> {
    return userDatabaseOperation('r', ['trackers', 'priorityLinks'], async db => {
      try {
        return await db.trackers.toArray()
      } catch (error) {
        console.error('Failed to list trackers:', error)
        throw new Error('Failed to retrieve trackers from database')
      }
    })
  }

  async create(data: CreateTrackerPayload): Promise<Tracker> {
    return userDatabaseOperation('rw', ['trackers', 'priorityLinks'], async db => {
      try {
        const tracker = createPlanningRecord<Tracker>(normalizeTrackerPayload(data))
        await db.trackers.add(toPlain(tracker))
        invalidatePlanningQueryCache()
        return tracker
      } catch (error) {
        console.error('Failed to create tracker:', error)
        throw new Error('Failed to create tracker in database')
      }
    })
  }

  async update(id: string, data: UpdateTrackerPayload): Promise<Tracker> {
    return userDatabaseOperation('rw', ['trackers', 'priorityLinks'], async db => {
      try {
        const existing = requireRecord(await db.trackers.get(id), `Tracker with id ${id} not found`)
        const updated = updatePlanningRecord(existing, normalizeTrackerPayload(data, existing))
        await db.trackers.put(toPlain(updated))
        invalidatePlanningQueryCache()
        return updated
      } catch (error) {
        console.error(`Failed to update tracker with id ${id}:`, error)
        throw new Error(`Failed to update tracker with id ${id}`)
      }
    })
  }

  async delete(id: string): Promise<void> {
    return userDatabaseOperation('rw', ['trackers', 'priorityLinks'], async db => {
      try {
        await db.transaction('rw', [db.trackers, db.priorityLinks], async () => {
          await db.trackers.delete(id)
          await retirePriorityLinksForSubject(db.priorityLinks, {
            subjectType: 'tracker',
            subjectId: id,
          })
        })
        invalidatePlanningQueryCache()
      } catch (error) {
        console.error(`Failed to delete tracker with id ${id}:`, error)
        throw new Error(`Failed to delete tracker with id ${id}`)
      }
    })
  }
}

export const trackerDexieRepository = new TrackerDexieRepository()
