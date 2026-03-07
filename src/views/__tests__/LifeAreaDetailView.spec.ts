import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import LifeAreaDetailView from '../LifeAreaDetailView.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'

const mockRoute = {
  params: { id: 'la-1' } as Record<string, string>,
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => mockRoute,
}))

describe('LifeAreaDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())

    const lifeAreaStore = useLifeAreaStore()
    const yearlyPlanStore = useYearlyPlanStore()

    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(yearlyPlanStore, 'loadYearlyPlans').mockResolvedValue()

    lifeAreaStore.lifeAreas = [
      {
        id: 'la-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        name: 'Health',
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: 0,
      },
    ]

    yearlyPlanStore.yearlyPlans = [
      {
        id: 'plan-2025',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-02-01T00:00:00.000Z',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        year: 2025,
        focusLifeAreaIds: ['la-1'],
        primaryFocusLifeAreaId: 'la-1',
        lifeAreaNarratives: { 'la-1': 'Older narrative.' },
      },
      {
        id: 'plan-2026',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        year: 2026,
        focusLifeAreaIds: ['la-1'],
        primaryFocusLifeAreaId: 'la-1',
        lifeAreaNarratives: { 'la-1': 'Latest narrative.' },
      },
    ]
  })

  it('shows the latest yearly baseline narrative when present', () => {
    render(LifeAreaDetailView, {
      global: {
        stubs: {
          AppCard: { template: '<div><slot /></div>' },
          AppButton: { template: '<button><slot /></button>' },
          AppSnackbar: { template: '<div />' },
          LifeAreaLinkedEntities: { template: '<div />' },
        },
      },
    })

    expect(screen.getByText('Yearly Baseline Narrative')).toBeInTheDocument()
    expect(screen.getByText('Latest narrative.')).toBeInTheDocument()
  })
})
