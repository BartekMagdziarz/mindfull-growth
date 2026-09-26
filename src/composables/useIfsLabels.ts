/**
 * Human-readable labels for IFS enum values (body locations, 8 C qualities,
 * relationship types, protector behaviours, check-in frequencies, weekday
 * initials). Every IFS wizard/view used to title-case the raw enum slug,
 * which leaked English into the Polish UI — this is the single source now.
 */

import { computed } from 'vue'
import { useT } from '@/composables/useT'
import type {
  IFSBodyLocation,
  IFSProtectorBehavior,
  IFSRelationship,
  IFSConstellationRelationType,
  SelfEnergyQuality,
} from '@/domain/exercises'

type RelationshipType = IFSRelationship['type'] | IFSConstellationRelationType

const RELATIONSHIP_KEYS: Record<RelationshipType, string> = {
  protects: 'protects',
  polarized: 'polarized',
  allied: 'allied',
  triggers: 'triggers',
  soothes: 'soothes',
  'protector-exile': 'protectorExile',
  'no-relationship': 'noRelationship',
}

const BEHAVIOR_KEYS: Record<IFSProtectorBehavior, string> = {
  perfectionism: 'perfectionism',
  control: 'control',
  avoidance: 'avoidance',
  numbing: 'numbing',
  'people-pleasing': 'peoplePleasing',
  overthinking: 'overthinking',
  anger: 'anger',
  withdrawal: 'withdrawal',
  distraction: 'distraction',
  caretaking: 'caretaking',
  custom: 'custom',
}

/** Monday-first, matching the check-in weekday strips. `common.days` is 0 = Sunday. */
const MONDAY_FIRST_DAY_INDEXES = [1, 2, 3, 4, 5, 6, 0]

export function useIfsLabels() {
  const { t } = useT()

  function formatBodyLocation(location: IFSBodyLocation | string): string {
    return t(`exerciseWizards.shared.ifs.bodyLocations.${location}`)
  }

  function formatBodyLocations(locations: readonly (IFSBodyLocation | string)[]): string {
    return locations.map(formatBodyLocation).join(', ')
  }

  function formatQuality(quality: SelfEnergyQuality | string): string {
    return t(`exerciseWizards.shared.ifs.selfEnergyWheel.qualities.${quality}`)
  }

  function formatRelationshipType(type: RelationshipType): string {
    return t(`exerciseWizards.shared.ifs.relationshipTypes.${RELATIONSHIP_KEYS[type] ?? type}`)
  }

  function formatProtectorBehavior(behavior: IFSProtectorBehavior | string): string {
    const key = BEHAVIOR_KEYS[behavior as IFSProtectorBehavior]
    return key
      ? t(`exerciseWizards.protectorAppreciation.understandJob.behaviorOptions.${key}`)
      : behavior
  }

  function formatCheckInFrequency(frequency: 'weekly' | 'biweekly' | 'monthly' | string): string {
    return t(`exerciseWizards.protectorAppreciation.checkIn.frequencyOptions.${frequency}`)
  }

  /** One-letter weekday labels, Monday first (P W Ś C P S N in Polish). */
  const weekdayInitials = computed(() =>
    MONDAY_FIRST_DAY_INDEXES.map((d) => t(`common.days.${d}`).charAt(0).toUpperCase()),
  )

  const unknownPartName = computed(() => t('exerciseWizards.shared.ifs.partSelector.unknownPart'))

  return {
    formatBodyLocation,
    formatBodyLocations,
    formatQuality,
    formatRelationshipType,
    formatProtectorBehavior,
    formatCheckInFrequency,
    weekdayInitials,
    unknownPartName,
  }
}
