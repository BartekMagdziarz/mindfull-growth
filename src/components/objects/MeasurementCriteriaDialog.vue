<template>
  <AppDialog
    :model-value="Boolean(request)"
    :title="t('planning.criteria.title')"
    :close-on-backdrop="false"
    panel-class="mg-v2-surface mg-v2-surface--raised max-h-[calc(100dvh-2rem)] overflow-y-auto"
    @cancel="emit('choose', null)"
  >
    <form v-if="request" class="flex flex-col gap-4" @submit.prevent="save">
      <p class="mg-v2-text-body">{{ request.subject.title }}</p>
      <fieldset class="flex flex-col gap-3" :disabled="loading">
        <legend class="sr-only">{{ t('planning.criteria.title') }}</legend>
        <label class="flex gap-2 items-start">
          <input
            v-model="scope"
            class="mg-well mg-well--sm"
            type="radio"
            value="next"
            name="criteria-scope"
          />
          <span
            >{{ t('planning.criteria.next') }} <strong>{{ nextStart }}</strong></span
          >
        </label>
        <label class="flex gap-2 items-start">
          <input
            v-model="scope"
            class="mg-well mg-well--sm"
            type="radio"
            value="all"
            name="criteria-scope"
          />
          <span>{{ t('planning.criteria.all') }}</span>
        </label>
        <label class="flex gap-2 items-start">
          <input
            v-model="scope"
            class="mg-well mg-well--sm"
            type="radio"
            value="date"
            name="criteria-scope"
          />
          <span>{{ t('planning.criteria.date') }}</span>
        </label>
        <label v-if="scope === 'date'" class="flex flex-col gap-1">
          <span>{{ t('planning.criteria.boundary') }}</span>
          <input v-model="date" type="date" required class="mg-v2-inline-field" />
        </label>
      </fieldset>
      <p v-if="invalidDate" role="alert">{{ t('planning.criteria.invalidDate') }}</p>
      <p v-if="preview && !loading" role="status" class="mg-v2-meta">
        {{ t('planning.criteria.preview', { changed: preview.changed, gained: preview.gained }) }}
      </p>
      <p v-if="error" role="alert">{{ t('planning.criteria.loadError') }}</p>
      <p class="mg-v2-meta">{{ t('planning.criteria.overrides') }}</p>
      <p v-if="!request.subject.criteriaVersions" class="mg-v2-meta">
        {{ t('planning.criteria.legacy') }}
      </p>
      <p v-if="replacesScheduled" class="mg-v2-meta">{{ t('planning.criteria.scheduled') }}</p>
      <div class="flex gap-3 justify-end">
        <DsButton type="button" variant="quiet" @click="emit('choose', null)">{{
          t('common.buttons.cancel')
        }}</DsButton>
        <DsButton type="submit" :disabled="loading || Boolean(error) || invalidDate">{{
          t('common.buttons.save')
        }}</DsButton>
      </div>
    </form>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import AppDialog from '@/components/AppDialog.vue'
import { DsButton } from '@/design-system/components'
import { useT } from '@/composables/useT'
import type { CriteriaEditRequest } from '@/composables/useMeasurementCriteriaEditor'
import type { MeasurementCriteriaChange } from '@/domain/planning'
import type { DayRef } from '@/domain/period'
import type {
  DailyMeasurementEntry,
  MeasurementMonthState,
  MeasurementWeekState,
} from '@/domain/planningState'
import { changeMeasurementCriteria, criteriaPeriodStart } from '@/domain/measurementCriteria'
import {
  buildMeasurementSummary,
  applyMeasurementTargetCascade,
} from '@/services/measurementProgress'
import { measurementPeriodOverrides } from '@/services/measurementPeriodOverrides'
import { getPeriodBounds, getPeriodRefsForDate, getNextPeriod } from '@/utils/periods'
import { getUserDatabase } from '@/services/userDatabaseService'
import { captureUserSession } from '@/services/userSessionScope'

const props = defineProps<{ request: CriteriaEditRequest | null }>()
const emit = defineEmits<{ choose: [change: MeasurementCriteriaChange | null] }>()
const { t } = useT()
const scope = ref<'next' | 'all' | 'date'>('next')
const date = ref('')
const loading = ref(false)
const error = ref(false)
const snapshot = shallowRef<{
  entries: DailyMeasurementEntry[]
  months: MeasurementMonthState[]
  weeks: MeasurementWeekState[]
}>()
const nextStart = computed(() => {
  const subject = props.request?.subject
  if (!subject) return ''
  if ('weekRef' in subject) return getPeriodBounds(subject.weekRef).start
  const refs = getPeriodRefsForDate(new Date())
  return getPeriodBounds(getNextPeriod(subject.cadence === 'weekly' ? refs.week : refs.month)).start
})
const invalidDate = computed(() => {
  if (scope.value !== 'date') return false
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value) || !Number.isFinite(Date.parse(date.value)))
    return true
  return criteriaPeriodStart(props.request!.subject.cadence, date.value as DayRef) !== date.value
})
const change = computed<MeasurementCriteriaChange>(() =>
  scope.value === 'all'
    ? { scope: 'all-history' }
    : {
        scope: 'from-date',
        effectiveFrom: (scope.value === 'next' ? nextStart.value : date.value) as DayRef,
      }
)

const replacesScheduled = computed(() =>
  props.request?.subject.criteriaVersions?.some(
    v =>
      v.effectiveFrom !== '0001-01-01' &&
      (change.value.scope === 'all-history' || v.effectiveFrom >= change.value.effectiveFrom!)
  )
)

watch(
  () => props.request,
  async request => {
    snapshot.value = undefined
    error.value = false
    scope.value = 'next'
    date.value = nextStart.value
    if (!request) return
    loading.value = true
    try {
      const session = captureUserSession()
      const db = getUserDatabase()
      const key = [request.subjectType, request.subject.id]
      const data = await session.wait(
        db.transaction(
          'r',
          [db.dailyMeasurementEntries, db.measurementMonthStates, db.measurementWeekStates],
          async () => ({
            entries: await db.dailyMeasurementEntries
              .where('[subjectType+subjectId]')
              .equals(key)
              .toArray(),
            months: await db.measurementMonthStates
              .where('[subjectType+subjectId]')
              .equals(key)
              .toArray(),
            weeks: await db.measurementWeekStates
              .where('[subjectType+subjectId]')
              .equals(key)
              .toArray(),
          })
        )
      )
      if (props.request === request) snapshot.value = data
    } catch {
      if (props.request === request) error.value = true
    } finally {
      if (props.request === request) loading.value = false
    }
  },
  { immediate: true }
)

const preview = computed(() => {
  if (!snapshot.value || !props.request || invalidDate.value) return null
  const { subject, next } = props.request
  const { entries, months, weeks } = snapshot.value
  const updated = changeMeasurementCriteria(subject, next, change.value)
  const refs = [
    ...new Set(
      entries.map(e => {
        const p = getPeriodRefsForDate(e.dayRef)
        return subject.cadence === 'weekly' ? p.week : p.month
      })
    ),
  ]
  let changed = 0
  let gained = 0
  for (const period of refs) {
    const overrides = measurementPeriodOverrides(period, subject.cadence, months, weeks)
    const before = buildMeasurementSummary(
      applyMeasurementTargetCascade(subject, period, overrides),
      entries,
      period
    )
    const after = buildMeasurementSummary(
      applyMeasurementTargetCascade(updated, period, overrides),
      entries,
      period
    )
    if (
      before.evaluationStatus !== after.evaluationStatus ||
      before.actualValue !== after.actualValue
    )
      changed++
    if (before.evaluationStatus !== 'met' && after.evaluationStatus === 'met') gained++
  }
  return { changed, gained }
})
function save() {
  if (!loading.value && !error.value && !invalidDate.value) emit('choose', change.value)
}
</script>
