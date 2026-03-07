export type SelectionRepairMode = 'pruned' | 'fallback'

export interface ResolvePeriodTrackerSelectionInput {
  selectedTrackerIds?: string[]
  eligibleTrackerIds: string[]
}

export interface ResolvePeriodTrackerSelectionResult {
  hasExplicitSelection: boolean
  effectiveSelectedTrackerIds: string[]
  repairedSelectedTrackerIds?: string[]
  repairMode?: SelectionRepairMode
}

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

export function resolvePeriodTrackerSelection(
  input: ResolvePeriodTrackerSelectionInput
): ResolvePeriodTrackerSelectionResult {
  const eligible = unique(input.eligibleTrackerIds)
  const eligibleSet = new Set(eligible)

  if (!Array.isArray(input.selectedTrackerIds)) {
    return {
      hasExplicitSelection: false,
      effectiveSelectedTrackerIds: eligible,
    }
  }

  const explicit = unique(input.selectedTrackerIds)
  const intersected = explicit.filter((trackerId) => eligibleSet.has(trackerId))

  if (explicit.length === 0) {
    return {
      hasExplicitSelection: true,
      effectiveSelectedTrackerIds: [],
    }
  }

  // Avoid destructive repairs while eligibility is unresolved (e.g. loading state).
  if (eligible.length === 0) {
    return {
      hasExplicitSelection: true,
      effectiveSelectedTrackerIds: [],
    }
  }

  if (intersected.length === 0 && eligible.length > 0) {
    return {
      hasExplicitSelection: true,
      effectiveSelectedTrackerIds: eligible,
      repairedSelectedTrackerIds: eligible,
      repairMode: 'fallback',
    }
  }

  if (intersected.length !== explicit.length) {
    return {
      hasExplicitSelection: true,
      effectiveSelectedTrackerIds: intersected,
      repairedSelectedTrackerIds: intersected,
      repairMode: 'pruned',
    }
  }

  return {
    hasExplicitSelection: true,
    effectiveSelectedTrackerIds: intersected,
  }
}
