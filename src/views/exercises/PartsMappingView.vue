<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <AppIcon name="arrow_back" class="text-2xl" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.partsMapping.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.partsMapping.subtitle') }}</p>
      </div>
    </div>

    <PartsMappingWizard @saved="handleSaved" />

    <!-- Past Maps -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastMaps') }}</h2>

      <template v-if="sortedMaps.length">
        <AppCard
          v-for="map in sortedMaps"
          :key="map.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">
              {{ formatDate(map.createdAt) }}
            </span>
            <div class="flex gap-2">
              <span class="neo-pill text-xs px-2 py-0.5 bg-violet-100 text-violet-700">
                {{ map.partIds.length !== 1 ? t('exercises.views.partsCount', { n: map.partIds.length }) : t('exercises.views.partCount', { n: map.partIds.length }) }}
              </span>
              <span v-if="map.relationships.length" class="neo-pill text-xs px-2 py-0.5 bg-blue-100 text-blue-700">
                {{ map.relationships.length !== 1 ? t('exercises.views.connectionsCount', { n: map.relationships.length }) : t('exercises.views.connectionCount', { n: map.relationships.length }) }}
              </span>
            </div>
          </div>

          <!-- Parts list -->
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="partId in map.partIds"
              :key="partId"
              class="neo-pill text-xs px-2 py-0.5"
              :class="partRoleClass(partId)"
            >
              {{ getPartNameById(partId) }}
            </span>
          </div>

          <p v-if="map.reflection" class="text-xs text-on-surface-variant line-clamp-2">
            {{ map.reflection }}
          </p>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noMapsYet') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import AppCard from '@/components/AppCard.vue'
import PartsMappingWizard from '@/components/exercises/PartsMappingWizard.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const partStore = useIFSPartStore()
const mapStore = useIFSPartsMapStore()
const lifeAreaStore = useLifeAreaStore()

onMounted(() => {
  partStore.loadParts()
  mapStore.loadMaps()
  lifeAreaStore.loadLifeAreas()
})

const sortedMaps = computed(() => mapStore.sortedMaps)

function handleSaved() {
  // Wizard already persisted via composable; reload to refresh
  mapStore.loadMaps()
  partStore.loadParts()
}

function getPartNameById(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function partRoleClass(partId: string): string {
  const part = partStore.getPartById(partId)
  if (!part) return 'bg-neu-base text-on-surface-variant'
  switch (part.role) {
    case 'manager': return 'bg-blue-100 text-blue-700'
    case 'firefighter': return 'bg-orange-100 text-orange-700'
    case 'exile': return 'bg-purple-100 text-purple-700'
    default: return 'bg-neu-base text-on-surface-variant'
  }
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
