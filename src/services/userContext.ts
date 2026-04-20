import { PROFILE_SECTION_IDS, type UserProfile } from '@/domain/userProfile'

/**
 * Builds a short markdown block summarising the user's psychological profile,
 * suitable for prepending to an LLM system prompt.
 *
 * Returns an empty string if `profile` is undefined/null or has no non-empty
 * sections — callers can safely concatenate without conditional logic.
 *
 * The output is deterministic: same input → same output. No timestamps,
 * scope details or raw response bodies leak in. Only the parsed sections and
 * optional note are included.
 *
 * Section labels are kept in English regardless of the user's locale, because
 * the markers are for the LLM, not the user. The LLM can write back in any
 * language based on its own prompt and conversation history.
 *
 * Empty sections are skipped entirely (no "N/A" or placeholder lines).
 */
export function buildUserContext(
  profile: UserProfile | undefined | null,
): string {
  if (!profile) return ''

  const labels: Record<(typeof PROFILE_SECTION_IDS)[number], string> = {
    summary: 'Summary',
    values: 'Values',
    emotionalPatterns: 'Emotional Patterns',
    strengths: 'Strengths',
    challenges: 'Challenges',
    relationships: 'Relationships',
    themes: 'Themes',
    recentArc: 'Recent Arc',
    suggestedDirections: 'Suggested Directions',
  }

  // Collect non-empty section blocks in canonical order first so we can bail
  // out early with `''` when everything is blank — without emitting a stray
  // header line.
  const sectionBlocks: string[] = []
  for (const id of PROFILE_SECTION_IDS) {
    const body = (profile.sections[id] ?? '').trim()
    if (!body) continue
    sectionBlocks.push(`### ${labels[id]}\n${body}`)
  }

  if (sectionBlocks.length === 0) return ''

  const lines: string[] = ['## User Profile Context']
  const note = profile.note?.trim()
  if (note) {
    lines.push(`_Note: ${note}_`)
  }
  lines.push('')
  for (const block of sectionBlocks) {
    lines.push(block)
    lines.push('')
  }

  return lines.join('\n').trimEnd()
}
