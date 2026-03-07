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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.protectorAppreciation.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.protectorAppreciation.subtitle') }}</p>
      </div>
    </div>

    <ProtectorAppreciationWizard @saved="handleSaved" />

    <!-- Past Appreciations -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastAppreciations') }}</h2>

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
            <span class="neo-pill text-xs px-2 py-0.5 bg-primary/10 text-primary font-semibold">
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
              class="neo-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ b }}
            </span>
            <span
              v-for="cb in (entry.customBehaviors ?? []).slice(0, 2)"
              :key="cb"
              class="neo-pill text-xs px-1.5 py-0.5 bg-neu-base text-on-surface-variant"
            >
              {{ cb }}
            </span>
          </div>

          <p class="text-xs text-on-surface-variant line-clamp-2">
            {{ entry.appreciationLetter }}
          </p>

          <div v-if="entry.commitment" class="flex items-center gap-1">
            <span class="neo-pill text-xs px-1.5 py-0.5 bg-green-100 text-green-700">
              {{ t('exercises.views.commitmentSet') }}
            </span>
          </div>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noAppreciationsYet') }}
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
import ProtectorAppreciationWizard from '@/components/exercises/ProtectorAppreciationWizard.vue'
import { useIFSProtectorAppreciationStore } from '@/stores/ifsProtectorAppreciation.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const appreciationStore = useIFSProtectorAppreciationStore()
const partStore = useIFSPartStore()

onMounted(() => {
  appreciationStore.loadAppreciations()
  partStore.loadParts()
})

const sortedAppreciations = computed(() => appreciationStore.sortedAppreciations)

function handleSaved() {
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
