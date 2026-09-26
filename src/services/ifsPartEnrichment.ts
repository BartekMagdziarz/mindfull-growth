/**
 * Write discoveries from IFS sessions back to the shared parts registry.
 *
 * Direct Access, Protector Appreciation and Exile Witnessing all learn
 * things about a part (its job, fear, need, felt age, burden). Until now
 * those stayed on the session record and the part card never learned —
 * every later AI prompt saw only what the first Parts Mapping captured.
 *
 * Policy: only EMPTY fields are filled (the user's own earlier wording is
 * never overwritten); list fields are unioned. Callers gate this behind a
 * user-visible checkbox.
 */

import type { IFSBodyLocation, IFSPart, UpdateIFSPartPayload } from '@/domain/exercises'
import { useIFSPartStore } from '@/stores/ifsPart.store'

export interface PartDiscoveries {
  positiveIntention?: string
  fears?: string
  needs?: string
  burden?: string
  feltAge?: number
  triggerContexts?: string[]
  bodyLocations?: IFSBodyLocation[]
}

function clean(value: string | undefined): string | undefined {
  const v = value?.trim()
  return v ? v : undefined
}

/** Compute the patch that fills only the part's empty fields. `null` = nothing to write. */
export function emptyFieldPatch(part: IFSPart, discoveries: PartDiscoveries): UpdateIFSPartPayload | null {
  const patch: UpdateIFSPartPayload = {}

  const positiveIntention = clean(discoveries.positiveIntention)
  if (positiveIntention && !clean(part.positiveIntention)) patch.positiveIntention = positiveIntention

  const fears = clean(discoveries.fears)
  if (fears && !clean(part.fears)) patch.fears = fears

  const needs = clean(discoveries.needs)
  if (needs && !clean(part.needs)) patch.needs = needs

  const burden = clean(discoveries.burden)
  if (burden && !clean(part.burden)) patch.burden = burden

  if (discoveries.feltAge && !part.feltAge) patch.feltAge = discoveries.feltAge

  const newTriggers = (discoveries.triggerContexts ?? []).map((t) => t.trim()).filter(Boolean)
  if (newTriggers.length) {
    const existing = part.triggerContexts ?? []
    const merged = [...existing, ...newTriggers.filter((t) => !existing.includes(t))]
    if (merged.length !== existing.length) patch.triggerContexts = merged
  }

  const newBody = discoveries.bodyLocations ?? []
  if (newBody.length) {
    const merged = [...part.bodyLocations, ...newBody.filter((b) => !part.bodyLocations.includes(b))]
    if (merged.length !== part.bodyLocations.length) patch.bodyLocations = merged
  }

  return Object.keys(patch).length ? patch : null
}

/** Fill the part's empty fields from `discoveries`. Resolves to true when something was written. */
export async function enrichPartFromDiscoveries(
  partId: string,
  discoveries: PartDiscoveries,
): Promise<boolean> {
  const partStore = useIFSPartStore()
  const part = partStore.getPartById(partId)
  if (!part) return false
  const patch = emptyFieldPatch(part, discoveries)
  if (!patch) return false
  await partStore.updatePart(partId, patch)
  return true
}
