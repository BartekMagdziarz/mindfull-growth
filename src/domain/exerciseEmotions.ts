import { groupSelectionsToFamilyIds, type EmotionGroupSelection } from './emotionGroups'

/** Keep family IDs alongside the full picker values for existing exercise readers. */
export function exerciseEmotionChange(
  before: EmotionGroupSelection[],
  after: EmotionGroupSelection[]
) {
  return {
    emotionsBefore: before,
    emotionFamilyIdsBefore: groupSelectionsToFamilyIds(before),
    emotionsAfter: after,
    emotionFamilyIdsAfter: groupSelectionsToFamilyIds(after),
  }
}

/** History can contain legacy words, family-only choices or a mix of both. */
export function exerciseEmotionIds(words: string[], families: string[] = []): string[] {
  return [...new Set([...words, ...families])]
}
