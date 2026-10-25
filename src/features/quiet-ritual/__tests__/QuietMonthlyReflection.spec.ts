import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { MonthRef } from '@/domain/period'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

const MONTH = '2026-09' as MonthRef

const wizard = {
  dataBundle: ref(null),
  activePriorities: ref([]),
  selectedPriorityIds: ref([]),
  assessmentFor: () => ({
    effort: null,
    verdict: null,
    note: '',
    observedProgressSignals: [],
    observedRiskSignals: [],
  }),
  updateAssessment: vi.fn(),
  toggleObservedSignal: vi.fn(),
  focusConfrontation: ref(null),
  balanceRating: ref<number | null>(null),
  purposeRating: ref<number | null>(null),
  growthRating: ref<number | null>(null),
  coherenceRating: ref<number | null>(null),
  agencyRating: ref<number | null>(null),
  promptResponses: ref({}),
  freeformReflection: ref(''),
  aiSummary: ref(''),
  isSaving: ref(false),
  save: vi.fn(async () => undefined),
  goToStep: vi.fn(),
}
vi.mock('@/composables/useMonthlyReflectionWizard', () => ({
  useMonthlyReflectionWizard: () => wizard,
}))
vi.mock('@/repositories/structuredReflectionDexieRepository', () => ({
  structuredReflectionDexieRepository: {
    getMonthly: async () => undefined,
    listMonthly: async () => [],
    listWeekly: async () => [],
    listWeeklyByRefs: async () => [],
  },
}))
vi.mock('@/repositories/goalDexieRepository', () => ({
  goalDexieRepository: { listAll: async () => [] },
}))
vi.mock('@/repositories/keyResultDexieRepository', () => ({
  keyResultDexieRepository: { listAll: async () => [] },
}))
vi.mock('@/repositories/habitDexieRepository', () => ({
  habitDexieRepository: { listAll: async () => [] },
}))
vi.mock('@/repositories/trackerDexieRepository', () => ({
  trackerDexieRepository: { listAll: async () => [] },
}))

import QuietMonthlyReflection from '../QuietMonthlyReflection.vue'

async function mountRitual(prefs: { locale: 'pl' | 'en'; grammaticalGender?: 'feminine' }) {
  setActivePinia(createPinia())
  useUserPreferencesStore().$patch(prefs)
  const wrapper = mount(QuietMonthlyReflection, {
    props: { monthRef: MONTH },
    attachTo: document.body,
    global: {
      stubs: {
        RouterLink: { template: '<a><slot /></a>' },
        ProfileProposalNotice: true,
        ReflectionCompanionPanel: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

async function goToAnchors(wrapper: Awaited<ReturnType<typeof mountRitual>>) {
  for (let i = 0; i < 2; i += 1) {
    await wrapper.find('.qr-arrow--next').trigger('click')
    await flushPromises()
  }
}

describe('QuietMonthlyReflection · grammatical gender (B-1)', () => {
  it('renders the feminine forms of the step questions, the effort hint and the anchors', async () => {
    const wrapper = await mountRitual({ locale: 'pl', grammaticalGender: 'feminine' })
    expect(wrapper.text()).toContain('Jaką uwagę poświęciłaś swoim kierunkom?')
    expect(wrapper.text()).not.toContain('poświęciłeś')
    await goToAnchors(wrapper)
    const text = wrapper.text()
    expect(text).toContain('Z czego jestem dumna')
    expect(text).toContain('Jak się rozwinęłam')
    expect(text).not.toMatch(/jestem dumny|rozwinąłem/)
    wrapper.unmount()
  })

  it('keeps the masculine forms by default', async () => {
    const wrapper = await mountRitual({ locale: 'pl' })
    expect(wrapper.text()).toContain('Jaką uwagę poświęciłeś swoim kierunkom?')
    await goToAnchors(wrapper)
    expect(wrapper.text()).toContain('Z czego jestem dumny')
    expect(wrapper.text()).toContain('Jak się rozwinąłem')
    wrapper.unmount()
  })

  it('stays English in the English interface (no fallback to Polish gendered text)', async () => {
    const wrapper = await mountRitual({ locale: 'en', grammaticalGender: 'feminine' })
    expect(wrapper.text()).toContain('What attention did you give your directions?')
    await goToAnchors(wrapper)
    expect(wrapper.text()).toContain("What I'm most proud of")
    expect(wrapper.text()).not.toMatch(/dumn|rozwin/)
    wrapper.unmount()
  })
})
