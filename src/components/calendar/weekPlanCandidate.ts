import type { MeasurementEntryMode, MeasurementTarget, WeeklyIntention } from '@/domain/planning'
import type { MeasurementSubjectType } from '@/domain/planningState'

/**
 * A week-active object (key result / habit / weekly intention) eligible for top-3 selection
 * in the combined weekly planning step. Enriched beyond the bare priority ref so the card can
 * render an icon, the measurement, and (for KRs) the parent goal — and edit/delete intentions.
 */
export interface WeekPlanCandidate {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  typeLabel: string
  icon?: string
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  description?: string
  parentGoalTitle?: string
  parentGoalIcon?: string
  /** Present only for weeklyIntention candidates — enables inline edit + delete. */
  intention?: WeeklyIntention
}
