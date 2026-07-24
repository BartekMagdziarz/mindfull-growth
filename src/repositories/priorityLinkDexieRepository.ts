import type {
  CreatePriorityLinkPayload,
  PriorityLink,
  PriorityLinkSubjectRef,
  UpdatePriorityLinkPayload,
} from '@/domain/planning'
import { normalizePriorityLinkPayload } from '@/domain/planning'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { PriorityLinkRepository } from './priorityLinkRepository'
import { createPlanningRecord, requireRecord, toPlain, updatePlanningRecord } from './planningDexieRepository.shared'

class PriorityLinkDexieRepository implements PriorityLinkRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<PriorityLink | undefined> {
    try {
      return await this.db.priorityLinks.get(id)
    } catch (error) {
      console.error(`Failed to get priority link with id ${id}:`, error)
      throw new Error(`Failed to retrieve priority link with id ${id}`)
    }
  }

  async listAll(): Promise<PriorityLink[]> {
    try {
      return await this.db.priorityLinks.toArray()
    } catch (error) {
      console.error('Failed to list priority links:', error)
      throw new Error('Failed to retrieve priority links from database')
    }
  }

  async listByPriority(priorityId: string): Promise<PriorityLink[]> {
    try {
      return await this.db.priorityLinks.where('priorityId').equals(priorityId).toArray()
    } catch (error) {
      console.error(`Failed to list priority links for priority ${priorityId}:`, error)
      throw new Error(`Failed to retrieve priority links for priority ${priorityId}`)
    }
  }

  async listBySubject(subjectRef: PriorityLinkSubjectRef): Promise<PriorityLink[]> {
    try {
      return await this.db.priorityLinks
        .where('[subjectRef.subjectType+subjectRef.subjectId]')
        .equals([subjectRef.subjectType, subjectRef.subjectId])
        .toArray()
    } catch (error) {
      console.error(`Failed to list priority links for subject ${subjectRef.subjectType}:${subjectRef.subjectId}:`, error)
      throw new Error('Failed to retrieve priority links for subject')
    }
  }

  async create(data: CreatePriorityLinkPayload): Promise<PriorityLink> {
    try {
      const normalized = normalizePriorityLinkPayload(data)
      const link = createPlanningRecord<PriorityLink>(normalized)
      await this.db.priorityLinks.add(toPlain(link))
      invalidatePlanningQueryCache()
      return requireRecord(await this.db.priorityLinks.get(link.id), `Priority link with id ${link.id} not found`)
    } catch (error) {
      console.error('Failed to create priority link:', error)
      throw new Error('Failed to create priority link in database')
    }
  }

  async update(id: string, data: UpdatePriorityLinkPayload): Promise<PriorityLink> {
    try {
      const existing = requireRecord(await this.db.priorityLinks.get(id), `Priority link with id ${id} not found`)
      const normalized = normalizePriorityLinkPayload(data, existing)
      const updated = updatePlanningRecord(existing, normalized)
      await this.db.priorityLinks.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return requireRecord(await this.db.priorityLinks.get(id), `Priority link with id ${id} not found`)
    } catch (error) {
      console.error(`Failed to update priority link with id ${id}:`, error)
      throw new Error(`Failed to update priority link with id ${id}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.priorityLinks.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete priority link with id ${id}:`, error)
      throw new Error(`Failed to delete priority link with id ${id}`)
    }
  }
}

export const priorityLinkDexieRepository = new PriorityLinkDexieRepository()
