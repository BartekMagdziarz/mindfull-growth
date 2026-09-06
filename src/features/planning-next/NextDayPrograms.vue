<template>
  <!-- Repeats and programs are actions of the current day only; the card exists
       only when there is something due. -->
  <div v-if="hasContent" class="next-day-programs" :aria-label="t('planning.today.wellness.plannedExercises')">
    <PlannedExercisesCard v-if="duePlanItems.length" :items="duePlanItems" :today-ref="dayRef" />
    <ProgramCard v-if="activeEnrollments.length" :enrollments="activeEnrollments" :today-ref="dayRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, toRef } from 'vue'
import type { DayRef } from '@/domain/period'
import PlannedExercisesCard from '@/components/today/PlannedExercisesCard.vue'
import ProgramCard from '@/components/today/ProgramCard.vue'
import { useT } from '@/composables/useT'
import { useDayWellness } from './useDayWellness'

const props = defineProps<{ dayRef: DayRef }>()
const { t } = useT()
const { isToday, duePlanItems, activeEnrollments, ensureLoaded } = useDayWellness(toRef(props, 'dayRef'))
const hasContent = computed(() => isToday.value && (duePlanItems.value.length > 0 || activeEnrollments.value.length > 0))

onMounted(() => void ensureLoaded())
</script>
