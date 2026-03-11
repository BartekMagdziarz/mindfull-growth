<template>
  <button
    class="w-full text-left"
    @click="$emit('click')"
  >
    <AppCard padding="lg" class="transition-shadow cursor-pointer">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center"
            :style="area.color ? { backgroundColor: area.color + '20' } : {}"
            :class="!area.color ? 'bg-primary/10' : ''"
          >
            <EntityIcon
              :icon="area.icon"
              :color="area.color"
              size="md"
            />
          </div>
          <div>
            <h3 class="text-base font-semibold text-on-surface">{{ area.name }}</h3>
            <p v-if="area.purpose" class="text-xs text-on-surface-variant line-clamp-1">
              {{ area.purpose }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span
            v-if="latestScore !== undefined"
            class="text-xs font-medium px-2 py-1 rounded-full"
            :class="scoreClass"
          >
            {{ t('lifeAreas.card.scoreFormat', { score: latestScore }) }}
          </span>
          <span
            v-if="!area.isActive"
            class="text-xs text-on-surface-variant bg-section px-2 py-1 rounded-full"
          >
            {{ t('lifeAreas.card.archived') }}
          </span>
        </div>
      </div>
      <div v-if="area.maintenanceStandard" class="mt-2">
        <p class="text-sm text-on-surface-variant line-clamp-2">
          {{ area.maintenanceStandard }}
        </p>
      </div>
    </AppCard>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LifeArea } from '@/domain/lifeArea'
import AppCard from '@/components/AppCard.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

const props = defineProps<{
  area: LifeArea
  latestScore?: number
}>()

defineEmits<{
  click: []
}>()

const scoreClass = computed(() => {
  if (props.latestScore === undefined) return ''
  if (props.latestScore >= 7) return 'bg-green-100 text-green-700'
  if (props.latestScore >= 4) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
})
</script>
