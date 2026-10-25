import { getCurrentUserId, getUserDatabase } from '@/services/userDatabaseService'
import { captureUserSession } from '@/services/userSessionScope'
import { getAIProviderSettings, sendMessage } from '@/services/llmService'
import { getPeriodBounds, getPeriodRefsForDate } from '@/utils/periods'
import { captureHistorySnapshot } from '../history/snapshot'
import { loadHistoryAccessPolicy } from '../history/access'
import { sourceKey } from '../history/contracts'
import { browserCompanionTransport } from '../companion/browserTransport'
import { DEFAULT_COMPANION_RATES, type ModelTransport, type WireItem } from '../companion/openai'
import { SpendingBudget } from '../companion/runtime'
import {
  PLANNER_REPLY_SCHEMA,
  parsePlannerReply,
  validatePlannerProposal,
  type PlannerReply,
} from './contracts'
import { PLANNING_CAPABILITIES, PLANNER_INSTRUCTIONS } from './capabilities'
import { mergePlannerObjects, type PlanningAssistantDraft } from '@/domain/planningAssistant'

export interface PlannerContext {
  priorities: Array<{ id: string; title: string }>
  existingObjects: Array<{ kind: string; title: string }>
  truncated: boolean
}
async function planningContext(
  include: boolean,
  asOf: string,
  timeZone: string
): Promise<PlannerContext> {
  if (!include) return { priorities: [], existingObjects: [], truncated: false }
  const userId = getCurrentUserId()
  if (!userId) throw new Error('Zaloguj się ponownie.')
  const snapshot = await captureHistorySnapshot(getUserDatabase(), userId, asOf, 'pl', timeZone)
  const kinds = new Set(['priorities', 'goals', 'habits', 'trackers', 'weeklyIntentions'])
  const sources = snapshot.sources.filter(source => {
    if (!kinds.has(source.ref.collection)) return false
    const row = snapshot.rows.get(sourceKey(source.ref))
    return (
      row &&
      (source.ref.collection === 'priorities'
        ? row.status === 'active'
        : row.isActive && row.status === 'open')
    )
  })
  await snapshot.assertCurrent()
  return {
    priorities: sources
      .filter(source => source.ref.collection === 'priorities')
      .slice(0, 5)
      .map(source => ({ id: source.ref.id, title: source.title.slice(0, 200) })),
    existingObjects: sources
      .filter(source => source.ref.collection !== 'priorities')
      .slice(0, 80)
      .map(source => ({ kind: source.ref.collection, title: source.title.slice(0, 200) })),
    truncated: sources.length > 85,
  }
}
export class PlannerRequestError extends Error {
  constructor(
    message: string,
    readonly spentUsd: number
  ) {
    super(message)
    this.name = 'PlannerRequestError'
  }
}
export interface PlannerRequestResult {
  reply: PlannerReply
  context: PlannerContext
  policyRevision: string
  spentUsd: number
}
/** No write tools and no autonomous history search: the only output is an upsert proposal. */
export async function requestPlannerReply(
  draft: PlanningAssistantDraft,
  message: string,
  options: {
    signal: AbortSignal
    transport?: ModelTransport
    now?: Date
    timeZone?: string
    beforeRequest?: (spentUsd: number, policyRevision: string) => Promise<void>
  }
): Promise<PlannerRequestResult> {
  const session = captureUserSession(),
    db = getUserDatabase()
  const controller = new AbortController()
  const cancel = () => controller.abort()
  const unsubscribe = session.onInvalidate(cancel)
  options.signal.addEventListener('abort', cancel, { once: true })
  if (options.signal.aborted) cancel()
  const timer = setTimeout(cancel, 180000)
  let spentUsd = draft.spentUsd
  try {
    if (!message.trim() || message.length > 12000 || draft.messages.length >= 60)
      throw new Error('Rozpocznij nową rozmowę lub skróć wiadomość.')
    const policy = await loadHistoryAccessPolicy(db)
    if (draft.policyRevision && draft.policyRevision !== policy.revision)
      throw new Error(
        'Zmieniono dostęp do danych. Rozpocznij nową rozmowę, aby nie przesyłać starego kontekstu.'
      )
    const timeZone = options.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = options.now ?? new Date()
    const context = await session.wait(
      planningContext(draft.includePlanning, now.toISOString(), timeZone)
    )
    const today = getPeriodRefsForDate(now).day
    const input: WireItem[] = [
      {
        role: 'user',
        content: JSON.stringify({
          capabilities: PLANNING_CAPABILITIES,
          today,
          weekBounds: getPeriodBounds(getPeriodRefsForDate(today).week),
          timeZone,
          planningContext: context,
          objects: draft.objects,
          lockedFields: draft.lockedFields,
          messages: [
            ...draft.messages.map(m => ({ role: m.role, text: m.text })),
            { role: 'user', text: message.trim() },
          ],
        }),
      },
    ]
    const inputBytes = new TextEncoder().encode(
      JSON.stringify({ input, instructions: PLANNER_INSTRUCTIONS, schema: PLANNER_REPLY_SCHEMA })
    ).length
    if (inputBytes > 100000)
      throw new Error('Rozmowa jest zbyt długa. Zachowaj szkic i rozpocznij nową.')
    const settings = options.transport
      ? null
      : await session.wait(getAIProviderSettings()).catch(error => {
          // Development proxy has its own configuration; it does not require a
          // provider record in the isolated verification account.
          if (import.meta.env.DEV) return null
          throw error
        })
    const hosted =
      options.transport ??
      (!settings || ['openai', 'anthropic'].includes(settings.provider)
        ? await session.wait(browserCompanionTransport())
        : null)
    const rates = hosted?.rates ?? DEFAULT_COMPANION_RATES
    const cap = hosted?.spendCapUsd ?? 0.5
    const budget = new SpendingBudget(cap)
    budget.usedUsd = spentUsd
    const maxOutputTokens = 8192
    const reserve = (inputBytes * rates.input + maxOutputTokens * rates.output) / 1e6
    const settle = budget.reserve(reserve)
    // Reserve before the network call; failed/unknown usage still consumes this estimate.
    spentUsd = budget.usedUsd
    const assertCurrent = async () => {
      session.assertCurrent()
      if (controller.signal.aborted)
        throw new Error('Przerwano odpowiedź. Możesz wysłać wiadomość ponownie.')
      if ((await loadHistoryAccessPolicy(db)).revision !== policy.revision)
        throw new Error('Zmieniono dostęp do danych. Rozpocznij nową rozmowę.')
    }
    await assertCurrent()
    await options.beforeRequest?.(spentUsd, policy.revision)
    await assertCurrent()
    let value: unknown
    if (hosted) {
      const response = await hosted({
        input,
        instructions: PLANNER_INSTRUCTIONS,
        schema: PLANNER_REPLY_SCHEMA,
        maxOutputTokens,
        toolsEnabled: false,
        signal: controller.signal,
      })
      if (response.output.some(item => item.type === 'function_call'))
        throw new Error('Model zaproponował niedozwoloną operację.')
      const content = response.output
        .filter(item => item.type === 'message')
        .flatMap(item => (Array.isArray(item.content) ? (item.content as WireItem[]) : []))
      if (content.some(item => item.type === 'refusal'))
        throw new Error('AI nie przygotowało tej propozycji. Spróbuj opisać zamiar inaczej.')
      const text = content
        .filter(item => item.type === 'output_text')
        .map(item => item.text)
        .join('')
      settle((response.usage.input * rates.input + response.usage.output * rates.output) / 1e6)
      spentUsd = budget.usedUsd
      value = JSON.parse(text)
    } else {
      // Local/custom providers keep their existing configured endpoint. Their JSON
      // is best effort; the same strict local validation applies before publication.
      const text = await sendMessage(
        [{ role: 'user', content: String(input[0].content) }],
        `${PLANNER_INSTRUCTIONS}\nSchemat JSON: ${JSON.stringify(PLANNER_REPLY_SCHEMA)}`,
        { signal: controller.signal, maxTokens: maxOutputTokens, timeoutMs: 180000 }
      )
      value = JSON.parse(
        text
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, '')
      )
    }
    await assertCurrent()
    const reply = parsePlannerReply(value)
    const merged = mergePlannerObjects(draft.objects, reply.objects, draft.lockedFields)
    validatePlannerProposal(merged)
    const priorityIds = new Set([
      ...context.priorities.map(item => item.id),
      ...draft.objects.flatMap(item => item.priorityIds),
    ])
    const lifeAreaIds = new Set(draft.objects.flatMap(item => item.lifeAreaIds))
    for (const item of merged)
      if (
        item.priorityIds.some(id => !priorityIds.has(id)) ||
        item.lifeAreaIds.some(id => !lifeAreaIds.has(id))
      )
        throw new Error('AI użyło nieznanego powiązania. Spróbuj ponownie.')
    return { reply, context, policyRevision: policy.revision, spentUsd }
  } catch (error) {
    if (controller.signal.aborted)
      throw new PlannerRequestError('Przerwano odpowiedź. Możesz spróbować ponownie.', spentUsd)
    if (error instanceof Error && /missing-api-key|provider is not configured/i.test(error.message))
      throw new PlannerRequestError('Skonfiguruj AI w profilu, aby rozpocząć rozmowę.', spentUsd)
    const safe =
      error instanceof Error &&
      !/http-|network-error|cost-limit|JSON|schema|[Ii]nvalid|empty-response|incomplete-response|failed-response|response-too-large/.test(
        error.message
      )
        ? error.message
        : error instanceof Error && error.message === 'cost-limit'
          ? 'Osiągnięto limit kosztu tej rozmowy. Możesz dodać szkic lub rozpocząć nową.'
          : 'Nie udało się przygotować poprawnej propozycji. Wiadomość i szkic zostają tutaj.'
    throw new PlannerRequestError(safe, spentUsd)
  } finally {
    clearTimeout(timer)
    unsubscribe()
    options.signal.removeEventListener('abort', cancel)
  }
}
