import type {
  MeasurementEntryDaysCondition,
  MeasurementEntryMode,
  MeasurementTarget,
} from '@/domain/planning'

/**
 * Pure helpers behind the library cards' field edits (extracted from
 * ObjectsLibraryView, P-5). No store, no repositories.
 */

/** Keeps a compatible target when the entry mode changes, otherwise the mode's default. */
export function buildTargetForEntryMode(
  entryMode: MeasurementEntryMode,
  currentTarget: MeasurementTarget
): MeasurementTarget {
  switch (entryMode) {
    case 'completion':
    case 'counter':
    case 'multi-completion':
      if (currentTarget.kind === 'count') return currentTarget
      return { kind: 'count', operator: 'min', value: 1 }
    case 'value':
      if (currentTarget.kind === 'value') return currentTarget
      return { kind: 'value', aggregation: 'sum', operator: 'gte', value: 1 }
    case 'rating':
      if (currentTarget.kind === 'rating') return currentTarget
      return { kind: 'rating', aggregation: 'average', operator: 'gte', value: 1 }
  }
}

/** One field of a target, respecting which fields each target kind carries. */
export function updateTargetField(
  _entryMode: MeasurementEntryMode,
  currentTarget: MeasurementTarget,
  field: 'operator' | 'aggregation' | 'value' | 'entryDays',
  value: string | number | MeasurementEntryDaysCondition | undefined
): MeasurementTarget {
  if (field === 'entryDays') {
    return { ...currentTarget, entryDays: value as MeasurementEntryDaysCondition | undefined }
  }
  switch (currentTarget.kind) {
    case 'count':
      if (field === 'operator') return { ...currentTarget, operator: value as 'min' | 'max' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
    case 'value':
      if (field === 'operator') return { ...currentTarget, operator: value as 'gte' | 'lte' }
      if (field === 'aggregation')
        return { ...currentTarget, aggregation: value as 'sum' | 'average' | 'last' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
    case 'rating':
      if (field === 'operator') return { ...currentTarget, operator: value as 'gte' | 'lte' }
      if (field === 'value') return { ...currentTarget, value: value as number }
      return currentTarget
  }
}

export function normalizeOptionalText(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

/** Priority signals are edited as one line per signal; empty lines and duplicates drop. */
export function parseSignalLines(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split('\n')
        .map(item => item.trim())
        .filter(Boolean)
    )
  )
}

/** Adds the id if missing, removes it if present. */
export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(existing => existing !== id) : [...ids, id]
}
