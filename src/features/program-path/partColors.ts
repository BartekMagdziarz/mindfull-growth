import { MOMENT_FAMILIES } from '@/domain/momentFamilies'
import type { ShamePartKey } from '@/domain/momentsProgress'

/**
 * The reaction families as colours (Lab /concepts/path-view-v2, rounds
 * 6j–6m, 2026-10-11; anger and anxiety added 2026-10-18 on the same
 * ramps). Two families, two shades each — the user's reading of the
 * compass: attack pointed at self vs others, hiding from others vs from
 * oneself. Within a family the lighter shade points at the self, the
 * deeper one at others. All pastel, drawn with a pencil outline.
 *
 *   Ja / Pauza / Podejście   czyste niebo   sky-400 washed with paper
 *   Odwracający uwagę · Milczenie · Odkładanie     inward, light   lilac
 *   Ukrywający · Na siebie · Wycofanie             inward, deep    lavender
 *   Krytyk · Ostrzej · Sprawdzanie                 outward, light  rose-200
 *   Agresor · Wybuch · Zamartwianie                outward, deep   rose-400
 *
 * ORDER = stacking order bottom → top (`MOMENT_FAMILIES[kind].keys`).
 * Validated with the dataviz palette checker on the mist tile: every
 * adjacent pair clears the CVD floor (worst 8.0, lilac ↔ blue); pastels
 * sit below the tool's normal-vision threshold, so colour is never the
 * only channel — outlines, gaps, the legend and the hover counts carry
 * identity too.
 */
export const PART_ORDER: readonly ShamePartKey[] = MOMENT_FAMILIES.shame.keys as readonly ShamePartKey[]

const SKY = 'color-mix(in srgb, rgb(var(--sky-400)) 78%, var(--mg-color-paper))'
const LILAC = 'rgb(227 220 246)'
const LAVENDER = 'rgb(197 168 216)'
const ROSE_LIGHT = 'rgb(var(--rose-200))'
const ROSE_DEEP = 'rgb(var(--rose-400))'

/** Colour per reaction key, every family in one map (keys never collide across families except `withdraw`, same shade). */
export const PART_COLOR: Readonly<Record<string, string>> = {
  // shame
  none: SKY,
  avoid: LILAC,
  withdraw: LAVENDER,
  attackSelf: ROSE_LIGHT,
  attackOthers: ROSE_DEEP,
  // anger
  pause: SKY,
  silence: LILAC,
  selfBlame: LAVENDER,
  sharp: ROSE_LIGHT,
  outburst: ROSE_DEEP,
  // anxiety (`withdraw` shares the lavender above)
  approach: SKY,
  postpone: LILAC,
  check: ROSE_LIGHT,
  worry: ROSE_DEEP,
}

export function partColor(key: string): string {
  return PART_COLOR[key] ?? SKY
}
