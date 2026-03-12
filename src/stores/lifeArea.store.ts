/**
 * Life Area Store
 *
 * Pinia store for managing Life Areas — persistent, profile-level life dimensions.
 * Life Areas are the canonical source for area names used across
 * Wheel of Life exercises and related profile flows.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LifeArea, CreateLifeAreaPayload, UpdateLifeAreaPayload } from '@/domain/lifeArea'
import { DEFAULT_LIFE_AREAS } from '@/domain/lifeArea'
import { lifeAreaDexieRepository } from '@/repositories/lifeAreaDexieRepository'
import { lifeAreaAssessmentDexieRepository } from '@/repositories/lifeAreaAssessmentDexieRepository'
import { getDefaultIconIdByLifeAreaName } from '@/constants/entityIconCatalog'

export const useLifeAreaStore = defineStore('lifeArea', () => {
  // ============================================================================
  // State
  // ============================================================================

  const lifeAreas = ref<LifeArea[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // ============================================================================
  // Getters
  // ============================================================================

  const sortedLifeAreas = computed(() => {
    return [...lifeAreas.value].sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const activeLifeAreas = computed(() => {
    return lifeAreas.value
      .filter((la) => la.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  })

  const getLifeAreaById = computed(() => {
    return (id: string): LifeArea | undefined => {
      return lifeAreas.value.find((la) => la.id === id)
    }
  })

  const getLifeAreaNames = computed(() => {
    return activeLifeAreas.value.map((la) => la.name)
  })

  // ============================================================================
  // Actions
  // ============================================================================

  async function loadLifeAreas(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      lifeAreas.value = await lifeAreaDexieRepository.getAll()
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load life areas'
      error.value = errorMessage
      console.error('Error loading life areas:', err)
    } finally {
      isLoading.value = false
    }
  }

  async function createLifeArea(data: CreateLifeAreaPayload): Promise<LifeArea> {
    error.value = null

    try {
      const newLifeArea = await lifeAreaDexieRepository.create(data)
      lifeAreas.value.push(newLifeArea)
      return newLifeArea
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create life area'
      error.value = errorMessage
      console.error('Error creating life area:', err)
      throw err
    }
  }

  async function updateLifeArea(
    id: string,
    data: UpdateLifeAreaPayload,
  ): Promise<LifeArea> {
    error.value = null

    try {
      const updatedLifeArea = await lifeAreaDexieRepository.update(id, data)

      const index = lifeAreas.value.findIndex((la) => la.id === id)
      if (index !== -1) {
        lifeAreas.value[index] = updatedLifeArea
      }

      return updatedLifeArea
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to update life area'
      error.value = errorMessage
      console.error('Error updating life area:', err)
      throw err
    }
  }

  async function deleteLifeArea(id: string): Promise<void> {
    error.value = null

    const linkedAssessments = await lifeAreaAssessmentDexieRepository.getByLifeArea(id)
    if (linkedAssessments.length > 0) {
      const message = 'Cannot permanently delete a life area with assessment history'
      error.value = message
      throw new Error(message)
    }

    try {
      await lifeAreaDexieRepository.delete(id)
      lifeAreas.value = lifeAreas.value.filter((la) => la.id !== id)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to delete life area'
      error.value = errorMessage
      console.error('Error deleting life area:', err)
      throw err
    }
  }

  async function reorderLifeAreas(idsInOrder: string[]): Promise<void> {
    error.value = null

    try {
      const updatePromises = idsInOrder.map((id, index) =>
        lifeAreaDexieRepository.update(id, { sortOrder: index }),
      )

      const updatedLifeAreas = await Promise.all(updatePromises)

      for (const updated of updatedLifeAreas) {
        const index = lifeAreas.value.findIndex((la) => la.id === updated.id)
        if (index !== -1) {
          lifeAreas.value[index] = updated
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to reorder life areas'
      error.value = errorMessage
      console.error('Error reordering life areas:', err)
      throw err
    }
  }

  async function setLifeAreaActive(id: string, isActive: boolean): Promise<LifeArea> {
    return updateLifeArea(id, { isActive })
  }

  async function hasAssessmentHistory(id: string): Promise<boolean> {
    const linkedAssessments = await lifeAreaAssessmentDexieRepository.getByLifeArea(id)
    return linkedAssessments.length > 0
  }

  /**
   * Seed default life areas for a new user.
   * Only creates areas if none exist.
   */
  async function seedDefaultAreas(): Promise<void> {
    if (lifeAreas.value.length > 0) return

    for (let i = 0; i < DEFAULT_LIFE_AREAS.length; i++) {
      await createLifeArea({
        name: DEFAULT_LIFE_AREAS[i],
        icon: getDefaultIconIdByLifeAreaName(DEFAULT_LIFE_AREAS[i]),
        measures: [],
        reviewCadence: 'monthly',
        isActive: true,
        sortOrder: i,
      })
    }
  }

  // ============================================================================
  // Return Store API
  // ============================================================================

  return {
    // State
    lifeAreas,
    isLoading,
    error,

    // Getters
    sortedLifeAreas,
    activeLifeAreas,
    getLifeAreaById,
    getLifeAreaNames,

    // Actions
    loadLifeAreas,
    createLifeArea,
    updateLifeArea,
    deleteLifeArea,
    reorderLifeAreas,
    setLifeAreaActive,
    hasAssessmentHistory,
    seedDefaultAreas,
  }
})
