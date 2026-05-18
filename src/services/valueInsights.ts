import type { useValueMapStore } from '@/stores/valueMap.store'
import type { useValuesDiscoveryStore } from '@/stores/valuesDiscovery.store'

type ValueMapStore = ReturnType<typeof useValueMapStore>
type ValuesDiscoveryStore = ReturnType<typeof useValuesDiscoveryStore>

export function getLatestCoreValuesFromStores(
  valueMapStore: ValueMapStore,
  valuesDiscoveryStore: ValuesDiscoveryStore,
): string[] {
  const valueMapValues = valueMapStore.latestMap?.coreValues ?? []
  if (valueMapValues.length > 0) return valueMapValues
  return valuesDiscoveryStore.latestDiscovery?.coreValues ?? []
}
