<template>
  <ExercisePage
    :title="t('exercises.cards.partsMapping.title')"
    :subtitle="t('exercises.cards.partsMapping.subtitle')"
  >
    <PartsMappingWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="parts-mapping" @again="saved = false" />

    <!-- Past Maps -->
    <div class="mt-10 space-y-4">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastMaps') }}</h2></div>

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
              <span class="neo-pill text-xs px-2 py-0.5 bg-exercise-ifs-soft text-exercise-ifs-on">
                {{ tp(map.partIds.length, 'exercises.views.partCount.one', 'exercises.views.partCount.few', 'exercises.views.partCount.many') }}
              </span>
              <span v-if="map.relationships.length" class="neo-pill text-xs px-2 py-0.5 bg-ifs-manager-soft text-ifs-manager-on">
                {{ tp(map.relationships.length, 'exercises.views.connectionCount.one', 'exercises.views.connectionCount.few', 'exercises.views.connectionCount.many') }}
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
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import PartsMappingWizard from '@/components/exercises/PartsMappingWizard.vue'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import { useIFSPartsMapStore } from '@/stores/ifsPartsMap.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'
import { IFS_ROLE_CLASSES } from '@/constants/exerciseColorRoles'

const { t, tp } = useT()
const partStore = useIFSPartStore()
const mapStore = useIFSPartsMapStore()
const lifeAreaStore = useLifeAreaStore()
const saved = ref(false)

onMounted(() => {
  partStore.loadParts()
  mapStore.loadMaps()
  lifeAreaStore.loadLifeAreas()
})

const sortedMaps = computed(() => mapStore.sortedMaps)

function handleSaved() {
  // Wizard already persisted via composable; reload to refresh
  saved.value = true
  mapStore.loadMaps()
  partStore.loadParts()
}

function getPartNameById(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function partRoleClass(partId: string): string {
  const part = partStore.getPartById(partId)
  if (!part) return 'bg-neu-base text-on-surface-variant'
  const c = IFS_ROLE_CLASSES[part.role]
  return `${c.bg} ${c.text}`
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
