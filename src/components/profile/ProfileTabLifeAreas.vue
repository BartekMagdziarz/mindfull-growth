<template>
  <section class="mg-v2-surface mg-v2-surface--raised-sm" style="padding: 24px">
    <!-- Header row -->
    <div class="flex items-start justify-between mb-[14px] gap-[14px]">
      <div class="min-w-0">
        <h3 class="text-base font-bold m-0" style="color: var(--mg-color-ink)">
          {{ t('profile.lifeAreas.title') }}
        </h3>
        <p class="text-mg-xs m-0 mt-[2px] max-w-[460px]" style="color: var(--mg-color-muted)">
          {{ t('profile.lifeAreas.tabDescription') }}
        </p>
      </div>
      <button
        type="button"
        class="mg-v2-button mg-v2-button--primary flex-shrink-0"
        @click="goToAreas"
      >
        <AppIcon class="material-symbols-outlined text-mg-icon-md" name="edit" />
        {{ t('common.buttons.manage') }}
      </button>
    </div>

    <!-- Areas grid -->
    <div v-if="areas.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]">
      <div
        v-for="(area, index) in areas"
        :key="area.id"
        class="mg-v2-block flex items-center gap-[10px]"
        style="padding: 12px"
      >
        <span class="mg-pip mg-pip--lg" :style="dotStyle(area, index)" aria-hidden="true" />
        <div class="flex-1 min-w-0">
          <div class="text-mg-sm font-bold truncate" style="color: var(--mg-color-ink)">
            {{ area.name }}
          </div>
          <div v-if="area.meaning" class="text-mg-xs truncate" style="color: var(--mg-color-muted)">
            {{ area.meaning }}
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-mg-sm py-4 text-center" style="color: var(--mg-color-muted)">
      {{ t('profile.lifeAreas.noAreas') }}
    </div>

    <!-- Footer summary -->
    <div
      v-if="areas.length > 0"
      class="mt-[14px] flex items-center gap-2 text-mg-xs"
      style="color: var(--mg-color-muted)"
    >
      <AppIcon
        class="material-symbols-outlined text-mg-icon-sm"
        style="color: var(--mg-color-primary-strong)"
        aria-hidden="true"
        name="explore"
      />
      <span>
        {{ t('profile.lifeAreas.areasDefined', { n: areas.length }) }}
        <template v-if="recentlyAddedName">
          ·
          {{ t('profile.lifeAreas.recentlyAdded', { name: recentlyAddedName }) }}
        </template>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import AppIcon from '@/components/shared/AppIcon.vue'

import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useT } from '@/composables/useT'
import type { LifeArea } from '@/domain/lifeArea'

const { t } = useT()
const router = useRouter()
const lifeAreaStore = useLifeAreaStore()

// Hues span the wheel evenly per slot so the dots look like a unified palette
// even when areas don't carry their own hex color yet. Picked to roughly match
// the design mock (200, 230, 260, 290, 320, 350).
const FALLBACK_HUES = [200, 230, 260, 290, 320, 350]

const areas = computed<LifeArea[]>(() => lifeAreaStore.activeLifeAreas)

const recentlyAddedName = computed(() => {
  if (areas.value.length === 0) return ''
  const newest = [...areas.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return newest?.name ?? ''
})

function dotStyle(area: LifeArea, index: number) {
  if (area.color) {
    return { '--mg-pip-color': area.color }
  }
  const hue = FALLBACK_HUES[index % FALLBACK_HUES.length]
  return { '--mg-pip-color': `oklch(70% 0.13 ${hue})` }
}

function goToAreas() {
  router.push('/areas')
}

onMounted(async () => {
  if (lifeAreaStore.lifeAreas.length === 0) {
    await lifeAreaStore.loadLifeAreas()
  }
})
</script>

<style scoped></style>
