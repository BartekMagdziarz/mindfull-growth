import { createPinia, setActivePinia } from 'pinia'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'

export function initializeStores() {
  const pinia = createPinia()
  setActivePinia(pinia)

  const emotionStore = useEmotionStore()
  const tagStore = useTagStore()
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()

  return {
    pinia,
    emotionStore,
    tagStore,
    journalStore,
    emotionLogStore,
  }
}

export async function loadCoreData() {
  const stores = initializeStores()
  const { emotionStore, tagStore, journalStore, emotionLogStore } = stores

  await emotionStore.loadEmotions()
  await Promise.all([tagStore.loadPeopleTags(), tagStore.loadContextTags()])
  await Promise.all([journalStore.loadEntries(), emotionLogStore.loadLogs()])

  return stores
}


