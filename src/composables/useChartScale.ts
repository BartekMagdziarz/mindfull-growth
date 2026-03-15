import { ref, computed, watch, type Ref } from 'vue'
import type { PlanningCadence } from '@/domain/planning'

export type ChartScale = 'months' | 'weeks' | 'days'

const STORAGE_PREFIX = 'mg-chart-scale:'

function getAvailableScales(
  objectCadence: PlanningCadence,
  viewScale: 'month' | 'week',
): ChartScale[] {
  if (viewScale === 'month') {
    return objectCadence === 'monthly' ? ['months', 'weeks'] : ['weeks']
  }
  // week view: both cadences get weeks + days
  return ['weeks', 'days']
}

function getDefaultScale(
  objectCadence: PlanningCadence,
  viewScale: 'month' | 'week',
): ChartScale {
  if (viewScale === 'month') {
    return objectCadence === 'monthly' ? 'months' : 'weeks'
  }
  return 'weeks'
}

function loadStoredScale(objectId: string): ChartScale | null {
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + objectId)
    if (stored === 'months' || stored === 'weeks' || stored === 'days') {
      return stored
    }
  } catch {
    // localStorage unavailable
  }
  return null
}

function saveScale(objectId: string, scale: ChartScale): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + objectId, scale)
  } catch {
    // localStorage unavailable
  }
}

export function useChartScale(
  objectId: Ref<string>,
  objectCadence: Ref<PlanningCadence>,
  viewScale: Ref<'month' | 'week'>,
) {
  const availableScales = computed(() =>
    getAvailableScales(objectCadence.value, viewScale.value),
  )

  const defaultScale = computed(() =>
    getDefaultScale(objectCadence.value, viewScale.value),
  )

  const hasToggle = computed(() => availableScales.value.length > 1)

  const currentScale = ref<ChartScale>(
    loadStoredScale(objectId.value) ?? defaultScale.value,
  )

  // Validate stored scale whenever inputs change
  watch(
    availableScales,
    (scales) => {
      if (!scales.includes(currentScale.value)) {
        currentScale.value = defaultScale.value
      }
    },
    { immediate: true },
  )

  function toggle(): void {
    const scales = availableScales.value
    if (scales.length <= 1) return
    const idx = scales.indexOf(currentScale.value)
    currentScale.value = scales[(idx + 1) % scales.length]
    saveScale(objectId.value, currentScale.value)
  }

  function setScale(scale: ChartScale): void {
    if (availableScales.value.includes(scale)) {
      currentScale.value = scale
      saveScale(objectId.value, scale)
    }
  }

  return {
    currentScale,
    availableScales,
    hasToggle,
    defaultScale,
    toggle,
    setScale,
  }
}
