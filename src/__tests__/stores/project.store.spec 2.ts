/**
 * Project Store Tests
 *
 * Unit tests for useProjectStore covering:
 * - CRUD operations (load, create, update, delete)
 * - Status updates and completedAt handling
 * - Getter filtering (by month, life area, priority, status, active)
 * - Unlinking commitments on delete
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '@/stores/project.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import {
  connectUserDatabase,
  disconnectUserDatabase,
  getUserDatabase,
} from '@/services/userDatabase.service'
import type { Project } from '@/domain/planning'

async function createTestLifeArea(name = 'Test Life Area') {
  const lifeAreaStore = useLifeAreaStore()
  return lifeAreaStore.createLifeArea({
    name,
    measures: [],
    reviewCadence: 'monthly',
    isActive: true,
    sortOrder: 0,
  })
}

async function createTestPriority(lifeAreaId: string) {
  const priorityStore = usePriorityStore()
  return priorityStore.createPriority({
    lifeAreaIds: [lifeAreaId],
    year: 2026,
    name: 'Test Priority',
    successSignals: [],
    isActive: true,
    sortOrder: 0,
  })
}

async function createProject(payload: Partial<Project> & { lifeAreaIds: string[] }) {
  const projectStore = useProjectStore()
  return projectStore.createProject({
    monthIds: payload.monthIds ?? ['month-1'],
    lifeAreaIds: payload.lifeAreaIds,
    priorityIds: payload.priorityIds ?? [],
    name: payload.name ?? 'Project',
    description: payload.description,
    targetOutcome: payload.targetOutcome,
    status: payload.status ?? 'planned',
  })
}

describe('useProjectStore', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    await connectUserDatabase('test-user-project')

    const db = getUserDatabase()
    await db.lifeAreas.clear()
    await db.priorities.clear()
    await db.projects.clear()
    await db.commitments.clear()
    await db.trackers.clear()
    await db.trackerPeriods.clear()
  })

  afterEach(async () => {
    await disconnectUserDatabase()
  })

  describe('createProject', () => {
    it('creates a project with auto-generated fields', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const created = await projectStore.createProject({
        monthIds: ['month-1'],
        lifeAreaIds: [lifeArea.id],
        priorityIds: [],
        name: 'New Project',
        icon: 'chart',
        status: 'planned',
      })

      expect(created.id).toBeDefined()
      expect(created.createdAt).toBeDefined()
      expect(created.updatedAt).toBeDefined()
      expect(created.monthIds).toEqual(['month-1'])
      expect(created.name).toBe('New Project')
      expect(created.icon).toBe('chart')
      expect(created.status).toBe('planned')

      expect(projectStore.projects).toHaveLength(1)
      expect(projectStore.projects[0].id).toBe(created.id)
    })
  })

  describe('loadProjects', () => {
    it('loads projects filtered by monthId', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      await createProject({ lifeAreaIds: [lifeArea.id], monthIds: ['month-1'], name: 'Month 1' })
      await createProject({ lifeAreaIds: [lifeArea.id], monthIds: ['month-2'], name: 'Month 2' })

      await projectStore.loadProjects({ monthId: 'month-1' })

      expect(projectStore.projects).toHaveLength(1)
      expect(projectStore.projects[0].name).toBe('Month 1')
    })

    it('loads projects filtered by life area', async () => {
      const projectStore = useProjectStore()
      const lifeArea1 = await createTestLifeArea('Life Area A')
      const lifeArea2 = await createTestLifeArea('Life Area B')

      await createProject({ lifeAreaIds: [lifeArea1.id], name: 'A1' })
      await createProject({ lifeAreaIds: [lifeArea2.id], name: 'B1' })

      await projectStore.loadProjects({ lifeAreaId: lifeArea1.id })

      expect(projectStore.projects).toHaveLength(1)
      expect(projectStore.projects[0].name).toBe('A1')
    })

    it('loads projects filtered by priority', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()
      const priority = await createTestPriority(lifeArea.id)

      await createProject({
        lifeAreaIds: [lifeArea.id],
        priorityIds: [priority.id],
        name: 'Priority Project',
      })
      await createProject({
        lifeAreaIds: [lifeArea.id],
        priorityIds: [],
        name: 'Other Project',
      })

      await projectStore.loadProjects({ priorityId: priority.id })

      expect(projectStore.projects).toHaveLength(1)
      expect(projectStore.projects[0].name).toBe('Priority Project')
    })

    it('loads projects filtered by status', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      await createProject({ lifeAreaIds: [lifeArea.id], name: 'Active', status: 'active' })
      await createProject({ lifeAreaIds: [lifeArea.id], name: 'Planned', status: 'planned' })

      await projectStore.loadProjects({ status: 'active' })

      expect(projectStore.projects).toHaveLength(1)
      expect(projectStore.projects[0].name).toBe('Active')
    })
  })

  describe('updateProject', () => {
    it('updates project fields', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const created = await createProject({ lifeAreaIds: [lifeArea.id], name: 'Original' })

      const updated = await projectStore.updateProject(created.id, {
        name: 'Updated',
        icon: 'layers',
        description: 'Details',
      })

      expect(updated.name).toBe('Updated')
      expect(updated.icon).toBe('layers')
      expect(updated.description).toBe('Details')
      expect(projectStore.projects[0].name).toBe('Updated')
    })
  })

  describe('updateProjectStatus', () => {
    it('sets completedAt when status becomes completed', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const created = await createProject({ lifeAreaIds: [lifeArea.id], status: 'active' })
      const updated = await projectStore.updateProjectStatus(created.id, 'completed')

      expect(updated.status).toBe('completed')
      expect(updated.completedAt).toBeDefined()
    })

    it('clears completedAt when status becomes active', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const created = await createProject({ lifeAreaIds: [lifeArea.id], status: 'active' })
      const completed = await projectStore.updateProjectStatus(created.id, 'completed')
      expect(completed.completedAt).toBeDefined()

      const active = await projectStore.updateProjectStatus(created.id, 'active')
      expect(active.completedAt).toBeUndefined()
    })
  })

  describe('deleteProject', () => {
    it('removes project from state and database', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const created = await createProject({ lifeAreaIds: [lifeArea.id] })
      expect(projectStore.projects).toHaveLength(1)

      await projectStore.deleteProject(created.id)

      expect(projectStore.projects).toHaveLength(0)
      const db = getUserDatabase()
      const persisted = await db.projects.get(created.id)
      expect(persisted).toBeUndefined()
    })

    it('unlinks commitments associated with the deleted project', async () => {
      const projectStore = useProjectStore()
      const lifeArea = await createTestLifeArea()

      const project = await createProject({ lifeAreaIds: [lifeArea.id] })

      const db = getUserDatabase()
      await db.commitments.add({
        id: 'c-1',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        startDate: '2026-01-06',
        endDate: '2026-01-12',
        periodType: 'weekly',
        weeklyPlanId: 'week-1',
        projectId: project.id,
        lifeAreaIds: [],
        priorityIds: [],
        name: 'Commitment',
        status: 'planned',
      })

      await projectStore.deleteProject(project.id)

      const updatedCommitment = await db.commitments.get('c-1')
      expect(updatedCommitment?.projectId).toBeUndefined()
    })
  })
})
