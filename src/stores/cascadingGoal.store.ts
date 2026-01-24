import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CascadingGoal,
  CreateCascadingGoalPayload,
  UpdateCascadingGoalPayload,
} from '@/domain/lifeSeasons'
import type { PeriodicEntryType } from '@/domain/periodicEntry'
import { cascadingGoalDexieRepository } from '@/repositories/cascadingGoalDexieRepository'

export const useCascadingGoalStore = defineStore('cascadingGoal', () => {
  // State
  const goals = ref<CascadingGoal[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const sortedGoals = computed(() => {
    return [...goals.value].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })
  })

  const activeGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.status === 'active')
  })

  const completedGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.status === 'completed')
  })

  const deferredGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.status === 'deferred')
  })

  const droppedGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.status === 'dropped')
  })

  const yearlyGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.sourcePeriodType === 'yearly')
  })

  const quarterlyGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.sourcePeriodType === 'quarterly')
  })

  const weeklyGoals = computed(() => {
    return sortedGoals.value.filter((g) => g.sourcePeriodType === 'weekly')
  })

  // Helper to get goals by period type
  function getGoalsByPeriodType(type: PeriodicEntryType): CascadingGoal[] {
    return sortedGoals.value.filter((g) => g.sourcePeriodType === type)
  }

  // Helper to get goals by source entry
  function getGoalsBySourceEntry(entryId: string): CascadingGoal[] {
    return sortedGoals.value.filter((g) => g.sourceEntryId === entryId)
  }

  // Helper to get child goals of a parent
  function getChildGoals(parentId: string): CascadingGoal[] {
    return sortedGoals.value.filter((g) => g.parentGoalId === parentId)
  }

  // Helper to get parent goal
  function getParentGoal(goalId: string): CascadingGoal | undefined {
    const goal = goals.value.find((g) => g.id === goalId)
    if (!goal?.parentGoalId) return undefined
    return goals.value.find((g) => g.id === goal.parentGoalId)
  }

  // Helper to get entire goal hierarchy (all ancestors)
  function getGoalHierarchy(goalId: string): CascadingGoal[] {
    const hierarchy: CascadingGoal[] = []
    let currentGoal = goals.value.find((g) => g.id === goalId)

    while (currentGoal) {
      hierarchy.unshift(currentGoal)
      if (currentGoal.parentGoalId) {
        currentGoal = goals.value.find((g) => g.id === currentGoal!.parentGoalId)
      } else {
        currentGoal = undefined
      }
    }

    return hierarchy
  }

  // Actions
  async function loadGoals() {
    isLoading.value = true
    error.value = null
    try {
      goals.value = await cascadingGoalDexieRepository.getAll()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load cascading goals'
      error.value = errorMessage
      console.error('Error loading cascading goals:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createGoal(payload: CreateCascadingGoalPayload): Promise<CascadingGoal> {
    error.value = null
    try {
      const newGoal = await cascadingGoalDexieRepository.create(payload)
      goals.value.push(newGoal)

      // Update parent's childGoalIds in memory
      if (payload.parentGoalId) {
        const parentIndex = goals.value.findIndex((g) => g.id === payload.parentGoalId)
        if (parentIndex !== -1) {
          goals.value[parentIndex] = {
            ...goals.value[parentIndex],
            childGoalIds: [...goals.value[parentIndex].childGoalIds, newGoal.id],
          }
        }
      }

      return newGoal
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create cascading goal'
      error.value = errorMessage
      console.error('Error creating cascading goal:', err)
      throw err
    }
  }

  async function updateGoal(
    id: string,
    updates: UpdateCascadingGoalPayload
  ): Promise<CascadingGoal> {
    error.value = null
    try {
      const updatedGoal = await cascadingGoalDexieRepository.update(id, updates)

      // Update in-memory state
      const index = goals.value.findIndex((g) => g.id === id)
      if (index !== -1) {
        goals.value[index] = updatedGoal
      }

      return updatedGoal
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update cascading goal'
      error.value = errorMessage
      console.error('Error updating cascading goal:', err)
      throw err
    }
  }

  async function completeGoal(id: string): Promise<CascadingGoal> {
    return updateGoal(id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    })
  }

  async function deferGoal(id: string): Promise<CascadingGoal> {
    return updateGoal(id, { status: 'deferred' })
  }

  async function dropGoal(id: string): Promise<CascadingGoal> {
    return updateGoal(id, { status: 'dropped' })
  }

  async function reactivateGoal(id: string): Promise<CascadingGoal> {
    return updateGoal(id, { status: 'active', completedAt: undefined })
  }

  async function deleteGoal(id: string): Promise<void> {
    error.value = null
    try {
      // Get the goal to check for parent
      const goal = goals.value.find((g) => g.id === id)

      await cascadingGoalDexieRepository.delete(id)

      // Remove from parent's childGoalIds in memory
      if (goal?.parentGoalId) {
        const parentIndex = goals.value.findIndex((g) => g.id === goal.parentGoalId)
        if (parentIndex !== -1) {
          goals.value[parentIndex] = {
            ...goals.value[parentIndex],
            childGoalIds: goals.value[parentIndex].childGoalIds.filter((cid) => cid !== id),
          }
        }
      }

      goals.value = goals.value.filter((g) => g.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete cascading goal'
      error.value = errorMessage
      console.error('Error deleting cascading goal:', err)
      throw err
    }
  }

  async function getGoalById(id: string): Promise<CascadingGoal | undefined> {
    error.value = null
    try {
      // Check in-memory goals first
      const inMemoryGoal = goals.value.find((g) => g.id === id)
      if (inMemoryGoal) {
        return inMemoryGoal
      }

      // Fall back to repository
      return await cascadingGoalDexieRepository.getById(id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : `Failed to retrieve goal with id ${id}`
      error.value = errorMessage
      console.error(`Error retrieving goal with id ${id}:`, err)
      throw err
    }
  }

  return {
    // State
    goals,
    isLoading,
    error,
    // Getters
    sortedGoals,
    activeGoals,
    completedGoals,
    deferredGoals,
    droppedGoals,
    yearlyGoals,
    quarterlyGoals,
    weeklyGoals,
    getGoalsByPeriodType,
    getGoalsBySourceEntry,
    getChildGoals,
    getParentGoal,
    getGoalHierarchy,
    // Actions
    loadGoals,
    createGoal,
    updateGoal,
    completeGoal,
    deferGoal,
    dropGoal,
    reactivateGoal,
    deleteGoal,
    getGoalById,
  }
})
