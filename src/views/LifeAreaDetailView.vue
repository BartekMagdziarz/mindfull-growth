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
            <p v-if="area.purpose" class="text-sm text-on-surface-variant">
              {{ area.purpose }}
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
        <AppCard v-if="area.maintenanceStandard" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.maintenanceTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">{{ area.maintenanceStandard }}</p>
        </AppCard>

        <AppCard v-if="area.successPicture" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.successPictureTitle') }}</h3>
          <p class="text-sm text-on-surface-variant">{{ area.successPicture }}</p>
        </AppCard>

        <AppCard v-if="area.measures.length > 0" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.detail.measuresTitle') }}</h3>
          <div class="space-y-1">
            <div v-for="(m, i) in area.measures" :key="i" class="flex items-center gap-2 text-sm">
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="m.type === 'leading' ? 'bg-primary-soft text-primary-strong' : 'bg-green-100 text-green-700'"
              >
                {{ m.type }}
              </span>
              <span class="text-on-surface">{{ m.name }}</span>
            </div>
          </div>
        </AppCard>

        <AppCard v-if="area.constraints && area.constraints.length > 0" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('lifeAreas.detail.constraintsTitle') }}</h3>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="(c, i) in area.constraints" :key="i" class="text-sm text-on-surface-variant">
              {{ c }}
            </li>
          </ul>
        </AppCard>

        <AppCard padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.reviewCadenceTitle') }}</h3>
          <p class="text-sm text-on-surface-variant capitalize">{{ area.reviewCadence }}</p>
        </AppCard>

        <AppCard padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-1">{{ t('lifeAreas.detail.baselineTitle') }}</h3>
          <p v-if="latestNarrative" class="text-sm text-on-surface-variant">
            {{ latestNarrative }}
          </p>
          <p v-else class="text-sm text-on-surface-variant">
            {{ t('lifeAreas.detail.notSet') }}
          </p>
          <p v-if="latestNarrative && latestNarrativeSource" class="mt-2 text-xs text-on-surface-variant">
            {{ t('lifeAreas.detail.fromSource', { source: latestNarrativeSource }) }}
          </p>
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
          @click="handleDelete"
          class="text-sm text-error hover:underline"
        >
          {{ t('lifeAreas.detail.deleteButton') }}
        </button>
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
import EntityIcon from '@/components/planning/EntityIcon.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { useYearlyPlanStore } from '@/stores/yearlyPlan.store'
import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const route = useRoute()
const lifeAreaStore = useLifeAreaStore()
const yearlyPlanStore = useYearlyPlanStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const area = computed(() => lifeAreaStore.getLifeAreaById(route.params.id as string))
const latestNarrativePlan = computed(() => {
  if (!area.value) return null
  const plans = yearlyPlanStore.yearlyPlans.filter((plan) =>
    plan.focusLifeAreaIds.includes(area.value!.id)
  )
  if (plans.length === 0) return null
  return plans.sort((a, b) => {
    const startCompare = b.startDate.localeCompare(a.startDate)
    if (startCompare !== 0) return startCompare
    return b.updatedAt.localeCompare(a.updatedAt)
  })[0]
})

const latestNarrative = computed(() => {
  if (!area.value || !latestNarrativePlan.value) return ''
  return latestNarrativePlan.value.lifeAreaNarratives?.[area.value.id]?.trim() || ''
})

const latestNarrativeSource = computed(() => {
  if (!latestNarrativePlan.value) return ''
  return latestNarrativePlan.value.name || `${latestNarrativePlan.value.year}`
})

onMounted(async () => {
  await Promise.all([
    lifeAreaStore.loadLifeAreas(),
    yearlyPlanStore.loadYearlyPlans(),
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
  if (!confirm(t('lifeAreas.detail.confirmDelete', { name: area.value.name }))) return

  try {
    await lifeAreaStore.deleteLifeArea(area.value.id)
    router.push('/areas')
  } catch {
    snackbarRef.value?.show(t('lifeAreas.detail.deleteError'))
  }
}
</script>
