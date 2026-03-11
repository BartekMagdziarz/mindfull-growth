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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.selfEnergy.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.selfEnergy.subtitle') }}</p>
      </div>
    </div>

    <SelfEnergyWizard @saved="handleSaved" />

    <!-- Past Check-Ins -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastCheckIns') }}</h2>

      <!-- Summary stats -->
      <template v-if="sortedCheckIns.length">
        <AppCard variant="raised" padding="md" class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm text-on-surface-variant">{{ t('exercises.views.totalCheckIns') }}</span>
            <span class="text-sm font-semibold text-primary">{{ sortedCheckIns.length }}</span>
          </div>

          <!-- Average wheel -->
          <div v-if="averageRatings" class="flex justify-center">
            <SelfEnergyWheel
              :ratings="averageRatings"
              :interactive="false"
              size="sm"
            />
          </div>

          <!-- Strongest / Weakest -->
          <div v-if="averageRatings" class="flex gap-4 text-xs">
            <div>
              <span class="text-on-surface-variant">{{ t('exercises.views.strongest') }}</span>
              <span class="ml-1 font-medium text-green-600 capitalize">{{ strongestC }}</span>
            </div>
            <div>
              <span class="text-on-surface-variant">{{ t('exercises.views.weakest') }}</span>
              <span class="ml-1 font-medium text-amber-600 capitalize">{{ weakestC }}</span>
            </div>
          </div>
        </AppCard>

        <!-- Check-in list -->
        <div class="space-y-2">
          <AppCard
            v-for="checkIn in sortedCheckIns"
            :key="checkIn.id"
            variant="raised"
            padding="sm"
            class="flex items-center justify-between"
          >
            <div class="space-y-0.5 min-w-0">
              <span class="text-sm font-medium text-on-surface">{{ formatDate(checkIn.createdAt) }}</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-on-surface-variant capitalize">
                  {{ t('exercises.views.lowest') }} {{ checkIn.lowestQuality }}
                </span>
                <span class="neo-pill text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700">
                  {{ checkIn.ratings[checkIn.lowestQuality] }}/5
                </span>
              </div>
              <div v-if="checkIn.identifiedPartId" class="flex items-center gap-1">
                <span class="text-xs text-on-surface-variant">{{ t('exercises.views.part') }}</span>
                <span class="text-xs font-medium text-on-surface">{{ getPartName(checkIn.identifiedPartId) }}</span>
              </div>
            </div>
          </AppCard>
        </div>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noCheckInsYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import type { SelfEnergyQuality } from '@/domain/exercises'
import AppCard from '@/components/AppCard.vue'
import SelfEnergyWheel from '@/components/exercises/ifs/SelfEnergyWheel.vue'
import SelfEnergyWizard from '@/components/exercises/SelfEnergyWizard.vue'
import { useIFSSelfEnergyStore } from '@/stores/ifsSelfEnergy.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSTrailheadStore } from '@/stores/ifsTrailhead.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const selfEnergyStore = useIFSSelfEnergyStore()
const partStore = useIFSPartStore()
const trailheadStore = useIFSTrailheadStore()

onMounted(() => {
  selfEnergyStore.loadCheckIns()
  partStore.loadParts()
  trailheadStore.loadEntries()
})

const sortedCheckIns = computed(() => selfEnergyStore.sortedCheckIns)
const averageRatings = computed(() => selfEnergyStore.averageRatings)

const allQualities: SelfEnergyQuality[] = [
  'calm', 'curiosity', 'compassion', 'clarity',
  'courage', 'creativity', 'confidence', 'connection',
]

const strongestC = computed(() => {
  if (!averageRatings.value) return '—'
  let best: SelfEnergyQuality = 'calm'
  let bestVal = 0
  for (const q of allQualities) {
    if (averageRatings.value[q] > bestVal) {
      bestVal = averageRatings.value[q]
      best = q
    }
  }
  return best
})

const weakestC = computed(() => {
  if (!averageRatings.value) return '—'
  let worst: SelfEnergyQuality = 'calm'
  let worstVal = Infinity
  for (const q of allQualities) {
    if (averageRatings.value[q] < worstVal) {
      worstVal = averageRatings.value[q]
      worst = q
    }
  }
  return worst
})

function handleSaved() {
  selfEnergyStore.loadCheckIns()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
