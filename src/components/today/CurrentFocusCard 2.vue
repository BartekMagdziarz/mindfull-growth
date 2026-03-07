<template>
  <AppCard padding="lg" class="w-full max-w-md">
    <h3 class="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
      <FlagIcon class="w-5 h-5 text-primary" />
      {{ t('today.currentFocus.title') }}
    </h3>

    <!-- Has monthly plan with primary focus -->
    <div v-if="monthlyPlan && primaryFocusLifeArea">
      <!-- Focus Life Area Row -->
      <div class="flex items-center gap-3 mb-4">
        <span
          class="w-3 h-3 rounded-full flex-shrink-0"
          :style="{ backgroundColor: primaryFocusLifeArea.color || 'rgb(var(--color-primary))' }"
        />
        <div class="flex-1">
          <p class="font-semibold text-on-surface">{{ primaryFocusLifeArea.name }}</p>
          <p class="text-xs text-on-surface-variant">{{ monthLabel }}</p>
        </div>
      </div>

      <!-- Weekly Focus Sentence -->
      <div v-if="weeklyPlan?.focusSentence" class="mb-4">
        <p class="text-xs text-on-surface-variant uppercase tracking-wide mb-1">
          {{ t('today.currentFocus.thisWeek') }}
        </p>
        <p class="text-on-surface bg-primary/5 rounded-lg px-3 py-2 text-sm italic">
          "{{ weeklyPlan.focusSentence }}"
        </p>
      </div>
      <p v-else-if="weeklyPlan" class="text-sm text-on-surface-variant mb-4">
        {{ t('today.currentFocus.noFocusSentence') }}
      </p>
      <p v-else class="text-sm text-on-surface-variant mb-4">
        {{ t('today.currentFocus.noWeeklyPlan') }}
      </p>

      <!-- CTA -->
      <RouterLink
        to="/planning"
        class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-strong transition-colors"
      >
        {{ t('today.currentFocus.openPlanningHub') }}
        <ChevronRightIcon class="w-4 h-4" />
      </RouterLink>
    </div>

    <!-- Empty state: No monthly plan or no primary focus area -->
    <div v-else class="text-center py-4">
      <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
        <CalendarIcon class="w-6 h-6 text-primary" />
      </div>
      <p class="text-on-surface-variant mb-4">
        {{ t('today.currentFocus.emptyDescription') }}
      </p>
      <AppButton variant="tonal" @click="$emit('createMonthlyPlan')">
        {{ t('today.currentFocus.createMonthlyPlan') }}
      </AppButton>
    </div>
  </AppCard>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppCard from '@/components/AppCard.vue'
import AppButton from '@/components/AppButton.vue'
import { FlagIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/vue/24/outline'
import type { MonthlyPlan, WeeklyPlan } from '@/domain/planning'
import type { LifeArea } from '@/domain/lifeArea'
import { useT } from '@/composables/useT'

const { t } = useT()

defineProps<{
  monthlyPlan: MonthlyPlan | undefined
  weeklyPlan: WeeklyPlan | undefined
  primaryFocusLifeArea: LifeArea | undefined
  monthLabel: string
}>()

defineEmits<{
  createMonthlyPlan: []
}>()
</script>
