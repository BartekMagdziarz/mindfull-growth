import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/vue'
import CommitmentCard from '../CommitmentCard.vue'
import type { Commitment, Project, Priority } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

const stubs = {
  AppCard: { template: '<div><slot /></div>' },
  InlineEditableText: {
    props: ['modelValue', 'textClass'],
    template: '<span data-testid="inline-title" :class="textClass">{{ modelValue }}</span>',
  },
  AnimatedStatusPicker: {
    props: ['currentStatus'],
    template: '<div>{{ currentStatus }}</div>',
  },
}

function buildLifeArea(id: string, name: string, color = '#111111', icon?: string): LifeArea {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name,
    icon,
    color,
    measures: [],
    reviewCadence: 'monthly',
    isActive: true,
    sortOrder: 0,
  }
}

function buildPriority(id: string, name: string, lifeAreaIds: string[], icon?: string): Priority {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lifeAreaIds,
    year: 2026,
    name,
    icon,
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
    icon: data.icon,
    description: data.description,
    targetOutcome: data.targetOutcome,
    monthIds: data.monthIds ?? [],
    lifeAreaIds: data.lifeAreaIds ?? [],
    priorityIds: data.priorityIds ?? [],
    status: data.status ?? 'active',
    completedAt: data.completedAt,
    reflectionNote: data.reflectionNote,
  }
}

function buildCommitment(data: Partial<Commitment> & { id: string; name: string }): Commitment {
  return {
    id: data.id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    startDate: data.startDate ?? '2026-01-12',
    endDate: data.endDate ?? '2026-01-18',
    periodType: data.periodType ?? 'weekly',
    weeklyPlanId: data.weeklyPlanId ?? 'week-1',
    projectId: data.projectId,
    lifeAreaIds: data.lifeAreaIds ?? [],
    priorityIds: data.priorityIds ?? [],
    name: data.name,
    status: data.status ?? 'planned',
    reflectionNote: data.reflectionNote,
  }
}

describe('CommitmentCard', () => {
  it('removes legacy details toggle and contribution button, and uses two-line title + linked cluster', async () => {
    const lifeAreaHealth = buildLifeArea('la-1', 'Health', '#ff0000', 'heart')
    const lifeAreaCareer = buildLifeArea('la-2', 'Career', '#00ff00', 'briefcase')

    const priorityRun = buildPriority('pr-1', 'Run Weekly', ['la-1'], 'flag')
    const priorityGrow = buildPriority('pr-2', 'Grow Skills', ['la-2'], 'chart')

    const project = buildProject({
      id: 'proj-1',
      name: 'Project X',
      icon: 'layers',
      lifeAreaIds: ['la-2'],
      priorityIds: ['pr-1'],
    })

    const commitment = buildCommitment({
      id: 'c-1',
      name: 'This is a long commitment title that should support two lines before truncating',
      projectId: 'proj-1',
      lifeAreaIds: ['la-1'],
      priorityIds: ['pr-2'],
    })

    render(CommitmentCard, {
      props: {
        commitment,
        availableProjects: [project],
        availableLifeAreas: [lifeAreaHealth, lifeAreaCareer],
        availablePriorities: [priorityRun, priorityGrow],
      },
      global: { stubs },
    })

    expect(screen.queryByRole('button', { name: 'Show link details' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show contribution trail' })).not.toBeInTheDocument()

    const title = screen.getByTestId('inline-title')
    expect(title.className).toContain('line-clamp-2')

    const clusterToggle = screen.getByRole('button', { name: 'Expand linked objects' })
    expect(clusterToggle).toBeInTheDocument()

    await fireEvent.click(clusterToggle)
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Career')).toBeInTheDocument()
    expect(screen.getByText('Grow Skills')).toBeInTheDocument()
    expect(screen.getByText('Run Weekly')).toBeInTheDocument()
    expect(screen.getByText('Project X')).toBeInTheDocument()
  })

  it('supports actions menu add/remove/delete flows with explicit-link removal only', async () => {
    const lifeAreaHealth = buildLifeArea('la-1', 'Health', '#ff0000', 'heart')
    const lifeAreaCareer = buildLifeArea('la-2', 'Career', '#00ff00', 'briefcase')
    const lifeAreaLearning = buildLifeArea('la-3', 'Learning', '#0099ff', 'cap')

    const priorityRun = buildPriority('pr-1', 'Run Weekly', ['la-1'], 'flag') // derived via project
    const priorityGrow = buildPriority('pr-2', 'Grow Skills', ['la-2'], 'chart') // explicit
    const priorityRead = buildPriority('pr-3', 'Read Daily', ['la-3'], 'cap')

    const project = buildProject({
      id: 'proj-1',
      name: 'Project X',
      icon: 'layers',
      lifeAreaIds: ['la-2'],
      priorityIds: ['pr-1'],
    })

    const commitment = buildCommitment({
      id: 'c-2',
      name: 'Do the thing',
      projectId: 'proj-1',
      lifeAreaIds: ['la-1'],
      priorityIds: ['pr-2'],
    })

    const { emitted } = render(CommitmentCard, {
      props: {
        commitment,
        availableProjects: [project],
        availableLifeAreas: [lifeAreaHealth, lifeAreaCareer, lifeAreaLearning],
        availablePriorities: [priorityRun, priorityGrow, priorityRead],
      },
      global: { stubs },
    })

    const menuTrigger = screen.getByRole('button', { name: 'Open commitment actions' })

    await fireEvent.click(menuTrigger)
    await fireEvent.click(screen.getByRole('button', { name: 'Add link' }))
    const addPanel = screen.getByText('Life area').closest('div') ?? document.body
    const learningOption = within(addPanel).getAllByText('Learning')[0]
    await fireEvent.click(learningOption)

    const addLifeAreaCalls = emitted('update-life-areas') || []
    expect(addLifeAreaCalls.length).toBeGreaterThan(0)
    expect(addLifeAreaCalls[0]).toEqual(['c-2', ['la-1', 'la-3']])

    await fireEvent.click(menuTrigger)
    await fireEvent.click(screen.getByRole('button', { name: 'Remove link' }))

    expect(screen.queryByText('Run Weekly')).not.toBeInTheDocument()
    await fireEvent.click(screen.getByText('Grow Skills'))

    const removePriorityCalls = emitted('update-priorities') || []
    expect(removePriorityCalls.length).toBeGreaterThan(0)
    expect(removePriorityCalls[0]).toEqual(['c-2', []])

    await fireEvent.click(menuTrigger)
    await fireEvent.click(screen.getByRole('button', { name: 'Delete commitment' }))

    const deleteCalls = emitted('delete') || []
    expect(deleteCalls).toEqual([['c-2']])
  })
})
