/**
 * Commitment Store
 *
 * Pinia store for managing Commitments in the Planning & Reflection System.
 * Commitments are simple done/not-done actionable items linked to Projects
 * or standalone with Priority/Life Area links.
 *
 * This store provides:
 * - State management for Commitments
 * - CRUD operations via the Dexie repository
 * - Status updates
 * - Filtering by plan, project, date range, and period type
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Commitment,
  CommitmentStatus,
  CreateCommitmentPayload,
  UpdateCommitmentPayload,
} from '@/domain/planning'
import { commitmentDexieRepository } from '@/repositories/planningDexieRepository'
import { useTrackerStore } from '@/stores/tracker.store'

export const useCommitmentStore = defineStore('commitment', () => {
  // ============================================================================
  // State
  // ============================================================================

  /** All loaded Commitments */
  const commitments = ref<Commitment[]>([])

  /** Loading state for async operations */
  const isLoading = ref(false)

  /** Error message if an operation fails */
  const error = ref<string | null>(null)

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Sort commitments by createdAt descending
   */
  function sortCommitments(items: Commitment[]): Commitment[] {
    return [...items].sort((a, b) => {
      return b.createdAt.localeCompare(a.createdAt)
    })
  }

  // ============================================================================
  // Getters
  // ============================================================================

  const sortedCommitments = computed(() => {
    return sortCommitments(commitments.value)
  })

  const getCommitmentById = computed(() => {
    return (id: string): Commitment | undefined => {
      return commitments.value.find((c) => c.id === id)
    }
  })

  const getCommitmentsByWeeklyPlanId = computed(() => {
    return (weeklyPlanId: string): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.weeklyPlanId === weeklyPlanId)
      )
    }
  })

  const getCommitmentsByMonthlyPlanId = computed(() => {
    return (monthlyPlanId: string): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.monthlyPlanId === monthlyPlanId)
      )
    }
  })

  const getCommitmentsByProject = computed(() => {
    return (projectId: string): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.projectId === projectId)
      )
    }
  })

  const getCommitmentsByLifeArea = computed(() => {
    return (lifeAreaId: string): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.lifeAreaIds?.includes(lifeAreaId))
      )
    }
  })

  const getCommitmentsByStatus = computed(() => {
    return (status: CommitmentStatus): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.status === status)
      )
    }
  })

  const getCommitmentsByPeriodType = computed(() => {
    return (periodType: 'weekly' | 'monthly'): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.periodType === periodType)
      )
    }
  })

  const getCommitmentsByDateRange = computed(() => {
    return (startDate: string, endDate: string): Commitment[] => {
      return sortCommitments(
        commitments.value.filter((c) => c.startDate >= startDate && c.startDate <= endDate)
      )
    }
  })

  // ============================================================================
  // Actions
  // ============================================================================

  async function loadCommitments(filters?: {
    weeklyPlanId?: string
    monthlyPlanId?: string
    projectId?: string
    lifeAreaId?: string
    startDate?: string
    endDate?: string
    periodType?: 'weekly' | 'monthly'
  }): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      let loadedCommitments: Commitment[]

      if (filters?.weeklyPlanId) {
        loadedCommitments = await commitmentDexieRepository.getByWeeklyPlanId(filters.weeklyPlanId)
      } else if (filters?.monthlyPlanId) {
        loadedCommitments = await commitmentDexieRepository.getByMonthlyPlanId(
          filters.monthlyPlanId
        )
      } else if (filters?.projectId) {
        loadedCommitments = await commitmentDexieRepository.getByProjectId(filters.projectId)
      } else if (filters?.lifeAreaId) {
        loadedCommitments = await commitmentDexieRepository.getByLifeAreaId(filters.lifeAreaId)
      } else if (filters?.startDate && filters?.endDate) {
        loadedCommitments = await commitmentDexieRepository.getByDateRange(
          filters.startDate,
          filters.endDate
        )
      } else if (filters?.periodType) {
        loadedCommitments = await commitmentDexieRepository.getByPeriodType(filters.periodType)
      } else {
        loadedCommitments = await commitmentDexieRepository.getAll()
      }

      commitments.value = loadedCommitments
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load commitments'
      error.value = errorMessage
      console.error('Error loading commitments:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createCommitment(data: CreateCommitmentPayload): Promise<Commitment> {
    error.value = null

    try {
      const newCommitment = await commitmentDexieRepository.create({
        ...data,
        lifeAreaIds: data.lifeAreaIds ?? [],
        priorityIds: data.priorityIds ?? [],
      })
      commitments.value.push(newCommitment)
      return newCommitment
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create commitment'
      error.value = errorMessage
      console.error('Error creating commitment:', err)
      throw err
    }
  }

  async function updateCommitment(
    id: string,
    data: UpdateCommitmentPayload
  ): Promise<Commitment> {
    error.value = null

    try {
      const updatedCommitment = await commitmentDexieRepository.update(id, data)

      const index = commitments.value.findIndex((c) => c.id === id)
      if (index !== -1) {
        commitments.value[index] = updatedCommitment
      }

      return updatedCommitment
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update commitment'
      error.value = errorMessage
      console.error('Error updating commitment:', err)
      throw err
    }
  }

  async function deleteCommitment(id: string): Promise<void> {
    error.value = null

    try {
      // Cascade-delete any tracker attached to this commitment
      const trackerStore = useTrackerStore()
      await trackerStore.deleteTrackersByParent('commitment', id)

      await commitmentDexieRepository.delete(id)
      commitments.value = commitments.value.filter((c) => c.id !== id)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete commitment'
      error.value = errorMessage
      console.error('Error deleting commitment:', err)
      throw err
    }
  }

  async function updateCommitmentStatus(
    id: string,
    status: CommitmentStatus
  ): Promise<Commitment> {
    return updateCommitment(id, { status })
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    commitments,
    isLoading,
    error,

    // Getters
    sortedCommitments,
    getCommitmentById,
    getCommitmentsByWeeklyPlanId,
    getCommitmentsByMonthlyPlanId,
    getCommitmentsByProject,
    getCommitmentsByLifeArea,
    getCommitmentsByStatus,
    getCommitmentsByPeriodType,
    getCommitmentsByDateRange,

    // Actions
    loadCommitments,
    createCommitment,
    updateCommitment,
    deleteCommitment,
    updateCommitmentStatus,
  }
})
