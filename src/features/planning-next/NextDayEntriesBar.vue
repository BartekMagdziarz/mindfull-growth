<template>
  <!-- Three quiet tiles for the day's own entries. Same routes as the Today cards. -->
  <component :is="embedded ? 'div' : DsSurface" :elevation="embedded ? undefined : 'raised-sm'" class="next-day-entries" :class="{ 'is-embedded': embedded }" aria-label="Wpisy dnia">
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': journalState === 'done' }" @click="router.push({ name: 'journal-edit', query: { day: dayRef } })">
      <span class="next-day-entries__icon"><AppIcon name="menu_book" /></span>
      <small>{{ t('planning.today.wellness.journal') }}</small>
    </button>
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': todayEmotionLogs.length >= DAILY_EMOTION_TARGET }" :aria-label="`${t('planning.today.wellness.emotions')}: ${todayEmotionLogs.length}/${DAILY_EMOTION_TARGET}`" @click="router.push({ name: 'emotions-edit', query: { day: dayRef } })">
      <span class="next-day-entries__icon"><AppIcon name="favorite" /></span>
      <small>{{ t('planning.today.wellness.emotions') }} · {{ todayEmotionLogs.length }}/{{ DAILY_EMOTION_TARGET }}</small>
    </button>
    <button type="button" class="next-day-entries__tile" :class="{ 'is-done': exerciseDayCompletions.length > 0 }" @click="router.push('/exercises')">
      <span class="next-day-entries__icon"><AppIcon name="self_improvement" /></span>
      <small>{{ t('planning.today.wellness.exercises') }}</small>
    </button>
  </component>
</template>

<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { DayRef } from '@/domain/period'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useT } from '@/composables/useT'
import { DsSurface } from '@/design-system/components'
import { DAILY_EMOTION_TARGET, useDayWellness } from './useDayWellness'

const props = defineProps<{ dayRef: DayRef; embedded?: boolean }>()
const router = useRouter()
const { t } = useT()
const { journalState, todayEmotionLogs, exerciseDayCompletions, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))

onMounted(() => void ensureLoaded())
</script>
