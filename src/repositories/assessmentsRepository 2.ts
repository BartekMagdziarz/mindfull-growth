import type {
  AssessmentAttempt,
  AssessmentId,
  AssessmentResponse,
  CompleteAssessmentAttemptPayload,
  SaveAssessmentResponsePayload,
  StartAssessmentAttemptPayload,
} from '@/domain/assessments'

export interface AssessmentsRepository {
  startAttempt(data: StartAssessmentAttemptPayload): Promise<AssessmentAttempt>
  getAttemptById(id: string): Promise<AssessmentAttempt | undefined>
  getInProgressAttempt(assessmentId: AssessmentId): Promise<AssessmentAttempt | undefined>
  getAttemptsByAssessment(assessmentId: AssessmentId): Promise<AssessmentAttempt[]>
  getLatestCompletedAttempt(assessmentId: AssessmentId): Promise<AssessmentAttempt | undefined>
  getPreviousCompletedAttempt(
    assessmentId: AssessmentId,
    beforeCompletedAt?: string,
  ): Promise<AssessmentAttempt | undefined>
  saveResponse(data: SaveAssessmentResponsePayload): Promise<AssessmentResponse>
  bulkSaveResponses(data: SaveAssessmentResponsePayload[]): Promise<AssessmentResponse[]>
  getResponsesByAttempt(attemptId: string): Promise<AssessmentResponse[]>
  completeAttempt(id: string, data: CompleteAssessmentAttemptPayload): Promise<AssessmentAttempt>
  abandonAttempt(id: string): Promise<AssessmentAttempt>
}
