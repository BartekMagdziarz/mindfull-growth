<template>
  <div class="period-row">
    <h2 class="text-lg font-semibold text-on-surface mb-4">{{ typeLabel }}</h2>

    <div class="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <!-- Create New Card -->
      <button
        type="button"
        class="flex-shrink-0 w-36 h-44 rounded-2xl border-2 border-dashed border-primary/40 bg-surface hover:bg-section hover:border-primary transition-all duration-200 flex flex-col items-center justify-center gap-3 cursor-pointer focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-background"
        @click="$emit('create', type)"
        :aria-label="`Create new ${typeLabel.toLowerCase()} entry`"
      >
        <div
          class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <PlusIcon class="w-6 h-6 text-primary" />
        </div>
        <span class="text-sm font-medium text-primary">New</span>
      </button>

      <!-- Existing Entry Cards -->
      <PeriodEntryCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        @click="$emit('select', entry)"
      />

      <!-- Empty State (when no entries) -->
      <div
        v-if="entries.length === 0"
        class="flex-shrink-0 flex items-center justify-center px-4 text-on-surface-variant text-sm"
      >
        No {{ typeLabel.toLowerCase() }} entries yet
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import PeriodEntryCard from './PeriodEntryCard.vue'
import { getTypeLabel } from '@/utils/periodUtils'
import type { PeriodicEntry, PeriodicEntryType } from '@/domain/periodicEntry'

const props = defineProps<{
  type: PeriodicEntryType
  entries: PeriodicEntry[]
}>()

defineEmits<{
  create: [type: PeriodicEntryType]
  select: [entry: PeriodicEntry]
}>()

const typeLabel = computed(() => getTypeLabel(props.type))
</script>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
