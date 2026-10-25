import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { JournalEntry } from '@/domain/journal'
import type { MonthRef } from '@/domain/period'
import { contextTagDexieRepository } from '@/repositories/tagDexieRepository'
import {
  listReturnReflectionsForMonth,
  selectReturnReflectionEntries,
} from '@/services/returnReflectionQueries'
import { connectTestDatabase, getTestDatabase } from '@/test/testDatabase'
import { parsePeriodRef } from '@/utils/periods'

const OCTOBER = parsePeriodRef('2026-10') as MonthRef
const NOVEMBER = parsePeriodRef('2026-11') as MonthRef

function entry(partial: Partial<JournalEntry> & { id: string; createdAt: string }): JournalEntry {
  return { body: '', updatedAt: partial.createdAt, ...partial }
}

beforeEach(async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const db = await connectTestDatabase()
  await db.journalEntries.clear()
  await db.contextTags.clear()
})

describe('selectReturnReflectionEntries', () => {
  it('picks tagged entries and titled ones, oldest first, parsed', () => {
    const picked = selectReturnReflectionEntries(
      [
        entry({
          id: 'b',
          createdAt: '2026-10-25T10:00:00Z',
          title: 'Powrót po przerwie · 1 paź – 25 paź',
          body: 'Co się działo: grypa\n\nChcę teraz: spokoju',
          contextTagIds: ['tag-return'],
        }),
        entry({ id: 'x', createdAt: '2026-10-20T10:00:00Z', title: 'Zwykły wpis', body: 'x' }),
        entry({
          id: 'a',
          createdAt: '2026-10-02T10:00:00Z',
          title: 'Powrót po przerwie',
          body: 'Tylko tekst.',
        }),
      ],
      'tag-return'
    )
    expect(picked.map(item => item.entryId)).toEqual(['a', 'b'])
    expect(picked[1]!.reflection).toEqual({
      whatHappened: 'grypa',
      aliveAndDropped: '',
      wantNow: 'spokoju',
    })
    expect(picked[0]!.reflection.whatHappened).toBe('Tylko tekst.')
  })
})

describe('listReturnReflectionsForMonth', () => {
  it('reads the month of the return day, by tag or by title', async () => {
    const db = getTestDatabase()
    const tag = await contextTagDexieRepository.create({ name: 'Powrót' })
    await db.journalEntries.bulkPut([
      entry({
        id: 'oct',
        createdAt: '2026-10-25T10:00:00Z',
        title: 'Powrót po przerwie · 1 paź – 25 paź',
        body: 'Co się działo: grypa',
        contextTagIds: [tag.id],
      }),
      entry({
        id: 'renamed',
        createdAt: '2026-10-26T10:00:00Z',
        title: 'Moja notatka',
        body: 'Chcę teraz: ciszy',
        contextTagIds: [tag.id],
      }),
      entry({
        id: 'nov',
        createdAt: '2026-11-03T10:00:00Z',
        title: 'Powrót po przerwie · 20 paź – 3 lis',
        body: 'Co się działo: urlop',
      }),
    ])
    expect((await listReturnReflectionsForMonth(OCTOBER)).map(item => item.entryId)).toEqual([
      'oct',
      'renamed',
    ])
    expect((await listReturnReflectionsForMonth(NOVEMBER)).map(item => item.entryId)).toEqual([
      'nov',
    ])
  })
})
