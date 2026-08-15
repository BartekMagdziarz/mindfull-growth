<template>
  <main class="standalone-replica" :class="{ 'standalone-replica--mobile': mobilePreview }">
    <component
      :is="activeComponent"
      :preset-id="presetId"
      :variant-id="variantId"
    />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { LabViewId } from '@product/dev/richVerificationScenario'
import MonthReplica from '~lab/experiments/MonthReplica.vue'
import MonthlyRitualReplica from '~lab/experiments/MonthlyRitualReplica.vue'
import TodayReplica from '~lab/experiments/TodayReplica.vue'
import WeekReplica from '~lab/experiments/WeekReplica.vue'
import WeeklyRitualReplica from '~lab/experiments/WeeklyRitualReplica.vue'
import YearReplica from '~lab/experiments/YearReplica.vue'
import AnnualRitualReplica from '~lab/experiments/AnnualRitualReplica.vue'
import { viewDefinitions } from '~lab/lab/registry'

const route = useRoute()
const router = useRouter()
const components = {
  today: TodayReplica,
  'calendar-year': YearReplica,
  'calendar-month': MonthReplica,
  'calendar-week': WeekReplica,
  'ritual-week': WeeklyRitualReplica,
  'ritual-month': MonthlyRitualReplica,
  'ritual-year': AnnualRitualReplica,
}
const viewId = computed(() => String(route.params.viewId) as LabViewId)
const variantId = computed(() => String(route.params.variantId))
const presetId = computed(() => String(route.params.presetId))
const mobilePreview = computed(() => route.query.viewport === 'mobile')
const activeComponent = computed(() => components[viewId.value])

if (!viewDefinitions[viewId.value]) void router.replace('/views/today')
</script>
