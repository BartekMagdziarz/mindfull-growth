<template>
  <div class="mx-auto w-full max-w-4xl px-4 py-6 pb-24">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('habits.views.title') }}</h1>
        <p class="text-sm text-on-surface-variant">
          {{ t('habits.views.subtitle') }}
        </p>
      </div>
      <AppButton variant="filled" @click="router.push('/planning/habits/new')">
        {{ t('habits.views.addButton') }}
      </AppButton>
    </div>

    <div v-if="!isLoading && habits.length === 0" class="text-center py-12">
      <p class="text-on-surface-variant mb-4">{{ t('habits.views.emptyState') }}</p>
      <AppButton variant="outlined" @click="router.push('/planning/habits/new')">
        {{ t('habits.views.createFirstButton') }}
      </AppButton>
    </div>

    <div v-else class="space-y-3">
      <AppCard
        v-for="habit in sortedHabits"
        :key="habit.id"
        class="cursor-pointer transition-colors hover:bg-section"
        @click="router.push(`/planning/habits/${habit.id}`)"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-base font-semibold text-on-surface">{{ habit.name }}</h3>
            <p class="text-xs text-on-surface-variant mt-1">
              {{ habit.cadence }} · {{ getTrackerTypeSummary(habit.id) }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              :class="statusBadgeClass(habit)"
            >
              {{ statusLabel(habit) }}
            </span>
            <AppButton
              variant="tonal"
              size="sm"
              @click.stop="toggleStatus(habit)"
            >
              {{ actionLabel(habit) }}
            </AppButton>
          </div>
        </div>
      </AppCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import { useHabitStore } from '@/stores/habit.store'
import { useTrackerStore } from '@/stores/tracker.store'
import { useT } from '@/composables/useT'
import type { Habit } from '@/domain/habit'

const { t } = useT()
const router = useRouter()
const habitStore = useHabitStore()
const trackerStore = useTrackerStore()

const habits = computed(() => habitStore.habits)
const sortedHabits = computed(() => habitStore.sortedHabits)
const isLoading = computed(() => habitStore.isLoading)

onMounted(async () => {
  await Promise.all([
    habitStore.loadHabits(),
    trackerStore.loadTrackers(),
  ])
})

function getTrackerTypeSummary(habitId: string): string {
  const trackers = trackerStore.getTrackersByHabit(habitId)
  if (trackers.length === 0) return t('habits.detail.noTracker')
  const tracker = trackers[0]
  if (tracker.type === 'count') return t('habits.form.trackerTypes.count')
  if (tracker.type === 'adherence') return `${tracker.targetCount ?? 0}x ${t('habits.form.trackerTypes.adherence')}`
  if (tracker.type === 'value') return `${t('habits.form.trackerTypes.value')}${tracker.unit ? ` (${tracker.unit})` : ''}`
  return t(`habits.form.trackerTypes.${tracker.type}`)
}

function statusLabel(habit: Habit): string {
  if (!habit.isActive) return t('habits.detail.status.inactive')
  return habit.isPaused ? t('habits.detail.status.paused') : t('habits.detail.status.active')
}

function statusBadgeClass(habit: Habit): string {
  if (!habit.isActive) return 'bg-outline/10 text-on-surface-variant'
  return habit.isPaused ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
}

function actionLabel(habit: Habit): string {
  if (!habit.isActive) return t('habits.detail.actions.activate')
  return habit.isPaused ? t('habits.detail.actions.resume') : t('habits.detail.actions.pause')
}

async function toggleStatus(habit: Habit) {
  if (!habit.isActive) {
    await habitStore.toggleHabitActive(habit.id, true)
    return
  }
  await habitStore.toggleHabitPaused(habit.id, !habit.isPaused)
}
</script>
