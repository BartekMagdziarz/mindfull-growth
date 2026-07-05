<template>
  <PageContainer>
    <div class="mb-6">
      <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.title') }}</h1>
      <p class="text-sm text-on-surface-variant">
        {{ t('exercises.subtitle') }}
      </p>
    </div>

    <!-- Tab Navigation -->
    <div class="mb-6">
      <div
        class="neo-segmented"
        role="tablist"
        aria-label="Exercise category tabs"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="neo-segmented__item neo-focus"
          :class="{ 'neo-segmented__item--active': activeTab === tab.id }"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`exercises-panel-${tab.id}`"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Cards render from the catalog (src/data/exerciseCatalog.ts) -->
    <div
      :id="`exercises-panel-${activeTab}`"
      role="tabpanel"
      :aria-label="activeTabLabel"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <ExerciseCard
        v-for="entry in visibleEntries"
        :key="entry.slug"
        :category="entry.category"
        :title="t(`exercises.cards.${entry.i18nKey}.title`)"
        :subtitle="t(`exercises.cards.${entry.i18nKey}.subtitle`)"
        :description="
          entry.descriptionGendered
            ? tg(`exercises.cards.${entry.i18nKey}.description`)
            : t(`exercises.cards.${entry.i18nKey}.description`)
        "
        :icon="entry.icon"
        :last-completed="lastCompletedBySlug.get(entry.slug)"
        :ai-assisted="entry.aiAssisted"
        @click="router.push(entry.route)"
      />
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import PageContainer from '@/components/layout/PageContainer.vue'
import ExerciseCard from '@/components/exercises/ExerciseCard.vue'
import type { ExerciseCatalogCategory } from '@/domain/exerciseCatalog'
import { catalogEntriesForTab } from '@/data/exerciseCatalog'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'

const router = useRouter()
const { t, tg } = useT()

const completionsStore = useExerciseCompletionsStore()

const activeTab = ref<ExerciseCatalogCategory>('self-discovery')

const tabs = computed(() => [
  { id: 'self-discovery' as const, label: t('exercises.tabs.selfDiscovery') },
  { id: 'cbt' as const, label: t('exercises.tabs.cbt') },
  { id: 'logotherapy' as const, label: t('exercises.tabs.logotherapy') },
  { id: 'ifs' as const, label: t('exercises.tabs.ifs') },
  { id: 'micro' as const, label: t('exercises.tabs.micro') },
])

const activeTabLabel = computed(
  () => tabs.value.find((tab) => tab.id === activeTab.value)?.label ?? '',
)

const visibleEntries = computed(() => catalogEntriesForTab(activeTab.value))

// "Last completed" badges come from the unified completion log (one
// query) — the v23 backfill covers pre-log history.
const lastCompletedBySlug = computed(() => completionsStore.latestBySlug)

onMounted(() => {
  void completionsStore.ensureLoaded()
})
</script>
