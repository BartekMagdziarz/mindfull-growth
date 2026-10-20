/**
 * Shame path (v3) — the four reactions of the compass of shame as IFS parts.
 *
 * The shame map (`shame-map` micro) asks which reaction takes over
 * (withdraw / attackSelf / attackOthers / avoid). In IFS terms each one is
 * a protector guarding an exile that carries the shame, so saving the map
 * creates those parts in the user's registry: later steps (Punkt wejścia,
 * Docenienie protektora, Rozmowa z częścią) preselect them by tag, and
 * Momenty label the compass options with the user's own part names.
 *
 * Rules (plan ideas/html-plans/2026-10-04-shame-path-v3.html §4):
 * - idempotent — a part is created once per tag; a second map save never
 *   duplicates;
 * - a part the user deleted does not come back: the shame-path enrollment
 *   keeps `partsDismissed` (reaction ids) and the service skips them;
 * - names are the Polish defaults (services stay i18n-free, parts are the
 *   user's data and renameable in Mapowanie części).
 *
 * Called from `exerciseCompletionService.recordCompletion` for
 * `shame-map`; failures are logged there and never block the completion.
 */

import type { CreateIFSPartPayload, IFSPart, IFSPartRole } from '@/domain/exercises'
import type { MicroExerciseEntry } from '@/domain/microExercises'
import { ifsPartDexieRepository } from '@/repositories/exercisesDexieRepository'
import { microExerciseEntryDexieRepository } from '@/repositories/microExerciseEntryDexieRepository'
import { programEnrollmentDexieRepository } from '@/repositories/programEnrollmentDexieRepository'

export const SHAME_PROGRAM_SLUG = 'shame-compassion'
export const SHAME_PROGRAM_TAG = `program:${SHAME_PROGRAM_SLUG}`

export type ShameReaction = 'withdraw' | 'attackSelf' | 'attackOthers' | 'avoid'

export const SHAME_REACTIONS: readonly ShameReaction[] = ['withdraw', 'attackSelf', 'attackOthers', 'avoid']

export interface ShameCompassPart {
  reaction: ShameReaction
  /** Default Polish name; the user may rename the part. */
  name: string
  role: IFSPartRole
  /** Default positive intention (editable on the part). */
  positiveIntention: string
  /** Stable tag — lookups survive a rename. */
  tag: string
}

export const SHAME_COMPASS_PARTS: Readonly<Record<ShameReaction, ShameCompassPart>> = {
  withdraw: {
    reaction: 'withdraw',
    name: 'Ukrywający',
    role: 'manager',
    positiveIntention: 'Chroni przed byciem zobaczonym, zanim ktoś oceni.',
    tag: 'shame-compass:withdraw',
  },
  attackSelf: {
    reaction: 'attackSelf',
    name: 'Krytyk',
    role: 'manager',
    positiveIntention: 'Uprzedza cudzą krytykę, żeby zabolała mniej.',
    tag: 'shame-compass:attackSelf',
  },
  attackOthers: {
    reaction: 'attackOthers',
    name: 'Agresor',
    role: 'firefighter',
    positiveIntention: 'Obwinia i odpycha innych, zanim poczucie małości zdąży zaboleć.',
    tag: 'shame-compass:attackOthers',
  },
  avoid: {
    reaction: 'avoid',
    name: 'Odwracający uwagę',
    role: 'firefighter',
    positiveIntention: 'Odwraca uwagę od samego poczucia, zanim zdąży zaboleć.',
    tag: 'shame-compass:avoid',
  },
}

export function shameCompassTag(reaction: ShameReaction): string {
  return SHAME_COMPASS_PARTS[reaction].tag
}

function isShameReaction(value: unknown): value is ShameReaction {
  return typeof value === 'string' && (SHAME_REACTIONS as readonly string[]).includes(value)
}

/** Reactions picked in a shame-map entry's `compass` step (unknown ids dropped). */
export function reactionsFromShameMap(entry: Pick<MicroExerciseEntry, 'responses'>): ShameReaction[] {
  const raw = entry.responses.compass
  const list = Array.isArray(raw) ? raw : typeof raw === 'string' ? [raw] : []
  return list.filter(isShameReaction)
}

/** The part created for a reaction, found by tag (survives renames). */
export function shamePartByReaction(
  parts: readonly IFSPart[],
  reaction: ShameReaction
): IFSPart | undefined {
  const tag = shameCompassTag(reaction)
  return parts.find(part => part.tags?.includes(tag))
}

export function createPayloadForReaction(reaction: ShameReaction): CreateIFSPartPayload {
  const spec = SHAME_COMPASS_PARTS[reaction]
  return {
    name: spec.name,
    role: spec.role,
    bodyLocations: [],
    emotionIds: [],
    lifeAreaIds: [],
    positiveIntention: spec.positiveIntention,
    triggerContexts: ['wstyd'],
    tags: [spec.tag, SHAME_PROGRAM_TAG],
  }
}

/** The shame-path enrollment whose `partsDismissed` applies: the open one, else the newest. */
async function shameEnrollment() {
  const all = await programEnrollmentDexieRepository.listAll()
  const mine = all
    .filter(enrollment => enrollment.programSlug === SHAME_PROGRAM_SLUG)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return mine.find(e => e.status === 'active' || e.status === 'paused') ?? mine[0]
}

/**
 * Ensures a tagged part exists for every reaction picked in the shame map.
 * Returns the parts that now represent the picked reactions (existing or
 * created); dismissed reactions are left alone.
 */
export async function ensureShameParts(entry: Pick<MicroExerciseEntry, 'responses'>): Promise<IFSPart[]> {
  const reactions = reactionsFromShameMap(entry)
  if (reactions.length === 0) return []
  const [parts, enrollment] = await Promise.all([ifsPartDexieRepository.getAll(), shameEnrollment()])
  const dismissed = new Set(enrollment?.partsDismissed ?? [])
  const result: IFSPart[] = []
  for (const reaction of reactions) {
    const existing = shamePartByReaction(parts, reaction)
    if (existing) {
      result.push(existing)
      continue
    }
    if (dismissed.has(reaction)) continue
    result.push(await ifsPartDexieRepository.create(createPayloadForReaction(reaction)))
  }
  return result
}

/** Loads the saved shame-map entry and ensures its parts; null when the entry is gone. */
export async function ensureShamePartsForEntry(entryId: string): Promise<IFSPart[] | null> {
  const entries = await microExerciseEntryDexieRepository.getBySlug('shame-map')
  const entry = entries.find(candidate => candidate.id === entryId)
  if (!entry) return null
  return ensureShameParts(entry)
}

/**
 * Remembers that the user removed the part created for `reaction`, so the
 * next shame-map save does not recreate it. No-op without an enrollment.
 */
export async function dismissShamePart(reaction: ShameReaction): Promise<void> {
  const enrollment = await shameEnrollment()
  if (!enrollment) return
  const current = enrollment.partsDismissed ?? []
  if (current.includes(reaction)) return
  await programEnrollmentDexieRepository.update(enrollment.id, {
    partsDismissed: [...current, reaction],
  })
}
