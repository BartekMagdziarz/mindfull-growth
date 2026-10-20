/**
 * Step lists of earlier content versions, kept so `programContentMigration`
 * can re-map an enrollment's completed step indices by exercise slug when
 * a path changes shape. Add an entry whenever `contentVersion` is bumped;
 * never edit a version that shipped.
 */

/** `programSlug → contentVersion → exercise slugs in step order`. */
export const LEGACY_PROGRAM_STEPS: Readonly<Record<string, Readonly<Record<number, readonly string[]>>>> = {
  // Shipped 2026-09-23 (v1); v2 on 2026-10-18 (weeks as phases, "Mój znak",
  // the mid-path measure and dose check, the letter, the close and Powrót).
  'anger-signal': {
    1: [
      'anger-barometer',
      'anger-map',
      'pause-plan',
      'cognitive-distortions',
      'thought-record',
      'trailhead',
      'protector-appreciation',
      'need-behind-anger',
      'structured-problem-solving',
      'behavioral-experiment',
      'compassionate-letter',
      'anger-barometer',
      'maintenance-plan',
    ],
  },
  'anxiety-approach': {
    1: [
      'gad-7',
      'ius-12',
      'anxiety-map',
      'worry-tree',
      'cognitive-distortions',
      'thought-record',
      'behavioral-experiment',
      'structured-problem-solving',
      'graded-exposure',
      'graded-exposure',
      'paradoxical-intention',
      'dereflection',
      'behavioral-activation',
      'gad-7',
      'maintenance-plan',
    ],
  },
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
    // Shipped 2026-09-26 (v2: image + response before the critic, the
    // "O czym jest ten wstyd?" axis, Momenty).
    2: [
      'scs-sf',
      'shame-map',
      'compassionate-image',
      'shame-response',
      'shame-or-guilt',
      'thought-record',
      'trailhead',
      'protector-appreciation',
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
