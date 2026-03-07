<template>
  <div class="space-y-2">
    <button
      v-for="area in areas"
      :key="area.id"
      @click="toggle(area.id)"
      :class="[
        'w-full text-left px-4 py-3 rounded-xl border-2 transition-colors',
        selected.includes(area.id)
          ? 'border-primary bg-primary/10 text-on-surface'
          : 'border-neu-border/30 bg-surface text-on-surface hover:bg-section',
      ]"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <EntityIcon
            :icon="area.icon"
            :color="area.color"
            size="sm"
          />
          <span class="font-medium text-sm">{{ area.name }}</span>
        </div>
        <CheckIcon
          v-if="selected.includes(area.id)"
          class="w-5 h-5 text-primary"
        />
      </div>
    </button>
    <p v-if="areas.length === 0" class="text-sm text-on-surface-variant text-center py-4">
      {{ t('lifeAreas.picker.emptyState') }}
      <router-link to="/areas" class="text-primary hover:underline">{{ t('lifeAreas.picker.createFirst') }}</router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import type { LifeArea } from '@/domain/lifeArea'
import { CheckIcon } from '@heroicons/vue/24/outline'
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  areas: LifeArea[]
  selected: string[]
}>()

const emit = defineEmits<{
  toggle: [id: string]
}>()

function toggle(id: string) {
  emit('toggle', id)
}
</script>
