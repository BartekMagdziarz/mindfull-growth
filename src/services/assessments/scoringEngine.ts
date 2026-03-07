import type {
  AssessmentAttempt,
  AssessmentComputation,
  AssessmentId,
  AssessmentResponse,
} from '@/domain/assessments'
import { getAssessmentRegistryEntry } from './registry'

export interface ScoreAssessmentRequest {
  assessmentId: AssessmentId
  responses: AssessmentResponse[]
  previousAttempt?: AssessmentAttempt
  centeredScoringEnabled?: boolean
}

export function scoreAssessment(request: ScoreAssessmentRequest): AssessmentComputation {
  const { assessmentId, responses, previousAttempt, centeredScoringEnabled } = request
  const { definition, scorer } = getAssessmentRegistryEntry(assessmentId)

  return scorer.score({
    definition,
    responses,
    previousAttempt,
    centeredScoringEnabled,
  })
}
