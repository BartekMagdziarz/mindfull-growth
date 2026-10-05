/** Explicit, bounded pilot on synthetic data only; never touches the browser database. */
import { expect, it } from 'vitest'
import { writeFile } from 'node:fs/promises'
import { buildCompanionScenario, PERSONA_IDS } from '../scenarios'
import { seedScenarioInTestDatabase } from './seedScenario'
import { getTestDatabase } from '@/test/testDatabase'
import { introductionService } from '@/services/ai/introduction/service'
import { approvedProfileRepository } from '@/repositories/approvedProfileRepository'
import { companionConversation } from '@/services/ai/companion/weeklyConversation'
import { createHistoryTools } from '@/services/ai/history/tools'
import { SpendingBudget } from '@/services/ai/companion/runtime'
import {
  createOpenAITransport,
  DEFAULT_COMPANION_RATES,
  OPENAI_HISTORY_TOOLS,
  type ModelTransport,
} from '@/services/ai/companion/openai'
const descriptions = {
  marta:
    'Jestem Marta. Ważne są dla mnie bliskie relacje i twórczość, lubię ceramikę. Praca ostatnio zajmuje za dużo miejsca. Chcę znajdować czas na odpoczynek i ruch, ale nie chcę, żeby brak wpisu w trackerze oznaczał porażkę. Pomaga mi elastyczny plan i rozmowa z Olą. Nie chcę być definiowana tylko przez trudności w pracy.',
  tomasz:
    'Jestem Tomasz. Cenię przyjaźń, ciekawość i autonomię. Gram na gitarze dla przyjemności, bez celu do osiągnięcia. Lubię spotkania, ale czasem wybieram spokojny wieczór z książką. Chcę rozmawiać także o dobrych doświadczeniach. Nie chcę zamieniać hobby w projekt produktywności.',
  alex: 'Jestem Alex. Lubię rysować i poznawać nowe rzeczy. Notuję rzadko i nie chcę codziennego zobowiązania. Mam różne doświadczenia ze spotkaniami zespołu i snem, ale nie wiem, co wpływa na co. Cenię możliwość wyboru i przyjemność bez narzuconych celów. Chcę, żeby AI pytało zamiast zakładać, że wie.',
}
it.skipIf(process.env.AI_COMPANION_PILOT !== '1')(
  'pilots introduction, approval, guides and all three surfaces on fictional people',
  async () => {
    if (!process.env.OPENAI_API_KEY) throw new Error('Missing local API key')
    const budget = new SpendingBudget(0.35),
      rates = DEFAULT_COMPANION_RATES
    const base = createOpenAITransport({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-6-luna',
      effort: 'medium',
    })
    const report: {
      model: string
      runs: Record<string, unknown>[]
      costUsd: number
      requests: number
    } = { model: 'gpt-6-luna', runs: [], costUsd: 0, requests: 0 }
    const transport: ModelTransport = async request => {
      const raw = JSON.stringify({ ...request, tools: OPENAI_HISTORY_TOOLS })
      expect(raw).not.toContain('bursztynowy-latawiec')
      const settle = budget.reserve(
        ((new TextEncoder().encode(raw).length + 4096) * rates.input +
          request.maxOutputTokens * rates.output) /
          1e6
      )
      report.requests++
      const result = await base(request)
      settle((result.usage.input * rates.input + result.usage.output * rates.output) / 1e6)
      return result
    }
    try {
      for (const persona of PERSONA_IDS.filter(
        id =>
          !process.env.AI_COMPANION_PILOT_PERSONAS ||
          process.env.AI_COMPANION_PILOT_PERSONAS.split(',').includes(id)
      )) {
        const db = getTestDatabase()
        for (const table of db.tables) await table.clear()
        const scenario = buildCompanionScenario(persona)
        await seedScenarioInTestDatabase(scenario)
        const item: Record<string, unknown> = { persona }
        report.runs.push(item)
        const intro = introductionService()
        let row = await intro.send(await intro.start(), descriptions[persona], { transport })
        item.introduction = row.messages
        row = await intro.finish(row, { transport })
        const repo = approvedProfileRepository(),
          state = await repo.snapshot()
        item.proposals = state.proposals.map(p => ({
          text: p.content.text,
          category: p.content.category,
          quote: p.origin.quote,
        }))
        // A simulated user decision on fictional data. Production never auto-accepts.
        if (state.proposals[0])
          await repo.decide(state.proposals[0].id, state.proposals[0].version, true)
        item.guide = await createHistoryTools().getHistoryGuide({
          weeks: [scenario.checkpoints[0].weekRef],
        })
        const results: Record<string, unknown> = {}
        item.surfaces = results
        for (const surface of ['weekly-reflection', 'journal', 'monthly-reflection'] as const) {
          const selection = process.env.AI_COMPANION_PILOT_SURFACES?.split(',')
          if (selection && !selection.includes(surface)) continue
          const events: unknown[] = []
          const contextPeriod =
            surface === 'journal'
              ? '2026-09-27'
              : surface === 'monthly-reflection'
                ? '2026-09'
                : scenario.checkpoints[0].weekRef
          const client = companionConversation(contextPeriod, {
            surface,
            conversationId: surface === 'journal' ? `journal:pilot-${persona}` : undefined,
            locale: 'pl',
            timeZone: 'Europe/Warsaw',
            transport,
          })
          await client.setEnabled(true)
          try {
            const result = await client.run({
              onEvent: event => events.push(event),
              mode: 'conversation',
              message:
                surface === 'journal'
                  ? 'Pomóż mi zastanowić się nad tym, co jest dla mnie teraz ważne. Nie chcę listy zadań.'
                  : surface === 'monthly-reflection'
                    ? 'Co mogę zauważyć w tym miesiącu, także dobrego? Oddziel to, co wiadomo, od tego, czego brakuje.'
                    : 'Jak mogę spojrzeć na ten tydzień bez oceniania siebie? Sprawdź kontekst i przeciwne przykłady.',
              draft: descriptions[persona],
              signal: new AbortController().signal,
            })
            results[surface] = { messages: result.messages, spentUsd: result.spentUsd, events }
          } catch (error) {
            results[surface] = { error: String(error), events }
          }
        }
        item.status = Object.values(results).some(result => (result as { error?: string }).error)
          ? 'failed'
          : 'completed'
      }
      expect(report.runs.length).toBeGreaterThan(0)
      expect(report.runs.every(run => run.status === 'completed')).toBe(true)
    } finally {
      report.costUsd = budget.usedUsd
      await writeFile('/tmp/ai-e6-integrated-pilot.json', JSON.stringify(report, null, 2))
      console.info(
        `E6 synthetic pilot: ${report.requests} requests; estimated/reserved USD ${budget.usedUsd.toFixed(4)}; report /tmp/ai-e6-integrated-pilot.json`
      )
    }
  },
  1_800_000
)
