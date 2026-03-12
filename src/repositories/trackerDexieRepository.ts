import type { CreateTrackerPayload, Tracker, UpdateTrackerPayload } from '@/domain/planning'
import { normalizeTrackerPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { TrackerRepository } from './trackerRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class TrackerDexieRepository implements TrackerRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<Tracker | undefined> {
    try {
      return await this.db.trackers.get(id)
    } catch (error) {
      console.error(`Failed to get tracker with id ${id}:`, error)
      throw new Error(`Failed to retrieve tracker with id ${id}`)
    }
  }

  async listAll(): Promise<Tracker[]> {
    try {
      return await this.db.trackers.toArray()
    } catch (error) {
      console.error('Failed to list trackers:', error)
      throw new Error('Failed to retrieve trackers from database')
    }
  }

  async create(data: CreateTrackerPayload): Promise<Tracker> {
    try {
      const tracker = createPlanningRecord<Tracker>(normalizeTrackerPayload(data))
      await this.db.trackers.add(toPlain(tracker))
      invalidatePlanningQueryCache()
      return tracker
    } catch (error) {
      console.error('Failed to create tracker:', error)
      throw new Error('Failed to create tracker in database')
    }
  }

  async update(id: string, data: UpdateTrackerPayload): Promise<Tracker> {
    try {
      const existing = requireRecord(await this.db.trackers.get(id), `Tracker with id ${id} not found`)
      const updated = updatePlanningRecord(existing, normalizeTrackerPayload(data, existing))
      await this.db.trackers.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update tracker with id ${id}:`, error)
      throw new Error(`Failed to update tracker with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.trackers.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete tracker with id ${id}:`, error)
      throw new Error(`Failed to delete tracker with id ${id}`)
    }
  }
}

export const trackerDexieRepository = new TrackerDexieRepository()
