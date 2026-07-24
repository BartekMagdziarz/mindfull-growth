<template>
  <NextRitualShell
    eyebrow="Plan miesiąca"
    :period-title="periodTitle"
    mode="plan"
    :steps="steps"
    :current="current"
    :selected-count="selectedPriorityIds.length"
    selection-label="kierunki"
    :period-pulse="String(activeSupportCount)"
    pulse-label="obiekty wsparcia"
    :saving="isSaving || supportSaving"
    finish-label="Zapisz plan"
    period-icon="calendar_view_month"
    @close="$emit('close')"
    @previous="current -= 1"
    @next="next"
    @go-to="current = $event"
    @finish="$emit('close')"
  >
    <section v-if="current === 0" class="next-ritual__choice-grid next-ritual__choice-grid--priorities">
      <article v-for="(priority, index) in activePriorities" :key="priority.id" :class="[{ selected: selectedPriorityIds.includes(priority.id) }, `tone-${priorityTone(index)}`]">
        <button type="button" @click="toggleTopPriority(priority.id)"><span><AppIcon :name="selectedPriorityIds.includes(priority.id) ? 'check' : priority.icon || priorityIcon(index)" /></span><span><small>Kierunek</small><strong>{{ priority.title }}</strong><em>{{ priority.desiredDirection || 'Nazwij pożądany kierunek' }}</em></span></button>
      </article>
      <DsState v-if="!activePriorities.length" title="Brak aktywnych kierunków" body="Dodaj priorytety w bibliotece obiektów, aby zaplanować miesiąc." />
    </section>

    <section v-else-if="current === 1" class="next-ritual__choice-grid">
      <article v-for="item in supportCandidates" :key="item.key" :class="{ selected: item.active }">
        <button type="button" :disabled="supportSaving" @click="toggleSupport(item)"><span><AppIcon :name="item.active ? 'check' : iconFor(item.subjectType)" /></span><span><small>{{ typeLabel(item.subjectType) }}</small><strong>{{ item.title }}</strong><em>{{ item.priorityMatch ? 'Wspiera wybrany kierunek' : 'Dodatkowe wsparcie' }}</em></span></button>
      </article>
    </section>

    <section v-else-if="current === 2" class="next-ritual__assignment"><MonthlyPlanner :month-ref="monthRef" @updated="handlePlannerUpdated" /></section>

    <section v-else class="next-ritual__review">
      <header :class="{ warning: uncoveredPriorityCount > 0 }"><span><AppIcon :name="uncoveredPriorityCount ? 'link_off' : 'task_alt'" /></span><div><small>PRZED ZAPISEM</small><h2>{{ uncoveredPriorityCount ? `${uncoveredPriorityCount} kierunek nie ma wsparcia` : 'Każdy kierunek ma konkretne wsparcie' }}</h2><p>{{ uncoveredPriorityCount ? 'Dobierz obiekt albo wróć do wyboru kierunków.' : 'Targety i rytm tygodni są gotowe do zapisu.' }}</p></div><button type="button" @click="current = uncoveredPriorityCount ? 1 : 2"><AppIcon :name="uncoveredPriorityCount ? 'add_link' : 'calendar_view_week'" />{{ uncoveredPriorityCount ? 'Dobierz wsparcie' : 'Popraw tygodnie' }}</button></header>
      <div class="next-ritual__review-layout">
        <section><header><span>Kierunki i wsparcie</span><small>{{ activeSupportCount }} obiekty</small></header><article v-for="(priority, index) in selectedPriorities" :key="priority.id"><span><AppIcon :name="priority.icon || priorityIcon(index)" /></span><div><strong>{{ priority.title }}</strong><small>{{ supportFor(priority.id).map(item => item.title).join(' · ') || 'Brak wybranego wsparcia' }}</small></div><p><i>{{ supportFor(priority.id).reduce((sum, item) => sum + item.weekCount, 0) }} tyg.</i><em v-if="!supportFor(priority.id).length">do uzupełnienia</em></p></article></section>
        <section class="next-ritual__load"><header><span>Rytm miesiąca</span><small>obiekty w tygodniach</small></header><div><span v-for="week in weekLoad" :key="week.label"><strong>{{ week.count }}</strong><i><b :style="{ height: `${Math.max(8, week.count * 20)}%` }" /></i><small>{{ week.label }}</small></span></div></section>
      </div>
    </section>
  </NextRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from 'vue'
import type { MonthRef } from '@/domain/period'
import type { MeasurementSubjectType } from '@/domain/planningState'
import type { Priority } from '@/domain/planning'
import type { MonthMeasurementPlanningItem } from '@/services/planningStateQueries'
import { getMonthPlanningBundle } from '@/services/planningStateQueries'
import { activateMeasurementInMonth, deactivateMeasurementInMonth } from '@/services/planningMutations'
import { getChildPeriods } from '@/utils/periods'
import { useMonthlyReflectionWizard } from '@/composables/useMonthlyReflectionWizard'
import AppIcon from '@/components/shared/AppIcon.vue'
import MonthlyPlanner from '@/components/calendar/MonthlyPlanner.vue'
import { DsState } from '@/design-system/components'
import NextRitualShell, { type NextRitualStep } from './NextRitualShell.vue'

interface SupportItem {
  key: string
  subjectType: MeasurementSubjectType
  subjectId: string
  title: string
  active: boolean
  priorityIds: string[]
  priorityMatch: boolean
  weekCount: number
  source: MonthMeasurementPlanningItem
}

const props = defineProps<{ monthRef: MonthRef }>()
const emit = defineEmits<{ close: []; updated: [] }>()
const current = ref(0)
const supportItems = ref<SupportItem[]>([])
const supportSaving = ref(false)
const { activePriorities, selectedPriorityIds, toggleTopPriority, isSaving } = useMonthlyReflectionWizard(toRef(props, 'monthRef'))
const steps: NextRitualStep[] = [
  { id: 'directions', label: 'Kierunki', short: 'Wybierz priorytety', kicker: 'KIERUNKI MIESIĄCA', question: 'Co ma prowadzić ten miesiąc?', description: 'Wybierz kilka kierunków uwagi — nie dodatkową listę zadań.' },
  { id: 'support', label: 'Wsparcie', short: 'Dobierz obiekty', kicker: 'KONKRETNE WSPARCIE', question: 'Co realnie wesprze te kierunki?', description: 'Połącz priorytety z celami, nawykami i mierzalnymi obiektami.' },
  { id: 'weeks', label: 'Tygodnie', short: 'Ułóż rytm miesiąca', kicker: 'RYTM TYGODNI', question: 'Kiedy to ma realną szansę się wydarzyć?', description: 'Rozmieść wsparcie w tygodniach i skalibruj targety.' },
  { id: 'review', label: 'Przegląd', short: 'Sprawdź plan', kicker: 'PRZED ZAPISEM', question: 'Czy kierunki mają konkretne wsparcie?', description: 'Sprawdź pokrycie priorytetów i obciążenie kolejnych tygodni.' },
]
const periodTitle = computed(() => new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(`${props.monthRef}-15T12:00:00`)))
const selectedPriorities = computed<Priority[]>(() => activePriorities.value.filter(priority => selectedPriorityIds.value.includes(priority.id)))
const supportCandidates = computed(() => supportItems.value.slice().sort((left, right) => Number(right.priorityMatch) - Number(left.priorityMatch)))
const activeSupportCount = computed(() => supportItems.value.filter(item => item.active).length)
const uncoveredPriorityCount = computed(() => selectedPriorityIds.value.filter(id => !supportItems.value.some(item => item.active && item.priorityIds.includes(id))).length)
const weekLoad = computed(() => getChildPeriods(props.monthRef).map((weekRef, index) => ({
  label: `T${weekRef.split('-W')[1]}`,
  count: supportItems.value.filter(item => item.active && item.weekCount > index).length,
})))

onMounted(() => void loadSupport())
watch(() => props.monthRef, () => void loadSupport())
watch(selectedPriorityIds, () => void loadSupport(), { deep: true })

async function loadSupport() {
  const bundle = await getMonthPlanningBundle(props.monthRef)
  supportItems.value = bundle.measurementItems.filter(item => item.subjectType !== 'tracker').map(item => {
    const priorityIds = 'priorityIds' in item.subject ? item.subject.priorityIds : []
    return { key: `${item.subjectType}:${item.subject.id}`, subjectType: item.subjectType, subjectId: item.subject.id, title: item.subject.title, active: item.planning.activityState === 'active', priorityIds, priorityMatch: priorityIds.some(id => selectedPriorityIds.value.includes(id)), weekCount: item.relatedWeekCount, source: item }
  })
}
async function toggleSupport(item: SupportItem) {
  supportSaving.value = true
  try {
    if (item.active) await deactivateMeasurementInMonth({ monthRef: props.monthRef, subjectType: item.subjectType, subjectId: item.subjectId })
    else await activateMeasurementInMonth({ monthRef: props.monthRef, subjectType: item.subjectType, subjectId: item.subjectId, targetOverride: 'target' in item.source.subject ? item.source.subject.target : undefined })
    await loadSupport(); emit('updated')
  } finally { supportSaving.value = false }
}
async function handlePlannerUpdated() { await loadSupport(); emit('updated') }
async function next() { if (current.value === 2) await loadSupport(); current.value += 1 }
function supportFor(priorityId: string) { return supportItems.value.filter(item => item.active && item.priorityIds.includes(priorityId)) }
function priorityTone(index: number) { return index === 1 ? 'lavender' : index === 2 ? 'mint' : 'blue' }
function priorityIcon(index: number) { return index === 0 ? 'directions_run' : index === 1 ? 'rocket_launch' : 'favorite' }
function typeLabel(type: MeasurementSubjectType) { return type === 'keyResult' ? 'Rezultat' : type === 'habit' ? 'Nawyk' : type === 'weeklyIntention' ? 'Intencja' : 'Tracker' }
function iconFor(type: MeasurementSubjectType) { return type === 'keyResult' ? 'flag' : type === 'habit' ? 'routine' : type === 'weeklyIntention' ? 'gps_fixed' : 'monitoring' }
</script>
