<template>
  <AppCard padding="lg" class="space-y-4">
    <button
      type="button"
      class="w-full flex items-center justify-between"
      @click="isExpanded = !isExpanded"
    >
      <h2 class="text-lg font-semibold text-on-surface flex items-center gap-2">
        <DocumentTextIcon class="w-5 h-5 text-primary" />
        Entries This Period
        <span class="text-sm font-normal text-on-surface-variant">
          ({{ journalCount }} journal, {{ emotionCount }} emotion)
        </span>
      </h2>
      <ChevronDownIcon
        class="w-5 h-5 text-on-surface-variant transition-transform duration-200"
        :class="{ 'rotate-180': isExpanded }"
      />
    </button>

    <Transition name="expand">
      <div v-if="isExpanded" class="space-y-4 pt-2">
        <!-- Empty State -->
        <p
          v-if="journalCount === 0 && emotionCount === 0"
          class="text-sm text-on-surface-variant text-center py-4"
        >
          No entries for this period
        </p>

        <!-- Journal Entries -->
        <div v-if="journalEntries.length > 0">
          <h3 class="text-sm font-medium text-on-surface-variant mb-2">
            Journal Entries
          </h3>
          <div class="space-y-2">
            <div
              v-for="entry in journalEntries"
              :key="entry.id"
              class="p-3 rounded-xl bg-section/50 border border-outline/20"
            >
              <div class="flex items-center justify-between mb-1">
                <span class="font-medium text-on-surface truncate">
                  {{ entry.title || 'Untitled entry' }}
                </span>
                <span class="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                  {{ formatDate(entry.createdAt) }}
                </span>
              </div>
              <p class="text-sm text-on-surface-variant line-clamp-2">
                {{ entry.body }}
              </p>
            </div>
          </div>
        </div>

        <!-- Emotion Logs -->
        <div v-if="emotionLogs.length > 0">
          <h3 class="text-sm font-medium text-on-surface-variant mb-2">
            Emotion Logs
          </h3>
          <div class="space-y-2">
            <div
              v-for="log in emotionLogs"
              :key="log.id"
              class="p-3 rounded-xl bg-section/50 border border-outline/20"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="emotionId in log.emotionIds"
                    :key="emotionId"
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="getEmotionClasses(emotionId)"
                  >
                    {{ getEmotionName(emotionId) }}
                  </span>
                </div>
                <span class="text-xs text-on-surface-variant flex-shrink-0 ml-2">
                  {{ formatDate(log.createdAt) }}
                </span>
              </div>
              <p v-if="log.note" class="text-sm text-on-surface-variant">
                {{ log.note }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </AppCard>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { DocumentTextIcon, ChevronDownIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import { useJournalStore } from '@/stores/journal.store'
import { useEmotionLogStore } from '@/stores/emotionLog.store'
import { useEmotionStore } from '@/stores/emotion.store'
import type { JournalEntry } from '@/domain/journal'
import type { EmotionLog } from '@/domain/emotionLog'

const props = defineProps<{
  journalEntryIds: string[]
  emotionLogIds: string[]
}>()

const journalStore = useJournalStore()
const emotionLogStore = useEmotionLogStore()
const emotionStore = useEmotionStore()

const isExpanded = ref(false)

const journalCount = computed(() => props.journalEntryIds.length)
const emotionCount = computed(() => props.emotionLogIds.length)

const journalEntries = computed<JournalEntry[]>(() => {
  return props.journalEntryIds
    .map((id) => journalStore.entries.find((e) => e.id === id))
    .filter((e): e is JournalEntry => !!e)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const emotionLogs = computed<EmotionLog[]>(() => {
  return props.emotionLogIds
    .map((id) => emotionLogStore.logs.find((l) => l.id === id))
    .filter((l): l is EmotionLog => !!l)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function getEmotionName(emotionId: string): string {
  return emotionStore.getEmotionById(emotionId)?.name ?? 'Unknown'
}

function getEmotionClasses(emotionId: string): string {
  const emotion = emotionStore.getEmotionById(emotionId)
  if (!emotion) return 'bg-section text-on-surface-variant'

  const isHighEnergy = emotion.energy > 5
  const isHighPleasantness = emotion.pleasantness > 5

  if (isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-high-energy-high-pleasantness text-on-surface'
  } else if (isHighEnergy && !isHighPleasantness) {
    return 'bg-quadrant-high-energy-low-pleasantness text-on-surface'
  } else if (!isHighEnergy && isHighPleasantness) {
    return 'bg-quadrant-low-energy-high-pleasantness text-on-surface'
  } else {
    return 'bg-quadrant-low-energy-low-pleasantness text-on-surface'
  }
}
</script>

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
