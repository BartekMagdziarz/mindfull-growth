/** Explicit opt-in only. Real OpenAI requests, synthetic data, isolated fake-indexeddb. */
import { it, expect } from 'vitest'
import { mkdir, writeFile } from 'node:fs/promises'
import { buildCompanionScenario, PERSONA_IDS, SCENARIO_VERSION, type PersonaId } from '../scenarios'
import { companionEvaluationCases } from '../evaluation'
import { seedScenarioInTestDatabase } from './seedScenario'
import { getTestDatabase } from '@/test/testDatabase'
import {
  createCompanionHistoryAccess,
  createCompanionSession,
  SpendingBudget,
  type CompanionContext,
  type CompanionEvent,
} from '@/services/ai/companion/runtime'
import {
  DEFAULT_COMPANION_RATES,
  CompanionError,
  createOpenAITransport,
  OPENAI_COMPANION_MODEL,
} from '@/services/ai/companion/openai'

it.skipIf(process.env.AI_COMPANION_LIVE !== '1')(
  'benchmarks OpenAI on explicitly selected synthetic scenarios',
  async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY; use npm run ai:benchmark')
    const model = process.env.AI_COMPANION_MODEL || OPENAI_COMPANION_MODEL
    const effort = process.env.AI_COMPANION_EFFORT || 'medium'
    if (!['low', 'medium', 'high'].includes(effort)) throw new Error('Invalid AI_COMPANION_EFFORT')
    const personas = (process.env.AI_COMPANION_PERSONAS || 'marta').split(',')
    if (!personas.length || personas.some(p => !PERSONA_IDS.includes(p as PersonaId)))
      throw new Error('Invalid personas')
    const scope = process.env.AI_COMPANION_SCOPE || 'smoke'
    if (!['smoke', 'full', 'execution'].includes(scope)) throw new Error('Invalid scope')
    if (
      model !== OPENAI_COMPANION_MODEL &&
      (!process.env.AI_COMPANION_INPUT_RATE || !process.env.AI_COMPANION_OUTPUT_RATE)
    )
      throw new Error('Custom model requires explicit pricing rates')
    const rates = {
      input: Number(process.env.AI_COMPANION_INPUT_RATE || DEFAULT_COMPANION_RATES.input),
      output: Number(process.env.AI_COMPANION_OUTPUT_RATE || DEFAULT_COMPANION_RATES.output),
    }
    const budget = new SpendingBudget(Number(process.env.AI_COMPANION_MAX_USD || 15))
    const transport = createOpenAITransport({
      apiKey,
      model,
      effort: effort as 'low' | 'medium' | 'high',
    })
    const runs: Array<Record<string, unknown>> = []
    const report = {
      version: SCENARIO_VERSION,
      scope,
      generatedAt: new Date().toISOString(),
      model,
      effort,
      rates,
      budgetUsd: budget.maxUsd,
      runs,
      quality:
        'Manual review required; structural checks do not prove psychological relevance or entailment.',
    }
    const directory = 'test-results/ai-companion'
    await mkdir(directory, { recursive: true })
    const path = `${directory}/${Date.now()}.json`
    const persist = () =>
      writeFile(
        path,
        JSON.stringify({ ...report, estimatedOrReservedUsd: budget.usedUsd }, null, 2)
      )
    try {
      for (const persona of personas as PersonaId[]) {
        const db = getTestDatabase()
        for (const table of db.tables) await table.clear()
        const scenario = buildCompanionScenario(persona)
        const manifest = await seedScenarioInTestDatabase(scenario)
        const checkpoints =
          scope === 'full' ? scenario.checkpoints : scenario.checkpoints.slice(0, 1)
        for (const checkpoint of checkpoints) {
          const context: CompanionContext = {
            surface: 'weekly-reflection',
            periodRef: checkpoint.weekRef,
            asOf: checkpoint.asOf,
            locale: 'pl',
            timeZone: 'Europe/Warsaw',
            approvedProfile: manifest.profile,
          }
          const events: CompanionEvent[] = []
          const session = createCompanionSession({
            context,
            access: await createCompanionHistoryAccess(context),
            transport,
            budget,
            rates,
            onEvent: event => events.push(event),
          })
          const run: Record<string, unknown> = {
            persona,
            checkpoint: checkpoint.id,
            events,
            status: 'running',
          }
          runs.push(run)
          try {
            const result = await session.run({
              mode:
                scope === 'execution' || checkpoint.stage === 'conversation'
                  ? 'conversation'
                  : 'topics',
              draft: checkpoint.draft,
              message:
                scope === 'execution'
                  ? 'Jak w liczbach wygląda realizacja mojego planu ruchu w tym tygodniu? Co z tego wiadomo, a czego nie można stwierdzić?'
                  : checkpoint.messages.map(m => m.content).join('\n') || undefined,
            })
            run.result = result
            if (scope !== 'execution' && checkpoint.stage === 'before-writing') {
              const chosen = result.reply.topics[0]
              run.followup = await session.run({
                mode: 'conversation',
                draft: checkpoint.draft,
                ...(chosen
                  ? { topicId: chosen.id }
                  : { message: 'Co mogłoby mi pomóc w refleksji nad tym tygodniem?' }),
              })
            }
            // Expectations are evaluator-only and are attached AFTER every model call.
            run.review = {
              expectations: companionEvaluationCases.find(c => c.checkpointId === checkpoint.id),
              verdict: 'pending-human-review',
              notes: '',
            }
            expect(JSON.stringify(events)).not.toContain('bursztynowy-latawiec')
            expect(result.reply.topics.length).toBeLessThanOrEqual(5)
            run.status = 'completed'
          } catch (error) {
            run.status = 'failed'
            run.error = error instanceof CompanionError ? error.code : 'benchmark-check-failed'
            throw new Error(`Benchmark ${persona}/${checkpoint.stage}: ${run.error}`)
          } finally {
            await persist()
          }
        }
      }
    } finally {
      await persist()
      console.info(`Companion report: ${path}; estimated/reserved USD ${budget.usedUsd.toFixed(4)}`)
    }
  },
  2_400_000
)
