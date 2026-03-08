import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/vue'
import { defineComponent, h, nextTick } from 'vue'
import { useMonthlyPlanningDraft } from '@/composables/useMonthlyPlanningDraft'
import { useWeeklyPlanningDraft } from '@/composables/useWeeklyPlanningDraft'
import { useYearlyPlanningDraft } from '@/composables/useYearlyPlanningDraft'
import { loadDraftFromDB } from '@/services/draftStorage'

const { draftStore } = vi.hoisted(() => ({
  draftStore: new Map<string, string>(),
}))

vi.mock('@/services/draftStorage', () => ({
  loadDraftFromDB: vi.fn(async (key: string) => draftStore.get(key) ?? null),
  saveDraftToDB: vi.fn(async (key: string, data: string) => {
    draftStore.set(key, data)
  }),
  clearDraftFromDB: vi.fn(async (key: string) => {
    draftStore.delete(key)
  }),
}))

interface DraftHarnessApi {
  ready: Promise<void>
  clearDraft: () => void
  draft: {
    value: Record<string, any>
  }
}

function mountComposable<T extends DraftHarnessApi>(factory: () => T): { api: T; unmount: () => void } {
  let api!: T

  const Harness = defineComponent({
    setup() {
      api = factory()
      return () => h('div')
    },
  })

  const rendered = render(Harness)

  return {
    api,
    unmount: rendered.unmount,
  }
}

async function flushAutosave(): Promise<void> {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 350))
  await Promise.resolve()
}

describe('planning draft clear behavior', () => {
  beforeEach(() => {
    draftStore.clear()
  })

  const cases: Array<{
    label: string
    key: string
    create: () => DraftHarnessApi
    mutate: (api: DraftHarnessApi) => void
  }> = [
    {
      label: 'yearly',
      key: 'yearly-planning-draft-2026',
      create: () => useYearlyPlanningDraft(2026),
      mutate: (api: DraftHarnessApi) => {
        api.draft.value.yearTheme = 'Clarity'
      },
    },
    {
      label: 'monthly',
      key: 'monthly-planning-draft-plan-1',
      create: () => useMonthlyPlanningDraft('plan-1'),
      mutate: (api: DraftHarnessApi) => {
        api.draft.value.monthIntention = 'Protect deep work'
      },
    },
    {
      label: 'weekly',
      key: 'weekly-planning-draft-plan-1',
      create: () => useWeeklyPlanningDraft('plan-1', {
        startDate: '2026-02-02',
        endDate: '2026-02-08',
        name: '',
      }),
      mutate: (api: DraftHarnessApi) => {
        api.draft.value.focusSentence = 'Keep the week calm and deliberate'
      },
    },
  ]

  it.each(cases)('does not recreate a blank $label draft after clearDraft()', async ({ create, key, mutate }) => {
    const { api, unmount } = mountComposable(create)

    await api.ready

    mutate(api)
    await flushAutosave()
    expect(await loadDraftFromDB(key)).not.toBeNull()

    api.clearDraft()
    await flushAutosave()
    expect(await loadDraftFromDB(key)).toBeNull()

    mutate(api)
    await flushAutosave()
    expect(await loadDraftFromDB(key)).not.toBeNull()

    unmount()
  })
})
