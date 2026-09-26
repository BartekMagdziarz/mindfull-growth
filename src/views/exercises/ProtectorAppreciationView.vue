<template>
  <ExercisePage
    :title="t('exercises.cards.protectorAppreciation.title')"
    :subtitle="t('exercises.cards.protectorAppreciation.subtitle')"
  >
    <ProtectorAppreciationWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="protector-appreciation" @again="saved = false" />

    <!-- Past Appreciations -->
    <div class="mt-10 space-y-4">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastAppreciations') }}</h2></div>

      <template v-if="sortedAppreciations.length">
        <AppCard
          v-for="entry in sortedAppreciations"
          :key="entry.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(entry.createdAt) }}</span>
            <span class="exercise-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold">
              {{ t('exercises.views.workloadBadge', { n: entry.workloadRating }) }}
            </span>
          </div>

          <!-- Linked part -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.protector') }}</span>
            <span class="text-xs font-medium text-on-surface">{{ getPartName(entry.partId) }}</span>
            <PartRoleBadge v-if="getPartRole(entry.partId)" :role="getPartRole(entry.partId)!" />
          </div>

          <!-- Behaviors -->
          <div v-if="entry.behaviors.length" class="flex flex-wrap gap-1">
            <span
              v-for="b in entry.behaviors.filter(x => x !== 'custom').slice(0, 4)"
              :key="b"
              class="exercise-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ formatProtectorBehavior(b) }}
            </span>
            <span
              v-for="cb in (entry.customBehaviors ?? []).slice(0, 2)"
              :key="cb"
              class="exercise-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ cb }}
            </span>
          </div>

          <p class="text-xs text-on-surface-variant line-clamp-2">
            {{ entry.appreciationLetter }}
          </p>

          <div v-if="entry.commitment" class="flex items-center gap-1">
            <span class="exercise-pill text-xs px-1.5 py-0.5 bg-status-good-soft text-status-good-on">
              {{ t('exercises.views.commitmentSet') }}
            </span>
          </div>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noAppreciationsYet') }}
      </p>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import PartRoleBadge from '@/components/exercises/ifs/PartRoleBadge.vue'
import ProtectorAppreciationWizard from '@/components/exercises/ProtectorAppreciationWizard.vue'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'
import { useIfsLabels } from '@/composables/useIfsLabels'

const { t } = useT()

const { formatProtectorBehavior } = useIfsLabels()
const appreciationStore = useIFSProtectorAppreciationStore()
const partStore = useIFSPartStore()
const saved = ref(false)

onMounted(() => {
  appreciationStore.loadAppreciations()
  partStore.loadParts()
})

const sortedAppreciations = computed(() => appreciationStore.sortedAppreciations)

function handleSaved() {
  saved.value = true
  appreciationStore.loadAppreciations()
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
