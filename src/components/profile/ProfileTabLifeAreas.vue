<template>
  <section
    class="neo-raised"
    style="padding: 24px"
  >
    <!-- Header row -->
    <div class="flex items-start justify-between mb-[14px] gap-[14px]">
      <div class="min-w-0">
        <h3 class="text-base font-bold m-0" style="color: rgb(var(--neo-text))">
          {{ t('profile.lifeAreas.title') }}
        </h3>
        <p
          class="text-[12px] m-0 mt-[2px] max-w-[460px]"
          style="color: rgb(var(--neo-muted))"
        >
          {{ t('profile.lifeAreas.tabDescription') }}
        </p>
      </div>
      <button
        type="button"
        class="neo-control neo-control--accent flex-shrink-0 text-[13px]"
        @click="goToAreas"
      >
        <span class="material-symbols-outlined text-[18px]">edit</span>
        {{ t('common.buttons.manage') }}
      </button>
    </div>

    <!-- Areas grid -->
    <div
      v-if="areas.length > 0"
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[10px]"
    >
      <div
        v-for="(area, index) in areas"
        :key="area.id"
        class="neo-inset flex items-center gap-[10px]"
        style="padding: 12px"
      >
        <span
          class="area-dot flex-shrink-0"
          :style="dotStyle(area, index)"
          aria-hidden="true"
        />
        <div class="flex-1 min-w-0">
          <div
            class="text-[13px] font-bold truncate"
            style="color: rgb(var(--neo-text))"
          >
            {{ area.name }}
          </div>
          <div
            v-if="area.meaning"
            class="text-[11px] truncate"
            style="color: rgb(var(--neo-muted))"
          >
            {{ area.meaning }}
          </div>
        </div>
      </div>
    </div>

    <div
      v-else
      class="text-[13px] py-4 text-center"
      style="color: rgb(var(--neo-muted))"
    >
      {{ t('profile.lifeAreas.noAreas') }}
    </div>

    <!-- Footer summary -->
    <div
      v-if="areas.length > 0"
      class="mt-[14px] flex items-center gap-2 text-[12px]"
      style="color: rgb(var(--neo-muted))"
    >
      <span
        class="material-symbols-outlined text-[16px]"
        style="color: rgb(var(--neo-focus))"
        aria-hidden="true"
      >explore</span>
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
  const newest = [...areas.value].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0]
  return newest?.name ?? ''
})

function dotStyle(area: LifeArea, index: number) {
  if (area.color) {
    return {
      background: area.color,
      boxShadow: `0 0 0 3px ${area.color}2E`,
    }
  }
  const hue = FALLBACK_HUES[index % FALLBACK_HUES.length]
  return {
    background: `oklch(70% 0.13 ${hue})`,
    boxShadow: `0 0 0 3px oklch(70% 0.13 ${hue} / 0.18)`,
  }
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

<style scoped>
.area-dot {
  width: 10px;
  height: 10px;
  border-radius: 9999px;
}
</style>
