import { createPinia, setActivePinia } from 'pinia'
import { expect, it } from 'vitest'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useUnifiedEntries } from '../useUnifiedEntries'

it('keeps current groups and intensity for both entry types and reads older word and family selections', () => {
  setActivePinia(createPinia())
  const timestamps = { createdAt: '2026-11-18T12:00:00Z', updatedAt: '2026-11-18T12:00:00Z' }
  useJournalStore().entries = [
    { ...timestamps, id: 'journal', body: '', emotions: [{ emotionId: 'podziw', intensity: 2 }] },
  ]
  useEmotionLogStore().logs = [
    {
      ...timestamps,
      id: 'log',
      emotions: [{ emotionId: 'radosc', intensity: 1 }],
      emotionIds: [],
      emotionFamilyIds: ['radosc'],
    },
    {
      ...timestamps,
      id: 'legacy',
      emotionIds: ['e4m10-happy-028'],
      emotionFamilyIds: ['radosc', 'energia'],
    },
  ]

  const { filteredEntries } = useUnifiedEntries()
  expect(
    Object.fromEntries(filteredEntries.value.map(entry => [entry.id, entry.emotions]))
  ).toEqual({
    journal: [{ emotionId: 'podziw', intensity: 2 }],
    log: [{ emotionId: 'radosc', intensity: 1 }],
    legacy: [{ emotionId: 'radosc', intensity: 5 }, { emotionId: 'ekscytacja' }],
  })
})
