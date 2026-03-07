/**
 * Project Store
 *
 * Pinia store for managing Projects in the Planning & Reflection System.
 * Projects are multi-week initiatives tied to Life Areas and optionally to Priorities.
 * Projects can be linked to multiple monthly plans via monthIds.
 *
 * This store provides:
 * - State management for Projects
 * - CRUD operations via the Dexie repository
 * - Status transitions with completedAt management
 * - Validation of Life Area and Priority links
 * - Unlinking commitments when a project is deleted
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Project,
  ProjectStatus,
  CreateProjectPayload,
  UpdateProjectPayload,
} from '@/domain/planning'
import {
  projectDexieRepository,
  commitmentDexieRepository,
} from '@/repositories/planningDexieRepository'
import { useLifeAreaStore } from './lifeArea.store'
import { usePriorityStore } from './priority.store'

export const useProjectStore = defineStore('project', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded Projects */
  const projects = ref<Project[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  /**
   * Returns Projects sorted by createdAt (descending)
   * This ensures consistent ordering in the UI with most recent first
   */
  const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt)
    })
  })

  /**
   * Returns a function to find a Project by ID
   * Usage: store.getProjectById('some-id')
   */
  const getProjectById = computed(() => {
    return (id: string): Project | undefined => {
      return projects.value.find((p) => p.id === id)
    }
  })

  /**
   * Returns a function to filter Projects by month ID
   * Usage: store.getProjectsByMonthId('month-plan-id')
   */
  const getProjectsByMonthId = computed(() => {
    return (monthId: string): Project[] => {
      return projects.value
        .filter((p) => p.monthIds.includes(monthId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  })

  /**
   * Returns a function to filter Projects by multiple month IDs
   * Usage: store.getProjectsByMonthIds(['month-1', 'month-2'])
   */
  const getProjectsByMonthIds = computed(() => {
    return (monthIds: string[]): Project[] => {
      const monthIdSet = new Set(monthIds)
      return projects.value
        .filter((p) => p.monthIds.some((id) => monthIdSet.has(id)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  })

  /**
   * Returns a function to filter Projects by Life Area
   * Usage: store.getProjectsByLifeArea('life-area-id')
   */
  const getProjectsByLifeArea = computed(() => {
    return (lifeAreaId: string): Project[] => {
      return projects.value
        .filter((p) => p.lifeAreaIds?.includes(lifeAreaId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  })

  /**
   * Returns a function to filter Projects by Priority
   * Usage: store.getProjectsByPriority('priority-id')
   */
  const getProjectsByPriority = computed(() => {
    return (priorityId: string): Project[] => {
      return projects.value
        .filter((p) => p.priorityIds?.includes(priorityId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  })

  /**
   * Returns a function to filter Projects by status
   * Usage: store.getProjectsByStatus('active')
   */
  const getProjectsByStatus = computed(() => {
    return (status: ProjectStatus): Project[] => {
      return projects.value
        .filter((p) => p.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
  })

  /**
   * Returns Projects with status 'planned' or 'active'
   * These are the projects that are currently being worked on or about to start
   */
  const getActiveProjects = computed(() => {
    return projects.value
      .filter((p) => p.status === 'planned' || p.status === 'active')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  /**
   * Returns non-terminal Projects (active, planned, or paused)
   * Used for auto-suggesting carry-forward projects in monthly planning
   */
  const getNonTerminalProjects = computed(() => {
    return projects.value
      .filter((p) => p.status !== 'completed' && p.status !== 'abandoned')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load Projects from the database
   * @param filters - Optional filters to apply
   *   - monthId: Filter by month plan ID
   *   - lifeAreaId: Filter by life area
   *   - priorityId: Filter by priority (client-side)
   *   - status: Filter by status
   */
  async function loadProjects(filters?: {
    monthId?: string
    lifeAreaId?: string
    priorityId?: string
    status?: ProjectStatus
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loadedProjects: Project[]

      // Use repository methods for indexed filters
      if (filters?.lifeAreaId) {
        loadedProjects = await projectDexieRepository.getByLifeAreaId(filters.lifeAreaId)
      } else if (filters?.status) {
        loadedProjects = await projectDexieRepository.getByStatus(filters.status)
      } else {
        loadedProjects = await projectDexieRepository.getAll()
      }

      // Apply client-side filters
      if (filters?.monthId) {
        loadedProjects = loadedProjects.filter((p) => p.monthIds.includes(filters.monthId!))
      }
      if (filters?.priorityId) {
        loadedProjects = loadedProjects.filter((p) => p.priorityIds?.includes(filters.priorityId!))
      }

      projects.value = loadedProjects
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects'
      error.value = errorMessage
      console.error('Error loading projects:', err)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Validate that linked Life Areas and Priorities exist
   */
  async function validateLinks(
    lifeAreaIds: string[],
    priorityIds: string[]
  ): Promise<void> {
    const lifeAreaStore = useLifeAreaStore()
    const priorityStore = usePriorityStore()

    // Ensure life areas are loaded
    if (lifeAreaStore.lifeAreas.length === 0) {
      await lifeAreaStore.loadLifeAreas()
    }

    for (const lifeAreaId of lifeAreaIds) {
      const lifeArea = lifeAreaStore.getLifeAreaById(lifeAreaId)
      if (!lifeArea) {
        throw new Error(`Life Area with id ${lifeAreaId} not found`)
      }
    }

    if (priorityIds.length > 0) {
      if (priorityStore.priorities.length === 0) {
        await priorityStore.loadPriorities()
      }

      for (const priorityId of priorityIds) {
        const priority = priorityStore.getPriorityById(priorityId)
        if (!priority) {
          throw new Error(`Priority with id ${priorityId} not found`)
        }
      }
    }
  }

  /**
   * Create a new Project
   * @param data - Project data (without id, createdAt, updatedAt)
   * @returns The created Project
   */
  async function createProject(data: CreateProjectPayload): Promise<Project> {
    error.value = null

    try {
      // Validate links
      const lifeAreaIds = data.lifeAreaIds ?? []
      const priorityIds = data.priorityIds ?? []
      const focusWeekIds = data.focusWeekIds ?? []
      const focusMonthIds = data.focusMonthIds ?? []
      await validateLinks(lifeAreaIds, priorityIds)

      const newProject = await projectDexieRepository.create({
        ...data,
        lifeAreaIds,
        priorityIds,
        focusWeekIds,
        focusMonthIds,
      })
      projects.value.push(newProject)
      return newProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create project'
      error.value = errorMessage
      console.error('Error creating project:', err)
      throw err
    }
  }

  /**
   * Update an existing Project
   * @param id - The Project ID
   * @param data - Partial Project data to update
   * @returns The updated Project
   */
  async function updateProject(id: string, data: UpdateProjectPayload): Promise<Project> {
    error.value = null

    try {
      // If link arrays are being updated, validate links
      const existing = projects.value.find((p) => p.id === id)
      if (!existing) {
        throw new Error(`Project with id ${id} not found`)
      }

      const nextLifeAreaIds = data.lifeAreaIds ?? existing.lifeAreaIds ?? []
      const nextPriorityIds = data.priorityIds ?? existing.priorityIds ?? []

      // Only validate if lifeAreaIds or priorityIds are changing
      if (data.lifeAreaIds !== undefined || data.priorityIds !== undefined) {
        await validateLinks(nextLifeAreaIds, nextPriorityIds)
      }

      const updatedProject = await projectDexieRepository.update(id, data)

      // Update local state
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      return updatedProject
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update project'
      error.value = errorMessage
      console.error('Error updating project:', err)
      throw err
    }
  }

  /**
   * Delete a Project
   * When a project is deleted, linked commitments are unlinked (projectId set to undefined)
   * rather than being deleted.
   * @param id - The Project ID
   */
  async function deleteProject(id: string): Promise<void> {
    error.value = null

    try {
      // First, unlink all commitments that reference this project
      const linkedCommitments = await commitmentDexieRepository.getByProjectId(id)
      for (const commitment of linkedCommitments) {
        await commitmentDexieRepository.update(commitment.id, { projectId: undefined })
      }

      // Delete associated trackers (and their periods) via the tracker store
      const { useTrackerStore } = await import('./tracker.store')
      const trackerStore = useTrackerStore()
      await trackerStore.deleteTrackersByParent('project', id)

      // Delete the Project
      await projectDexieRepository.delete(id)

      // Update local state
      projects.value = projects.value.filter((p) => p.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project'
      error.value = errorMessage
      console.error('Error deleting project:', err)
      throw err
    }
  }

  /**
   * Update a Project's status with proper completedAt management
   * - When status becomes 'completed' or 'abandoned', set completedAt
   * - When status becomes 'planned', 'active', or 'paused', clear completedAt
   * @param id - The Project ID
   * @param status - The new status
   * @returns The updated Project
   */
  async function updateProjectStatus(id: string, status: ProjectStatus): Promise<Project> {
    error.value = null

    try {
      const updateData: UpdateProjectPayload = { status }

      // Manage completedAt based on status
      if (status === 'completed' || status === 'abandoned') {
        updateData.completedAt = new Date().toISOString()
      } else {
        // For 'planned', 'active', 'paused' - clear completedAt
        updateData.completedAt = undefined
      }

      const updatedProject = await projectDexieRepository.update(id, updateData)

      // Update local state
      const index = projects.value.findIndex((p) => p.id === id)
      if (index !== -1) {
        projects.value[index] = updatedProject
      }

      return updatedProject
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update project status'
      error.value = errorMessage
      console.error('Error updating project status:', err)
      throw err
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    projects,
    isLoading,
    error,

    // Getters
    sortedProjects,
    getProjectById,
    getProjectsByMonthId,
    getProjectsByMonthIds,
    getProjectsByLifeArea,
    getProjectsByPriority,
    getProjectsByStatus,
    getActiveProjects,
    getNonTerminalProjects,

    // Actions
    loadProjects,
    createProject,
    updateProject,
    deleteProject,
    updateProjectStatus,
  }
})
