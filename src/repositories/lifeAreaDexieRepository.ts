/**
 * Dexie (IndexedDB) implementation for Life Area repository
 */

import { getUserDatabase } from '@/services/userDatabase.service'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'

/**
 * Deep-clone to strip Vue reactive Proxies before IndexedDB storage.
 */
function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
import type { LifeArea, CreateLifeAreaPayload, UpdateLifeAreaPayload } from '@/domain/lifeArea'
import type { LifeAreaRepository } from './lifeAreaRepository'

function cleanReflectionSignals(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((signal): signal is string => typeof signal === 'string')
    .map((signal) => signal.trim())
    .filter((signal) => signal.length > 0)
}

function normalizeCreatePayload(data: CreateLifeAreaPayload): CreateLifeAreaPayload {
  return {
    ...data,
    reflectionSignals: cleanReflectionSignals(data.reflectionSignals),
  }
}

function normalizeUpdatePayload(data: UpdateLifeAreaPayload): UpdateLifeAreaPayload {
  if (!('reflectionSignals' in data)) return data
  return {
    ...data,
    reflectionSignals: cleanReflectionSignals(data.reflectionSignals),
  }
}

class LifeAreaDexieRepository implements LifeAreaRepository {
  private get db() {
    return getUserDatabase()
  }

  async getAll(): Promise<LifeArea[]> {
    try {
      return await this.db.lifeAreas.toArray()
    } catch (error) {
      console.error('Failed to get all life areas:', error)
      throw new Error('Failed to retrieve life areas from database')
    }
  }

  async getById(id: string): Promise<LifeArea | undefined> {
    try {
      return await this.db.lifeAreas.get(id)
    } catch (error) {
      console.error(`Failed to get life area with id ${id}:`, error)
      throw new Error(`Failed to retrieve life area with id ${id}`)
    }
  }

  async getActive(): Promise<LifeArea[]> {
    try {
      return await this.db.lifeAreas.filter((la) => la.isActive).toArray()
    } catch (error) {
      console.error('Failed to get active life areas:', error)
      throw new Error('Failed to retrieve active life areas from database')
    }
  }

  async create(data: CreateLifeAreaPayload): Promise<LifeArea> {
    try {
      const now = new Date().toISOString()
      const normalizedData = normalizeCreatePayload(data)
      const lifeArea: LifeArea = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...normalizedData,
      }
      await this.db.lifeAreas.add(toPlain(lifeArea))
      invalidatePlanningQueryCache()
      return lifeArea
    } catch (error) {
      console.error('Failed to create life area:', error)
      throw new Error('Failed to create life area in database')
    }
  }

  async update(id: string, data: UpdateLifeAreaPayload): Promise<LifeArea> {
    try {
      const existing = await this.db.lifeAreas.get(id)
      if (!existing) {
        throw new Error(`Life area with id ${id} not found`)
      }
      const normalizedData = normalizeUpdatePayload(data)
      const updated: LifeArea = {
        ...existing,
        ...normalizedData,
        reflectionSignals: cleanReflectionSignals(
          'reflectionSignals' in normalizedData
            ? normalizedData.reflectionSignals
            : existing.reflectionSignals,
        ),
        updatedAt: new Date().toISOString(),
      }
      await this.db.lifeAreas.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update life area with id ${id}:`, error)
      throw new Error(`Failed to update life area with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.lifeAreas.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete life area with id ${id}:`, error)
      throw new Error(`Failed to delete life area with id ${id}`)
    }
  }
}

export const lifeAreaDexieRepository = new LifeAreaDexieRepository()
