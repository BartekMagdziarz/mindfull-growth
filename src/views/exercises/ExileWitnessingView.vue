<template>
  <ExercisePage
    :title="t('exercises.cards.exileWitnessing.title')"
    :subtitle="t('exercises.cards.exileWitnessing.subtitle')"
  >
    <IFSSafetyBanner class="mb-6" />

    <ExileWitnessingWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="exile-witnessing" @again="saved = false" />

    <!-- Past Witnessings -->
    <div class="mt-10 space-y-4">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastWitnessings') }}</h2></div>

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
            <span class="exercise-pill text-xs px-2 py-0.5 font-semibold" :class="postStateBadgeClass(entry.postSessionState)">
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
              class="exercise-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
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
        {{ tg('exercises.views.noWitnessingsYet') }}
      </p>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import IFSSafetyBanner from '@/components/exercises/ifs/IFSSafetyBanner.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import ExileWitnessingWizard from '@/components/exercises/ExileWitnessingWizard.vue'
import { useIFSExileWitnessingStore } from '@/stores/ifsExileWitnessing.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSExilePostState } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const { t, tg } = useT()
const witnessingStore = useIFSExileWitnessingStore()
const partStore = useIFSPartStore()
const saved = ref(false)

onMounted(() => {
  witnessingStore.loadWitnessings()
  partStore.loadParts()
})

const sortedWitnessings = computed(() => witnessingStore.sortedWitnessings)

function handleSaved() {
  saved.value = true
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
    case 'calmer': return 'bg-status-good-soft text-status-good-on'
    case 'same': return 'bg-neu-base text-on-surface-variant'
    case 'more-distressed': return 'bg-status-warn-soft text-status-warn-on'
    default: return 'bg-neu-base text-on-surface-variant'
  }
}
</script>
