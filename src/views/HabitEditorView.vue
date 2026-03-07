<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
    <div class="mb-6">
      <h1 class="text-xl font-bold text-on-surface">
        {{ isEditing ? t('habits.editor.editTitle') : t('habits.editor.newTitle') }}
      </h1>
      <p class="text-sm text-on-surface-variant">
        {{ t('habits.editor.subtitle') }}
      </p>
    </div>

    <AppCard padding="lg">
      <HabitForm
        v-model:form="form"
        :life-areas="lifeAreas"
        :priorities="priorities"
      />

      <div class="flex gap-3 mt-8">
        <AppButton variant="filled" :disabled="!canSave" @click="handleSave">
          {{ isEditing ? t('habits.editor.saveButton') : t('habits.editor.createButton') }}
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
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import AppSnackbar from '@/components/AppSnackbar.vue'
import HabitForm from '@/components/habits/HabitForm.vue'
import type { HabitFormData } from '@/components/habits/HabitForm.vue'
import { useHabitStore } from '@/stores/habit.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useT } from '@/composables/useT'
import { getCurrentYear } from '@/utils/periodUtils'
import type { TrackerType } from '@/domain/planning'

const { t } = useT()
const router = useRouter()
const route = useRoute()
const habitStore = useHabitStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

const isEditing = computed(() => !!route.params.id)
const habitId = computed(() => route.params.id as string | undefined)

const IFS_PREFILL = computed<Record<string, { name: string; cadence: 'weekly' | 'monthly' }>>(() => ({
  'unblending': { name: t('habits.ifsPrefill.unblending'), cadence: 'weekly' },
  'self-energy': { name: t('habits.ifsPrefill.selfEnergy'), cadence: 'weekly' },
  'daily-checkin': { name: t('habits.ifsPrefill.dailyCheckin'), cadence: 'weekly' },
  'protector-checkin': { name: t('habits.ifsPrefill.protectorCheckin'), cadence: 'weekly' },
}))

const form = ref<HabitFormData>({
  name: '',
  cadence: 'weekly',
  lifeAreaIds: [],
  priorityIds: [],
  isActive: true,
  isPaused: false,
  trackerType: 'count',
  targetCount: undefined,
  rollup: 'sum',
})

const lifeAreas = computed(() => lifeAreaStore.sortedLifeAreas)
const priorities = computed(() => priorityStore.priorities)

const canSave = computed(() => form.value.name.trim().length > 0)

onMounted(async () => {
  await Promise.all([
    habitStore.loadHabits(),
    trackerStore.loadTrackers(),
    lifeAreaStore.loadLifeAreas(),
    priorityStore.loadPriorities(getCurrentYear()),
  ])

  if (isEditing.value && habitId.value) {
    const existing = habitStore.getHabitById(habitId.value)
    if (existing) {
      // Load habit fields
      form.value.name = existing.name
      form.value.cadence = existing.cadence
      form.value.lifeAreaIds = [...existing.lifeAreaIds]
      form.value.priorityIds = [...existing.priorityIds]
      form.value.isActive = existing.isActive
      form.value.isPaused = existing.isPaused

      // Load owned tracker config
      const ownedTrackers = trackerStore.getTrackersByHabit(habitId.value)
      if (ownedTrackers.length > 0) {
        const tracker = ownedTrackers[0]
        form.value.trackerType = tracker.type
        form.value.targetCount = tracker.type === 'adherence' ? tracker.targetCount : undefined
        form.value.targetValue = tracker.targetValue
        form.value.baselineValue = tracker.baselineValue
        form.value.direction = tracker.direction
        form.value.unit = tracker.unit
        form.value.ratingScaleMin = tracker.ratingScaleMin
        form.value.ratingScaleMax = tracker.ratingScaleMax
        form.value.rollup = tracker.rollup
      }
    }
  }

  // Apply IFS prefill when creating a new habit from an exercise view
  if (!isEditing.value) {
    const prefillKey = route.query.prefill as string | undefined
    if (prefillKey && IFS_PREFILL.value[prefillKey]) {
      const prefill = IFS_PREFILL.value[prefillKey]
      const customName = route.query.prefillName as string | undefined
      form.value.name = customName || prefill.name
      form.value.cadence = prefill.cadence
    }
  }
})

function buildTrackerData() {
  const targetCount =
    form.value.trackerType === 'adherence' ? form.value.targetCount : undefined

  return {
    name: form.value.name.trim(),
    type: form.value.trackerType as TrackerType,
    cadence: form.value.cadence,
    targetCount,
    targetValue: form.value.targetValue,
    baselineValue: form.value.baselineValue,
    direction: form.value.direction,
    unit: form.value.unit,
    ratingScaleMin: form.value.ratingScaleMin,
    ratingScaleMax: form.value.ratingScaleMax,
    rollup: form.value.rollup,
    sortOrder: 0,
    isActive: true,
  }
}

async function handleSave() {
  if (!canSave.value) return

  try {
    if (isEditing.value && habitId.value) {
      await habitStore.updateHabitWithTracker(
        habitId.value,
        {
          name: form.value.name.trim(),
          cadence: form.value.cadence,
          lifeAreaIds: form.value.lifeAreaIds,
          priorityIds: form.value.priorityIds,
          isActive: form.value.isActive,
          isPaused: form.value.isPaused,
        },
        buildTrackerData(),
      )
      snackbarRef.value?.show(t('habits.editor.successUpdated'))
      router.push(`/planning/habits/${habitId.value}`)
    } else {
      const created = await habitStore.createHabitWithTracker(
        {
          name: form.value.name.trim(),
          cadence: form.value.cadence,
          lifeAreaIds: form.value.lifeAreaIds,
          priorityIds: form.value.priorityIds,
          isActive: form.value.isActive,
          isPaused: form.value.isPaused,
        },
        buildTrackerData(),
      )
      snackbarRef.value?.show(t('habits.editor.successCreated'))
      router.push(`/planning/habits/${created.id}`)
    }
  } catch {
    snackbarRef.value?.show(t('habits.editor.errorSave'))
  }
}
</script>
