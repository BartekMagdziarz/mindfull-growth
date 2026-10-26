import type {
  MeasurementEntryMode,
  MeasurementTarget,
  MultiCompletionItem,
  PlanningCadence,
} from '@/domain/planning'

type Translator = (key: string, params?: Record<string, string | number>) => string

function formatMeasurementValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '')
}

/**
 * Compact, capitalised summary kept for the planning rituals' chips
 * ("Co najmniej 3 · ≥ 5 dni"). Object cards read the full sentence instead —
 * see {@link formatMeasurementSentence}.
 */
export function formatMeasurementTargetSummary(target: MeasurementTarget, t: Translator): string {
  const value = formatMeasurementValue(target.value)
  // Operators render as words ("Co najmniej / Co najwyżej") for every kind, matching the
  // inline target editor — no more >= / <= notation in user-facing summaries.
  const operator = t(`planning.objects.targetOperators.${target.operator}`)
  let base: string
  switch (target.kind) {
    case 'count':
      base = `${operator} ${value}`
      break
    case 'value': {
      const aggregation = t(`planning.objects.targetAggregations.${target.aggregation}`)
      base = `${aggregation} ${operator} ${value}`
      break
    }
    case 'rating': {
      const aggregation = t('planning.objects.targetAggregations.average')
      base = `${aggregation} ${operator} ${value}`
      break
    }
  }

  const entryDays = target.entryDays
  if (!entryDays) {
    return base
  }
  // The condition stays symbolic ("· ≥ 5 dni") to keep the summary compact.
  const symbol = entryDays.operator === 'min' ? '≥' : '≤'
  return `${base} · ${symbol} ${entryDays.value} ${t('planning.objects.targetSentence.entryDaysUnit')}`
}

/** Checklist threshold facts the sentence needs beyond the target itself. */
export interface MeasurementSentenceMulti {
  /** Points needed per day; undefined = every active item. */
  threshold: number | undefined
  /** Sum of active item weights (the "of N" part). */
  weightSum: number
  /** All active weights are 1 → "items", otherwise "points". */
  allWeightsOne: boolean
}

/** Threshold facts of a checklist from its current items (archived ones do not count). */
export function checklistSentenceFacts(
  items: MultiCompletionItem[],
  threshold: number | undefined
): MeasurementSentenceMulti {
  const active = items.filter(item => !item.archived)
  return {
    threshold,
    weightSum: active.reduce((sum, item) => sum + item.weight, 0),
    allWeightsOne: active.every(item => item.weight === 1),
  }
}

export interface MeasurementSentenceInput {
  entryMode: MeasurementEntryMode
  target: MeasurementTarget
  cadence: PlanningCadence
  ratingScale?: number
  multi?: MeasurementSentenceMulti
}

/** Separator between the clauses of a sentence (threshold · days · cadence). */
export const MEASUREMENT_SENTENCE_SEPARATOR = ' · '

/**
 * The measurement sentence in reading form — the same words the editable
 * sentence shows as pills, as one quiet lowercase line:
 *
 *   "co najmniej 3 razy w tygodniu"
 *   "suma co najmniej 15 w tygodniu"
 *   "średnia co najmniej 3 na 5 · co najmniej 5 dni w tygodniu"
 *   "3 z 4 pkt · co najmniej 4 dni w tygodniu"
 */
export function formatMeasurementSentence(input: MeasurementSentenceInput, t: Translator): string {
  const { entryMode, target, cadence } = input
  const s = (key: string, params?: Record<string, string | number>) =>
    t(`planning.objects.targetSentence.${key}`, params)
  const value = formatMeasurementValue(target.value)
  const operator = s(`op.${target.operator}`)
  const period = cadence === 'monthly' ? s('perMonth') : s('perWeek')
  const clauses: string[] = []

  // Checklist facts are optional: a host that does not know the items skips the clause.
  const multi = entryMode === 'multi-completion' ? input.multi : undefined
  if (multi) {
    if (multi.threshold !== undefined) {
      const unit = multi.allWeightsOne
        ? t('planning.objects.form.multiItems.thresholdOfItems', { max: multi.weightSum })
        : t('planning.objects.form.multiItems.thresholdOfPoints', { max: multi.weightSum })
      clauses.push(`${multi.threshold} ${unit}`)
    } else {
      clauses.push(s('thresholdAllRead'))
    }
  }

  let main: string
  switch (target.kind) {
    case 'count': {
      const unit =
        entryMode === 'completion'
          ? ` ${s(target.value === 1 ? 'timesUnitOne' : 'timesUnit')}`
          : entryMode === 'multi-completion'
            ? ` ${s('entryDaysUnit')}`
            : ''
      main = `${operator} ${value}${unit}`
      break
    }
    case 'value':
      main = `${s(`agg.${target.aggregation}`)} ${operator} ${value}`
      break
    case 'rating':
      main = `${s('agg.average')} ${operator} ${value} ${s('ratingOutOf', { max: input.ratingScale ?? 5 })}`
      break
  }
  clauses.push(main)

  const entryDays = target.entryDays
  if (entryDays) {
    clauses.push(`${s(`op.${entryDays.operator}`)} ${entryDays.value} ${s('entryDaysUnit')}`)
  }

  return `${clauses.join(MEASUREMENT_SENTENCE_SEPARATOR)} ${period}`
}
