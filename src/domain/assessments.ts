import type { LocaleId } from '@/services/locale.service'

export type AssessmentId =
  | 'ipip-bfm-50'
  | 'ipip-neo-120'
  | 'hexaco-60'
  | 'pvq-40'
  | 'vlq'
  | 'erq'
  | 'ecr-rs'
  | 'rrq'
  | 'ipip-via'
  | 'gad-7'
  | 'scs-sf'
  | 'anger-barometer'
  | 'ius-12'

export type InstrumentVersion = string
export type ScoringKeyVersion = string

export type AssessmentStatus = 'in-progress' | 'completed' | 'abandoned'

export type ScaleBand = 'low' | 'medium' | 'high'

export interface AssessmentResponseScale {
  min: number
  max: number
  anchors: Record<string, string>
}

export interface AssessmentItemDefinition {
  id: string
  textKey: string
  scaleId?: string
  reverse: boolean
  responseMin: number
  responseMax: number
  // Used by VLQ (importance / consistency) and other future dual-response instruments.
  metric?: string
}

export interface AssessmentScaleDefinition {
  id: string
  labelKey: string
  itemIds: string[]
  minAnswered: number
}

export interface MissingDataPolicy {
  id: string
  descriptionKey: string
  thresholdPercent: number
  imputeWithScaleMean: boolean
}

export interface RetakePolicy {
  weeks: number
}

export type InterpretationScale = '0-3' | '1-5' | '1-6' | '1-7' | '0-10'

/**
 * Symptom-style instruments (GAD-7, anger barometer, IUS-12) are scored as
 * item sums, not means, and read through named bands on one primary scale.
 * Copy: `<namespace>.bands.<id>` (label) and `<namespace>.interpretation.<id>`.
 */
export interface SumScoringConfig {
  /** Scale whose total drives the band and the notice (usually 'total'). */
  primaryScaleId: string
  /** Ascending by `min`; the band is the last one whose `min` ≤ total. Empty = no bands. */
  bands: Array<{ id: string; min: number }>
  /** Higher totals mean more difficulty — the band pill stays neutral, never "good". */
  higherIsWorse: boolean
  /** Calm pointer to professional help once the primary total reaches `minTotal`. */
  notice?: { minTotal: number; textKey: string }
}

export interface AssessmentDefinition {
  id: AssessmentId
  instrumentVersion: InstrumentVersion
  scoringKeyVersion: ScoringKeyVersion
  titleKey: string
  subtitleKey: string
  descriptionKey: string
  categoryKey: string
  disclaimerKey: string
  estimatedMinutes: number
  responseScale: AssessmentResponseScale
  items: AssessmentItemDefinition[]
  scales: AssessmentScaleDefinition[]
  // Optional facet-level schema (e.g., IPIP-NEO facets) for future scoring key injection.
  facetScales?: AssessmentScaleDefinition[]
  missingDataPolicy: MissingDataPolicy
  retakePolicy: RetakePolicy
  pageSize: number
  supportsCentering?: boolean
  defaultCenteringEnabled?: boolean
  interpretationScale: InterpretationScale
  /** Every response value has its own anchor, so answer buttons show labels, not numbers. */
  labelledResponses?: boolean
  sumScoring?: SumScoringConfig
}

export interface ScaleScore {
  scaleId: string
  labelKey: string
  answeredCount: number
  itemCount: number
  rawMean: number | null
  normalizedMean: number | null
  band?: ScaleBand
  deltaFromPrevious?: number
  details?: Record<string, number | string | boolean | null>
}

export interface OverallSummary {
  completedScaleCount: number
  totalScaleCount: number
  meanOfMeans: number | null
  highlights?: string[]
  topValues?: Array<{ scaleId: string; value: number }>
  biggestGaps?: Array<{ scaleId: string; gap: number }>
  details?: Record<string, number | string | boolean | null>
}

export interface ScoringComputationMetadata {
  centeredScoringEnabled: boolean
  mrat?: number
  completedWithMissingData: boolean
  missingItemCount: number
  scoringTimestamp: string
}

export interface AssessmentAttempt {
  id: string
  assessmentId: AssessmentId
  instrumentVersion: InstrumentVersion
  language: LocaleId
  startedAt: string
  completedAt?: string
  status: AssessmentStatus
  scoringKeyVersion: ScoringKeyVersion
  missingDataPolicyVersion: string
  retakeEligibleAt?: string
  responseCount: number
  totalItems: number
  computedScales?: ScaleScore[]
  overallSummary?: OverallSummary
  scoringComputationMetadata?: ScoringComputationMetadata
  createdAt: string
  updatedAt: string
}

export interface AssessmentResponse {
  id: string
  attemptId: string
  assessmentId: AssessmentId
  itemId: string
  responseValue: number
  reverseFlagAtTime: boolean
  scoringKeyVersion: ScoringKeyVersion
  answeredAt: string
  createdAt: string
  updatedAt: string
}

export interface StartAssessmentAttemptPayload {
  assessmentId: AssessmentId
  instrumentVersion: InstrumentVersion
  language: LocaleId
  scoringKeyVersion: ScoringKeyVersion
  missingDataPolicyVersion: string
  totalItems: number
}

export interface SaveAssessmentResponsePayload {
  attemptId: string
  assessmentId: AssessmentId
  itemId: string
  responseValue: number
  reverseFlagAtTime: boolean
  scoringKeyVersion: ScoringKeyVersion
}

export interface CompleteAssessmentAttemptPayload {
  computedScales: ScaleScore[]
  overallSummary: OverallSummary
  scoringComputationMetadata: ScoringComputationMetadata
  retakeEligibleAt?: string
}

export interface AssessmentResult {
  attempt: AssessmentAttempt
  responses: AssessmentResponse[]
}

export interface AssessmentComputation {
  computedScales: ScaleScore[]
  overallSummary: OverallSummary
  scoringComputationMetadata: ScoringComputationMetadata
}
