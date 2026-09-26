<template>
  <ExercisePage
    :title="t('exercises.cards.dailyCheckIn.title')"
    :subtitle="t('exercises.cards.dailyCheckIn.subtitle')"
  >
    <!-- Week-in-review -->
    <div class="mb-6 flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5">
        <div
          v-for="day in weekDays"
          :key="day.label"
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
          :class="day.completed
            ? 'bg-primary text-on-primary'
            : day.isToday
              ? 'border-2 border-primary text-primary'
              : 'bg-neu-border/20 text-on-surface-variant'"
        >
          {{ day.label }}
        </div>
      </div>
      <p class="text-sm text-on-surface-variant">
        {{ tp(checkInStore.weeklyCheckInCount, 'exercises.views.checkInsThisWeek.one', 'exercises.views.checkInsThisWeek.few', 'exercises.views.checkInsThisWeek.many') }}
      </p>
    </div>

    <DailyCheckInWizard v-if="!saved" @saved="handleSaved" />
    <ExerciseSavedPanel v-else exercise-slug="daily-ifs-checkin" @again="saved = false" />

    <!-- Past Check-Ins -->
    <div class="mt-10 space-y-4">
      <div class="mg-v2-section-head"><h2>{{ t('exercises.views.pastCheckIns') }}</h2></div>

      <template v-if="sortedCheckIns.length">
        <AppCard
          v-for="entry in sortedCheckIns"
          :key="entry.id"
          variant="raised"
          padding="md"
          class="space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-on-surface">{{ formatDate(entry.createdAt) }}</span>
            <span class="exercise-pill text-xs px-2 py-0.5 font-semibold" :class="practiceTypeBadgeClass(entry.practiceType)">
              {{ practiceTypeLabel(entry.practiceType) }}
            </span>
          </div>

          <!-- Practice-specific summary -->
          <div class="text-xs text-on-surface-variant space-y-1">
            <template v-if="entry.practiceType === 'weather-report' && entry.activeParts?.length">
              <p v-for="ap in entry.activeParts.slice(0, 3)" :key="ap.partId">
                {{ getPartName(ap.partId) }} — {{ ap.intensity }}/10
              </p>
              <p v-if="entry.activeParts.length > 3">+{{ entry.activeParts.length - 3 }} more</p>
            </template>
            <template v-else-if="entry.practiceType === 'gratitude-to-part'">
              <p v-if="entry.gratitudePartId">
                {{ t('exercises.views.thanked') }} {{ getPartName(entry.gratitudePartId) }}
                <span v-if="entry.gratitudeNote"> — {{ entry.gratitudeNote }}</span>
              </p>
            </template>
            <template v-else-if="entry.practiceType === 'self-energy-moment'">
              <p v-if="entry.selfEnergyQuality">{{ t('exercises.views.focusedOn') }} {{ formatQuality(entry.selfEnergyQuality) }}</p>
            </template>
            <template v-else-if="entry.practiceType === 'evening-reflection'">
              <p v-if="entry.selfLeadershipRating">{{ t('exercises.views.leadership') }} {{ formatLeadership(entry.selfLeadershipRating) }}</p>
              <p v-if="entry.appreciationNote">{{ t('exercises.views.appreciated') }} {{ entry.appreciationNote }}</p>
            </template>
          </div>
        </AppCard>
      </template>

      <p v-else class="text-sm text-on-surface-variant">
        {{ t('exercises.views.noCheckInsYetDaily') }}
      </p>
    </div>
  </ExercisePage>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ExercisePage from '@/components/exercises/ExercisePage.vue'
import AppCard from '@/components/AppCard.vue'
import ExerciseSavedPanel from '@/components/exercises/ExerciseSavedPanel.vue'
import DailyCheckInWizard from '@/components/exercises/DailyCheckInWizard.vue'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSDailyCheckInType, IFSSelfLeadershipRating } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { useIfsLabels } from '@/composables/useIfsLabels'
import { getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'

const { t, tp } = useT()

const { formatQuality, weekdayInitials } = useIfsLabels()
const checkInStore = useIFSDailyCheckInStore()
const partStore = useIFSPartStore()
const saved = ref(false)

onMounted(() => {
  checkInStore.loadCheckIns()
  partStore.loadParts()
})

const sortedCheckIns = computed(() => checkInStore.sortedCheckIns)

function handleSaved() {
  saved.value = true
  checkInStore.loadCheckIns()
}

function getPartName(id: string): string {
  return partStore.getPartById(id)?.name ?? t('exercises.views.unknown')
}

function formatDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function practiceTypeLabel(type: IFSDailyCheckInType): string {
  switch (type) {
    case 'weather-report': return t('exercises.views.practiceWeatherReport')
    case 'gratitude-to-part': return t('exercises.views.practiceGratitude')
    case 'self-energy-moment': return t('exercises.views.practiceSelfEnergy')
    case 'evening-reflection': return t('exercises.views.practiceEvening')
    default: return type
  }
}

function practiceTypeBadgeClass(type: IFSDailyCheckInType): string {
  switch (type) {
    case 'weather-report': return 'bg-sky-100 text-sky-700'
    case 'gratitude-to-part': return 'bg-rose-100 text-rose-700'
    case 'self-energy-moment': return 'bg-insight-intention-soft text-insight-intention-on'
    case 'evening-reflection': return 'bg-exercise-ifs-soft text-exercise-ifs-on'
    default: return 'bg-neu-base text-on-surface-variant'
  }
}

function formatLeadership(rating: IFSSelfLeadershipRating): string {
  switch (rating) {
    case 'mostly-self': return t('exercises.views.leadershipMostlySelf')
    case 'mostly-part': return t('exercises.views.leadershipMostlyPart')
    case 'mixed': return t('exercises.views.leadershipMixed')
    default: return rating
  }
}

// Week display
const weekDays = computed(() => {
  const refs = getPeriodRefsForDate(new Date())
  const days = getChildPeriods(refs.week)
  const checkInDates = new Set(
    checkInStore.currentWeekCheckIns.map((c) => getPeriodRefsForDate(c.createdAt).day),
  )

  return days.map((dayRef, idx) => {
    return {
      label: weekdayInitials.value[idx],
      completed: checkInDates.has(dayRef),
      isToday: dayRef === refs.day,
    }
  })
})
</script>
