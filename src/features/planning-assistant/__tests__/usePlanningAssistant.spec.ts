import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { usePlanningAssistant } from '../usePlanningAssistant'
import { requestPlannerReply } from '@/services/ai/planning/planningAssistantService'
import { planningAssistantDraftRepository as drafts } from '@/repositories/planningAssistantDraftRepository'
import { plannerFixture as obj } from '@/domain/__tests__/planningAssistant.fixture'
import type { PlannerRequestResult } from '@/services/ai/planning/planningAssistantService'
import { resetPlanningTestData } from '@/test/planningTestUtils'
import { getTestDatabase } from '@/test/testDatabase'
import { invalidateUserSession } from '@/services/userSessionScope'
vi.mock('@/services/ai/planning/planningAssistantService', async importOriginal => {
  const original =
    await importOriginal<typeof import('@/services/ai/planning/planningAssistantService')>()
  return { ...original, requestPlannerReply: vi.fn() }
})
const answer = (): PlannerRequestResult => ({
  reply: { message: 'Zacznijmy od dwóch tygodni.', suggestions: [], objects: [obj()] },
  context: { priorities: [], existingObjects: [], truncated: false },
  policyRevision: 'initial',
  spentUsd: 0.001,
})
const cleanups: Array<() => void> = []
afterEach(() => {
  cleanups.splice(0).forEach(fn => fn())
})
async function setup() {
  let vm!: ReturnType<typeof usePlanningAssistant>
  const wrapper = mount(
    defineComponent({
      setup() {
        vm = usePlanningAssistant()
        return () => null
      },
    })
  )
  cleanups.push(() => wrapper.unmount())
  await vi.waitFor(() => expect(vm.loading.value).toBe(false))
  return { vm, wrapper }
}
beforeEach(async () => {
  await resetPlanningTestData()
  vi.mocked(requestPlannerReply).mockReset()
})
describe('planning assistant conversation persistence', () => {
  it('saves only on explicit approval and keeps the receipt on reopening', async () => {
    vi.mocked(requestPlannerReply).mockResolvedValue(answer())
    const { vm, wrapper } = await setup()
    await vm.send('Chcę czytać')
    expect(vm.draft.value!.messages.map(m => m.role)).toEqual(['user', 'assistant'])
    expect(await getTestDatabase().habits.count()).toBe(0)
    await Promise.all([vm.save(), vm.save()])
    expect(await getTestDatabase().habits.count()).toBe(1)
    expect(vm.draft.value!.receipt?.objects).toHaveLength(1)
    wrapper.unmount()
    await flushPromises()
    const reopened = await setup()
    expect(reopened.vm.draft.value!.receipt).not.toBeNull()
    reopened.wrapper.unmount()
  })
  it('preserves manual changes made while waiting for AI', async () => {
    const draft = await drafts.open()
    draft.objects = [obj()]
    await drafts.save(draft, 0)
    let resolve!: (value: PlannerRequestResult) => void
    vi.mocked(requestPlannerReply).mockImplementation(
      () =>
        new Promise(r => {
          resolve = r
        })
    )
    const { vm, wrapper } = await setup()
    const work = vm.send('Dopracuj opis')
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    vm.draft.value!.objects[0].target = 2
    vm.edited('reading')
    vm.draft.value!.objects[0].title = 'Mój tytuł'
    vm.edited('reading')
    resolve(answer())
    await work
    expect(vm.draft.value!.objects[0]).toMatchObject({ target: 2, title: 'Mój tytuł' })
    expect((await drafts.open()).objects[0]).toMatchObject({ target: 2, title: 'Mój tytuł' })
    wrapper.unmount()
  })
  it('locks every cascaded selection in a goal group', async () => {
    const draft = await drafts.open()
    draft.objects = [
      obj({ id: 'goal', kind: 'goal', successDefinition: 'Gotowe.' }),
      obj({ id: 'kr', kind: 'keyResult', parentId: 'goal' }),
    ]
    await drafts.save(draft, 0)
    const { vm, wrapper } = await setup()
    vm.select('goal', false)
    await vm.persist()
    expect(vm.draft.value!.lockedFields.goal).toContain('selected')
    expect(vm.draft.value!.lockedFields.kr).toContain('selected')
    wrapper.unmount()
  })
  it('restores interrupted pending messages after refresh', async () => {
    const draft = await drafts.open()
    draft.pendingMessageId = 'pending'
    draft.messages = [{ id: 'pending', role: 'user', text: 'Mój plan' }]
    await drafts.save(draft, 0)
    const { vm, wrapper } = await setup()
    expect(vm.draft.value!.input).toBe('Mój plan')
    expect(vm.draft.value!.messages).toEqual([])
    expect((await drafts.open()).pendingMessageId).toBeNull()
    wrapper.unmount()
  })
  it('does not apply responses arriving after cancellation', async () => {
    vi.mocked(requestPlannerReply).mockImplementation(async (_draft, _message, options) => {
      await options.beforeRequest?.(0.01, 'initial')
      options.signal.addEventListener('abort', () => {})
      return answer()
    })
    const { vm, wrapper } = await setup()
    const work = vm.send('Mój plan')
    await flushPromises()
    await work
    await vm.reset()
    let resolve!: (value: PlannerRequestResult) => void
    vi.mocked(requestPlannerReply).mockImplementation(() => new Promise(r => (resolve = r)))
    const cancelled = vm.send('Przerwij')
    await vi.waitFor(() => expect(resolve).toBeTypeOf('function'))
    vm.cancel()
    resolve(answer())
    await cancelled
    expect(vm.draft.value!.objects).toEqual([])
    wrapper.unmount()
  })
  it('blocks a stale tab without overwriting its current edits', async () => {
    const { vm, wrapper } = await setup()
    const other = await drafts.open()
    other.input = 'W drugim oknie'
    await drafts.save(other, other.revision)
    vm.draft.value!.input = 'W tym oknie'
    expect(await vm.persist()).toBe(false)
    expect(vm.conflict.value).toBe(true)
    expect((await drafts.open()).input).toBe('W drugim oknie')
    expect(vm.draft.value!.input).toBe('W tym oknie')
    wrapper.unmount()
  })
  it('does not write old queued work into another account', async () => {
    const { vm, wrapper } = await setup()
    vm.draft.value!.input = 'Stare konto'
    invalidateUserSession()
    expect(vm.draft.value).toBeNull()
    expect(await vm.persist()).toBe(false)
    expect((await drafts.open()).input).toBe('')
    wrapper.unmount()
  })
})
