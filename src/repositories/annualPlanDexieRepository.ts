import type {
  AnnualPlan,
  CreateAnnualPlanPayload,
  UpdateAnnualPlanPayload,
} from '@/domain/annualPlan'
import { normalizeAnnualPlanPayload } from '@/domain/annualPlan'
import type { YearRef } from '@/domain/period'
import { invalidatePlanningQueryCache } from '@/services/planningQueryCache'
import { getUserDatabase } from '@/services/userDatabase.service'
import type { AnnualPlanRepository } from './annualPlanRepository'
import {
  createPlanningRecord,
  requireRecord,
  toPlain,
  updatePlanningRecord,
} from './planningDexieRepository.shared'

class AnnualPlanDexieRepository implements AnnualPlanRepository {
  private get db() {
    return getUserDatabase()
  }

  async getById(id: string): Promise<AnnualPlan | undefined> {
    try {
      return await this.db.annualPlans.get(id)
    } catch (error) {
      console.error(`Failed to get annual plan with id ${id}:`, error)
      throw new Error(`Failed to retrieve annual plan with id ${id}`)
    }
  }

  async getByYearRef(yearRef: YearRef): Promise<AnnualPlan | undefined> {
    try {
      return await this.db.annualPlans.where('yearRef').equals(yearRef).first()
    } catch (error) {
      console.error(`Failed to get annual plan for ${yearRef}:`, error)
      throw new Error(`Failed to retrieve annual plan for ${yearRef}`)
    }
  }

  async listAll(): Promise<AnnualPlan[]> {
    try {
      return await this.db.annualPlans.orderBy('yearRef').toArray()
    } catch (error) {
      console.error('Failed to list annual plans:', error)
      throw new Error('Failed to retrieve annual plans from database')
    }
  }

  async create(data: CreateAnnualPlanPayload): Promise<AnnualPlan> {
    try {
      const annualPlan = createPlanningRecord<AnnualPlan>(normalizeAnnualPlanPayload(data))
      await this.db.annualPlans.add(toPlain(annualPlan))
      invalidatePlanningQueryCache()
      return annualPlan
    } catch (error) {
      console.error('Failed to create annual plan:', error)
      throw new Error('Failed to create annual plan in database')
    }
  }

  async update(id: string, data: UpdateAnnualPlanPayload): Promise<AnnualPlan> {
    try {
      const existing = requireRecord(
        await this.db.annualPlans.get(id),
        `Annual plan with id ${id} not found`,
      )
      const updated = updatePlanningRecord(existing, normalizeAnnualPlanPayload(data, existing))
      await this.db.annualPlans.put(toPlain(updated))
      invalidatePlanningQueryCache()
      return updated
    } catch (error) {
      console.error(`Failed to update annual plan with id ${id}:`, error)
      throw new Error(`Failed to update annual plan with id ${id}`)
    }
  }

  async upsertForYear(
    yearRef: YearRef,
    data: UpdateAnnualPlanPayload = {},
  ): Promise<AnnualPlan> {
    try {
      const existing = await this.getByYearRef(yearRef)
      if (existing) {
        return await this.update(existing.id, { ...data, yearRef })
      }

      return await this.create({
        yearRef,
        status: data.status ?? 'draft',
        annualBriefNote: data.annualBriefNote,
        lifeAreaAssessmentId: data.lifeAreaAssessmentId,
        narrative: data.narrative,
        executionPlaceholderNote: data.executionPlaceholderNote,
      })
    } catch (error) {
      console.error(`Failed to upsert annual plan for ${yearRef}:`, error)
      throw new Error(`Failed to upsert annual plan for ${yearRef}`)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.db.annualPlans.delete(id)
      invalidatePlanningQueryCache()
    } catch (error) {
      console.error(`Failed to delete annual plan with id ${id}:`, error)
      throw new Error(`Failed to delete annual plan with id ${id}`)
    }
  }
}

export const annualPlanDexieRepository = new AnnualPlanDexieRepository()
