import type {
  AssessmentAttempt,
  AssessmentComputation,
  AssessmentDefinition,
  AssessmentResponse,
} from '@/domain/assessments'

export interface ScoringInput {
  definition: AssessmentDefinition
  responses: AssessmentResponse[]
  previousAttempt?: AssessmentAttempt
  centeredScoringEnabled?: boolean
}

export interface AssessmentScorer {
  score(input: ScoringInput): AssessmentComputation
}
