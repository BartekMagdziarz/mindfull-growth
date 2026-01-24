<template>
  <div class="container mx-auto px-4 py-6 pb-24">
    <h1 class="text-2xl font-bold text-on-surface mb-8">Periodic Reflections</h1>

    <div v-if="isLoading" class="text-on-surface-variant text-center py-8">
      Loading periodic entries...
    </div>

    <div v-else-if="error" class="text-error bg-error-container p-4 rounded-xl">
      <p class="font-semibold mb-2">Unable to load periodic entries</p>
      <p class="text-sm">{{ error }}</p>
    </div>

    <div v-else class="space-y-8">
      <PeriodRow
        v-for="periodType in periodTypes"
        :key="periodType"
        :type="periodType"
        :entries="getEntriesByType(periodType)"
        @create="handleCreateEntry"
        @select="handleSelectEntry"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePeriodicEntryStore } from '@/stores/periodicEntry.store'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import PeriodRow from '@/components/periodic/PeriodRow.vue'
import type { PeriodicEntry, PeriodicEntryType } from '@/domain/periodicEntry'

const router = useRouter()
const periodicEntryStore = usePeriodicEntryStore()
const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()

const periodTypes: PeriodicEntryType[] = ['weekly', 'quarterly', 'yearly']

const isLoading = computed(() => periodicEntryStore.isLoading)
const error = computed(() => periodicEntryStore.error)

function getEntriesByType(type: PeriodicEntryType): PeriodicEntry[] {
  return periodicEntryStore.getEntriesByType(type)
}

function handleCreateEntry(type: PeriodicEntryType) {
  router.push(`/periodic/new/${type}`)
}

function handleSelectEntry(entry: PeriodicEntry) {
  router.push(`/periodic/${entry.id}`)
}

onMounted(async () => {
  // Load all data in parallel
  const loadPromises = [periodicEntryStore.loadEntries()]

  // Also load journal entries and emotion logs if not already loaded
  if (journalStore.entries.length === 0) {
    loadPromises.push(journalStore.loadEntries())
  }

  if (emotionLogStore.logs.length === 0) {
    loadPromises.push(emotionLogStore.loadLogs())
  }

  await Promise.all(loadPromises)
})
</script>
