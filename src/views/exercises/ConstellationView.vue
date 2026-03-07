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
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.constellation.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.constellation.subtitle') }}</p>
      </div>
    </div>

    <IFSSafetyBanner class="mb-6" />

    <ConstellationWizard @saved="handleSaved" />

    <!-- Past Constellations -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastConstellations') }}</h2>

      <template v-if="sortedConstellations.length">
        <AppCard
          v-for="entry in sortedConstellations"
          :key="entry.id"
          variant="raised"
          padding="md"
          class="space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(entry.createdAt) }}</span>
            <span class="text-xs text-on-surface-variant">{{ t('exercises.views.partsLabel', { n: entry.selectedPartIds.length }) }}</span>
          </div>

          <!-- Parts -->
          <div class="flex flex-wrap gap-1">
            <span
              v-for="pid in entry.selectedPartIds"
              :key="pid"
              class="neo-pill text-xs px-1.5 py-0.5 bg-primary/10 text-primary"
            >
              {{ getPartName(pid) }}
            </span>
          </div>

          <!-- Relationship summary -->
          <div class="flex gap-3 text-xs text-on-surface-variant">
            <span v-if="countByType(entry, 'polarized')">
              {{ countByType(entry, 'polarized') }} {{ t('exercises.views.polarized') }}
            </span>
            <span v-if="countByType(entry, 'allied')">
              {{ countByType(entry, 'allied') }} {{ t('exercises.views.allied') }}
            </span>
            <span v-if="countByType(entry, 'protector-exile')">
              {{ countByType(entry, 'protector-exile') }} {{ t('exercises.views.protectorExile') }}
            </span>
          </div>

          <!-- Mini SVG preview -->
          <div class="flex justify-center">
            <svg viewBox="0 0 200 200" class="w-40 h-40">
              <!-- Lines -->
              <template v-for="rel in entry.relationships" :key="`mini-${rel.partAId}-${rel.partBId}`">
                <line
                  v-if="rel.type !== 'no-relationship'"
                  :x1="getMiniNodePos(entry.selectedPartIds, rel.partAId).x"
                  :y1="getMiniNodePos(entry.selectedPartIds, rel.partAId).y"
                  :x2="getMiniNodePos(entry.selectedPartIds, rel.partBId).x"
                  :y2="getMiniNodePos(entry.selectedPartIds, rel.partBId).y"
                  :stroke="miniLineColor(rel.type)"
                  stroke-width="1.5"
                  :stroke-dasharray="rel.type === 'protector-exile' ? '4 3' : 'none'"
                />
              </template>
              <!-- Center -->
              <circle cx="100" cy="100" r="14" class="fill-primary/15 stroke-primary" stroke-width="1.5" />
              <text x="100" y="104" text-anchor="middle" class="fill-primary" style="font-size: 9px; font-weight: 600;">{{ t('exercises.views.selfLabel') }}</text>
              <!-- Nodes -->
              <circle
                v-for="pid in entry.selectedPartIds"
                :key="`mini-node-${pid}`"
                :cx="getMiniNodePos(entry.selectedPartIds, pid).x"
                :cy="getMiniNodePos(entry.selectedPartIds, pid).y"
                r="10"
                :class="miniNodeClasses(pid)"
                stroke-width="1.5"
              />
            </svg>
          </div>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noConstellationsYet') }}
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
import ConstellationWizard from '@/components/exercises/ConstellationWizard.vue'
import { useIFSConstellationStore } from '@/stores/ifsConstellation.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSConstellation, IFSConstellationRelationType } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const { t } = useT()
const constellationStore = useIFSConstellationStore()
const partStore = useIFSPartStore()

onMounted(() => {
  constellationStore.loadConstellations()
  partStore.loadParts()
})

const sortedConstellations = computed(() => constellationStore.sortedConstellations)

function handleSaved() {
  constellationStore.loadConstellations()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function countByType(entry: IFSConstellation, type: IFSConstellationRelationType): number {
  return entry.relationships.filter((r) => r.type === type).length
}

// Mini SVG layout
function getMiniNodePos(partIds: string[], partId: string): { x: number; y: number } {
  const idx = partIds.indexOf(partId)
  if (idx === -1) return { x: 100, y: 100 }
  const angle = (2 * Math.PI * idx) / partIds.length - Math.PI / 2
  return {
    x: 100 + 65 * Math.cos(angle),
    y: 100 + 65 * Math.sin(angle),
  }
}

function miniLineColor(type: IFSConstellationRelationType): string {
  switch (type) {
    case 'polarized': return '#f87171'
    case 'allied': return '#60a5fa'
    case 'protector-exile': return '#c084fc'
    default: return '#d1d5db'
  }
}

function miniNodeClasses(partId: string): string {
  const role = partStore.getPartById(partId)?.role ?? 'unknown'
  switch (role) {
    case 'manager': return 'fill-blue-100 stroke-blue-400'
    case 'firefighter': return 'fill-orange-100 stroke-orange-400'
    case 'exile': return 'fill-purple-100 stroke-purple-400'
    default: return 'fill-gray-100 stroke-gray-400'
  }
}
</script>
