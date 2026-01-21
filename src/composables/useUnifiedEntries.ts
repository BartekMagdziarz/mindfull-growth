import { computed, ref } from 'vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import type { UnifiedEntry } from '@/domain/unifiedEntry'

export type DateRangeFilter = 'all' | 'today' | 'week' | 'month'
export type SortOrder = 'asc' | 'desc'
export type TypeFilter = 'all' | 'journal' | 'emotion-log'

export function useUnifiedEntries() {
  const journalStore = useJournalStore()
  const emotionLogStore = useEmotionLogStore()

  const typeFilter = ref<TypeFilter>('all')
  const dateRange = ref<DateRangeFilter>('all')
  const sortOrder = ref<SortOrder>('desc')

  // Convert journal entries to unified format
  const journalAsUnified = computed<UnifiedEntry[]>(() => {
    return journalStore.entries.map((entry) => ({
      id: entry.id,
      type: 'journal' as const,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      title: entry.title,
      body: entry.body,
      chatSessions: entry.chatSessions,
      emotionIds: entry.emotionIds ?? [],
      peopleTagIds: entry.peopleTagIds ?? [],
      contextTagIds: entry.contextTagIds ?? [],
    }))
  })

  // Convert emotion logs to unified format
  const emotionLogsAsUnified = computed<UnifiedEntry[]>(() => {
    return emotionLogStore.logs.map((log) => ({
      id: log.id,
      type: 'emotion-log' as const,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
      note: log.note,
      emotionIds: log.emotionIds,
      peopleTagIds: log.peopleTagIds ?? [],
      contextTagIds: log.contextTagIds ?? [],
    }))
  })

  // Merge all entries
  const allEntries = computed<UnifiedEntry[]>(() => {
    return [...journalAsUnified.value, ...emotionLogsAsUnified.value]
  })

  // Apply filters and sorting
  const filteredEntries = computed<UnifiedEntry[]>(() => {
    let entries = [...allEntries.value]

    // Type filter
    if (typeFilter.value !== 'all') {
      entries = entries.filter((e) => e.type === typeFilter.value)
    }

    // Date range filter
    if (dateRange.value !== 'all') {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      let cutoffDate: Date
      switch (dateRange.value) {
        case 'today':
          cutoffDate = startOfDay
          break
        case 'week':
          cutoffDate = new Date(startOfDay)
          cutoffDate.setDate(cutoffDate.getDate() - 7)
          break
        case 'month':
          cutoffDate = new Date(startOfDay)
          cutoffDate.setMonth(cutoffDate.getMonth() - 1)
          break
        default:
          cutoffDate = new Date(0)
      }

      entries = entries.filter((e) => new Date(e.createdAt) >= cutoffDate)
    }

    // Sort
    entries.sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return sortOrder.value === 'desc' ? diff : -diff
    })

    return entries
  })

  const isLoading = computed(() => journalStore.isLoading || emotionLogStore.isLoading)
  const error = computed(() => journalStore.error || emotionLogStore.error)

  async function loadAllEntries() {
    await Promise.all([journalStore.loadEntries(), emotionLogStore.loadLogs()])
  }

  async function deleteEntry(entry: UnifiedEntry) {
    if (entry.type === 'journal') {
      await journalStore.deleteEntry(entry.id)
    } else {
      await emotionLogStore.deleteLog(entry.id)
    }
  }

  return {
    typeFilter,
    dateRange,
    sortOrder,
    filteredEntries,
    isLoading,
    error,
    loadAllEntries,
    deleteEntry,
  }
}
