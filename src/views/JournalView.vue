<template>
  <div class="container mx-auto px-4 py-6">
    <AppCard>
      <h2 class="text-2xl font-semibold text-on-surface mb-4">Journal</h2>
      <div v-if="journalStore.isLoading" class="text-on-surface-variant">
        Loading journal entries...
      </div>
      <div
        v-else-if="journalStore.error"
        class="text-error bg-error-container p-4 rounded"
      >
        <p class="font-semibold mb-2">Unable to load journal entries</p>
        <p class="text-sm">{{ journalStore.error }}</p>
        <p class="text-sm mt-2">Please refresh the page.</p>
      </div>
      <div v-else class="text-on-surface-variant">
        <p v-if="journalStore.sortedEntries.length === 0">
          No journal entries yet. This view will contain journal entry functionality.
        </p>
        <p v-else>
          {{ journalStore.sortedEntries.length }} journal
          {{ journalStore.sortedEntries.length === 1 ? 'entry' : 'entries' }}
          loaded.
        </p>
      </div>
    </AppCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import AppCard from '@/components/AppCard.vue'
import { useJournalStore } from '@/stores/journal.store'

const journalStore = useJournalStore()

onMounted(() => {
  journalStore.loadEntries()
})
</script>

