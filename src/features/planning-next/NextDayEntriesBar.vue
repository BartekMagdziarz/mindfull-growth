<template>
  <!-- Three quiet tiles for the day's own entries. Same routes as the Today cards. -->
  <DsSurface elevation="raised-sm" class="next-day-entries" aria-label="Wpisy dnia">
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': journalState === 'done' }" @click="router.push(journalState === 'done' ? '/journal' : '/journal/edit')">
      <span class="next-day-entries__icon"><AppIcon :name="journalState === 'done' ? 'check' : 'history_edu'" /></span>
      <small>{{ t('planning.today.wellness.journal') }}</small>
    </button>
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': todayEmotionLogs.length >= DAILY_EMOTION_TARGET }" :aria-label="`${t('planning.today.wellness.emotions')}: ${todayEmotionLogs.length}/${DAILY_EMOTION_TARGET}`" @click="router.push(todayEmotionLogs.length >= DAILY_EMOTION_TARGET ? '/emotions' : { name: 'emotions-edit' })">
      <span class="next-day-entries__icon"><AppIcon name="cognition" /></span>
      <small>{{ t('planning.today.wellness.emotions') }} · {{ todayEmotionLogs.length }}/{{ DAILY_EMOTION_TARGET }}</small>
    </button>
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': exerciseDayCompletions.length > 0 }" @click="router.push('/exercises')">
      <span class="next-day-entries__icon"><AppIcon :name="exerciseDayCompletions.length ? 'check' : 'psychology'" /></span>
      <small>{{ t('planning.today.wellness.exercises') }}</small>
    </button>
  </DsSurface>
</template>

<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsSurface } from '@/design-system/components'
import { DAILY_EMOTION_TARGET, useDayWellness } from './useDayWellness'

const props = defineProps<{ dayRef: DayRef }>()
const router = useRouter()
const { t } = useT()
const { journalState, todayEmotionLogs, exerciseDayCompletions, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))

onMounted(() => void ensureLoaded())
</script>
