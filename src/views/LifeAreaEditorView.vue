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
  meaning?: string
  desiredState?: string
  typicalRisks?: string
  reflectionSignals: string[]
}>({
  name: '',
  icon: undefined,
  color: undefined,
  meaning: undefined,
  desiredState: undefined,
  typicalRisks: undefined,
  reflectionSignals: [],
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
        meaning: existing.meaning,
        desiredState: existing.desiredState,
        typicalRisks: existing.typicalRisks,
        reflectionSignals: [...existing.reflectionSignals],
      }
    }
  }
})

function cleanOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : undefined
}

function cleanReflectionSignals(signals: string[]): string[] {
  return signals.map((signal) => signal.trim()).filter((signal) => signal.length > 0)
}

async function handleSave() {
  if (!canSave.value) return

  try {
    const payload = {
      name: form.value.name.trim(),
      icon: form.value.icon || undefined,
      color: form.value.color || undefined,
      meaning: cleanOptionalText(form.value.meaning),
      desiredState: cleanOptionalText(form.value.desiredState),
      typicalRisks: cleanOptionalText(form.value.typicalRisks),
      reflectionSignals: cleanReflectionSignals(form.value.reflectionSignals),
    }

    if (isEditing.value) {
      await lifeAreaStore.updateLifeArea(route.params.id as string, payload)
      snackbarRef.value?.show(t('lifeAreas.editor.successUpdated'))
    } else {
      await lifeAreaStore.createLifeArea({
        ...payload,
        isActive: true,
        sortOrder: lifeAreaStore.lifeAreas.length,
      })
      snackbarRef.value?.show(t('lifeAreas.editor.successCreated'))
    }

    router.push('/areas')
  } catch {
    snackbarRef.value?.show(t('lifeAreas.editor.errorSave'))
  }
}
</script>
