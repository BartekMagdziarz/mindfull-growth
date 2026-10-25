import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createPlanningAssistantDraft } from '@/domain/planningAssistant'
import { plannerFixture as obj } from '@/domain/__tests__/planningAssistant.fixture'
import { requestPlannerReply } from '../planningAssistantService'
import type { ModelRequest, ModelResponse, ModelTransport } from '../../companion/openai'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getTestDatabase } from '@/test/testDatabase'
import { saveHistoryAccessPolicy } from '../../history/access'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { invalidateUserSession } from '@/services/userSessionScope'
beforeEach(async () => {
  await resetPlanningTestData()
  await getTestDatabase().userSettings.delete('ai.history.access.v1')
})
function response(value: unknown): ModelResponse {
  return {
    output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(value) }] }],
    usage: { input: 100, output: 200, cached: 0, reasoning: 0 },
    model: 'test',
    requestId: 'test',
  }
}
function transport(value: unknown) {
  return vi.fn(async (_request: ModelRequest) => response(value)) as unknown as ModelTransport &
    ReturnType<typeof vi.fn>
}
const reply = () => ({ message: 'Zacznijmy od dwóch tygodni.', suggestions: [], objects: [obj()] })
const options = (t: ModelTransport) => ({
  signal: new AbortController().signal,
  transport: t,
  now: new Date('2026-10-25T11:00:00Z'),
  timeZone: 'Europe/Warsaw',
})
describe('planning assistant AI boundary', () => {
  it('uses strict structured proposals, disables tools and does not write planning data', async () => {
    const t = transport(reply()),
      result = await requestPlannerReply(createPlanningAssistantDraft(), 'Chcę czytać', options(t))
    expect(result.reply.objects).toHaveLength(1)
    expect(t).toHaveBeenCalledOnce()
    const request = t.mock.calls[0][0] as ModelRequest
    expect(request.toolsEnabled).toBe(false)
    expect(request.schema.additionalProperties).toBe(false)
    expect(request.instructions).toContain('Nie masz narzędzia zapisu')
    expect(JSON.parse(String(request.input[0].content)).today).toBe('2026-10-25')
    expect(await getTestDatabase().habits.count()).toBe(0)
  })
  it('sends no planning context by default and only allowed titles when opted in', async () => {
    const habit = await habitDexieRepository.create({
      title: 'Prywatny tytuł',
      description: 'Prywatny opis',
      priorityIds: [],
      lifeAreaIds: [],
      isActive: true,
      status: 'open',
      entryMode: 'completion',
      cadence: 'weekly',
      target: { kind: 'count', operator: 'min', value: 2 },
    })
    // The snapshot drops rows created after `now`; the habit above is created at
    // wall-clock time, so this test's `now` must sit after it, not at a fixed hour.
    const after = (t: ModelTransport) => ({ ...options(t), now: new Date(Date.now() + 60_000) })
    let t = transport({ message: 'Co planujemy?', suggestions: [], objects: [] }),
      draft = createPlanningAssistantDraft()
    await requestPlannerReply(draft, 'Pomóż', after(t))
    expect(JSON.stringify(t.mock.calls)).not.toContain('Prywatny tytuł')
    draft.includePlanning = true
    t = transport({ message: 'Co planujemy?', suggestions: [], objects: [] })
    await requestPlannerReply(draft, 'Pomóż', after(t))
    expect(JSON.stringify(t.mock.calls)).toContain('Prywatny tytuł')
    expect(JSON.stringify(t.mock.calls)).not.toContain('Prywatny opis')
    await saveHistoryAccessPolicy({
      excludedKinds: [],
      excludedSources: [{ collection: 'habits', id: habit.id }],
    })
    t = transport({ message: 'Co planujemy?', suggestions: [], objects: [] })
    await requestPlannerReply(draft, 'Pomóż', after(t))
    expect(JSON.stringify(t.mock.calls)).not.toContain('Prywatny tytuł')
  })
  it('does not re-send conversation after history permissions change', async () => {
    const draft = createPlanningAssistantDraft()
    draft.policyRevision = 'old'
    const t = transport(reply())
    await expect(requestPlannerReply(draft, 'Pomóż', options(t))).rejects.toThrow('dostęp')
    expect(t).not.toHaveBeenCalled()
  })
  it('rejects stale responses after policy or account changes', async () => {
    const draft = createPlanningAssistantDraft()
    const policyTransport: ModelTransport = async () => {
      await saveHistoryAccessPolicy({ excludedKinds: ['planning'], excludedSources: [] })
      return response(reply())
    }
    await expect(requestPlannerReply(draft, 'Pomóż', options(policyTransport))).rejects.toThrow(
      'dostęp'
    )
    const accountTransport: ModelTransport = async () => {
      invalidateUserSession()
      return response(reply())
    }
    await expect(requestPlannerReply(draft, 'Pomóż', options(accountTransport))).rejects.toThrow()
  })
  it.each([
    { message: 'x', suggestions: [], objects: [obj({ target: 9 })] },
    { message: 'x', suggestions: [], objects: [obj({ priorityIds: ['invented'] })] },
    { message: 'x', suggestions: [], objects: [obj({ lifeAreaIds: ['invented'] })] },
    { message: 'x', suggestions: [], objects: [{ ...obj(), unit: 'kg' }] },
  ])('rejects unrepresentable or invented data before showing it', async value => {
    await expect(
      requestPlannerReply(createPlanningAssistantDraft(), 'Pomóż', options(transport(value)))
    ).rejects.toThrow()
    expect(await getTestDatabase().habits.count()).toBe(0)
  })
  it('never changes manually locked fields', async () => {
    const draft = createPlanningAssistantDraft()
    draft.objects = [obj({ target: 2 })]
    draft.lockedFields = { reading: ['target'] }
    const result = await requestPlannerReply(draft, 'Zmień opis', options(transport(reply())))
    expect(result.reply.objects[0].target).toBe(3) // caller merges the proposal again with current locks
  })
  it('reserves cost durably before the network call and retains the estimate on failure', async () => {
    const beforeRequest = vi.fn(async () => {})
    const t: ModelTransport = async () => {
      expect(beforeRequest).toHaveBeenCalledOnce()
      throw new Error('network-error')
    }
    try {
      await requestPlannerReply(createPlanningAssistantDraft(), 'Pomóż', {
        ...options(t),
        beforeRequest,
      })
      expect.fail('must fail')
    } catch (error) {
      expect(error).toMatchObject({ name: 'PlannerRequestError' })
      expect((error as { spentUsd: number }).spentUsd).toBeGreaterThan(0)
    }
  })
  it('does not call API when reservation cannot be saved or budget is exhausted', async () => {
    const t = transport(reply())
    await expect(
      requestPlannerReply(createPlanningAssistantDraft(), 'x', {
        ...options(t),
        beforeRequest: async () => {
          throw new Error('draft-conflict')
        },
      })
    ).rejects.toThrow()
    expect(t).not.toHaveBeenCalled()
    const draft = createPlanningAssistantDraft()
    draft.spentUsd = 0.5
    await expect(requestPlannerReply(draft, 'x', options(t))).rejects.toThrow('limit kosztu')
    expect(t).not.toHaveBeenCalled()
  })
  it('ignores a response arriving after abort', async () => {
    const controller = new AbortController()
    const t: ModelTransport = async () => {
      controller.abort()
      return response(reply())
    }
    await expect(
      requestPlannerReply(createPlanningAssistantDraft(), 'Pomóż', {
        ...options(t),
        signal: controller.signal,
      })
    ).rejects.toThrow('Przerwano')
  })
})
