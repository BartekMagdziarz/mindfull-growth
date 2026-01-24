import type {
  PeriodicEntry,
  PeriodicEntryType,
  CreatePeriodicEntryPayload,
} from '@/domain/periodicEntry'
import { getUserDatabase } from '@/services/userDatabase.service'
import { getPreviousPeriodRange, toISODateString } from '@/utils/periodUtils'

export interface PeriodicEntryRepository {
  getAll(): Promise<PeriodicEntry[]>
  getById(id: string): Promise<PeriodicEntry | undefined>
  getByTypeAndPeriodStart(
    type: PeriodicEntryType,
    periodStartDate: string
  ): Promise<PeriodicEntry | undefined>
  getByType(type: PeriodicEntryType): Promise<PeriodicEntry[]>
  getPreviousEntry(
    type: PeriodicEntryType,
    currentPeriodStart: string
  ): Promise<PeriodicEntry | undefined>
  create(data: CreatePeriodicEntryPayload): Promise<PeriodicEntry>
  update(entry: PeriodicEntry): Promise<PeriodicEntry>
  delete(id: string): Promise<void>
}

class PeriodicEntryDexieRepository implements PeriodicEntryRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<PeriodicEntry[]> {
    try {
      return await this.db.periodicEntries.toArray()
    } catch (error) {
      console.error('Failed to get all periodic entries:', error)
      throw new Error('Failed to retrieve periodic entries from database')
    }
  }

  async getById(id: string): Promise<PeriodicEntry | undefined> {
    try {
      return await this.db.periodicEntries.get(id)
    } catch (error) {
      console.error(`Failed to get periodic entry with id ${id}:`, error)
      throw new Error(`Failed to retrieve periodic entry with id ${id}`)
    }
  }

  async getByTypeAndPeriodStart(
    type: PeriodicEntryType,
    periodStartDate: string
  ): Promise<PeriodicEntry | undefined> {
    try {
      return await this.db.periodicEntries
        .where({ type, periodStartDate })
        .first()
    } catch (error) {
      console.error(
        `Failed to get periodic entry for type ${type} and start ${periodStartDate}:`,
        error
      )
      throw new Error(`Failed to retrieve periodic entry for ${type} starting ${periodStartDate}`)
    }
  }

  async getByType(type: PeriodicEntryType): Promise<PeriodicEntry[]> {
    try {
      return await this.db.periodicEntries
        .where('type')
        .equals(type)
        .toArray()
    } catch (error) {
      console.error(`Failed to get periodic entries of type ${type}:`, error)
      throw new Error(`Failed to retrieve ${type} periodic entries`)
    }
  }

  async getPreviousEntry(
    type: PeriodicEntryType,
    currentPeriodStart: string
  ): Promise<PeriodicEntry | undefined> {
    try {
      const currentStart = new Date(currentPeriodStart)
      const prevRange = getPreviousPeriodRange(type, currentStart)
      const prevStartDate = toISODateString(prevRange.start)

      return await this.db.periodicEntries
        .where({ type, periodStartDate: prevStartDate })
        .first()
    } catch (error) {
      console.error(`Failed to get previous periodic entry:`, error)
      throw new Error('Failed to retrieve previous periodic entry')
    }
  }

  async create(data: CreatePeriodicEntryPayload): Promise<PeriodicEntry> {
    try {
      const now = new Date().toISOString()
      const entry: PeriodicEntry = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        type: data.type,
        periodStartDate: data.periodStartDate,
        periodEndDate: data.periodEndDate,
        wins: data.wins ?? [],
        challenges: data.challenges ?? [],
        learnings: data.learnings ?? [],
        gratitude: data.gratitude ?? [],
        freeWriting: data.freeWriting ?? '',
        intention: data.intention,
        intentionReflection: data.intentionReflection,
        aggregatedData: data.aggregatedData,
        previousEntryId: data.previousEntryId,
      }
      await this.db.periodicEntries.add(entry)
      return entry
    } catch (error) {
      console.error('Failed to create periodic entry:', error)
      throw new Error('Failed to create periodic entry in database')
    }
  }

  async update(entry: PeriodicEntry): Promise<PeriodicEntry> {
    try {
      const updatedEntry: PeriodicEntry = {
        ...entry,
        updatedAt: new Date().toISOString(),
      }
      await this.db.periodicEntries.put(updatedEntry)
      return updatedEntry
    } catch (error) {
      console.error(`Failed to update periodic entry with id ${entry.id}:`, error)
      throw new Error(`Failed to update periodic entry with id ${entry.id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.periodicEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete periodic entry with id ${id}:`, error)
      throw new Error(`Failed to delete periodic entry with id ${id}`)
    }
  }
}

export const periodicEntryDexieRepository = new PeriodicEntryDexieRepository()
