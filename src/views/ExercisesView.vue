<template>
  <PageContainer>
    <PageHeader
      :title="t('exercises.title')"
      :description="t('exercises.subtitle')"
    />

    <!-- Tab navigation: the active tab lives in the URL (?tab=) so a refresh
         or a "back to exercises" from a wizard lands on the same category. -->
    <div class="exercises-tabs">
      <DsSegmentedControl
        :label="t('exercises.title')"
        :model-value="activeTab"
        :options="tabs.map((tab) => ({ value: tab.id, label: tab.label }))"
        @update:model-value="setActiveTab"
      />
    </div>

    <!-- Programs ("ścieżki") render from src/data/programCatalog.ts -->
    <div
      v-if="activeTab === 'programs'"
      :id="`exercises-panel-${activeTab}`"
      role="tabpanel"
      :aria-label="activeTabLabel"
      class="mg-v2-tile-grid"
    >
      <ProgramCatalogCard
        v-for="program in PROGRAM_CATALOG"
        :key="program.slug"
        :program="program"
        :enrollment="enrollmentStore.enrollmentForProgram(program.slug)"
      />
    </div>

    <!-- Cards render from the catalog (src/data/exerciseCatalog.ts) -->
    <div
      v-else
      :id="`exercises-panel-${activeTab}`"
      role="tabpanel"
      :aria-label="activeTabLabel"
      class="mg-v2-tile-grid"
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
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useT } from '@/composables/useT'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { DsSegmentedControl } from '@/design-system/components'
import ExerciseCard from '@/components/exercises/ExerciseCard.vue'
import ProgramCatalogCard from '@/components/exercises/ProgramCatalogCard.vue'
import type { ExerciseCatalogCategory } from '@/domain/exerciseCatalog'
import { catalogEntriesForTab } from '@/data/exerciseCatalog'
import { PROGRAM_CATALOG } from '@/data/programCatalog'
import { useExerciseCompletionsStore } from '@/stores/exerciseCompletions.store'
import { useProgramEnrollmentStore } from '@/stores/programEnrollment.store'

const route = useRoute()
const router = useRouter()
const { t, tg } = useT()

const completionsStore = useExerciseCompletionsStore()
const enrollmentStore = useProgramEnrollmentStore()

/** Catalog categories plus the programs ("ścieżki") tab. */
type ExercisesTab = ExerciseCatalogCategory | 'programs'

const TAB_IDS: ExercisesTab[] = ['self-discovery', 'cbt', 'logotherapy', 'ifs', 'micro', 'programs']

function isTab(value: unknown): value is ExercisesTab {
  return typeof value === 'string' && (TAB_IDS as string[]).includes(value)
}

const activeTab = computed<ExercisesTab>(() =>
  isTab(route.query.tab) ? route.query.tab : 'self-discovery',
)

function setActiveTab(tab: ExercisesTab) {
  void router.replace({ query: { ...route.query, tab } })
}

const tabs = computed(() => [
  { id: 'self-discovery' as const, label: t('exercises.tabs.selfDiscovery') },
  { id: 'cbt' as const, label: t('exercises.tabs.cbt') },
  { id: 'logotherapy' as const, label: t('exercises.tabs.logotherapy') },
  { id: 'ifs' as const, label: t('exercises.tabs.ifs') },
  { id: 'micro' as const, label: t('exercises.tabs.micro') },
  { id: 'programs' as const, label: t('exercises.tabs.programs') },
])

const activeTabLabel = computed(
  () => tabs.value.find((tab) => tab.id === activeTab.value)?.label ?? '',
)

const visibleEntries = computed(() =>
  activeTab.value === 'programs' ? [] : catalogEntriesForTab(activeTab.value),
)

// "Last completed" badges come from the unified completion log (one
// query) — the v23 backfill covers pre-log history.
const lastCompletedBySlug = computed(() => completionsStore.latestBySlug)

onMounted(() => {
  void completionsStore.ensureLoaded()
  void enrollmentStore.ensureLoaded()
})
</script>

<style scoped>
/* Flex parent lets the segmented control shrink to equal, content-sized
   segments instead of stretching across the page. */
.exercises-tabs {
  display: flex;
  margin-bottom: var(--mg-space-6);
}
</style>
