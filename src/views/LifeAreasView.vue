<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('lifeAreas.views.title') }}</h1>
        <p class="text-sm text-on-surface-variant">
          {{ t('lifeAreas.views.subtitle') }}
        </p>
      </div>
      <AppButton variant="filled" @click="router.push('/areas/new')">
        {{ t('lifeAreas.views.addButton') }}
      </AppButton>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && lifeAreas.length === 0" class="text-center py-12">
      <p class="text-on-surface-variant mb-4">
        {{ t('lifeAreas.views.emptyState') }}
      </p>
      <div class="flex gap-3 justify-center">
        <AppButton variant="filled" @click="handleSeedDefaults">
          {{ t('lifeAreas.views.startWithDefaults') }}
        </AppButton>
        <AppButton variant="outlined" @click="router.push('/areas/new')">
          {{ t('lifeAreas.views.createFromScratch') }}
        </AppButton>
      </div>
    </div>

    <!-- Area list -->
    <div v-else class="space-y-3">
      <LifeAreaCard
        v-for="area in sortedAreas"
        :key="area.id"
        :area="area"
        :latest-score="getLatestScore(area.id)"
        @click="router.push(`/areas/${area.id}`)"
      />
    </div>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
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
