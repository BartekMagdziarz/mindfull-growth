import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/vue'
import CommitmentLinkedObjectsCluster from '../CommitmentLinkedObjectsCluster.vue'
import type { Priority, Project } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'

function lifeArea(id: string, name: string, icon?: string): LifeArea {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name,
    icon,
    color: '#3388ff',
    measures: [],
    reviewCadence: 'monthly',
    isActive: true,
    sortOrder: 0,
  }
}

function priority(id: string, name: string, lifeAreaIds: string[], icon?: string): Priority {
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

function project(id: string, name: string, icon?: string): Project {
  return {
    id,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name,
    icon,
    lifeAreaIds: [],
    priorityIds: [],
    monthIds: [],
    status: 'active',
  }
}

describe('CommitmentLinkedObjectsCluster', () => {
  it('renders more icons when additional linked objects are provided', async () => {
    const la1 = lifeArea('la-1', 'Health', 'heart')
    const la2 = lifeArea('la-2', 'Career', 'briefcase')
    const pr1 = priority('pr-1', 'Run', ['la-1'], 'flag')

    const { rerender, container } = render(CommitmentLinkedObjectsCluster, {
      props: {
        lifeAreas: [la1],
        priorities: [],
      },
    })

    // Collapsed mode renders EntityIcon elements (one per item)
    const compactIcons = container.querySelectorAll('[title]')
    expect(compactIcons).toHaveLength(1)

    await rerender({
      lifeAreas: [la1, la2],
      priorities: [pr1],
      project: project('proj-1', 'Project X', 'layers'),
    })

    const multiIcons = container.querySelectorAll('[title]')
    expect(multiIcons.length).toBeGreaterThan(1)
    // 2 life areas + 1 priority + 1 project = 4 icons
    expect(multiIcons).toHaveLength(4)
  })

  it('dedupes direct and derived links, and supports expand/collapse interactions', async () => {
    const la1 = lifeArea('la-1', 'Health', 'heart')
    const la2 = lifeArea('la-2', 'Career', 'briefcase')
    const pr1 = priority('pr-1', 'Run Weekly', ['la-1'], 'flag')
    const pr2 = priority('pr-2', 'Grow Skills', ['la-2'], 'chart')

    render(CommitmentLinkedObjectsCluster, {
      props: {
        lifeAreas: [la1],
        derivedLifeAreas: [la1, la2],
        priorities: [pr1],
        derivedPriorities: [pr1, pr2],
        project: project('proj-1', 'Project X', 'layers'),
      },
    })

    const toggle = screen.getByRole('button', { name: 'Expand linked objects' })
    await fireEvent.click(toggle)

    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Career')).toBeInTheDocument()
    expect(screen.getByText('Run Weekly')).toBeInTheDocument()
    expect(screen.getByText('Grow Skills')).toBeInTheDocument()
    expect(screen.getByText('Project X')).toBeInTheDocument()

    expect(screen.getAllByText('Health')).toHaveLength(1)
    expect(screen.getAllByText('Run Weekly')).toHaveLength(1)

    await fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Expand linked objects' })).toBeInTheDocument()
    expect(screen.queryByText('Project X')).not.toBeInTheDocument()
  })
})
