<template>
  <p v-if="latest" class="mg-v2-meta" data-testid="criteria-version-note">
    {{
      t(
        latest.effectiveFrom > today
          ? 'planning.criteria.scheduledFrom'
          : 'planning.criteria.rulesFrom',
        { date: formattedDate }
      )
    }}
  </p>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { MeasurementCriteriaVersion } from '@/domain/planning'
import { useT } from '@/composables/useT'
import { getPeriodRefsForDate } from '@/utils/periods'
const props = defineProps<{ versions?: MeasurementCriteriaVersion[] }>()
const { t, locale } = useT()
const today = getPeriodRefsForDate(new Date()).day
const latest = computed(() => {
  const version = props.versions?.at(-1)
  return version && version.effectiveFrom !== '0001-01-01' ? version : undefined
})
const formattedDate = computed(() =>
  latest.value
    ? new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
        new Date(`${latest.value.effectiveFrom}T12:00:00`)
      )
    : ''
)
</script>
