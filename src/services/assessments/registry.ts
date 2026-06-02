import type { AssessmentDefinition, AssessmentId } from '@/domain/assessments'
import type { AssessmentScorer } from '@/services/assessments/types'
import ipipBfm50Meta from '@/data/assessments/ipip-bfm50.meta.json'
import ipipNeo120Meta from '@/data/assessments/ipip-neo-120.meta.json'
import hexaco60Meta from '@/data/assessments/hexaco-60.meta.json'
import pvq40Meta from '@/data/assessments/pvq-40.meta.json'
import vlqMeta from '@/data/assessments/vlq.meta.json'
import erqMeta from '@/data/assessments/erq.meta.json'
import ecrRsMeta from '@/data/assessments/ecr-rs.meta.json'
import rrqMeta from '@/data/assessments/rrq.meta.json'
import ipipViaMeta from '@/data/assessments/ipip-via.meta.json'
import { ipipBfm50Scorer } from './scorers/ipipBfm50.scorer'
import { ipipNeo120Scorer } from './scorers/ipipNeo120.scorer'
import { hexaco60Scorer } from './scorers/hexaco60.scorer'
import { pvq40Scorer } from './scorers/pvq40.scorer'
import { vlqScorer } from './scorers/vlq.scorer'
import { erqScorer } from './scorers/erq.scorer'
import { ecrRsScorer } from './scorers/ecrRs.scorer'
import { rrqScorer } from './scorers/rrq.scorer'
import { ipipViaScorer } from './scorers/ipipVia.scorer'

export interface AssessmentRegistryEntry {
  definition: AssessmentDefinition
  scorer: AssessmentScorer
}

const IPIP_BFM_50_DEFINITION = ipipBfm50Meta as AssessmentDefinition
const IPIP_NEO_120_DEFINITION: AssessmentDefinition = {
  ...(ipipNeo120Meta as AssessmentDefinition),
  // Domain-level scoring only in this release.
  // TODO: inject facet scoring keys when a validated facet map is provided.
  facetScales: [],
}
const HEXACO_60_DEFINITION = hexaco60Meta as AssessmentDefinition
const PVQ_40_DEFINITION = pvq40Meta as AssessmentDefinition
const VLQ_DEFINITION = vlqMeta as AssessmentDefinition
const ERQ_DEFINITION = erqMeta as AssessmentDefinition
const ECR_RS_DEFINITION = ecrRsMeta as AssessmentDefinition
const RRQ_DEFINITION = rrqMeta as AssessmentDefinition
const IPIP_VIA_DEFINITION = ipipViaMeta as AssessmentDefinition

const assessmentRegistry: Record<AssessmentId, AssessmentRegistryEntry> = {
  'ipip-bfm-50': {
    definition: IPIP_BFM_50_DEFINITION,
    scorer: ipipBfm50Scorer,
  },
  'ipip-neo-120': {
    definition: IPIP_NEO_120_DEFINITION,
    scorer: ipipNeo120Scorer,
  },
  'hexaco-60': {
    definition: HEXACO_60_DEFINITION,
    scorer: hexaco60Scorer,
  },
  'pvq-40': {
    definition: PVQ_40_DEFINITION,
    scorer: pvq40Scorer,
  },
  vlq: {
    definition: VLQ_DEFINITION,
    scorer: vlqScorer,
  },
  erq: {
    definition: ERQ_DEFINITION,
    scorer: erqScorer,
  },
  'ecr-rs': {
    definition: ECR_RS_DEFINITION,
    scorer: ecrRsScorer,
  },
  rrq: {
    definition: RRQ_DEFINITION,
    scorer: rrqScorer,
  },
  'ipip-via': {
    definition: IPIP_VIA_DEFINITION,
    scorer: ipipViaScorer,
  },
}

export function getAssessmentRegistryEntry(assessmentId: AssessmentId): AssessmentRegistryEntry {
  const entry = assessmentRegistry[assessmentId]
  if (!entry) {
    throw new Error(`Unknown assessment id: ${assessmentId}`)
  }
  return entry
}

export function getAssessmentDefinition(assessmentId: AssessmentId): AssessmentDefinition {
  return getAssessmentRegistryEntry(assessmentId).definition
}

export function getAssessmentScorer(assessmentId: AssessmentId): AssessmentScorer {
  return getAssessmentRegistryEntry(assessmentId).scorer
}

export function listAssessmentDefinitions(): AssessmentDefinition[] {
  return Object.values(assessmentRegistry).map((entry) => entry.definition)
}
