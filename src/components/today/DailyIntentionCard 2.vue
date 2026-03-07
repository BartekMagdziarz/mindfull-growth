<template>
  <AppCard class="neo-raised w-full">
    <div class="flex items-start gap-3">
      <component :is="icon" class="h-6 w-6 text-primary mt-0.5" />
      <div class="flex-1 min-w-0">
        <h2 class="text-lg font-semibold text-on-surface">{{ heading }}</h2>
        <p class="text-sm text-on-surface-variant mt-1">{{ description }}</p>

        <div class="mt-4 flex flex-wrap gap-2">
          <AppButton variant="filled" size="sm" @click="emit('primaryAction')">
            {{ primaryActionLabel }}
          </AppButton>
          <AppButton variant="tonal" size="sm" @click="emit('secondaryAction')">
            {{ secondaryActionLabel }}
          </AppButton>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-2 text-xs text-on-surface-variant">
          <div class="neo-surface rounded-lg px-2.5 py-2">
            {{ t('today.intention.commitmentsProgress', { done: commitmentDone, total: commitmentTotal }) }}
          </div>
          <div class="neo-surface rounded-lg px-2.5 py-2">
            {{ t('today.intention.emotionProgress', { logged: emotionLogged, target: emotionTarget }) }}
          </div>
        </div>
      </div>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  SunIcon,
  ArrowPathIcon,
  MoonIcon,
} from '@heroicons/vue/24/outline'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { useT } from '@/composables/useT'
import type { TodayMode } from '@/types/today'

const { t } = useT()

const props = defineProps<{
  mode: TodayMode
  hasJournalToday: boolean
  commitmentDone: number
  commitmentTotal: number
  emotionLogged: number
  emotionTarget: number
}>()

const emit = defineEmits<{
  primaryAction: []
  secondaryAction: []
}>()

const icon = computed(() => {
  if (props.mode === 'morning') return SunIcon
  if (props.mode === 'midday') return ArrowPathIcon
  return MoonIcon
})

const heading = computed(() => {
  if (props.mode === 'morning') return t('today.intention.morningTitle')
  if (props.mode === 'midday') return t('today.intention.middayTitle')
  return t('today.intention.eveningTitle')
})

const description = computed(() => {
  if (props.mode === 'morning') return t('today.intention.morningDescription')
  if (props.mode === 'midday') return t('today.intention.middayDescription')
  return t('today.intention.eveningDescription')
})

const primaryActionLabel = computed(() => {
  if (props.mode === 'midday') return t('today.intention.logEmotion')
  return props.hasJournalToday ? t('today.intention.continueJournal') : t('today.intention.startJournal')
})

const secondaryActionLabel = computed(() => {
  if (props.mode === 'morning') return t('today.intention.openPlanning')
  if (props.mode === 'midday') return t('today.intention.reviewCommitments')
  return t('today.intention.openPlanning')
})
</script>
