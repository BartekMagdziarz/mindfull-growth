<template>
  <PageContainer>
    <PageHeader
      :eyebrow="t('common.nav.profile')"
      :title="t('lifeAreas.views.title')"
      :description="t('lifeAreas.views.subtitle')"
      :back-to="{ name: 'profile' }"
    >
      <template #actions>
        <AppButton variant="filled" @click="router.push('/areas/new')">
          {{ t('lifeAreas.views.addButton') }}
        </AppButton>
      </template>
    </PageHeader>

    <!-- Empty State -->
    <DsState
      v-if="!isLoading && lifeAreas.length === 0"
      icon="donut_small"
      :title="t('lifeAreas.views.emptyState')"
    >
      <template #actions>
        <div class="flex gap-3 justify-center">
          <AppButton variant="filled" @click="handleSeedDefaults">
            {{ t('lifeAreas.views.startWithDefaults') }}
          </AppButton>
          <AppButton variant="outlined" @click="router.push('/areas/new')">
            {{ t('lifeAreas.views.createFromScratch') }}
          </AppButton>
        </div>
      </template>
    </DsState>

    <!-- Area list -->
    <div v-else class="mg-v2-tile-grid">
      <LifeAreaCard
        v-for="area in sortedAreas"
        :key="area.id"
        :area="area"
        :latest-score="getLatestScore(area.id)"
        @click="router.push(`/areas/${area.id}`)"
      />
    </div>

    <AppSnackbar ref="snackbarRef" />
  </PageContainer>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import PageContainer from '@/components/layout/PageContainer.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { DsState } from '@/design-system/components'
import AppSnackbar from '@/components/AppSnackbar.vue'
import LifeAreaCard from '@/components/lifeAreas/LifeAreaCard.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const lifeAreaStore = useLifeAreaStore()
const assessmentStore = useLifeAreaAssessmentStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const lifeAreas = computed(() => lifeAreaStore.lifeAreas)
const isLoading = computed(() => lifeAreaStore.isLoading)
const sortedAreas = computed(() => lifeAreaStore.sortedLifeAreas)

onMounted(async () => {
  await Promise.all([
    lifeAreaStore.loadLifeAreas(),
    assessmentStore.loadAssessments(),
  ])
})

function getLatestScore(lifeAreaId: string): number | undefined {
  const latest = assessmentStore.latestFullAssessment
  if (!latest) return undefined
  return latest.items.find((item) => item.lifeAreaId === lifeAreaId)?.score
}

async function handleSeedDefaults() {
  try {
    await lifeAreaStore.seedDefaultAreas()
    snackbarRef.value?.show(t('lifeAreas.views.defaultsCreated'))
  } catch {
    snackbarRef.value?.show(t('lifeAreas.views.defaultsError'))
  }
}
</script>
