import type {
  CreateLifeAreaAssessmentPayload,
  LifeAreaAssessment,
  LifeAreaAssessmentItem,
  UpdateLifeAreaAssessmentPayload,
} from '@/domain/lifeAreaAssessment'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { LifeAreaAssessmentRepository } from './lifeAreaAssessmentRepository'

function toPlain<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function normalizeItem(item: LifeAreaAssessmentItem): LifeAreaAssessmentItem {
  return {
    lifeAreaId: item.lifeAreaId,
    lifeAreaNameSnapshot: item.lifeAreaNameSnapshot.trim(),
    score: item.score,
    note: normalizeText(item.note),
    visionSnapshot: normalizeText(item.visionSnapshot),
    details: item.details ? toPlain(item.details) : undefined,
  }
}

function normalizePayload(
  data: CreateLifeAreaAssessmentPayload | UpdateLifeAreaAssessmentPayload,
  existing?: LifeAreaAssessment,
): Omit<LifeAreaAssessment, 'id' | 'createdAt' | 'updatedAt'> {
  const items = (data.items ?? existing?.items ?? []).map(normalizeItem)
  const lifeAreaIds = Array.from(
    new Set((data.lifeAreaIds ?? items.map((item) => item.lifeAreaId)).filter(Boolean)),
  )

  return {
    scope: data.scope ?? existing?.scope ?? 'full',
    notes: normalizeText(data.notes ?? existing?.notes),
    lifeAreaIds,
    items,
  }
}

class LifeAreaAssessmentDexieRepository implements LifeAreaAssessmentRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<LifeAreaAssessment | undefined> {
    try {
      return await this.db.lifeAreaAssessments.get(id)
    } catch (error) {
      console.error(`Failed to get life area assessment with id ${id}:`, error)
      throw new Error(`Failed to retrieve life area assessment with id ${id}`)
    }
  }

  async listAll(): Promise<LifeAreaAssessment[]> {
    try {
      return await this.db.lifeAreaAssessments.orderBy('createdAt').reverse().toArray()
    } catch (error) {
      console.error('Failed to list life area assessments:', error)
      throw new Error('Failed to retrieve life area assessments from database')
    }
  }

  async getByLifeArea(lifeAreaId: string): Promise<LifeAreaAssessment[]> {
    try {
      const matches = await this.db.lifeAreaAssessments.where('lifeAreaIds').equals(lifeAreaId).toArray()
      return matches.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    } catch (error) {
      console.error(`Failed to get life area assessments for area ${lifeAreaId}:`, error)
      throw new Error(`Failed to retrieve life area assessments for area ${lifeAreaId}`)
    }
  }

  async getByDateRange(startDate: string, endDate: string): Promise<LifeAreaAssessment[]> {
    try {
      return await this.db.lifeAreaAssessments
        .where('createdAt')
        .between(startDate, endDate + '\uffff', true, true)
        .reverse()
        .toArray()
    } catch (error) {
      console.error('Failed to get life area assessments by date range:', error)
      throw new Error('Failed to retrieve life area assessments by date range')
    }
  }

  async getLatest(): Promise<LifeAreaAssessment | undefined> {
    try {
      return await this.db.lifeAreaAssessments.orderBy('createdAt').reverse().first()
    } catch (error) {
      console.error('Failed to get latest life area assessment:', error)
      throw new Error('Failed to retrieve latest life area assessment')
    }
  }

  async getLatestForLifeArea(lifeAreaId: string): Promise<LifeAreaAssessment | undefined> {
    const assessments = await this.getByLifeArea(lifeAreaId)
    return assessments[0]
  }

  async getPreviousForLifeArea(
    lifeAreaId: string,
    beforeCreatedAt: string,
  ): Promise<LifeAreaAssessment | undefined> {
    const assessments = await this.getByLifeArea(lifeAreaId)
    return assessments.find((assessment) => assessment.createdAt < beforeCreatedAt)
  }

  async create(data: CreateLifeAreaAssessmentPayload): Promise<LifeAreaAssessment> {
    try {
      const now = new Date().toISOString()
      const normalized = normalizePayload(data)
      const assessment: LifeAreaAssessment = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        ...normalized,
      }
      await this.db.lifeAreaAssessments.add(toPlain(assessment))
      return assessment
    } catch (error) {
      console.error('Failed to create life area assessment:', error)
      throw new Error('Failed to create life area assessment in database')
    }
  }

  async update(
    id: string,
    data: UpdateLifeAreaAssessmentPayload,
  ): Promise<LifeAreaAssessment> {
    try {
      const existing = await this.db.lifeAreaAssessments.get(id)
      if (!existing) {
        throw new Error(`Life area assessment with id ${id} not found`)
      }

      const normalized = normalizePayload(data, existing)
      const updated: LifeAreaAssessment = {
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
        ...normalized,
      }

      await this.db.lifeAreaAssessments.put(toPlain(updated))
      return updated
    } catch (error) {
      console.error(`Failed to update life area assessment with id ${id}:`, error)
      throw new Error(`Failed to update life area assessment with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.lifeAreaAssessments.delete(id)
    } catch (error) {
      console.error(`Failed to delete life area assessment with id ${id}:`, error)
      throw new Error(`Failed to delete life area assessment with id ${id}`)
    }
  }
}

export const lifeAreaAssessmentDexieRepository = new LifeAreaAssessmentDexieRepository()
