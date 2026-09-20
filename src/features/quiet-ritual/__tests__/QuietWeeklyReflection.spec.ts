import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { WEEKLY_RATING_KEYS, type WeeklyRatingKey } from '@/domain/reflection'
import type { WeekRef } from '@/domain/period'
import { trailingWeekRefs } from '@/domain/loadStateSeries'

const WEEK = '2026-W37' as WeekRef

const ratingRefsByKey = Object.fromEntries(WEEKLY_RATING_KEYS.map(key => [key, ref<number | null>(null)])) as Record<
  WeeklyRatingKey,
  ReturnType<typeof ref<number | null>>
>
const wizard = {
  dataBundle: ref(null),
  objectComments: ref({}),
  topPriorityKeys: ref([]),
  ratingRefsByKey,
  promptResponses: ref({}),
  freeformReflection: ref(''),
  aiSummary: ref(''),
  isSaving: ref(false),
  save: vi.fn(async () => undefined),
  goToStep: vi.fn(),
}
vi.mock('@/composables/useWeeklyReflectionWizard', () => ({ useWeeklyReflectionWizard: () => wizard }))

const previousRefs = trailingWeekRefs(WEEK, 10).slice(0, -1)
const listWeeklyByRefs = vi.fn(async (refs: WeekRef[]) =>
  refs
    .filter((_, i) => i !== 3) // one gap in the tail
    .map(weekRef => ({ weekRef, physicalIntensityRating: 4, energyRating: 2, physicalCareRating: 5, promptResponses: {} })),
)
vi.mock('@/repositories/structuredReflectionDexieRepository', () => ({
  structuredReflectionDexieRepository: {
    listWeeklyByRefs: (refs: WeekRef[]) => listWeeklyByRefs(refs),
    listWeekly: async () => [],
    getWeekly: async () => undefined,
  },
}))

import QuietWeeklyReflection from '../QuietWeeklyReflection.vue'

async function mountOnBodyStep() {
  const wrapper = mount(QuietWeeklyReflection, { props: { weekRef: WEEK }, attachTo: document.body })
  await flushPromises()
  await wrapper.find('.qr-arrow--next').trigger('click')
  await flushPromises()
  return wrapper
}

describe('QuietWeeklyReflection · area step (load + state)', () => {
  it('asks about load and state only, never the actions column', async () => {
    const wrapper = await mountOnBodyStep()
    const titles = wrapper.findAll('.qr-bars .qr-axis h2').map(h => h.text())
    // the test locale is EN; PL is the user's working language
    expect([['Load', 'State'], ['Obciążenie', 'Stan']]).toContainEqual(titles)
    expect(wrapper.text()).not.toMatch(/Działania|Actions/)
    expect(wrapper.find('.qr-demands').exists()).toBe(false)
    wrapper.unmount()
  })

  it('loads the nine preceding weeks and draws the tail with the current week appended', async () => {
    const wrapper = await mountOnBodyStep()
    expect(listWeeklyByRefs).toHaveBeenCalledWith(previousRefs)
    const ribbon = wrapper.find('.qr-tail .ls-ribbon')
    expect(ribbon.exists()).toBe(true)
    expect(ribbon.findAll('.ls-ribbon__hit')).toHaveLength(10)
    // one gap in history + unrated current week → history splits into two runs
    expect(ribbon.findAll('.ls-ribbon__line--state')).toHaveLength(2)
    expect(wrapper.find('.qr-tail header small').text()).toContain('jeszcze bez oceny')
    wrapper.unmount()
  })

  it('writes the load bar into the demands field and colours the state bar once both are rated', async () => {
    const wrapper = await mountOnBodyStep()
    const [loadBar, stateBar] = wrapper.findAll('.qr-bars .qr-axis')
    await loadBar.findAll('.qr-scale--vertical button')[3].trigger('click')
    expect(ratingRefsByKey.physicalIntensityRating.value).toBe(4)
    expect(ratingRefsByKey.physicalCareRating.value).toBeNull()
    expect(stateBar.classes()).not.toContain('qr-axis--paired')
    await stateBar.findAll('.qr-scale--vertical button')[4].trigger('click')
    expect(ratingRefsByKey.energyRating.value).toBe(5)
    await flushPromises()
    expect(wrapper.findAll('.qr-bars .qr-axis')[1].classes()).toContain('qr-axis--paired')
    expect(wrapper.find('.qr-tail header small').text()).toContain('dorysowany')
    wrapper.unmount()
  })
})
