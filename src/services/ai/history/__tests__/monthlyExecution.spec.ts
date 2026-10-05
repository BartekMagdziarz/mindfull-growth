import {
  createCompanionHistoryAccess,
  createCompanionSession,
  SpendingBudget,
  type CompanionContext,
} from '../../companion/runtime'
import type { ModelTransport, ModelResponse } from '../../companion/openai'
import { beforeEach, describe, expect, it } from 'vitest'
import { getTestDatabase } from '@/test/testDatabase'
import { createHistoryTools } from '../tools'
import { saveHistoryAccessPolicy } from '../access'
import { getChildPeriods, getPeriodBounds } from '@/utils/periods'
import type { MonthRef } from '@/domain/period'

const stamp = '2025-01-01T12:00:00Z'
const subjectRef = { collection: 'habits', id: 'h' } as const
async function put(collection: string, data: Record<string, unknown>) {
  await getTestDatabase()
    .table(collection)
    .put({ createdAt: stamp, updatedAt: stamp, ...data })
}
async function measure(day: string, value: number, extra = {}) {
  await put('dailyMeasurementEntries', {
    id: day,
    subjectType: 'habit',
    subjectId: 'h',
    dayRef: day,
    value,
    ...extra,
  })
}
async function summarize(
  asOf = '2026-10-02T12:00:00Z',
  month = '2026-09',
  timeZone = 'Europe/Warsaw'
) {
  const result = await createHistoryTools({ asOf, timeZone }).getExecutionSummary({
    subjects: [subjectRef],
    periodRef: month,
  })
  return result.items[0] as any
}
beforeEach(async () => {
  const db = getTestDatabase()
  for (const table of db.tables) await table.clear()
  await put('habits', {
    id: 'h',
    title: 'Ruch',
    isActive: true,
    status: 'open',
    cadence: 'weekly',
    entryMode: 'counter',
    target: { kind: 'count', operator: 'min', value: 2 },
  })
  await put('measurementMonthStates', {
    id: 'month',
    subjectType: 'habit',
    subjectId: 'h',
    monthRef: '2026-09',
    activityState: 'active',
  })
})
describe('monthly execution over accessible real database records', () => {
  it('separates calendar totals from three full weeks and does not count boundary weeks', async () => {
    for (const [day, value] of [
      ['2026-09-01', 9],
      ['2026-09-07', 2],
      ['2026-09-14', 0],
      ['2026-09-21', 3],
      ['2026-09-30', 8],
      ['2026-08-31', 99],
    ] as const)
      await measure(day, value)
    const result = await summarize()
    expect(result.calendarMeasurements).toMatchObject({ actualValue: 22, entryCount: 5 })
    expect(result.qualifiedPeriods).toMatchObject({ met: 2, evaluated: 3 })
    expect(result.periods.filter((p: any) => p.boundary)).toHaveLength(2)
    expect(result.sources.some((s: any) => s.ref.id === '2026-08-31')).toBe(false)
    const read = await createHistoryTools({ asOf: '2026-10-02T12:00:00Z' }).readSources({
      requests: result.sources.map((s: any) => ({ ref: s.ref, expectedVersion: s.version })),
      maxCharsPerSource: 1000,
    })
    expect(read.items.every(s => s.status === 'ok')).toBe(true)
  })
  it('does not count absent records as failure; explicit zero is evaluated', async () => {
    await measure('2026-09-07', 0)
    const result = await summarize()
    expect(result.qualifiedPeriods).toMatchObject({ met: 0, evaluated: 1 })
    expect(result.periods.filter((p: any) => p.reason === 'no-records')).toHaveLength(2)
  })
  it('uses the local day to exclude a still-running week, including its last day', async () => {
    await measure('2026-09-07', 2)
    const utc = await summarize('2026-09-13T22:30:00Z', '2026-09', 'UTC')
    const warsaw = await summarize('2026-09-13T22:30:00Z')
    expect(utc.qualifiedPeriods.evaluated).toBe(0)
    expect(warsaw.qualifiedPeriods.evaluated).toBe(1)
    expect(warsaw.periods.some((p: any) => p.future)).toBe(true)
  })
  it('excludes paused weeks and applies week overrides over month and base thresholds', async () => {
    await getTestDatabase()
      .table('measurementMonthStates')
      .update('month', { targetOverride: { kind: 'count', operator: 'min', value: 4 } })
    const full = getChildPeriods('2026-09' as MonthRef).filter(
      w => getPeriodBounds(w).start >= '2026-09-01' && getPeriodBounds(w).end <= '2026-09-30'
    )
    await put('measurementWeekStates', {
      id: 'override',
      subjectType: 'habit',
      subjectId: 'h',
      weekRef: full[0],
      activityState: 'active',
      targetOverride: { kind: 'count', operator: 'min', value: 1 },
    })
    await put('measurementWeekStates', {
      id: 'pause',
      subjectType: 'habit',
      subjectId: 'h',
      weekRef: full[1],
      activityState: 'paused',
    })
    await measure('2026-09-07', 1)
    await measure('2026-09-14', 10)
    await measure('2026-09-21', 3)
    const r = await summarize()
    expect(r.qualifiedPeriods).toMatchObject({ met: 1, evaluated: 2 })
    expect(r.periods.find((p: any) => p.periodRef === full[1]).reason).toBe('inactive-or-paused')
  })
  it('does not pretend to know a threshold before its last edit', async () => {
    await getTestDatabase().table('habits').update('h', { updatedAt: '2026-09-16T12:00:00Z' })
    await measure('2026-09-07', 3)
    await measure('2026-09-21', 3)
    const r = await summarize()
    expect(r.qualifiedPeriods).toMatchObject({ met: 1, evaluated: 1 })
    expect(
      r.periods.some(
        (p: any) => p.reason === 'historical-settings-unknown' && p.comparison === 'met'
      )
    ).toBe(true)
  })
  it('excludes partial lifetimes and cannot infer historical retirement dates', async () => {
    await getTestDatabase()
      .table('habits')
      .update('h', { createdAt: '2026-09-09T12:00:00Z', updatedAt: '2026-09-09T12:00:00Z' })
    await measure('2026-09-10', 3)
    expect((await summarize()).periods.some((p: any) => p.reason === 'partial-lifetime')).toBe(true)
    await getTestDatabase().table('habits').update('h', { status: 'retired', isActive: false })
    await measure('2026-09-21', 3)
    expect((await summarize()).qualifiedPeriods.evaluated).toBe(0)
  })
  it('suppresses evaluations under restricted access, without exposing hidden values', async () => {
    await measure('2026-09-07', 777)
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'dailyMeasurementEntries', id: '2026-09-07' }],
    })
    const result = await summarize()
    expect(result.coverage).toBe('access-restricted')
    expect(result.qualifiedPeriods.evaluated).toBe(0)
    expect(JSON.stringify(result)).not.toContain('777')
    expect(result.periods.every((p: any) => p.target === null)).toBe(true)
  })
  it('computes monthly value aggregation using the monthly override, never weekly targets', async () => {
    await getTestDatabase()
      .table('habits')
      .update('h', {
        cadence: 'monthly',
        entryMode: 'value',
        target: { kind: 'value', aggregation: 'sum', operator: 'gte', value: 100 },
      })
    await getTestDatabase()
      .table('measurementMonthStates')
      .update('month', {
        targetOverride: { kind: 'value', aggregation: 'average', operator: 'gte', value: 3 },
      })
    await measure('2026-09-07', 2)
    await measure('2026-09-21', 4)
    const result = await summarize()
    expect(result.actualValue).toBe(3)
    expect(result.evaluation).toBe('met')
    expect(result.qualifiedPeriods).toMatchObject({ met: 1, evaluated: 1 })
  })
  it('uses measurement days for late entries and never counts narrative text', async () => {
    await measure('2026-09-07', 2, {
      createdAt: '2026-10-01T12:00:00Z',
      updatedAt: '2026-10-01T12:00:00Z',
    })
    await put('journalEntries', { id: 'story', body: 'Ćwiczyłam dziesięć razy bez logowania.' })
    expect((await summarize()).actualValue).toBe(2)
  })
  it('supports the app calendar at a year boundary and an empty future month', async () => {
    await put('measurementMonthStates', {
      id: 'jan',
      subjectType: 'habit',
      subjectId: 'h',
      monthRef: '2026-01',
      activityState: 'active',
    })
    await measure('2026-01-05', 2)
    const r = await summarize('2026-02-02T12:00:00Z', '2026-01')
    expect(r.qualifiedPeriods).toMatchObject({ met: 1, evaluated: 1 })
    expect(r.periods).toHaveLength(getChildPeriods('2026-01' as MonthRef).length)
    expect((await summarize('2026-08-20T12:00:00Z')).calendarMeasurements.throughDay).toBeNull()
  })
})

it('does not evaluate trackers without targets, and reports missing activation separately', async () => {
  await measure('2026-09-07', 3)
  await getTestDatabase().table('measurementMonthStates').clear()
  expect((await summarize()).periods.some((p: any) => p.reason === 'activity-unknown')).toBe(true)
  await put('measurementMonthStates', {
    id: 'month',
    subjectType: 'habit',
    subjectId: 'h',
    monthRef: '2026-09',
    activityState: 'active',
  })
  await getTestDatabase().table('habits').update('h', { target: undefined })
  const r = await summarize()
  expect(r.qualifiedPeriods.evaluated).toBe(0)
  expect(r.periods.some((p: any) => p.reason === 'not-targeted')).toBe(true)
})
it('monthly pauses prevent historical achievement claims', async () => {
  await getTestDatabase().table('habits').update('h', { cadence: 'monthly' })
  await measure('2026-09-07', 3)
  await put('measurementWeekStates', {
    id: 'pause',
    subjectType: 'habit',
    subjectId: 'h',
    weekRef: getChildPeriods('2026-09' as MonthRef)[1],
    activityState: 'paused',
  })
  expect((await summarize()).periods[0].reason).toBe('inactive-or-paused')
})
it('evaluates ratings and multi-completion through existing domain arithmetic', async () => {
  await getTestDatabase()
    .table('habits')
    .update('h', {
      cadence: 'monthly',
      entryMode: 'rating',
      target: { kind: 'rating', aggregation: 'average', operator: 'gte', value: 3 },
    })
  await measure('2026-09-07', 2)
  await measure('2026-09-08', 4)
  expect((await summarize()).actualValue).toBe(3)
  await getTestDatabase()
    .table('habits')
    .update('h', {
      entryMode: 'multi-completion',
      target: { kind: 'count', operator: 'min', value: 1 },
      multiItems: [
        { id: 'a', label: 'Ruch', weight: 2 },
        { id: 'b', label: 'Odpoczynek', weight: 1 },
      ],
      multiDailyThreshold: 2,
    })
  await getTestDatabase().table('dailyMeasurementEntries').clear()
  await measure('2026-09-07', 0, { checkedItemIds: ['a'], value: null })
  await measure('2026-09-08', 0, { checkedItemIds: ['b'], value: null })
  expect(await summarize()).toMatchObject({ actualValue: 1, evaluation: 'met' })
})
it('limits a weekly intention to its own week', async () => {
  const weekRef = getChildPeriods('2026-09' as MonthRef)[1]
  await put('weeklyIntentions', {
    id: 'i',
    title: 'Spacer',
    weekRef,
    cadence: 'weekly',
    entryMode: 'completion',
    isActive: true,
    status: 'open',
    target: { kind: 'count', operator: 'min', value: 1 },
  })
  await put('dailyMeasurementEntries', {
    id: 'intention',
    subjectType: 'weeklyIntention',
    subjectId: 'i',
    dayRef: '2026-09-07',
    value: 1,
  })
  const r = (
    await createHistoryTools({ asOf: '2026-10-02T12:00:00Z' }).getExecutionSummary({
      subjects: [{ collection: 'weeklyIntentions', id: 'i' }],
      periodRef: '2026-09',
    })
  ).items[0] as any
  expect(r.qualifiedPeriods).toMatchObject({ met: 1, evaluated: 1 })
  expect(r.periods.filter((p: any) => p.reason === 'outside-intention-week')).toHaveLength(4)
})
it('honors parent goal pauses and restrictions for measurable key results', async () => {
  await put('goals', { id: 'g', title: 'Zdrowie', isActive: true, status: 'open' })
  await put('keyResults', {
    id: 'kr',
    goalId: 'g',
    title: 'Spacer',
    cadence: 'monthly',
    entryMode: 'counter',
    isActive: true,
    status: 'open',
    target: { kind: 'count', operator: 'min', value: 1 },
  })
  await put('measurementMonthStates', {
    id: 'kr-state',
    subjectType: 'keyResult',
    subjectId: 'kr',
    monthRef: '2026-09',
    activityState: 'active',
  })
  await put('goalMonthStates', {
    id: 'goal-state',
    goalId: 'g',
    monthRef: '2026-09',
    activityState: 'paused',
  })
  await put('dailyMeasurementEntries', {
    id: 'kr-value',
    subjectType: 'keyResult',
    subjectId: 'kr',
    dayRef: '2026-09-07',
    value: 5,
  })
  const run = async () =>
    (
      await createHistoryTools({ asOf: '2026-10-02T12:00:00Z' }).getExecutionSummary({
        subjects: [{ collection: 'keyResults', id: 'kr' }],
        periodRef: '2026-09',
      })
    ).items[0] as any
  expect((await run()).periods[0].reason).toBe('inactive-or-paused')
  await saveHistoryAccessPolicy({
    excludedKinds: [],
    excludedSources: [{ collection: 'goalMonthStates', id: 'goal-state' }],
  })
  expect((await run()).coverage).toBe('access-restricted')
})

it('passes monthly arithmetic and verified citations through the monthly conversation runtime', async () => {
  await measure('2026-09-07', 2)
  await measure('2026-09-14', 0)
  await measure('2026-09-21', 3)
  const context: CompanionContext = {
    surface: 'monthly-reflection',
    periodRef: '2026-09',
    asOf: '2026-10-02T12:00:00Z',
    locale: 'pl',
    timeZone: 'Europe/Warsaw',
    approvedProfile: [],
  }
  const access = await createCompanionHistoryAccess(context)
  let calls = 0
  const transport: ModelTransport = async request => {
    calls++
    const base = {
      usage: { input: 100, output: 100, cached: 0, reasoning: 0 },
      model: 'test',
      requestId: null,
    }
    if (calls === 1) {
      expect(JSON.stringify(request.input)).toContain('qualifiedPeriods.met/evaluated')
      return {
        ...base,
        output: [
          {
            type: 'function_call',
            name: 'get_execution_summary',
            call_id: 'monthly-count',
            arguments: JSON.stringify({ subjects: [subjectRef], periodRef: '2026-09' }),
          },
        ],
      } as ModelResponse
    }
    const result = JSON.parse(
      request.input.find(i => i.type === 'function_call_output')!.output as string
    ).items[0]
    expect(result.qualifiedPeriods).toMatchObject({ met: 2, evaluated: 3 })
    const reply = {
      message:
        'W zapisach próg osiągnięto w 2 z 3 pełnych, ocenialnych tygodni. Tygodnie graniczne są osobno; brak wpisu nie dowodzi braku działania.',
      topics: [],
      citations: [{ ref: result.ref, version: result.subjectVersion }, ...result.sources],
    }
    return {
      ...base,
      output: [
        {
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: JSON.stringify(reply) }],
        },
      ],
    } as ModelResponse
  }
  const session = createCompanionSession({
    context,
    access,
    transport,
    budget: new SpendingBudget(1),
  })
  const result = await session.run({
    mode: 'conversation',
    draft: '',
    message: 'Jak wyglądał mój miesiąc?',
  })
  expect(result.reply.message).toContain('2 z 3')
  expect(result.metrics.toolCalls).toBe(1)
})
