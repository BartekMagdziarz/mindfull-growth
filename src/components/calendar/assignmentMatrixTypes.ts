import type { SubjectKind } from './plannerTypes'

export type AssignmentMatrixCellState = 'checked' | 'soft' | 'empty'

export interface AssignmentMatrixColumn {
  key: string
  /** Header line, e.g. "PON" (week view) or "T27" (month view). */
  label: string
  /** Second header line, e.g. "29" / "1 lip" or "6–12 lip". */
  sublabel?: string
  /** When present, a small marker dot with this tooltip (e.g. month-boundary info). */
  marker?: string
}

export interface AssignmentMatrixCell {
  state: AssignmentMatrixCellState
  /** Small corner count, e.g. days already scheduled inside a month-view week cell. */
  badge?: string
  disabled?: boolean
  title?: string
}

export interface AssignmentMatrixRow {
  key: string
  title: string
  icon?: string
  subjectType: SubjectKind
  /** Cell per column key; a missing key renders a non-interactive placeholder. */
  cells: Partial<Record<string, AssignmentMatrixCell>>
  /** Pill after the title while the whole period is softly covered, e.g. "cały miesiąc". */
  softLabel?: string
  /** Whole-period quick action renders pressed when already applied. */
  isWholePeriod?: boolean
  /** Row has any placement — enables the clear action. */
  hasPlacement?: boolean
  /** Row can expand a detail strip below itself (rendered via the row-detail slot). */
  expandable?: boolean
}

export interface AssignmentMatrixSection {
  key: string
  /** Rendered as-is — include counts yourself, e.g. "Nawyki (6)". */
  label: string
  rows: AssignmentMatrixRow[]
  /** Collapsible section (e.g. "Pozostałe obiekty"); starts collapsed unless defaultOpen. */
  collapsible?: boolean
  defaultOpen?: boolean
}
