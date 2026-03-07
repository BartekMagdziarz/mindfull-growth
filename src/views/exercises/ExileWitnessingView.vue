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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.exileWitnessing.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.exileWitnessing.subtitle') }}</p>
      </div>
    </div>

    <IFSSafetyBanner class="mb-6" />

    <ExileWitnessingWizard @saved="handleSaved" />

    <!-- Past Witnessings -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastWitnessings') }}</h2>

      <template v-if="sortedWitnessings.length">
        <AppCard
          v-for="entry in sortedWitnessings"
          :key="entry.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(entry.createdAt) }}</span>
            <span class="neo-pill text-xs px-2 py-0.5 font-semibold" :class="postStateBadgeClass(entry.postSessionState)">
              {{ postStateLabel(entry.postSessionState) }}
            </span>
          </div>

          <!-- Exile -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.exile') }}</span>
            <span class="text-xs font-medium text-on-surface">{{ getPartName(entry.exilePartId) }}</span>
            <PartRoleBadge role="exile" />
          </div>

          <!-- Protectors -->
          <div v-if="entry.protectorPartIds.length" class="flex items-center gap-1 flex-wrap">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.protectors') }}</span>
            <span
              v-for="pid in entry.protectorPartIds"
              :key="pid"
              class="neo-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ getPartName(pid) }}
            </span>
          </div>

          <!-- Compassion excerpt -->
          <p class="text-xs text-on-surface-variant italic line-clamp-2">
            "{{ entry.compassionMessage }}"
          </p>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noWitnessingsYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import IFSSafetyBanner from '@/components/exercises/ifs/IFSSafetyBanner.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import ExileWitnessingWizard from '@/components/exercises/ExileWitnessingWizard.vue'
import { useIFSExileWitnessingStore } from '@/stores/ifsExileWitnessing.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSExilePostState } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const witnessingStore = useIFSExileWitnessingStore()
const partStore = useIFSPartStore()

onMounted(() => {
  witnessingStore.loadWitnessings()
  partStore.loadParts()
})

const sortedWitnessings = computed(() => witnessingStore.sortedWitnessings)

function handleSaved() {
  witnessingStore.loadWitnessings()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function postStateLabel(state: IFSExilePostState): string {
  switch (state) {
    case 'calmer': return t('exercises.views.postStateCalmer')
    case 'same': return t('exercises.views.postStateSame')
    case 'more-distressed': return t('exercises.views.postStateMoreDistressed')
    default: return state
  }
}

function postStateBadgeClass(state: IFSExilePostState): string {
  switch (state) {
    case 'calmer': return 'bg-green-100 text-green-700'
    case 'same': return 'bg-neu-base text-on-surface-variant'
    case 'more-distressed': return 'bg-orange-100 text-orange-700'
    default: return 'bg-neu-base text-on-surface-variant'
  }
}
</script>
