<template>
  <!-- After a week/month reflection is saved: goals whose deadline has passed, each
       with a way into the closing ritual or a week's grace. Renders nothing when
       there is nothing to close (spec D3/D8). -->
  <section v-if="goals.length" class="gc-invite" aria-label="Cele do podsumowania">
    <header class="gc-invite__head">
      <strong>Cele do podsumowania</strong>
      <small>{{ lead }}</small>
    </header>
    <div v-for="goal in goals" :key="goal.id" class="gc-invite__row">
      <span class="gc-invite__icon"><AppIcon :name="goal.icon || 'outlined_flag'" /></span>
      <span class="gc-invite__copy">
        <strong>{{ goal.title }}</strong>
        <small>{{ rowMeta(goal) }}</small>
      </span>
      <span class="gc-invite__actions">
        <button type="button" class="qr-primary gc-invite__go" @click="openRitual(goal)">Podsumuj cel</button>
        <button type="button" class="qr-quiet" :disabled="busyId === goal.id" @click="defer(goal)">Później</button>
      </span>
    </div>
    <p v-if="error" class="qr-mutation-error" role="alert">{{ error }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/shared/AppIcon.vue'
import type { Goal } from '@/domain/planning'
import type { DayRef } from '@/domain/period'
import { formatDay, plural } from '@/features/quiet-ritual/quietRitualModel'
import { GOAL_CLOSING_DEFER_DAYS, deferGoalClosing } from '@/services/goalClosingService'
import { getGoalsAwaitingClosing } from '@/services/goalClosingQueries'
import { getPeriodRefsForDate } from '@/utils/periods'
import { daysAfterDeadline } from './useGoalClosingRitual'

const props = defineProps<{
  /** Last day of the period that was just reflected on. */
  periodEnd: DayRef
  /** First day of that period: deadlines inside it read differently from older ones. */
  periodStart?: DayRef
}>()

const router = useRouter()
const route = useRoute()
const goals = ref<Goal[]>([])
const busyId = ref<string | null>(null)
const error = ref<string | null>(null)
const todayRef = getPeriodRefsForDate(new Date()).day

async function load(): Promise<void> {
  try {
    goals.value = await getGoalsAwaitingClosing(props.periodEnd, todayRef)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  }
}
watch(() => props.periodEnd, () => void load(), { immediate: true })

const inPeriodCount = computed(
  () => goals.value.filter((goal) => !props.periodStart || (goal.targetDate as string) >= props.periodStart).length,
)
const lead = computed(() => {
  const older = goals.value.length - inPeriodCount.value
  const parts: string[] = []
  if (inPeriodCount.value) {
    parts.push(
      `W tym okresie minął termin ${inPeriodCount.value} ${plural(inPeriodCount.value, 'celu', 'celów', 'celów')}`,
    )
  }
  if (older) parts.push(`${older} ${plural(older, 'czeka', 'czekają', 'czeka')} od wcześniej`)
  return parts.join(', ') + '.'
})

function rowMeta(goal: Goal): string {
  const late = daysAfterDeadline(goal.targetDate, todayRef)
  const parts = [`termin ${formatDay(goal.targetDate as string)}`]
  if (late !== null && late > 0) parts.push(`${late} ${plural(late, 'dzień', 'dni', 'dni')} po terminie`)
  return parts.join(' · ')
}

function openRitual(goal: Goal): void {
  void router.push({
    name: 'goal-closing-ritual',
    params: { goalId: goal.id },
    query: { return: route.fullPath },
  })
}

async function defer(goal: Goal): Promise<void> {
  busyId.value = goal.id
  error.value = null
  try {
    await deferGoalClosing(goal.id, GOAL_CLOSING_DEFER_DAYS)
    goals.value = goals.value.filter((item) => item.id !== goal.id)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busyId.value = null
  }
}
</script>

<style src="./goal-closing.css"></style>
