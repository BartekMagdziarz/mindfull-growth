<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="mb-6">
      <h1 class="text-xl font-bold text-on-surface">
        {{ isEditing ? t('lifeAreas.editor.editTitle') : t('lifeAreas.editor.newTitle') }}
      </h1>
    </div>

    <AppCard padding="lg">
      <LifeAreaForm v-model:form="form" />

      <div class="flex gap-3 mt-8">
        <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
          {{ isEditing ? t('lifeAreas.editor.saveButton') : t('lifeAreas.editor.createButton') }}
        </AppButton>
        <AppButton variant="outlined" @click="router.back()">
          {{ t('common.buttons.cancel') }}
        </AppButton>
      </div>
    </AppCard>

    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import LifeAreaForm from '@/components/lifeAreas/LifeAreaForm.vue'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import type { ReviewCadence, LifeAreaMeasure } from '@/domain/lifeArea'
import { useT } from '@/composables/useT'

const { t } = useT()
const router = useRouter()
const route = useRoute()
const lifeAreaStore = useLifeAreaStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isEditing = computed(() => !!route.params.id)

const form = ref<{
  name: string
  icon?: string
  color?: string
  purpose?: string
  maintenanceStandard?: string
  successPicture?: string
  measures: LifeAreaMeasure[]
  constraints?: string[]
  reviewCadence: ReviewCadence
}>({
  name: '',
  icon: undefined,
  color: undefined,
  purpose: undefined,
  maintenanceStandard: undefined,
  successPicture: undefined,
  measures: [],
  constraints: [],
  reviewCadence: 'monthly',
})

const canSave = computed(() => form.value.name.trim().length > 0)

onMounted(async () => {
  await lifeAreaStore.loadLifeAreas()

  if (isEditing.value) {
    const existing = lifeAreaStore.getLifeAreaById(route.params.id as string)
    if (existing) {
      form.value = {
        name: existing.name,
        icon: existing.icon,
        color: existing.color,
        purpose: existing.purpose,
        maintenanceStandard: existing.maintenanceStandard,
        successPicture: existing.successPicture,
        measures: [...existing.measures],
        constraints: existing.constraints ? [...existing.constraints] : [],
        reviewCadence: existing.reviewCadence,
      }
    }
  }
})

async function handleSave() {
  if (!canSave.value) return

  try {
    if (isEditing.value) {
      await lifeAreaStore.updateLifeArea(route.params.id as string, {
        name: form.value.name.trim(),
        icon: form.value.icon || undefined,
        color: form.value.color || undefined,
        purpose: form.value.purpose || undefined,
        maintenanceStandard: form.value.maintenanceStandard || undefined,
        successPicture: form.value.successPicture || undefined,
        measures: form.value.measures.filter((m) => m.name.trim()),
        constraints: form.value.constraints?.filter((c) => c.trim()) || undefined,
        reviewCadence: form.value.reviewCadence,
      })
      snackbarRef.value?.show(t('lifeAreas.editor.updated'))
    } else {
      await lifeAreaStore.createLifeArea({
        name: form.value.name.trim(),
        icon: form.value.icon || undefined,
        color: form.value.color || undefined,
        purpose: form.value.purpose || undefined,
        maintenanceStandard: form.value.maintenanceStandard || undefined,
        successPicture: form.value.successPicture || undefined,
        measures: form.value.measures.filter((m) => m.name.trim()),
        constraints: form.value.constraints?.filter((c) => c.trim()) || undefined,
        reviewCadence: form.value.reviewCadence,
        isActive: true,
        sortOrder: lifeAreaStore.lifeAreas.length,
      })
      snackbarRef.value?.show(t('lifeAreas.editor.created'))
    }

    router.push('/areas')
  } catch {
    snackbarRef.value?.show(t('lifeAreas.editor.saveError'))
  }
}
</script>
