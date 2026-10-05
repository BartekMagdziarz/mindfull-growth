import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { blankProfileContent, type ProfileCategory } from '@/domain/approvedProfile'
import { PROFILE_SECTION_IDS } from '@/domain/userProfile'
import { CompanionError } from '../companion/openai'

/** Explicit user action; migration itself never interprets or approves an old portrait. */
export async function proposeLegacyProfile(id: string) {
  const repo = approvedProfileRepository()
  const profile = await repo.db.userProfiles.get(id)
  repo.guard()
  if (!profile) throw new CompanionError('missing-profile')
  const category: Record<string, ProfileCategory> = {
    values: 'values',
    strengths: 'strengths',
    recentArc: 'currentContext',
    challenges: 'currentContext',
    suggestedDirections: 'focus',
  }
  let created = 0,
    tooLong = 0
  for (const section of PROFILE_SECTION_IDS) {
    const text = profile.sections[section]?.trim()
    if (!text) continue
    if (text.length > 4000) {
      tooLong++
      continue
    }
    await repo.propose({
      dedupeKey: `legacy:${id}:${profile.updatedAt}:${section}`,
      operation: 'add',
      targetId: null,
      targetVersion: null,
      content: { ...blankProfileContent(), category: category[section] ?? 'identity', text },
      origin: {
        kind: 'legacy',
        label: `Wcześniejszy profil · ${section}`,
        legacyId: id,
        legacyVersion: profile.updatedAt,
        citations: [],
      },
      reason:
        'Fragment wcześniejszego opisu AI, nie potwierdzony fakt. Przeczytaj, popraw lub odrzuć; możesz też omówić go z AI.',
    })
    created++
  }
  return { created, tooLong }
}
