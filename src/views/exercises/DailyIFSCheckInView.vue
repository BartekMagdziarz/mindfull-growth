<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-6 pb-24">
    <div class="flex items-center gap-4 mb-6">
      <button
        class="neo-back-btn p-2 text-neu-text neo-focus"
        @click="router.push('/exercises')"
      >
        <ArrowLeftIcon class="w-6 h-6" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-on-surface">{{ t('exercises.cards.dailyCheckIn.title') }}</h1>
        <p class="text-sm text-on-surface-variant">{{ t('exercises.cards.dailyCheckIn.subtitle') }}</p>
      </div>
    </div>

    <!-- Week-in-review -->
    <div class="mb-6 flex flex-col items-center gap-2">
      <div class="flex items-center gap-1.5">
        <div
          v-for="day in weekDays"
          :key="day.label"
          class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
          :class="day.completed
            ? 'bg-primary text-white'
            : day.isToday
              ? 'border-2 border-primary text-primary'
              : 'bg-neu-border/20 text-on-surface-variant'"
        >
          {{ day.label }}
        </div>
      </div>
      <p class="text-sm text-on-surface-variant">
        {{ checkInStore.weeklyCheckInCount === 1 ? t('exercises.views.checkInsThisWeek', { n: checkInStore.weeklyCheckInCount }) : t('exercises.views.checkInsThisWeekPlural', { n: checkInStore.weeklyCheckInCount }) }}
      </p>
    </div>

    <DailyCheckInWizard @saved="handleSaved" />

    <!-- Past Check-Ins -->
    <div class="mt-10 space-y-4">
      <h2 class="text-base font-semibold text-on-surface">{{ t('exercises.views.pastCheckIns') }}</h2>

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
            <span class="neo-pill text-xs px-2 py-0.5 font-semibold" :class="practiceTypeBadgeClass(entry.practiceType)">
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
              <p v-if="entry.selfEnergyQuality" class="capitalize">{{ t('exercises.views.focusedOn') }} {{ entry.selfEnergyQuality }}</p>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import DailyCheckInWizard from '@/components/exercises/DailyCheckInWizard.vue'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSDailyCheckInType, IFSSelfLeadershipRating } from '@/domain/exercises'
import { useT } from '@/composables/useT'
import { getChildPeriods, getPeriodRefsForDate } from '@/utils/periods'

const router = useRouter()
const { t } = useT()
const checkInStore = useIFSDailyCheckInStore()
const partStore = useIFSPartStore()
const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

onMounted(() => {
  checkInStore.loadCheckIns()
  partStore.loadParts()
})

const sortedCheckIns = computed(() => checkInStore.sortedCheckIns)

function handleSaved() {
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
    case 'self-energy-moment': return 'bg-yellow-100 text-yellow-700'
    case 'evening-reflection': return 'bg-indigo-100 text-indigo-700'
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
      label: WEEKDAY_LABELS[idx],
      completed: checkInDates.has(dayRef),
      isToday: dayRef === refs.day,
    }
  })
})
</script>
