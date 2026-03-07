<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.trailhead.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.trailhead.subtitle') }}</p>
      </div>
    </div>

    <TrailheadWizard @saved="handleSaved" />

    <!-- Past Entries -->
    <div class="mt-10 space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastEntries') }}</h2>
        <span v-if="sortedEntries.length" class="neo-pill text-xs px-2.5 py-0.5 bg-amber-100 text-amber-700">
          {{ sortedEntries.length !== 1 ? t('exercises.views.trailheadsLoggedPlural', { n: sortedEntries.length }) : t('exercises.views.trailheadsLogged', { n: sortedEntries.length }) }}
        </span>
      </div>

      <template v-if="sortedEntries.length">
        <!-- Timeline -->
        <div class="relative pl-6">
          <!-- Timeline line -->
          <div class="absolute left-2.5 top-0 bottom-0 w-px bg-neu-border/30" />

          <div class="space-y-4">
            <div
              v-for="entry in sortedEntries"
              :key="entry.id"
              class="relative"
            >
              <!-- Timeline dot -->
              <div class="absolute -left-6 top-3 w-5 h-5 rounded-full neo-surface shadow-neu-raised-sm flex items-center justify-center">
                <div class="w-2.5 h-2.5 rounded-full bg-amber-500" />
              </div>

              <AppCard variant="raised" padding="md" class="space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-medium text-on-surface">{{ formatDate(entry.createdAt) }}</span>
                  <span class="neo-pill text-xs px-2 py-0.5 bg-amber-100 text-amber-700 font-semibold">
                    {{ entry.intensity }}/10
                  </span>
                </div>

                <p class="text-sm text-on-surface line-clamp-2">{{ entry.triggerDescription }}</p>

                <!-- Emotion dots -->
                <div v-if="entry.emotionIds.length" class="flex flex-wrap gap-1">
                  <span
                    v-for="eid in entry.emotionIds.slice(0, 4)"
                    :key="eid"
                    class="neo-pill text-xs px-1.5 py-0.5 bg-primary/10 text-primary"
                  >
                    {{ getEmotionName(eid) }}
                  </span>
                  <span v-if="entry.emotionIds.length > 4" class="text-xs text-on-surface-variant">
                    +{{ entry.emotionIds.length - 4 }}
                  </span>
                </div>

                <!-- Intensity bar -->
                <div class="w-full h-1.5 rounded-full bg-neu-border/20">
                  <div
                    class="h-full rounded-full bg-amber-500 transition-all"
                    :style="{ width: `${(entry.intensity / 10) * 100}%` }"
                  />
                </div>

                <!-- Linked part -->
                <div v-if="entry.linkedPartId" class="flex items-center gap-2">
                  <span class="text-xs text-on-surface-variant">{{ t('exercises.views.part') }}</span>
                  <span class="text-xs font-medium text-on-surface">{{ getPartName(entry.linkedPartId) }}</span>
                  <PartRoleBadge v-if="getPartRole(entry.linkedPartId)" :role="getPartRole(entry.linkedPartId)!" />
                </div>
              </AppCard>
            </div>
          </div>
        </div>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noTrailheadsYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import TrailheadWizard from '@/components/exercises/TrailheadWizard.vue'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useEmotionStore } from '@/stores/emotion.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const trailheadStore = useIFSTrailheadStore()
const partStore = useIFSPartStore()
const emotionStore = useEmotionStore()

onMounted(() => {
  trailheadStore.loadEntries()
  partStore.loadParts()
  emotionStore.loadEmotions()
})

const sortedEntries = computed(() => trailheadStore.sortedEntries)

function handleSaved() {
  trailheadStore.loadEntries()
}

function getEmotionName(id: string): string {
  return emotionStore.getEmotionById(id)?.name ?? id
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function getPartRole(id: string) {
  return partStore.getPartById(id)?.role ?? null
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
