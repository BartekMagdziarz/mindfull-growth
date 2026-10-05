import { beforeEach, expect, it } from 'vitest'
import { getTestDatabase } from '@/test/testDatabase'
import { WEEKLY_RATING_KEYS, MONTHLY_RATING_KEYS } from '@/domain/reflection'
import { seedScenarioInTestDatabase } from './seedScenario'
import { buildCompanionScenario } from '../scenarios'
import { enrichDemoHistory } from '../enrichDemoHistory'
import { createHistoryTools } from '@/services/ai/history/tools'
beforeEach(async () => {
  for (const table of getTestDatabase().tables) await table.clear()
})
it.each(['marta', 'tomasz'] as const)(
  'enriches %s with three coherent months and preserves existing edits on rerun',
  async persona => {
    await seedScenarioInTestDatabase(buildCompanionScenario(persona))
    const db = getTestDatabase()
    const before = (await db.weeklyReflections.toArray())[0]
    await db.weeklyReflections.update(before.id, {
      physicalCareRating: 1,
      freeformReflection: 'Moja własna poprawka',
    })
    await enrichDemoHistory(persona, () => {})
    const weeks = await db.weeklyReflections.toArray(),
      months = await db.monthlyReflections.toArray()
    expect(weeks).toHaveLength(13)
    expect(months).toHaveLength(3)
    expect(
      weeks.every(w =>
        ['wentWell', 'challenges', 'lessons'].every(k => w.promptResponses[k]?.trim())
      )
    ).toBe(true)
    expect(
      months.every(m =>
        ['proudOf', 'challenges', 'growth'].every(k => m.promptResponses[k]?.trim())
      )
    ).toBe(true)
    expect(weeks.every(w => WEEKLY_RATING_KEYS.every(k => w[k] !== null))).toBe(true)
    expect(months.every(m => MONTHLY_RATING_KEYS.every(k => m[k] !== null))).toBe(true)
    expect(await db.weeklyReflections.get(before.id)).toMatchObject({
      physicalCareRating: 1,
      freeformReflection: 'Moja własna poprawka',
    })
    expect(months.find(m => m.monthRef === '2026-09')?.freeformReflection).toContain(
      'do 27 września'
    )
    const journals = await db.journalEntries.count()
    await enrichDemoHistory(persona, () => {})
    expect(await db.journalEntries.count()).toBe(journals)
    const api = createHistoryTools({ asOf: '2026-09-27T18:00:00.000Z', timeZone: 'Europe/Warsaw' })
    const habit = (await db.habits.toArray())[0]
    const result = await api.getExecutionSummary({
      subjects: [{ collection: 'habits', id: habit.id }],
      periodRef: '2026-08',
    })
    expect(result.items[0].status).toBe('ok')
    expect((result.items[0] as any).qualifiedPeriods.evaluated).toBeGreaterThan(0)
  }
)
it('keeps Alex sparse and invokes the account guard', async () => {
  await seedScenarioInTestDatabase(buildCompanionScenario('alex'))
  const count = await getTestDatabase().journalEntries.count()
  await expect(
    enrichDemoHistory('alex', () => {
      throw new Error('wrong account')
    })
  ).rejects.toThrow('wrong account')
  await enrichDemoHistory('alex', () => {})
  expect(await getTestDatabase().journalEntries.count()).toBe(count)
})

it('upgrades an already-enriched demo and its current saved draft without replacing user edits', async () => {
  await seedScenarioInTestDatabase(buildCompanionScenario('marta'))
  await enrichDemoHistory('marta', () => {})
  const db = getTestDatabase()
  await db.userSettings.delete('ai-demo-reflection-answers-v2')
  const week = (await db.weeklyReflections.toArray()).find(w => w.weekRef === '2026-W38')!
  await db.weeklyReflections.update(week.id, { promptResponses: {}, physicalCareRating: null })
  await db.drafts.put({
    key: 'weekly-reflection-2026-W38',
    updatedAt: '2026-09-30T09:00:00Z',
    data: JSON.stringify({
      currentStep: 'journal',
      physicalCareRating: null,
      moodRating: 5,
      promptResponses: { wentWell: 'Moja odpowiedź', challenges: '' },
      freeformReflection: 'Mój szkic',
      objectComments: { test: 'Nie zmieniaj' },
    }),
  })
  await db.drafts.put({
    key: 'monthly-reflection-2026-09',
    updatedAt: '2026-09-30T09:00:00Z',
    data: JSON.stringify({
      currentStep: 'journal',
      balanceRating: null,
      agencyRating: 5,
      promptResponses: {},
    }),
  })
  await enrichDemoHistory('marta', () => {})
  const saved = JSON.parse((await db.drafts.get('weekly-reflection-2026-W38'))!.data)
  expect(saved).toMatchObject({
    currentStep: 'journal',
    moodRating: 5,
    freeformReflection: 'Mój szkic',
    objectComments: { test: 'Nie zmieniaj' },
    promptResponses: { wentWell: 'Moja odpowiedź' },
  })
  expect(saved.physicalCareRating).toBeGreaterThan(0)
  expect(saved.promptResponses.challenges).toContain('dużo pracy')
  expect(saved.promptResponses.lessons).toContain('sen, ceramika i bliscy')
  const monthly = JSON.parse((await db.drafts.get('monthly-reflection-2026-09'))!.data)
  expect(monthly.balanceRating).toBe(2)
  expect(monthly.agencyRating).toBe(5)
  expect(monthly.promptResponses.proudOf).toContain('27 września')
  const api = createHistoryTools({ asOf: '2026-09-30T12:00:00Z', timeZone: 'Europe/Warsaw' })
  const source = (
    await api.readSources({
      requests: [{ ref: { collection: 'weeklyReflections', id: week.id } }],
      maxCharsPerSource: 8000,
    })
  ).items[0]
  expect(source.status).toBe('ok')
  if (source.status === 'ok')
    expect(source.blocks.find(b => b.label === 'promptResponses')?.text).toContain(
      'sobotnia ceramika'
    )
})
