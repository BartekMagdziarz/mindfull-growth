/**
 * Step lists of earlier content versions, kept so `programContentMigration`
 * can re-map an enrollment's completed step indices by exercise slug when
 * a path changes shape. Add an entry whenever `contentVersion` is bumped;
 * never edit a version that shipped.
 */

/** `programSlug → contentVersion → exercise slugs in step order`. */
export const LEGACY_PROGRAM_STEPS: Readonly<Record<string, Readonly<Record<number, readonly string[]>>>> = {
  'shame-compassion': {
    // Shipped 2026-09-23 (problem-focused paths v1).
    1: [
      'scs-sf',
      'shame-map',
      'shame-or-guilt',
      'thought-record',
      'trailhead',
      'protector-appreciation',
      'compassionate-image',
      'compassionate-letter',
      'core-beliefs',
      'behavioral-experiment',
      'shadow-beliefs',
      'exile-witnessing',
      'scs-sf',
      'maintenance-plan',
    ],
  },
}

export function legacyProgramSteps(programSlug: string, contentVersion: number): readonly string[] | undefined {
  return LEGACY_PROGRAM_STEPS[programSlug]?.[contentVersion]
}
