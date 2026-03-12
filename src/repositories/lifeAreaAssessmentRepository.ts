import type {
  CreateLifeAreaAssessmentPayload,
  LifeAreaAssessment,
  UpdateLifeAreaAssessmentPayload,
} from '@/domain/lifeAreaAssessment'

export interface LifeAreaAssessmentRepository {
  getById(id: string): Promise<LifeAreaAssessment | undefined>
  listAll(): Promise<LifeAreaAssessment[]>
  getByLifeArea(lifeAreaId: string): Promise<LifeAreaAssessment[]>
  getByDateRange(startDate: string, endDate: string): Promise<LifeAreaAssessment[]>
  getLatest(): Promise<LifeAreaAssessment | undefined>
  getLatestForLifeArea(lifeAreaId: string): Promise<LifeAreaAssessment | undefined>
  getPreviousForLifeArea(
    lifeAreaId: string,
    beforeCreatedAt: string,
  ): Promise<LifeAreaAssessment | undefined>
  create(data: CreateLifeAreaAssessmentPayload): Promise<LifeAreaAssessment>
  update(id: string, data: UpdateLifeAreaAssessmentPayload): Promise<LifeAreaAssessment>
  delete(id: string): Promise<void>
}
