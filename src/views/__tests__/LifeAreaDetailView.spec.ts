import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/vue'
import { createPinia, setActivePinia } from 'pinia'
import LifeAreaDetailView from '../LifeAreaDetailView.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'

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
    const assessmentStore = useLifeAreaAssessmentStore()

    vi.spyOn(lifeAreaStore, 'loadLifeAreas').mockResolvedValue()
    vi.spyOn(assessmentStore, 'loadAssessments').mockResolvedValue()

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
    expect(screen.queryByText('Yearly Baseline Narrative')).not.toBeInTheDocument()
    expect(screen.getByText('Linked Data')).toBeInTheDocument()
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
