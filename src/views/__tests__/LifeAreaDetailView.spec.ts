import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import LifeAreaDetailView from '../LifeAreaDetailView.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useUserPreferencesStore } from '@/stores/userPreferences.store'

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
    useUserPreferencesStore().$patch({ locale: 'en', isLoaded: true })

    const lifeAreaStore = useLifeAreaStore()
    const assessmentStore = useLifeAreaAssessmentStore()

    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(assessmentStore, 'loadAssessments').mockResolvedValue()

    lifeAreaStore.lifeAreas = [
      {
        id: 'la-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        name: 'Health',
        meaning: 'Energy and stability',
        desiredState: 'I feel strong and steady.',
        typicalRisks: 'I ignore rest and tension.',
        reflectionSignals: ['Did I have enough energy this week?'],
        isActive: true,
        sortOrder: 0,
      },
    ]
    assessmentStore.assessments = []
  })

  it('renders detail content without planning-derived baseline data', () => {
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

    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Meaning')).toBeInTheDocument()
    expect(screen.getByText('Desired State')).toBeInTheDocument()
    expect(screen.getByText('Typical Risks')).toBeInTheDocument()
    expect(screen.getByText('Reflection Signals')).toBeInTheDocument()
    expect(screen.queryByText('Yearly Baseline Narrative')).not.toBeInTheDocument()
    expect(screen.queryByText('Measures')).not.toBeInTheDocument()
    expect(screen.queryByText('Review Cadence')).not.toBeInTheDocument()
    expect(screen.getByText('Wheel of Life History')).toBeInTheDocument()
  })

  it('hides permanent delete when the life area already has assessment history', () => {
    const assessmentStore = useLifeAreaAssessmentStore()
    assessmentStore.assessments = [
      {
        id: 'assessment-1',
        createdAt: '2026-02-01T00:00:00.000Z',
        updatedAt: '2026-02-01T00:00:00.000Z',
        scope: 'full',
        lifeAreaIds: ['la-1'],
        items: [
          {
            lifeAreaId: 'la-1',
            lifeAreaNameSnapshot: 'Health',
            score: 7,
          },
        ],
      },
    ]

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

    expect(screen.queryByText('Delete this area permanently')).not.toBeInTheDocument()
    expect(
      screen.getByText('This area has assessment history and can only be archived.'),
    ).toBeInTheDocument()
  })
})
