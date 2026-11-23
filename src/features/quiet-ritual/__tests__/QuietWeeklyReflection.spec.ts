import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { WEEKLY_RATING_KEYS, type WeeklyRatingKey } from '@/domain/reflection'
import type { WeekRef } from '@/domain/period'
import { trailingWeekRefs, weekPointLabel } from '@/domain/loadStateSeries'

const WEEK = '2026-W37' as WeekRef

const ratingRefsByKey = Object.fromEntries(
  WEEKLY_RATING_KEYS.map(key => [key, ref<number | null>(null)])
) as Record<WeeklyRatingKey, ReturnType<typeof ref<number | null>>>
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
vi.mock('@/composables/useWeeklyReflectionWizard', () => ({
  useWeeklyReflectionWizard: () => wizard,
}))

const previousRefs = trailingWeekRefs(WEEK, 10).slice(0, -1)
const listWeeklyByRefs = vi.fn(async (refs: WeekRef[]) =>
  refs
    .filter((_, i) => i !== 3) // one gap in the tail
    .map(weekRef => ({
      weekRef,
      physicalIntensityRating: 4,
      energyRating: 2,
      physicalCareRating: 5,
      emotionalIntensityRating: 3,
      moodRating: 4,
      promptResponses: {},
    }))
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
  const wrapper = mount(QuietWeeklyReflection, {
    props: { weekRef: WEEK },
    attachTo: document.body,
    global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  })
  await flushPromises()
  await wrapper.find('.qr-arrow--next').trigger('click')
  await flushPromises()
  return wrapper
}

describe('QuietWeeklyReflection · area step (load + state)', () => {
  it('asks about load and state only, never the actions column', async () => {
    const wrapper = await mountOnBodyStep()
    const titles = wrapper.findAll('.qr-area__field h2').map(h => h.text())
    // the test locale is EN; PL is the user's working language
    expect([
      ['Load', 'State'],
      ['Obciążenie', 'Stan'],
    ]).toContainEqual(titles)
    expect(wrapper.text()).not.toMatch(/Działania|Actions/)
    expect(wrapper.find('.qr-demands').exists()).toBe(false)
    wrapper.unmount()
  })

  it('leads with the live mark and keeps the earlier weeks folded inside the result tile', async () => {
    const wrapper = await mountOnBodyStep()
    expect(listWeeklyByRefs).toHaveBeenCalledWith(previousRefs)
    // the result tile stands above the two fields and carries one big, live, still unrated mark
    const tile = wrapper.find('.qr-area .qr-tile')
    expect(tile.exists()).toBe(true)
    expect(tile.findAll('.ls-track')).toHaveLength(1)
    expect(tile.find('.ls-track').classes()).toEqual(
      expect.arrayContaining(['ls-track--lg', 'ls-track--live'])
    )
    expect(tile.find('.qr-tile__past').exists()).toBe(false)
    expect(tile.find('.qr-tile__head').text()).not.toMatch(/\d/)

    // history is an add-on: one word opens the last five rated weeks, newest first, no gaps
    const fold = tile.find('.qr-tile__fold')
    expect(fold.attributes('aria-expanded')).toBe('false')
    await fold.trigger('click')
    const rows = tile.findAll('.qr-tile__past li')
    expect(rows).toHaveLength(5)
    expect(tile.findAll('.qr-tile__past .ls-track--sm')).toHaveLength(5)
    expect(tile.findAll('.qr-tile__past .ls-track__rail--empty')).toHaveLength(0)
    expect(rows[0].find('small').text()).toBe(weekPointLabel(previousRefs[previousRefs.length - 1]))
    expect(tile.find('.qr-tile__date').text()).toBe(weekPointLabel(WEEK))
    wrapper.unmount()
  })

  it('remembers the opened history while walking to the next area', async () => {
    const wrapper = await mountOnBodyStep()
    await wrapper.find('.qr-tile__fold').trigger('click')
    await wrapper.find('.qr-arrow--next').trigger('click')
    await flushPromises()
    expect(wrapper.find('.qr-tile__fold').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.qr-tile__past').exists()).toBe(true)
    wrapper.unmount()
  })

  it('writes the load counter into the demands field and draws the pair on the mark', async () => {
    const wrapper = await mountOnBodyStep()
    const [loadField, stateField] = wrapper.findAll('.qr-area__field')
    const more = (field: typeof loadField) => field.findAll('.qr-counter__nudge')[1]
    for (let i = 0; i < 4; i++) await more(loadField).trigger('click')
    expect(ratingRefsByKey.physicalIntensityRating.value).toBe(4)
    expect(ratingRefsByKey.physicalCareRating.value).toBeNull()
    // one rating is already drawn on the live mark, before the pair has its colour
    expect(wrapper.find('.qr-tile .ls-track').attributes('aria-label')).toContain('obciążenie 4')
    for (let i = 0; i < 5; i++) await more(stateField).trigger('click')
    expect(ratingRefsByKey.energyRating.value).toBe(5)
    await flushPromises()
    expect(wrapper.find('.qr-tile .ls-track').attributes('aria-label')).toContain(
      'obciążenie 4, stan 5'
    )
    expect(loadField.find('.qr-counter__number').text()).toBe('4')
    expect(stateField.find('.qr-counter__number').text()).toBe('5')
    ratingRefsByKey.physicalIntensityRating.value = null
    ratingRefsByKey.energyRating.value = null
    wrapper.unmount()
  })

  it('keeps separate tags in the load field and the state field', async () => {
    wizard.promptResponses.value = { 'tags:body': 'stary tag' }
    const wrapper = await mountOnBodyStep()
    const [loadField, stateField] = wrapper.findAll('.qr-area__field')
    expect(loadField.find('.qr-tags').exists()).toBe(true)
    expect(stateField.find('.qr-tags').exists()).toBe(true)
    // the legacy undivided list is still shown with the week, read-only
    expect(wrapper.find('.qr-legacy-tags').text()).toContain('stary tag')

    await loadField.find('.qr-tags__btn').trigger('click')
    await loadField.find('.qr-tags__input').setValue('sen')
    await loadField.find('.qr-tags__input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wizard.promptResponses.value).toMatchObject({
      'tags:body:load': 'sen',
      'tags:body': 'stary tag',
    })
    expect(wizard.promptResponses.value).not.toHaveProperty('tags:body:state')

    await stateField.find('.qr-tags__btn').trigger('click')
    await stateField.find('.qr-tags__input').setValue('spokój')
    await stateField.find('.qr-tags__input').trigger('keydown', { key: 'Enter' })
    await flushPromises()
    expect(wizard.promptResponses.value).toMatchObject({
      'tags:body:load': 'sen',
      'tags:body:state': 'spokój',
    })
    wizard.promptResponses.value = {}
    wrapper.unmount()
  })
})
