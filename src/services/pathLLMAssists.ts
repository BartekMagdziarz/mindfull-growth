/**
 * Path (program) LLM assists — plan v3 §7.4 / P4.
 *
 * One call: "wzorzec tygodnia" — a single descriptive sentence about a
 * week of Momenty, shown in the weekly reflection's Ścieżka step as a
 * proposal. Input is the week's statistics (`MomentsWeekStats`) and up to
 * three kind sentences the user wrote; the path's records stay out of the
 * companion's history. No profile context: the sentence is about the week,
 * not the person.
 */

import type { MomentsWeekStats, NoticedKey, ShamePartKey } from '@/domain/momentsProgress'
import { sendMessage, type ChatMessage } from '@/services/llmService'
import type { LocaleId } from '@/services/locale.service'
import { getPathPrompts } from '@/services/prompts'
import type { PathPromptModule } from '@/services/prompts/types'

export interface WeekPatternParams {
  week: MomentsWeekStats
  previous?: MomentsWeekStats
  /** Part labels as the UI shows them (the user may have renamed the parts). */
  partLabels: Record<Exclude<ShamePartKey, 'none'>, string>
  kindVoices: string[]
  locale: LocaleId
}

function describeWeek(label: string, week: MomentsWeekStats, params: WeekPatternParams, prompts: PathPromptModule): string {
  const l = prompts.labels
  const parts = (Object.keys(week.byPart) as ShamePartKey[])
    .filter((key) => week.byPart[key] > 0)
    .map((key) => {
      const name = key === 'none' ? l.nonePart : params.partLabels[key]
      const strength = week.strength[key]
      const mean = strength.rated ? ` · ${(strength.sum / strength.rated).toFixed(1)}` : ''
      return `${name} ${week.byPart[key]}×${mean}`
    })
  const noticed = (Object.keys(week.noticed) as NoticedKey[])
    .filter((key) => week.noticed[key] > 0)
    .map((key) => `${l.noticing[key]} ${week.noticed[key]}`)
  const lines = [
    `${label}:`,
    `${l.moments}: ${week.total}${week.unlogged ? ` (${l.unlogged}: ~${week.unlogged})` : ''}`,
    parts.length ? `${l.parts}: ${parts.join(', ')}` : '',
    noticed.length ? `${l.noticed}: ${noticed.join(', ')}` : '',
    week.total ? `${l.responded}: ${week.responded}/${week.total}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

export async function describeWeekPattern(params: WeekPatternParams): Promise<string> {
  const prompts = getPathPrompts(params.locale)
  const sections = [describeWeek(prompts.labels.thisWeek, params.week, params, prompts)]
  if (params.previous) sections.push(describeWeek(prompts.labels.previousWeek, params.previous, params, prompts))
  if (params.kindVoices.length) {
    sections.push(`${prompts.labels.kindVoices}:\n${params.kindVoices.slice(0, 3).map((text) => `- "${text}"`).join('\n')}`)
  }
  const messages: ChatMessage[] = [{ role: 'user', content: sections.join('\n\n') }]
  return sendMessage(messages, prompts.PATH_WEEK_PATTERN)
}
