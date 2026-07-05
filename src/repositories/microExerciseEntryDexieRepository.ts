import type {
  CreateMicroExerciseEntryPayload,
  MicroExerciseEntry,
} from '@/domain/microExercises'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { MicroExerciseEntryRepository } from './microExerciseEntryRepository'
import { toPlain } from './planningDexieRepository.shared'

class MicroExerciseEntryDexieRepository implements MicroExerciseEntryRepository {
  private get db() {
    return getUserDatabase()
  }

  async create(payload: CreateMicroExerciseEntryPayload): Promise<MicroExerciseEntry> {
    try {
      const { createdAt: createdAtOverride, ...data } = payload
      const now = new Date().toISOString()
      const createdAt = createdAtOverride ?? now
      const entry: MicroExerciseEntry = {
        id: crypto.randomUUID(),
        createdAt,
        updatedAt: createdAt,
        ...data,
      }
      await this.db.microExerciseEntries.add(toPlain(entry))
      return entry
    } catch (error) {
      console.error('Failed to create micro exercise entry:', error)
      throw new Error('Failed to create micro exercise entry in database')
    }
  }

  async getAll(): Promise<MicroExerciseEntry[]> {
    try {
      return await this.db.microExerciseEntries.toArray()
    } catch (error) {
      console.error('Failed to list micro exercise entries:', error)
      throw new Error('Failed to retrieve micro exercise entries from database')
    }
  }

  async getBySlug(exerciseSlug: string): Promise<MicroExerciseEntry[]> {
    try {
      return await this.db.microExerciseEntries
        .where('exerciseSlug')
        .equals(exerciseSlug)
        .toArray()
    } catch (error) {
      console.error(`Failed to list micro exercise entries for ${exerciseSlug}:`, error)
      throw new Error(`Failed to retrieve micro exercise entries for ${exerciseSlug}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.microExerciseEntries.delete(id)
    } catch (error) {
      console.error(`Failed to delete micro exercise entry with id ${id}:`, error)
      throw new Error(`Failed to delete micro exercise entry with id ${id}`)
    }
  }
}

export const microExerciseEntryDexieRepository = new MicroExerciseEntryDexieRepository()
