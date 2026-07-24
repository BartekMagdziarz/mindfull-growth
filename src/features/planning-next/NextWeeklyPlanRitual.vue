<template>
  <NextRitualShell
    eyebrow="Plan tygodnia"
    :period-title="periodTitle"
    mode="plan"
    :steps="steps"
    :current="current"
    :selected-count="selectedKeys.length"
    selection-label="fokusy"
    :period-pulse="`${placedCount}/${selectedKeys.length || 0}`"
    pulse-label="z terminem"
    :saving="isSaving"
    finish-label="Zapisz plan"
    @close="$emit('close')"
    @previous="current -= 1"
    @next="next"
    @go-to="current = $event"
    @finish="$emit('close')"
  >
    <section v-if="current === 0" class="next-ritual__choice-grid">
      <p class="next-ritual__soft-limit" :class="{ warning: selectedKeys.length > 3 }"><AppIcon :name="selectedKeys.length > 3 ? 'warning' : 'info'" /><span><strong>{{ selectedKeys.length }} wybrane</strong><small>Trzy to sugestia, nie blokada.</small></span></p>
      <article v-for="candidate in candidates" :key="candidate.key" :class="{ selected: selectedKeys.includes(candidate.key) }">
        <button type="button" @click="toggleCandidate(candidate)">
          <span><AppIcon :name="selectedKeys.includes(candidate.key) ? 'check' : iconFor(candidate.subjectType)" /></span>
          <span><small>{{ candidate.typeLabel }}</small><strong>{{ candidate.title }}</strong><em>{{ targetLabel(candidate) }}</em></span>
        </button>
      </article>
      <aside class="next-ritual__composer"><IntentionComposer :week-ref="weekRef" :priorities="priorityOptions" @created="handleIntentionCreated" /></aside>
    </section>

    <section v-else-if="current === 1" class="next-ritual__assignment"><WeekDayAssignmentStep :week-ref="weekRef" @updated="handlePlannerUpdated" /></section>

    <section v-else class="next-ritual__review">
      <header :class="{ warning: unplacedCount > 0 }"><span><AppIcon :name="unplacedCount ? 'event_busy' : 'task_alt'" /></span><div><small>PRZED ZAPISEM</small><h2>{{ unplacedCount ? `${unplacedCount} fokus wymaga dnia` : 'Plan ma rytm i może zostać zapisany' }}</h2><p>{{ unplacedCount ? 'Przypisz przynajmniej jeden dzień albo świadomie usuń obiekt z fokusu.' : 'Wszystkie fokusy mają target i miejsce w tygodniu.' }}</p></div><button type="button" @click="current = 1"><AppIcon name="edit_calendar" />Popraw rytm</button></header>
      <div class="next-ritual__review-layout">
        <section><header><span>Fokus i terminy</span><small>{{ placedCount }}/{{ selectedCandidates.length }} rozmieszczone</small></header><article v-for="candidate in selectedCandidates" :key="candidate.key"><span><AppIcon :name="iconFor(candidate.subjectType)" /></span><div><strong>{{ candidate.title }}</strong><small>{{ targetLabel(candidate) }}</small></div><p><i v-for="day in candidate.plannedDays" :key="day">{{ shortDay(day) }}</i><em v-if="!candidate.plannedDays.length">bez dnia</em></p></article></section>
        <section class="next-ritual__load"><header><span>Obciążenie dni</span><small>liczba fokusów</small></header><div><span v-for="day in dayLoad" :key="day.dayRef"><strong>{{ day.count }}</strong><i><b :style="{ height: `${Math.max(8, day.count * 28)}%` }" /></i><small>{{ shortDay(day.dayRef) }}</small></span></div></section>
      </div>
    </section>
  </NextRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { WeekRef } from '@/domain/period'
import type { MeasurementTarget } from '@/domain/planning'
import type { MeasurementSubjectType, WeekTopPriorityRef } from '@/domain/planningState'
import type { WeekPlanPriorityOption } from '@/components/calendar/weekPlanCandidate'
import { getWeekPlanningBundle } from '@/services/planningStateQueries'
import { getActivePrioritiesForMonth } from '@/services/monthlyPriorityService'
import { setWeekTopPriorities } from '@/services/weeklyIntentionService'
import { getChildPeriods, getParentPeriod, getPeriodBounds } from '@/utils/periods'
import { formatMeasurementTargetSummary } from '@/utils/measurementTargetFormat'
import { useT } from '@/composables/useT'
import AppIcon from '@/components/shared/AppIcon.vue'
import IntentionComposer from '@/components/calendar/IntentionComposer.vue'
import WeekDayAssignmentStep from '@/components/calendar/WeekDayAssignmentStep.vue'
import NextRitualShell, { type NextRitualStep } from './NextRitualShell.vue'

interface Candidate {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  typeLabel: string
  target: MeasurementTarget
  plannedDays: string[]
}

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: [] }>()
const { t } = useT()
const current = ref(0)
const candidates = ref<Candidate[]>([])
const selectedKeys = ref<string[]>([])
const priorityOptions = ref<WeekPlanPriorityOption[]>([])
const isSaving = ref(false)
const steps: NextRitualStep[] = [
  { id: 'focus', label: 'Fokus', short: 'Wybierz to, co najważniejsze', kicker: 'FOKUS TYGODNIA', question: 'Co naprawdę zasługuje na uwagę?', description: 'Wybierz kilka obiektów, które wyznaczą kierunek tygodnia.' },
  { id: 'rhythm', label: 'Rytm', short: 'Rozmieść fokus w dniach', kicker: 'RYTM DNI', question: 'Kiedy to ma realną szansę się wydarzyć?', description: 'Nadaj obiektom target i miejsce w siedmiu dniach.' },
  { id: 'review', label: 'Przegląd', short: 'Sprawdź obciążenie', kicker: 'PRZED ZAPISEM', question: 'Czy plan ma rytm i oddech?', description: 'Sprawdź rozłożenie uwagi, zanim zapiszesz plan.' },
]
const periodTitle = computed(() => {
  const bounds = getPeriodBounds(props.weekRef)
  const format = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
  return `${format.format(new Date(`${bounds.start}T12:00:00`))}–${format.format(new Date(`${bounds.end}T12:00:00`))}`
})
const selectedCandidates = computed(() => candidates.value.filter(candidate => selectedKeys.value.includes(candidate.key)))
const placedCount = computed(() => selectedCandidates.value.filter(candidate => candidate.plannedDays.length).length)
const unplacedCount = computed(() => selectedCandidates.value.length - placedCount.value)
const dayLoad = computed(() => getChildPeriods(props.weekRef).map(dayRef => ({ dayRef, count: selectedCandidates.value.filter(candidate => candidate.plannedDays.includes(dayRef)).length })))

onMounted(() => void load())
watch(() => props.weekRef, () => void load())

async function load() {
  const [bundle, priorities] = await Promise.all([getWeekPlanningBundle(props.weekRef), getActivePrioritiesForMonth(getParentPeriod(props.weekRef))])
  const list: Candidate[] = []
  for (const item of bundle.relevant.measurementItems) {
    if (!('target' in item.subject)) continue
    list.push({ key: `${item.subjectType}:${item.subject.id}`, subjectType: item.subjectType, subjectId: item.subject.id, title: item.subject.title, typeLabel: typeLabel(item.subjectType), target: item.subject.target, plannedDays: item.planning.scheduledDayRefs })
  }
  candidates.value = list
  selectedKeys.value = (bundle.weekPlan?.topPriorities ?? []).map(item => `${item.subjectType}:${item.subjectId}`)
  priorityOptions.value = priorities.map(priority => ({ id: priority.id, title: priority.title }))
}
async function toggleCandidate(candidate: Candidate) {
  selectedKeys.value = selectedKeys.value.includes(candidate.key) ? selectedKeys.value.filter(key => key !== candidate.key) : [...selectedKeys.value, candidate.key]
  const refs: WeekTopPriorityRef[] = selectedKeys.value.map(key => candidates.value.find(item => item.key === key)).filter((item): item is Candidate => Boolean(item)).map(item => ({ subjectType: item.subjectType, subjectId: item.subjectId }))
  isSaving.value = true
  try { await setWeekTopPriorities(props.weekRef, refs); emit('updated') } finally { isSaving.value = false }
}
async function handleIntentionCreated() { await load(); emit('updated') }
async function handlePlannerUpdated() { await load(); emit('updated') }
async function next() { if (current.value === 1) await load(); current.value += 1 }
function targetLabel(candidate: Candidate) { return formatMeasurementTargetSummary(candidate.target, t) }
function typeLabel(type: MeasurementSubjectType) { return type === 'keyResult' ? 'Rezultat' : type === 'habit' ? 'Nawyk' : type === 'weeklyIntention' ? 'Intencja' : 'Tracker' }
function iconFor(type: MeasurementSubjectType) { return type === 'keyResult' ? 'flag' : type === 'habit' ? 'routine' : type === 'weeklyIntention' ? 'gps_fixed' : 'monitoring' }
function shortDay(dayRef: string) { return new Intl.DateTimeFormat('pl-PL', { weekday: 'short' }).format(new Date(`${dayRef}T12:00:00`)).replace('.', '') }
</script>
