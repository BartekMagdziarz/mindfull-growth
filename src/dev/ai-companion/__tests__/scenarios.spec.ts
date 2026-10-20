import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildCompanionScenario,
  fixtureId,
  getScenarioInput,
  PERSONA_IDS,
  validateCompanionScenario,
} from '../scenarios'
import { companionEvaluationCases } from '../evaluation'
import { seedScenarioInTestDatabase } from './seedScenario'
import { getTestDatabase, connectTestDatabase } from '@/test/testDatabase'
import { connectUserDatabase, disconnectUserDatabase } from '@/services/userDatabaseService'
import { journalDexieRepository } from '@/repositories/journalDexieRepository'
import { thoughtRecordDexieRepository } from '@/repositories/exercisesDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { planningStateDexieRepository } from '@/repositories/planningStateDexieRepository'
import emotionsMeta from '@/data/emotions-meta.json'
import { loadHistoryAccessPolicy } from '@/services/ai/history/access'

async function clearTestDatabase() {
  const db = await connectTestDatabase()
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
}
afterEach(clearTestDatabase)

describe('AI companion synthetic scenarios', () => {
  it.each(PERSONA_IDS)('%s has reproducible sources and three independent checkpoints', persona => {
    const scenario = buildCompanionScenario(persona)
    validateCompanionScenario(scenario)
    expect(buildCompanionScenario(persona)).toEqual(scenario)
    expect(scenario.checkpoints).toHaveLength(3)
    expect(scenario.checkpoints[0].draft).toBe('')
    expect(scenario.checkpoints[1].messages).toEqual([])
    expect(scenario.checkpoints[2].messages).toHaveLength(1)
    const catalog = new Set(emotionsMeta.map(e => e.id))
    for (const source of scenario.sources) {
      if (source.kind === 'emotion')
        for (const id of source.emotionIds) expect(catalog.has(id)).toBe(true)
    }
    scenario.profile[0].text = 'changed'
    expect(buildCompanionScenario(persona).profile[0].text).not.toBe('changed')
  })

  it.each(PERSONA_IDS)(
    '%s projects model data without private content or evaluator notes',
    persona => {
      const scenario = buildCompanionScenario(persona)
      // A contaminated caller cannot accidentally pass evaluator metadata through.
      Object.assign(scenario, { expectedAnswer: 'EVALUATOR_ONLY' })
      for (const checkpoint of scenario.checkpoints) {
        const input = getScenarioInput(scenario, checkpoint.id)
        const text = JSON.stringify(input)
        expect(text).not.toContain('bursztynowy-latawiec')
        expect(text).not.toContain('EVALUATOR_ONLY')
        expect(input.sources.some(s => s.id === fixtureId(persona, 'conversation'))).toBe(true)
        input.profile[0].text = 'mutated input'
        expect(scenario.profile[0].text).not.toBe('mutated input')
      }
    }
  )

  it('keeps a conversation out when its parent is excluded', () => {
    const scenario = buildCompanionScenario('marta')
    scenario.sources.find(s => s.id === fixtureId('marta', 'small-success'))!.aiAccess = 'excluded'
    expect(
      getScenarioInput(scenario, scenario.checkpoints[0].id).sources.some(
        s => s.kind === 'conversation'
      )
    ).toBe(false)
  })

  it('does not expose later records or measurements at an earlier checkpoint', () => {
    const scenario = buildCompanionScenario('marta')
    scenario.checkpoints[0].asOf = '2026-09-21T18:00:00.000Z'
    const input = getScenarioInput(scenario, scenario.checkpoints[0].id)
    expect(input.sources.some(s => s.id === fixtureId('marta', 'boundary'))).toBe(true)
    expect(input.sources.some(s => s.id === fixtureId('marta', 'small-success'))).toBe(false)
    expect(input.sources.some(s => s.kind === 'conversation')).toBe(false)
    expect(input.habits[0].completedDays).toEqual([])
  })

  it('rejects future data, duplicate IDs and broken source relationships', () => {
    const future = buildCompanionScenario('alex')
    future.sources[0].occurredAt = '2027-01-01T12:00:00.000Z'
    expect(() => validateCompanionScenario(future)).toThrow('Invalid scenario time')
    const duplicate = buildCompanionScenario('alex')
    duplicate.sources.push(duplicate.sources[0])
    expect(() => validateCompanionScenario(duplicate)).toThrow('duplicate id')
    const broken = buildCompanionScenario('alex')
    const conversation = broken.sources.find(s => s.kind === 'conversation')!
    if (conversation.kind === 'conversation') conversation.journalSourceId = 'missing'
    expect(() => validateCompanionScenario(broken)).toThrow('no journal source')
  })

  it('has nine evaluator cases whose evidence exists, independently of model inputs', () => {
    expect(companionEvaluationCases).toHaveLength(9)
    for (const testCase of companionEvaluationCases) {
      const scenario = buildCompanionScenario(testCase.persona)
      expect(scenario.checkpoints.some(c => c.id === testCase.checkpointId)).toBe(true)
      for (const ref of testCase.usefulSources)
        expect(scenario.sources.some(s => s.id === ref)).toBe(true)
    }
  })

  it.each(PERSONA_IDS)(
    'loads %s through real repositories preserving event dates and authorship',
    async persona => {
      await clearTestDatabase()
      const scenario = buildCompanionScenario(persona)
      const manifest = await seedScenarioInTestDatabase(scenario)
      const entries = await journalDexieRepository.getAll()
      expect(entries).toHaveLength(scenario.sources.filter(s => s.kind === 'journal').length)
      for (const source of scenario.sources.filter(s => s.kind === 'journal')) {
        const entry = entries.find(e => e.id === manifest.ids.get(source.id))!
        expect(entry.createdAt).toBe(source.occurredAt)
        expect(entry.body).toBe(source.body)
      }
      const exercise = await thoughtRecordDexieRepository.getById(
        manifest.ids.get(fixtureId(persona, 'exercise'))!
      )
      expect(exercise?.balancedThought).toContain('docenić')
      expect(exercise?.createdAt).toBe('2026-09-24T12:00:00.000Z')
      const sessions = entries.flatMap(e => e.chatSessions ?? [])
      expect(sessions).toHaveLength(1)
      expect(sessions[0].messages.map(m => m.role)).toEqual(['assistant', 'user'])
      expect(sessions[0].messages[1].content).toContain('Nie.')
      expect(manifest.excludedIds).toEqual([manifest.ids.get(fixtureId(persona, 'private'))])
      expect((await loadHistoryAccessPolicy(getTestDatabase())).excludedSources).toEqual(
        manifest.excludedSources
      )
      const reflections = await structuredReflectionDexieRepository.listWeekly()
      expect(reflections).toHaveLength(persona === 'alex' ? 1 : 3)
      const measurements = await planningStateDexieRepository.listDailyMeasurementEntries()
      expect(measurements).toHaveLength(persona === 'alex' ? 0 : persona === 'marta' ? 1 : 2)
      expect(await getTestDatabase().userProfiles.count()).toBe(0)
      // Loader refuses a second seed; it never resets or merges an existing DB.
      await expect(seedScenarioInTestDatabase(scenario)).rejects.toThrow('must be empty')
      expect(await journalDexieRepository.getAll()).toHaveLength(entries.length)
    }
  )

  it('refuses a connected account outside the isolated test database', async () => {
    const other = await connectUserDatabase('ai-fixture-guard-test')
    try {
      await expect(seedScenarioInTestDatabase(buildCompanionScenario('alex'))).rejects.toThrow(
        'isolated Vitest database'
      )
      expect(await other.journalEntries.count()).toBe(0)
    } finally {
      await disconnectUserDatabase()
      await other.delete()
      await connectTestDatabase()
    }
  })

  it('rolls back earlier writes if a repository fails during seeding', async () => {
    await clearTestDatabase()
    const failure = vi
      .spyOn(thoughtRecordDexieRepository, 'create')
      .mockRejectedValueOnce(new Error('Interrupted seed'))
    try {
      await expect(seedScenarioInTestDatabase(buildCompanionScenario('marta'))).rejects.toThrow(
        'Interrupted seed'
      )
      for (const table of getTestDatabase().tables) expect(await table.count()).toBe(0)
    } finally {
      failure.mockRestore()
    }
  })
})
