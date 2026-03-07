<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
    <div v-if="!habit" class="text-center py-12">
      <p class="text-on-surface-variant">{{ t('habits.detail.notFound') }}</p>
      <AppButton variant="outlined" class="mt-4" @click="router.push('/planning/habits')">
        {{ t('habits.detail.backButton') }}
      </AppButton>
    </div>

    <template v-else>
      <div class="flex items-start justify-between mb-6">
        <div>
          <h1 class="text-xl font-bold text-on-surface">{{ habit.name }}</h1>
          <p class="text-sm text-on-surface-variant">
            {{ habit.cadence }} · {{ statusLabel }}
          </p>
        </div>
        <div class="flex gap-2">
          <AppButton variant="outlined" @click="router.push(`/planning/habits/${habit.id}/edit`)">
            {{ t('habits.detail.editButton') }}
          </AppButton>
          <AppButton variant="text" @click="toggleStatus">
            {{ actionLabel }}
          </AppButton>
        </div>
      </div>

      <div class="space-y-4">
        <!-- Tracker Config Summary -->
        <AppCard v-if="ownedTracker" padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('habits.detail.trackerTitle') }}</h3>
          <div class="flex items-center gap-2 text-sm text-on-surface-variant">
            <span class="capitalize">{{ ownedTracker.type }}</span>
            <span v-if="trackerTargetSummary">· {{ trackerTargetSummary }}</span>
          </div>
        </AppCard>

        <!-- Performance -->
        <AppCard padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-3">{{ t('habits.detail.performanceTitle') }}</h3>

          <div v-if="isLoadingCompliance" class="text-sm text-on-surface-variant">
            {{ t('habits.detail.loading') }}
          </div>
          <div v-else-if="!compliance" class="text-sm text-on-surface-variant">
            {{ t('habits.detail.emptyPerformance', { cadence: habit.cadence === 'weekly' ? t('habits.form.cadenceOptions.weekly') : t('habits.form.cadenceOptions.monthly') }) }}
          </div>
          <template v-else>
            <div class="flex items-center gap-3 mb-3">
              <span class="text-2xl font-bold text-on-surface">
                {{ Math.round(compliance.successRatio * 100) }}%
              </span>
              <span class="text-sm text-on-surface-variant">
                {{ compliance.successCount }}/{{ compliance.totalPeriods }} {{ t('habits.detail.periodsMet') }}
              </span>
            </div>

            <!-- Period bars -->
            <div class="flex items-end gap-1">
              <div
                v-for="period in compliance.periods"
                :key="period.startDate"
                class="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  class="w-full rounded-sm min-h-[4px]"
                  :class="period.isComplete ? 'bg-success' : 'bg-outline/20'"
                  :style="{ height: `${Math.max(4, period.ratio * 32)}px` }"
                />
                <span class="text-[9px] text-on-surface-variant/60">
                  {{ period.label }}
                </span>
              </div>
            </div>
          </template>
        </AppCard>

        <!-- Links -->
        <AppCard padding="lg">
          <h3 class="text-sm font-semibold text-on-surface mb-2">{{ t('habits.detail.linksTitle') }}</h3>
          <div class="space-y-2">
            <div>
              <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">{{ t('habits.detail.lifeAreasLabel') }}</p>
              <div v-if="linkedLifeAreas.length" class="flex flex-wrap gap-2 mt-1">
                <span
                  v-for="lifeArea in linkedLifeAreas"
                  :key="lifeArea.id"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-neu-border/30 bg-neu-base text-on-surface"
                >
                  {{ lifeArea.name }}
                </span>
              </div>
              <p v-else class="text-xs text-on-surface-variant">{{ t('habits.detail.noLifeAreas') }}</p>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-wide text-on-surface-variant">{{ t('habits.detail.prioritiesLabel') }}</p>
              <div v-if="linkedPriorities.length" class="flex flex-wrap gap-2 mt-1">
                <span
                  v-for="priority in linkedPriorities"
                  :key="priority.id"
                  class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-neu-border/30 bg-neu-base text-on-surface"
                >
                  {{ priority.name }}
                </span>
              </div>
              <p v-else class="text-xs text-on-surface-variant">{{ t('habits.detail.noPriorities') }}</p>
            </div>
          </div>
        </AppCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import { useHabitStore } from '@/stores/habit.store'
import { useLifeAreaStore } from '@/stores/lifeArea.store'
import { usePriorityStore } from '@/stores/priority.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useT } from '@/composables/useT'
import { getCurrentYear } from '@/utils/periodUtils'
import {
  computeRollingCompliance,
  type RollingComplianceSummary,
} from '@/services/trackerRollup.service'

const { t } = useT()
const route = useRoute()
const router = useRouter()
const habitStore = useHabitStore()
const lifeAreaStore = useLifeAreaStore()
const priorityStore = usePriorityStore()
const trackerStore = useTrackerStore()

const habitId = computed(() => route.params.id as string)
const habit = computed(() => habitStore.getHabitById(habitId.value))

const ownedTracker = computed(() => {
  const trackers = trackerStore.getTrackersByHabit(habitId.value)
  return trackers.length > 0 ? trackers[0] : undefined
})

const trackerTargetSummary = computed(() => {
  const tracker = ownedTracker.value
  if (!tracker) return ''
  if (tracker.type === 'count') {
    return ''
  }
  if (tracker.type === 'adherence') {
    return t('habits.detail.trackerLabels.countPerPeriod', {
      count: tracker.targetCount ?? 0,
      period: tracker.cadence === 'weekly' ? t('habits.form.cadenceOptions.weekly') : t('habits.form.cadenceOptions.monthly'),
    })
  }
  if (tracker.type === 'value') {
    return t('habits.detail.trackerLabels.valueTarget', {
      target: tracker.targetValue ?? 0,
      unit: tracker.unit ?? '',
    })
  }
  if (tracker.type === 'rating') {
    return t('habits.detail.trackerLabels.ratingScale', {
      min: tracker.ratingScaleMin ?? 1,
      max: tracker.ratingScaleMax ?? 10,
    })
  }
  if (tracker.type === 'checkin') {
    return t('habits.detail.trackerLabels.checkin')
  }
  return ''
})

const linkedLifeAreas = computed(() =>
  (habit.value?.lifeAreaIds ?? [])
    .map((id) => lifeAreaStore.getLifeAreaById(id))
    .filter((x): x is NonNullable<typeof x> => !!x)
)

const linkedPriorities = computed(() =>
  (habit.value?.priorityIds ?? [])
    .map((id) => priorityStore.getPriorityById(id))
    .filter((x): x is NonNullable<typeof x> => !!x)
)

// Performance data
const compliance = ref<RollingComplianceSummary | null>(null)
const isLoadingCompliance = ref(false)

const statusLabel = computed(() => {
  if (!habit.value) return ''
  if (!habit.value.isActive) return t('habits.detail.status.inactive')
  return habit.value.isPaused ? t('habits.detail.status.paused') : t('habits.detail.status.active')
})

const actionLabel = computed(() => {
  if (!habit.value) return ''
  if (!habit.value.isActive) return t('habits.detail.actions.activate')
  return habit.value.isPaused ? t('habits.detail.actions.resume') : t('habits.detail.actions.pause')
})

onMounted(async () => {
  await Promise.all([
    habitStore.loadHabits(),
    trackerStore.loadTrackers(),
    lifeAreaStore.loadLifeAreas(),
    priorityStore.loadPriorities(getCurrentYear()),
  ])

  // Load compliance data
  const tracker = ownedTracker.value
  if (tracker && habit.value) {
    isLoadingCompliance.value = true
    try {
      compliance.value = await computeRollingCompliance(tracker.id, habit.value.cadence)
    } finally {
      isLoadingCompliance.value = false
    }
  }
})

async function toggleStatus() {
  if (!habit.value) return
  if (!habit.value.isActive) {
    await habitStore.toggleHabitActive(habit.value.id, true)
    return
  }
  await habitStore.toggleHabitPaused(habit.value.id, !habit.value.isPaused)
}
</script>
