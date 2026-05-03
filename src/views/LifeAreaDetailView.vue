<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div v-if="!area" class="text-center py-12">
      <p class="text-on-surface-variant">{{ t('lifeAreas.detail.notFound') }}</p>
      <AppButton variant="outlined" class="mt-4" @click="router.push('/areas')">
        {{ t('lifeAreas.detail.backButton') }}
      </AppButton>
    </div>

    <template v-else>
      <!-- Header -->
      <div class="flex items-start justify-between mb-6">
        <div class="flex items-center gap-3">
          <div
            class="w-12 h-12 rounded-full flex items-center justify-center"
            :style="area.color ? { backgroundColor: area.color + '20' } : {}"
            :class="!area.color ? 'bg-primary/10' : ''"
          >
            <EntityIcon
              :icon="area.icon"
              :color="area.color"
              size="lg"
            />
          </div>
          <div>
            <h1 class="text-xl font-bold text-on-surface">{{ area.name }}</h1>
            <p v-if="area.meaning" class="text-sm text-on-surface-variant">
              {{ area.meaning }}
            </p>
          </div>
        </div>
        <div class="flex gap-2">
          <AppButton variant="outlined" @click="router.push(`/areas/${area.id}/edit`)">
            {{ t('lifeAreas.detail.editButton') }}
          </AppButton>
          <AppButton
            v-if="area.isActive"
            variant="text"
            @click="handleArchive"
          >
            {{ t('lifeAreas.detail.archiveButton') }}
          </AppButton>
          <AppButton
            v-else
            variant="text"
            @click="handleReactivate"
          >
            {{ t('lifeAreas.detail.reactivateButton') }}
          </AppButton>
        </div>
      </div>

      <!-- Metadata Cards -->
      <div class="space-y-4">
        <AppCard v-if="area.meaning" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.meaningTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">{{ area.meaning }}</p>
        </AppCard>

        <AppCard v-if="area.desiredState" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.desiredStateTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">{{ area.desiredState }}</p>
        </AppCard>

        <AppCard v-if="area.typicalRisks" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.typicalRisksTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">{{ area.typicalRisks }}</p>
        </AppCard>

        <AppCard v-if="area.reflectionSignals.length > 0" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.detail.reflectionSignalsTitle') }}</h3>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(signal, i) in area.reflectionSignals" :key="i" class="text-sm text-on-surface-variant">
              {{ signal }}
            </li>
          </ul>
        </AppCard>

        <!-- Linked Entities -->
        <AppCard padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-3">{{ t('lifeAreas.detail.linkedDataTitle') }}</h3>
          <LifeAreaLinkedEntities :life-area="area" />
        </AppCard>
      </div>

      <!-- Delete -->
      <div class="mt-8 text-center">
        <button
          v-if="canDeletePermanently"
          @click="handleDelete"
          class="text-sm text-error hover:underline"
        >
          {{ t('lifeAreas.detail.deleteButton') }}
        </button>
        <p
          v-else
          class="text-sm text-on-surface-variant"
        >
          {{ t('lifeAreas.detail.deleteBlockedHistory') }}
        </p>
      </div>
    </template>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import LifeAreaLinkedEntities from '@/components/lifeAreas/LifeAreaLinkedEntities.vue'
import EntityIcon from '@/components/shared/EntityIcon.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useLifeAreaAssessmentStore } from '@/stores/lifeAreaAssessment.store'
import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const route = useRoute()
const lifeAreaStore = useLifeAreaStore()
const lifeAreaAssessmentStore = useLifeAreaAssessmentStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const area = computed(() => lifeAreaStore.getLifeAreaById(route.params.id as string))
const canDeletePermanently = computed(() => {
  if (!area.value) return false
  return !lifeAreaAssessmentStore.hasAssessmentsForLifeArea(area.value.id)
})

onMounted(async () => {
  await Promise.all([
    lifeAreaStore.loadLifeAreas(),
    lifeAreaAssessmentStore.loadAssessments(),
  ])
})

async function handleArchive() {
  if (!area.value) return
  await lifeAreaStore.setLifeAreaActive(area.value.id, false)
  snackbarRef.value?.show(t('lifeAreas.detail.archived'))
}

async function handleReactivate() {
  if (!area.value) return
  await lifeAreaStore.setLifeAreaActive(area.value.id, true)
  snackbarRef.value?.show(t('lifeAreas.detail.reactivated'))
}

async function handleDelete() {
  if (!area.value) return
  if (!canDeletePermanently.value) {
    snackbarRef.value?.show(t('lifeAreas.detail.deleteBlockedHistory'))
    return
  }
  if (!confirm(t('lifeAreas.detail.confirmDelete', { name: area.value.name }))) return

  try {
    await lifeAreaStore.deleteLifeArea(area.value.id)
    router.push('/areas')
  } catch {
    snackbarRef.value?.show(t('lifeAreas.detail.deleteError'))
  }
}
</script>
