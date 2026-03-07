import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/vue'
import { defineComponent, onMounted } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import ProjectCard from '../ProjectCard.vue'
import type { Project, Priority, Tracker } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

const {
  mockTrackersByProject,
  mockComputeTrackerProgressDirect,
  mockResolveProjectTrendRanges,
  mockReconcileProjectTrackers,
} = vi.hoisted(() => ({
  mockTrackersByProject: {} as Record<string, Tracker[]>,
  mockComputeTrackerProgressDirect: vi.fn(),
  mockResolveProjectTrendRanges: vi.fn(),
  mockReconcileProjectTrackers: vi.fn(),
}))

vi.mock('@/stores/tracker.store', () => ({
  useTrackerStore: () => ({
    trackers: [],
    trackerPeriods: [],
    isLoading: false,
    error: null,
    getTrackersByProject: (projectId: string) => mockTrackersByProject[projectId] ?? [],
    updateTracker: vi.fn().mockResolvedValue(undefined),
    createTracker: vi.fn().mockResolvedValue(undefined),
    deleteTracker: vi.fn().mockResolvedValue(undefined),
    reconcileProjectTrackers: mockReconcileProjectTrackers,
    loadTrackers: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/services/trackerRollup.service', () => ({
  computeTrackerProgressDirect: mockComputeTrackerProgressDirect,
  resolveProjectTrendRanges: mockResolveProjectTrendRanges,
}))

const stubs = {
  AppCard: { template: '<div><slot /></div>' },
  InlineEditableText: {
    props: ['modelValue'],
    template: '<span>{{ modelValue }}</span>',
  },
  AnimatedStatusPicker: {
    props: ['currentStatus'],
    template: '<div>{{ currentStatus }}</div>',
  },
  CommitmentActionsMenu: {
    props: ['addCategories', 'addItemsByCategory', 'removableLinks', 'deleteLabel', 'triggerAriaLabel'],
    template: '<button type="button" aria-label="Open project actions">...</button>',
  },
  CommitmentLinkedObjectsCluster: {
    props: ['lifeAreas', 'priorities', 'derivedLifeAreas'],
    template: '<div data-testid="linked-objects-cluster"></div>',
  },
  InlineDateRangeEditor: {
    props: ['startDate', 'endDate'],
    template: '<span data-testid="date-editor"></span>',
  },
  IconPicker: {
    props: ['modelValue', 'compact', 'previewColor'],
    template: '<button type="button" aria-label="Select project icon"></button>',
  },
  KeyResultsEditor: defineComponent({
    emits: ['update:modelValue'],
    setup(_props, { expose }) {
      expose({
        validate: () => true,
      })
      return () => null
    },
  }),
  TrackerProgressRow: {
    props: ['title', 'type', 'currentProgress', 'trendData', 'tracker', 'startDate', 'endDate'],
    emits: ['logged'],
    template: '<div>{{ title }} {{ currentProgress?.summary }}</div>',
  },
}

function buildLifeArea(id: string, name: string, color = '#111111'): LifeArea {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name,
    color,
    measures: [],
    reviewCadence: 'monthly',
    isActive: true,
    sortOrder: 0,
  }
}

function buildPriority(id: string, name: string, lifeAreaIds: string[]): Priority {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lifeAreaIds,
    year: 2026,
    name,
    successSignals: [],
    constraints: [],
    isActive: true,
    sortOrder: 0,
  }
}

function buildProject(data: Partial<Project> & { id: string; name: string }): Project {
  return {
    id: data.id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: data.name,
    description: data.description,
    targetOutcome: data.targetOutcome,
    monthIds: data.monthIds ?? [],
    focusMonthIds: data.focusMonthIds ?? [],
    focusWeekIds: data.focusWeekIds ?? [],
    lifeAreaIds: data.lifeAreaIds ?? [],
    priorityIds: data.priorityIds ?? [],
    status: data.status ?? 'active',
    completedAt: data.completedAt,
    reflectionNote: data.reflectionNote,
  }
}

describe('ProjectCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.keys(mockTrackersByProject).forEach((key) => {
      delete mockTrackersByProject[key]
    })
    mockComputeTrackerProgressDirect.mockReset()
    mockComputeTrackerProgressDirect.mockResolvedValue({
      trackerId: 'default-tracker',
      type: 'value',
      cadence: 'weekly',
      percent: 50,
      summary: '10/20',
    })
    mockResolveProjectTrendRanges.mockReset()
    mockResolveProjectTrendRanges.mockResolvedValue({
      ranges: [
        { startDate: '2026-01-27', endDate: '2026-02-02' },
        { startDate: '2026-01-20', endDate: '2026-01-26' },
      ],
      dateRangeLabel: 'Jan 1 – Feb 28, 2026',
    })
    mockReconcileProjectTrackers.mockReset()
  })

  it('renders project name with actions menu and linked objects cluster', async () => {
    const lifeAreaHealth = buildLifeArea('la-1', 'Health')
    const lifeAreaCareer = buildLifeArea('la-2', 'Career')
    const priorityGrowth = buildPriority('pr-1', 'Grow Skills', ['la-2'])

    const project = buildProject({
      id: 'proj-1',
      name: 'Project X',
      lifeAreaIds: ['la-1'],
      priorityIds: ['pr-1'],
    })

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [lifeAreaHealth, lifeAreaCareer],
        availablePriorities: [priorityGrowth],
      },
      global: { stubs },
    })

    expect(screen.getByText('Project X')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open project actions' })).toBeInTheDocument()
    expect(screen.getByTestId('linked-objects-cluster')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select project icon' })).toBeInTheDocument()
  })

  it('renders date editor and actions menu for unlinked project', async () => {
    const project = buildProject({ id: 'proj-2', name: 'Unlinked Project' })

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: { stubs },
    })

    expect(screen.getByText('Unlinked Project')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open project actions' })).toBeInTheDocument()
    expect(screen.getByTestId('date-editor')).toBeInTheDocument()
  })

  it('shows roll-ups and trend without inline logging controls', async () => {
    const project = buildProject({ id: 'proj-3', name: 'Tracker Project' })
    mockTrackersByProject['proj-3'] = [
      {
        id: 'tracker-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: 'proj-3',
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Weekly distance',
        type: 'value',
        cadence: 'weekly',
        targetValue: 25,
        unit: 'km',
        rollup: 'sum',
        sortOrder: 0,
        isActive: true,
      },
    ]

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: { stubs },
    })

    await waitFor(() => {
      expect(screen.getByText(/Weekly distance/)).toBeInTheDocument()
    })

    expect(screen.queryByText('Log Progress')).not.toBeInTheDocument()
  })

  it('passes project focus windows to trend range resolver', async () => {
    const project = buildProject({
      id: 'proj-scope-1',
      name: 'Scoped Trend Project',
      monthIds: ['month-1'],
      focusMonthIds: ['month-focus-1'],
      focusWeekIds: ['week-1'],
    })
    mockTrackersByProject[project.id] = [
      {
        id: 'tracker-week',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Weekly Runs',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
    ]

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: { stubs },
    })

    await waitFor(() => {
      expect(mockResolveProjectTrendRanges).toHaveBeenCalled()
    })

    expect(mockResolveProjectTrendRanges).toHaveBeenCalledWith(
      expect.objectContaining({
        monthIds: ['month-1'],
        focusMonthIds: ['month-focus-1'],
        focusWeekIds: ['week-1'],
      }),
      'weekly',
      { trackerId: 'tracker-week' }
    )
  })

  it('resolves trend ranges independently for trackers sharing the same cadence', async () => {
    const project = buildProject({ id: 'proj-scope-2', name: 'Multi Tracker Project' })
    mockTrackersByProject[project.id] = [
      {
        id: 'tracker-a',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Runs completed',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
      {
        id: 'tracker-b',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Mobility sessions',
        type: 'count',
        cadence: 'weekly',
        targetCount: 2,
        sortOrder: 1,
        isActive: true,
      },
    ]

    mockResolveProjectTrendRanges.mockImplementation(
      async (_project: Project, _cadence: Tracker['cadence'], options?: { trackerId?: string }) => ({
        ranges:
          options?.trackerId === 'tracker-a'
            ? [{ startDate: '2026-01-26', endDate: '2026-02-01' }]
            : [{ startDate: '2026-01-19', endDate: '2026-01-25' }],
        dateRangeLabel: 'Jan 2026',
      })
    )

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: { stubs },
    })

    await waitFor(() => {
      expect(mockResolveProjectTrendRanges).toHaveBeenCalledWith(project, 'weekly', {
        trackerId: 'tracker-a',
      })
      expect(mockResolveProjectTrendRanges).toHaveBeenCalledWith(project, 'weekly', {
        trackerId: 'tracker-b',
      })
    })
  })

  it('reconciles existing key results when editor is opened and saved immediately', async () => {
    const project = buildProject({ id: 'proj-kr-1', name: 'KR Reconcile Project' })
    mockTrackersByProject[project.id] = [
      {
        id: 'tracker-existing',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Existing KR',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
    ]

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: { stubs },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Key results options' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save Key Results' }))

    await waitFor(() => {
      expect(mockReconcileProjectTrackers).toHaveBeenCalledTimes(1)
    })

    const [projectId, snapshotTrackers, draftTrackers] = mockReconcileProjectTrackers.mock.calls[0]
    expect(projectId).toBe(project.id)
    expect(snapshotTrackers).toHaveLength(1)
    expect(snapshotTrackers[0].id).toBe('tracker-existing')
    expect(draftTrackers).toHaveLength(1)
    expect(draftTrackers[0].id).toBe('tracker-existing')
  })

  it('requires explicit confirmation before deleting all existing key results', async () => {
    const project = buildProject({ id: 'proj-kr-2', name: 'KR Guard Project' })
    mockTrackersByProject[project.id] = [
      {
        id: 'tracker-existing',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        parentType: 'project',
        parentId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Existing KR',
        type: 'count',
        cadence: 'weekly',
        targetCount: 3,
        sortOrder: 0,
        isActive: true,
      },
    ]

    const KeyResultsEditorClearStub = defineComponent({
      emits: ['update:modelValue'],
      setup(_props, { emit, expose }) {
        expose({
          validate: () => true,
        })
        onMounted(() => {
          emit('update:modelValue', [])
        })
        return () => null
      },
    })

    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

    render(ProjectCard, {
      props: {
        project,
        availableLifeAreas: [],
        availablePriorities: [],
      },
      global: {
        stubs: {
          ...stubs,
          KeyResultsEditor: KeyResultsEditorClearStub,
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Key results options' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Save Key Results' }))

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    expect(mockReconcileProjectTrackers).not.toHaveBeenCalled()

    confirmSpy.mockRestore()
  })
})
