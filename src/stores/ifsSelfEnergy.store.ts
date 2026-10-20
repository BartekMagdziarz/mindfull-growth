import { defineStore } from 'pinia'
import { computed } from 'vue'
import type {
  IFSSelfEnergyCheckIn,
  CreateIFSSelfEnergyPayload,
  UpdateIFSSelfEnergyPayload,
  SelfEnergyQuality,
} from '@/domain/exercises'
import { ifsSelfEnergyDexieRepository } from '@/repositories/exercisesDexieRepository'
import { useExerciseCollection } from './_exerciseCollection'

const ALL_QUALITIES: SelfEnergyQuality[] = [
  'calm',
  'curiosity',
  'compassion',
  'clarity',
  'courage',
  'creativity',
  'confidence',
  'connection',
]

export const useIFSSelfEnergyStore = defineStore('ifsSelfEnergy', () => {
  const checkIns = useExerciseCollection<
    IFSSelfEnergyCheckIn,
    CreateIFSSelfEnergyPayload,
    UpdateIFSSelfEnergyPayload
  >({
    repository: ifsSelfEnergyDexieRepository,
    label: 'self-energy check-in',
    scope: 'ifsSelfEnergyStore',
    completionSlug: 'self-energy',
  })

  const hasEnoughForReview = computed(() => checkIns.items.value.length >= 14)

  const averageRatings = computed(() => {
    if (checkIns.items.value.length === 0) return null
    const totals: Record<string, number> = {}
    const counts: Record<string, number> = {}
    for (const q of ALL_QUALITIES) {
      totals[q] = 0
      counts[q] = 0
    }
    for (const checkIn of checkIns.items.value) {
      for (const q of ALL_QUALITIES) {
        const val = checkIn.ratings[q]
        if (val != null) {
          totals[q] += val
          counts[q]++
        }
      }
    }
    const result = {} as Record<SelfEnergyQuality, number>
    for (const q of ALL_QUALITIES) {
      result[q as SelfEnergyQuality] = counts[q] > 0 ? totals[q] / counts[q] : 0
    }
    return result
  })

  return {
    checkIns: checkIns.items,
    isLoading: checkIns.isLoading,
    error: checkIns.error,
    sortedCheckIns: checkIns.sorted,
    latestCheckIn: checkIns.latest,
    getCheckInById: checkIns.getById,
    hasEnoughForReview,
    averageRatings,
    loadCheckIns: checkIns.loadAll,
    createCheckIn: checkIns.create,
    updateCheckIn: checkIns.update,
    deleteCheckIn: checkIns.remove,
    reset: checkIns.reset,
  }
})
