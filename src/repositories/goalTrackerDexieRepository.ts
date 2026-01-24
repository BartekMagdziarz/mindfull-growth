import type {
  GoalTracker,
  TrackerEntry,
  CreateGoalTrackerPayload,
  CreateTrackerEntryPayload,
  TrackerFrequency,
} from '@/domain/lifeSeasons'
import { getUserDatabase } from '@/services/userDatabase.service'

export interface GoalTrackerRepository {
  // Tracker methods
  getAllTrackers(): Promise<GoalTracker[]>
  getTrackerById(id: string): Promise<GoalTracker | undefined>
  getTrackersByGoal(goalId: string): Promise<GoalTracker[]>
  getTrackersByFrequency(frequency: TrackerFrequency): Promise<GoalTracker[]>
  createTracker(data: CreateGoalTrackerPayload): Promise<GoalTracker>
  updateTracker(tracker: GoalTracker): Promise<GoalTracker>
  deleteTracker(id: string): Promise<void>

  // Entry methods
  getAllEntries(): Promise<TrackerEntry[]>
  getEntryById(id: string): Promise<TrackerEntry | undefined>
  getEntriesByTracker(trackerId: string): Promise<TrackerEntry[]>
  getEntriesByTrackerAndDate(trackerId: string, date: string): Promise<TrackerEntry | undefined>
  getEntriesByDateRange(trackerId: string, startDate: string, endDate: string): Promise<TrackerEntry[]>
  createEntry(data: CreateTrackerEntryPayload): Promise<TrackerEntry>
  updateEntry(entry: TrackerEntry): Promise<TrackerEntry>
  deleteEntry(id: string): Promise<void>
}

class GoalTrackerDexieRepository implements GoalTrackerRepository {
  private get db() {
    return getUserDatabase()
  }

  // Tracker methods
  async getAllTrackers(): Promise<GoalTracker[]> {
    try {
      return await this.db.goalTrackers.toArray()
    } catch (error) {
      console.error('Failed to get all goal trackers:', error)
      throw new Error('Failed to retrieve goal trackers from database')
    }
  }

  async getTrackerById(id: string): Promise<GoalTracker | undefined> {
    try {
      return await this.db.goalTrackers.get(id)
    } catch (error) {
      console.error(`Failed to get goal tracker with id ${id}:`, error)
      throw new Error(`Failed to retrieve goal tracker with id ${id}`)
    }
  }

  async getTrackersByGoal(goalId: string): Promise<GoalTracker[]> {
    try {
      return await this.db.goalTrackers
        .where('goalId')
        .equals(goalId)
        .toArray()
    } catch (error) {
      console.error(`Failed to get trackers for goal ${goalId}:`, error)
      throw new Error(`Failed to retrieve trackers for goal ${goalId}`)
    }
  }

  async getTrackersByFrequency(frequency: TrackerFrequency): Promise<GoalTracker[]> {
    try {
      return await this.db.goalTrackers
        .where('frequency')
        .equals(frequency)
        .toArray()
    } catch (error) {
      console.error(`Failed to get trackers with frequency ${frequency}:`, error)
      throw new Error(`Failed to retrieve trackers with frequency ${frequency}`)
    }
  }

  async createTracker(data: CreateGoalTrackerPayload): Promise<GoalTracker> {
    try {
      const now = new Date().toISOString()
      const tracker: GoalTracker = {
        id: crypto.randomUUID(),
        goalId: data.goalId,
        name: data.name,
        type: data.type,
        targetValue: data.targetValue,
        unit: data.unit,
        frequency: data.frequency,
        createdAt: now,
        updatedAt: now,
      }
      await this.db.goalTrackers.add(tracker)
      return tracker
    } catch (error) {
      console.error('Failed to create goal tracker:', error)
      throw new Error('Failed to create goal tracker in database')
    }
  }

  async updateTracker(tracker: GoalTracker): Promise<GoalTracker> {
    try {
      const updatedTracker: GoalTracker = {
        ...tracker,
        updatedAt: new Date().toISOString(),
      }
      await this.db.goalTrackers.put(updatedTracker)
      return updatedTracker
    } catch (error) {
      console.error(`Failed to update goal tracker with id ${tracker.id}:`, error)
      throw new Error(`Failed to update goal tracker with id ${tracker.id}`)
    }
  }

  async deleteTracker(id: string): Promise<void> {
    try {
      // Also delete all entries for this tracker
      await this.db.trackerEntries.where('trackerId').equals(id).delete()
      await this.db.goalTrackers.delete(id)
    } catch (error) {
      console.error(`Failed to delete goal tracker with id ${id}:`, error)
      throw new Error(`Failed to delete goal tracker with id ${id}`)
    }
  }

  // Entry methods
  async getAllEntries(): Promise<TrackerEntry[]> {
    try {
      return await this.db.trackerEntries.toArray()
    } catch (error) {
      console.error('Failed to get all tracker entries:', error)
      throw new Error('Failed to retrieve tracker entries from database')
    }
  }

  async getEntryById(id: string): Promise<TrackerEntry | undefined> {
    try {
      return await this.db.trackerEntries.get(id)
    } catch (error) {
      console.error(`Failed to get tracker entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve tracker entry with id ${id}`)
    }
  }

  async getEntriesByTracker(trackerId: string): Promise<TrackerEntry[]> {
    try {
      return await this.db.trackerEntries
        .where('trackerId')
        .equals(trackerId)
        .toArray()
    } catch (error) {
      console.error(`Failed to get entries for tracker ${trackerId}:`, error)
      throw new Error(`Failed to retrieve entries for tracker ${trackerId}`)
    }
  }

  async getEntriesByTrackerAndDate(
    trackerId: string,
    date: string
  ): Promise<TrackerEntry | undefined> {
    try {
      return await this.db.trackerEntries
        .where({ trackerId, date })
        .first()
    } catch (error) {
      console.error(`Failed to get entry for tracker ${trackerId} on ${date}:`, error)
      throw new Error(`Failed to retrieve entry for tracker on date`)
    }
  }

  async getEntriesByDateRange(
    trackerId: string,
    startDate: string,
    endDate: string
  ): Promise<TrackerEntry[]> {
    try {
      const allEntries = await this.db.trackerEntries
        .where('trackerId')
        .equals(trackerId)
        .toArray()

      return allEntries.filter(
        (entry) => entry.date >= startDate && entry.date <= endDate
      )
    } catch (error) {
      console.error(`Failed to get entries for tracker ${trackerId} in date range:`, error)
      throw new Error('Failed to retrieve tracker entries for date range')
    }
  }

  async createEntry(data: CreateTrackerEntryPayload): Promise<TrackerEntry> {
    try {
      // Check if entry already exists for this tracker and date
      const existing = await this.getEntriesByTrackerAndDate(data.trackerId, data.date)
      if (existing) {
        // Update existing entry instead
        return this.updateEntry({
          ...existing,
          value: data.value,
          note: data.note,
        })
      }

      const entry: TrackerEntry = {
        id: crypto.randomUUID(),
        trackerId: data.trackerId,
        date: data.date,
        value: data.value,
        note: data.note,
        createdAt: new Date().toISOString(),
      }
      await this.db.trackerEntries.add(entry)
      return entry
    } catch (error) {
      console.error('Failed to create tracker entry:', error)
      throw new Error('Failed to create tracker entry in database')
    }
  }

  async updateEntry(entry: TrackerEntry): Promise<TrackerEntry> {
    try {
      await this.db.trackerEntries.put(entry)
      return entry
    } catch (error) {
      console.error(`Failed to update tracker entry with id ${entry.id}:`, error)
      throw new Error(`Failed to update tracker entry with id ${entry.id}`)
    }
  }

  async deleteEntry(id: string): Promise<void> {
    try {
      await this.db.trackerEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete tracker entry with id ${id}:`, error)
      throw new Error(`Failed to delete tracker entry with id ${id}`)
    }
  }
}

export const goalTrackerDexieRepository = new GoalTrackerDexieRepository()
