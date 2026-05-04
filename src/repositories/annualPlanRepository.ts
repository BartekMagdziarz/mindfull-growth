import type {
  AnnualPlan,
  CreateAnnualPlanPayload,
  UpdateAnnualPlanPayload,
} from '@/domain/annualPlan'
import type { YearRef } from '@/domain/period'

export interface AnnualPlanRepository {
  getById(id: string): Promise<AnnualPlan | undefined>
  getByYearRef(yearRef: YearRef): Promise<AnnualPlan | undefined>
  listAll(): Promise<AnnualPlan[]>
  create(data: CreateAnnualPlanPayload): Promise<AnnualPlan>
  update(id: string, data: UpdateAnnualPlanPayload): Promise<AnnualPlan>
  upsertForYear(yearRef: YearRef, data?: UpdateAnnualPlanPayload): Promise<AnnualPlan>
  delete(id: string): Promise<void>
}
