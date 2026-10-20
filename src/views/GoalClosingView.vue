<template>
  <div class="mg-design-v2 goal-closing-view">
    <GoalClosingRitual
      :goal-id="goalId"
      :preset-outcome="presetOutcome"
      :open-deadline="queryString('deadline') === '1'"
      @close="leave"
      @finished="handleFinished"
      @moved="handleMoved"
    />
    <AppSnackbar ref="snackbarRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppSnackbar from '@/components/AppSnackbar.vue'
import { GOAL_OUTCOMES, type GoalOutcome } from '@/domain/planning'
import GoalClosingRitual from '@/features/goal-closing/GoalClosingRitual.vue'
import { formatDay } from '@/features/quiet-ritual/quietRitualModel'
import type { GoalClosingResult } from '@/services/goalClosingService'

defineProps<{ goalId: string }>()

const route = useRoute()
const router = useRouter()
const snackbarRef = ref<InstanceType<typeof AppSnackbar> | null>(null)

function queryString(name: string): string | undefined {
  const raw = route.query[name]
  const value = Array.isArray(raw) ? raw[0] : raw
  return typeof value === 'string' ? value : undefined
}

/** The card's status menu pre-selects the outcome (?outcome=abandoned). */
const presetOutcome = computed<GoalOutcome | null>(() => {
  const value = queryString('outcome')
  return value && (GOAL_OUTCOMES as readonly string[]).includes(value)
    ? (value as GoalOutcome)
    : null
})

/** Same-app relative path to go back to; the library otherwise. */
function returnTarget(): string {
  const value = queryString('return')
  if (value && value.startsWith('/') && !value.startsWith('//')) return value
  return '/objects/goals'
}

function leave(): void {
  void router.push(returnTarget())
}

function handleFinished(result: GoalClosingResult): void {
  // „Nowy cel” lands in the goals library, where the creator lives.
  if (result.goal.closingReflection?.followUp?.kind === 'new-goal') {
    void router.push('/objects/goals')
    return
  }
  leave()
}

function handleMoved(targetDate: string): void {
  snackbarRef.value?.show(`Termin celu przesunięty na ${formatDay(targetDate)}.`)
  window.setTimeout(leave, 600)
}
</script>
