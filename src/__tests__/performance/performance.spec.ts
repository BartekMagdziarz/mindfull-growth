import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest'
import { performance } from 'node:perf_hooks'
import { resetDatabase } from '../utils/dbTestUtils'
import { db } from '@/repositories/journalDexieRepository'
import { createPinia, setActivePinia } from 'pinia'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useTagStore } from '@/stores/tag.store'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'
import { render, cleanup } from '@testing-library/vue'
import emotionsData from '@/data/emotions.json'

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useRoute: () => ({
    path: '/',
  }),
}))

import JournalView from '@/views/JournalView.vue'

const EMOTION_ID = (emotionsData as { id: string }[])[0].id

async function seedJournalEntries(count: number) {
  const entries: JournalEntry[] = []
  const now = Date.now()
  for (let i = 0; i < count; i++) {
    entries.push({
      id: `entry-${i}`,
      createdAt: new Date(now + i).toISOString(),
      updatedAt: new Date(now + i).toISOString(),
      title: `Entry ${i}`,
      body: `Body for entry ${i}`,
      emotionIds: [],
      peopleTagIds: [],
      contextTagIds: [],
    })
  }
  await db.journalEntries.bulkAdd(entries)
}

describe('Performance benchmarks', () => {
  beforeEach(async () => {
    await resetDatabase()
    setActivePinia(createPinia())
  })

  afterEach(() => {
    cleanup()
  })

  it('loads 150 journal entries in under 1 second', async () => {
    await seedJournalEntries(150)
    const journalStore = useJournalStore()

    const start = performance.now()
    await journalStore.loadEntries()
    const duration = performance.now() - start

    expect(journalStore.entries).toHaveLength(150)
    expect(duration).toBeLessThan(1000)
  })

  it('creates 120 emotion logs in under 5 seconds', async () => {
    const emotionLogStore = useEmotionLogStore()
    const payload: Omit<EmotionLog, 'id' | 'createdAt' | 'updatedAt'> = {
      emotionIds: [EMOTION_ID],
      note: 'Performance log',
      peopleTagIds: [],
      contextTagIds: [],
    }

    const start = performance.now()
    for (let i = 0; i < 120; i++) {
      await emotionLogStore.createLog(payload)
    }
    const duration = performance.now() - start

    expect(duration).toBeLessThan(5000)
    expect(emotionLogStore.logs).toHaveLength(120)
  })

  it('renders JournalView with 120 entries in under 800ms', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const journalStore = useJournalStore()
    const emotionStore = useEmotionStore()
    const tagStore = useTagStore()

    // Preload store state
    const entries: JournalEntry[] = []
    const now = Date.now()
    for (let i = 0; i < 120; i++) {
      entries.push({
        id: `ui-entry-${i}`,
        createdAt: new Date(now + i).toISOString(),
        updatedAt: new Date(now + i).toISOString(),
        title: `UI Entry ${i}`,
        body: `UI Body ${i}`,
        emotionIds: [EMOTION_ID],
        peopleTagIds: [],
        contextTagIds: [],
      })
    }
    journalStore.entries = entries
    journalStore.loadEntries = vi.fn()
    emotionStore.emotions = emotionsData as any
    emotionStore.isLoaded = true
    tagStore.peopleTags = []
    tagStore.contextTags = []

    const start = performance.now()
    const utils = render(JournalView, {
      global: {
        plugins: [pinia],
        stubs: {
          transition: false,
        },
      },
    })
    const duration = performance.now() - start

    expect(duration).toBeLessThan(800)
    utils.unmount()
  })

  it('resolves 200 emotion ids to names in under 200ms', async () => {
    const emotionStore = useEmotionStore()
    await emotionStore.loadEmotions()

    const ids = Array.from({ length: 200 }, () => EMOTION_ID)
    const start = performance.now()
    ids.forEach((id) => {
      emotionStore.getEmotionById(id)
    })
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })

  it('loads 150 tags from Dexie in under 500ms', async () => {
    const peopleTags = []
    for (let i = 0; i < 150; i++) {
      peopleTags.push({ id: `people-${i}`, name: `Person ${i}` })
    }
    await db.peopleTags.bulkAdd(peopleTags)
    const tagStore = useTagStore()

    const start = performance.now()
    await tagStore.loadPeopleTags()
    const duration = performance.now() - start

    expect(tagStore.peopleTags).toHaveLength(150)
    expect(duration).toBeLessThan(500)
  })
})


