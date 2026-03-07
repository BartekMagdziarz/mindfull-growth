<template>
  <AppCard
    v-if="partStore.parts.length >= 1"
    padding="lg"
    class="w-full max-w-md"
  >
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <GlobeAltIcon class="w-5 h-5 text-primary" />
        <h3 class="text-base font-semibold text-on-surface">{{ t('today.ifsCheckIn.title') }}</h3>
      </div>
      <span
        class="neo-pill text-xs px-2 py-0.5 font-medium"
        :class="doneToday
          ? 'bg-primary/10 text-primary'
          : 'bg-neu-base text-on-surface-variant'"
      >
        {{ doneToday ? t('today.ifsCheckIn.done') : t('today.ifsCheckIn.notYet') }}
      </span>
    </div>

    <!-- Not done today: micro-practice buttons -->
    <template v-if="!doneToday">
      <p class="text-sm text-on-surface-variant mb-3">
        {{ t('today.ifsCheckIn.pickPractice') }}
      </p>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="practice in practices"
          :key="practice.type"
          type="button"
          class="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all neo-selector hover:-translate-y-px"
          @click="navigateToCheckIn()"
        >
          <component
            :is="practice.icon"
            class="w-5 h-5 text-primary"
          />
          <span class="text-xs font-medium text-on-surface">{{ practice.label }}</span>
        </button>
      </div>
    </template>

    <!-- Done today: summary -->
    <template v-else>
      <div class="neo-surface p-3 rounded-lg mb-3">
        <p v-if="latestTodayCheckIn" class="text-sm text-on-surface">
          {{ t('today.ifsCheckIn.completed', { type: practiceTypeLabel(latestTodayCheckIn.practiceType) }) }}
        </p>
        <button
          type="button"
          class="text-xs text-primary font-medium mt-1 hover:underline"
          @click="navigateToCheckIn()"
        >
          {{ t('today.ifsCheckIn.doAnother') }}
        </button>
      </div>
    </template>

    <!-- Week streak dots -->
    <div class="flex flex-col items-center gap-1.5 mt-4 pt-3 border-t border-neu-border/20">
      <div class="flex items-center gap-1.5">
        <div
          v-for="day in weekDays"
          :key="day.label"
          class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium"
          :class="day.completed
            ? 'bg-primary text-white'
            : day.isToday
              ? 'border-2 border-primary text-primary'
              : 'bg-neu-border/20 text-on-surface-variant'"
        >
          {{ day.label }}
        </div>
      </div>
      <p class="text-xs text-on-surface-variant">
        {{ t(checkInStore.weeklyCheckInCount === 1 ? 'today.ifsCheckIn.checkInCount' : 'today.ifsCheckIn.checkInsCount', { count: checkInStore.weeklyCheckInCount }) }}
      </p>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  GlobeAltIcon,
  CloudIcon,
  HeartIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import { useIFSDailyCheckInStore } from '@/stores/ifsDailyCheckIn.store'
import { useIFSPartStore } from '@/stores/ifsPart.store'
import type { IFSDailyCheckInType } from '@/domain/exercises'
import { useT } from '@/composables/useT'

const router = useRouter()
const checkInStore = useIFSDailyCheckInStore()
const partStore = useIFSPartStore()
const { t } = useT()

const practices = computed(() => [
  { type: 'weather-report', label: t('today.ifsCheckIn.weatherReport'), icon: CloudIcon },
  { type: 'gratitude-to-part', label: t('today.ifsCheckIn.gratitude'), icon: HeartIcon },
  { type: 'self-energy-moment', label: t('today.ifsCheckIn.selfEnergy'), icon: SunIcon },
  { type: 'evening-reflection', label: t('today.ifsCheckIn.evening'), icon: MoonIcon },
])

const todayStr = computed(() => new Date().toISOString().slice(0, 10))

const todayCheckIns = computed(() =>
  checkInStore.checkIns.filter((c) => c.createdAt.slice(0, 10) === todayStr.value),
)

const doneToday = computed(() => todayCheckIns.value.length > 0)

const latestTodayCheckIn = computed(() => {
  if (!todayCheckIns.value.length) return null
  return [...todayCheckIns.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
})

function practiceTypeLabel(type: IFSDailyCheckInType): string {
  const labels: Record<string, string> = {
    'weather-report': t('today.ifsCheckIn.weatherReport'),
    'gratitude-to-part': t('today.ifsCheckIn.gratitude'),
    'self-energy-moment': t('today.ifsCheckIn.selfEnergy'),
    'evening-reflection': t('today.ifsCheckIn.eveningReflection'),
  }
  return labels[type] ?? type
}

function navigateToCheckIn() {
  router.push('/exercises/daily-checkin')
}

// Week dots (M–S)
const weekDays = computed(() => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const checkInDates = new Set(
    checkInStore.currentWeekCheckIns.map((c) => c.createdAt.slice(0, 10)),
  )
  const todayDate = now.toISOString().slice(0, 10)

  return days.map((label, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const dateStr = d.toISOString().slice(0, 10)
    return {
      label,
      completed: checkInDates.has(dateStr),
      isToday: dateStr === todayDate,
    }
  })
})
</script>
