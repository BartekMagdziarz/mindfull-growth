/**
 * Reflections over a break, as readers see them: the journal entries the
 * return ritual wrote (tag „Powrót”, or the title as a fallback), parsed back
 * into their three answers. Pure reads.
 */

import type { JournalEntry } from '@/domain/journal'
import type { MonthRef } from '@/domain/period'
import {
  isReturnReflectionTitle,
  parseReturnReflection,
  RETURN_CONTEXT_TAG_NAME,
  type ReturnReflection,
} from '@/domain/returnReflection'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { contextTagDexieRepository } from '@/repositories/tagDexieRepository'
import { getPeriodRefsForDate } from '@/utils/periods'

export interface ReturnReflectionEntry {
  entryId: string
  /** „Powrót po przerwie · 30 wrz – 25 paź” */
  title: string
  writtenAt: string
  reflection: ReturnReflection
}

export function selectReturnReflectionEntries(
  entries: readonly JournalEntry[],
  returnTagId: string | undefined
): ReturnReflectionEntry[] {
  return entries
    .filter(
      entry =>
        (returnTagId && entry.contextTagIds?.includes(returnTagId)) ||
        isReturnReflectionTitle(entry.title)
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(entry => ({
      entryId: entry.id,
      title: entry.title ?? '',
      writtenAt: entry.createdAt,
      reflection: parseReturnReflection(entry.body),
    }))
}

/** Return reflections written in the month (by the day of the return). */
export async function listReturnReflectionsForMonth(
  monthRef: MonthRef
): Promise<ReturnReflectionEntry[]> {
  const [entries, tags] = await Promise.all([
    journalDexieRepository.getAll(),
    contextTagDexieRepository.getAll(),
  ])
  const tagId = tags.find(tag => tag.name === RETURN_CONTEXT_TAG_NAME)?.id
  return selectReturnReflectionEntries(
    entries.filter(entry => getPeriodRefsForDate(new Date(entry.createdAt)).month === monthRef),
    tagId
  )
}
