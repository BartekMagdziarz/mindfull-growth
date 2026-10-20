import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMicroExerciseEntryStore } from '@/stores/microExerciseEntry.store'
import { momentSeedFrom, type MomentSeed } from './momentSeed'

/**
 * The moment a wizard was launched from (`?momentId=`), as a prefill seed.
 * Null until the entries are loaded or when the route carries no moment.
 */
export function useMomentSeed() {
  const route = useRoute()
  const entryStore = useMicroExerciseEntryStore()
  onMounted(() => {
    if (typeof route.query.momentId === 'string') void entryStore.loadEntries()
  })
  const seed = computed<MomentSeed | null>(() => {
    const id = route.query.momentId
    if (typeof id !== 'string' || !id) return null
    const entry = entryStore.entries.find(candidate => candidate.id === id)
    return entry ? momentSeedFrom(entry) : null
  })
  return { seed, entryStore }
}
