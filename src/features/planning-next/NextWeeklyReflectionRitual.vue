<template>
  <NextRitualShell
    eyebrow="Refleksja tygodnia"
    :period-title="periodTitle"
    mode="reflect"
    :steps="steps"
    :current="current"
    :selected-count="dataBundle?.weekObjectItems.length ?? 0"
    selection-label="obiekty"
    :period-pulse="`${dataBundle?.weeklySummary.totalJournalEntries ?? 0}`"
    pulse-label="wpisy dziennika"
    :saving="isSaving"
    :can-advance="canAdvance"
    finish-label="Zapisz refleksję"
    alternate-finish-label="Zapisz i planuj kolejny tydzień"
    @close="$emit('close')"
    @previous="go(current - 1)"
    @next="go(current + 1)"
    @go-to="go"
    @finish="finish"
    @alternate-finish="finishAndPlanNext"
  >
    <section v-if="current === 0" class="next-ritual__facts">
      <div class="next-ritual__fact-summary">
        <article><AppIcon name="task_alt" /><span><strong>{{ completionSignal }}%</strong><small>sygnałów wykonania</small></span></article>
        <article><AppIcon name="history_edu" /><span><strong>{{ dataBundle?.weeklySummary.totalJournalEntries ?? 0 }}</strong><small>wpisów dziennika</small></span></article>
        <article><AppIcon name="cognition" /><span><strong>{{ dataBundle?.weeklySummary.totalEmotionLogs ?? 0 }}</strong><small>zapisów emocji</small></span></article>
        <article><AppIcon name="psychology" /><span><strong>{{ dataBundle?.weeklySummary.totalExercises ?? 0 }}</strong><small>ćwiczeń</small></span></article>
      </div>
      <div class="next-ritual__days">
        <article v-for="day in dataBundle?.dailyBreakdown ?? []" :key="day.dayRef">
          <span>{{ dayLabel(day.dayRef) }}</span><i :class="{ active: daySignal(day) > 0 }"><b /></i><strong>{{ daySignal(day) }}</strong><small>aktywności</small>
        </article>
      </div>
      <aside><AppIcon name="view_list" /><span><strong>{{ dataBundle?.weekObjectItems.length ?? 0 }} obiektów przejrzysz osobno</strong><small>W kolejnym kroku dodasz komentarz tylko tam, gdzie sam wynik nie wystarcza.</small></span><AppIcon name="arrow_forward" /></aside>
    </section>

    <section v-else-if="current === 1" class="next-ritual__object-review">
      <ReflectionObjectReview
        v-if="dataBundle"
        v-model:comments="objectComments"
        :items="dataBundle.weekObjectItems"
        :raw-entries="dataBundle.rawEntries"
        :all-day-assignments="dataBundle.allDayAssignments"
        :week-ref="weekRef"
        :today-day-ref="weekEnd"
        :top-priority-keys="topPriorityKeys"
      />
      <DsState v-else title="Ładuję fakty" body="Zbieram wyniki obiektów z tego tygodnia." />
    </section>

    <section v-else-if="activeArea" class="next-ritual__area-rating">
      <header><span><AppIcon :name="activeArea.icon" /></span><div><small>OBSZAR</small><h2>{{ activeArea.label }}</h2><p>{{ activeArea.hint }}</p></div></header>
      <article v-for="axis in activeArea.axes" :key="axis.key" :class="`axis-${axis.tone}`">
        <span><i /><strong>{{ axis.label }}</strong><small>{{ axis.hint }}</small></span>
        <div><button v-for="value in 5" :key="value" type="button" :class="{ active: ratingValue(axis.key) === value }" :aria-label="`${activeArea.label}, ${axis.label}: ${value} z 5`" @click="setRating(axis.key, value)">{{ value }}</button></div>
      </article>
    </section>

    <section v-else-if="current === 6" class="next-ritual__anchors">
      <label v-for="(anchor, index) in anchors" :key="anchor.key" :class="{ open: openAnchor === index }">
        <button type="button" @click="openAnchor = openAnchor === index ? null : index"><span><AppIcon :name="anchor.icon" /><strong>{{ anchor.label }}</strong></span><AppIcon name="expand_more" /></button>
        <textarea v-if="openAnchor === index" :value="promptResponses[anchor.key] ?? ''" rows="4" placeholder="Krótko — tylko to, co chcesz pamiętać." @input="setAnchor(anchor.key, $event)" />
      </label>
    </section>

    <ReflectionJournalSidebar
      v-else
      class="next-ritual__journal-adapter"
      :model-value="freeformReflection"
      placeholder="Co chcesz zapamiętać z tego tygodnia?"
      :anchors="promptResponses"
      :anchor-categories="anchors"
      :rating-groups="weeklyRatingSummary"
      :data-bundle="dataBundle"
      :week-ref="weekRef"
      :ai-summary="aiSummary"
      :summary-context="summaryContext"
      @update:model-value="freeformReflection = $event"
      @update:ai-summary="aiSummary = $event"
    />
  </NextRitualShell>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue'
import type { DayRef, WeekRef } from '@/domain/period'
import type { WeeklyRatingKey } from '@/domain/reflection'
import type { DailyActivityBreakdown } from '@/services/reflectionDataQueries'
import { getPeriodBounds } from '@/utils/periods'
import { useWeeklyReflectionWizard } from '@/composables/useWeeklyReflectionWizard'
import AppIcon from '@/components/shared/AppIcon.vue'
import ReflectionObjectReview from '@/components/calendar/ReflectionObjectReview.vue'
import ReflectionJournalSidebar from '@/components/calendar/ReflectionJournalSidebar.vue'
import type { SidebarRatingGroup } from '@/components/calendar/ReflectionJournalSidebar.vue'
import { DsState } from '@/design-system/components'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'
import NextRitualShell, { type NextRitualStep } from './NextRitualShell.vue'

interface Axis { key: WeeklyRatingKey; label: string; hint: string; tone: 'effort' | 'state' }
interface Area { key: string; label: string; hint: string; icon: string; step: 2 | 3 | 4 | 5; axes: Axis[] }

const props = defineProps<{ weekRef: WeekRef }>()
const emit = defineEmits<{ close: []; updated: []; 'plan-next-week': [] }>()
const current = ref(0)
const openAnchor = ref<number | null>(0)
const saveError = ref('')
const {
  dataBundle, objectComments, topPriorityKeys, ratingRefsByKey, promptResponses,
  freeformReflection, aiSummary, isSaving, save, goToStep,
} = useWeeklyReflectionWizard(toRef(props, 'weekRef'))

const steps: NextRitualStep[] = [
  { id: 'facts', label: 'Fakty', short: 'Rytm siedmiu dni', kicker: 'FAKTY TYGODNIA', question: 'Jak wyglądał rytm tygodnia?', description: 'Najpierw zobacz fakty — bez interpretacji i oceniania siebie.' },
  { id: 'objects', label: 'Przegląd obiektów', short: 'Plan a wykonanie', kicker: 'PLAN A WYKONANIE', question: 'Co wydarzyło się naprawdę?', description: 'Przejrzyj wynik i dopisz komentarz tylko tam, gdzie jest potrzebny.' },
  { id: 'body', label: 'Ciało', short: 'Energia i regeneracja', kicker: 'OBSZAR · CIAŁO', question: 'Jak ciało przeżyło ten tydzień?', description: 'Oceń świadomy wysiłek oraz końcowy stan.' },
  { id: 'emotions', label: 'Emocje', short: 'Kontakt i przestrzeń', kicker: 'OBSZAR · EMOCJE', question: 'Co działo się w emocjach?', description: 'Oddziel to, co robiłeś, od tego, jak się czułeś.' },
  { id: 'action', label: 'Działanie', short: 'Ruch i koszt tempa', kicker: 'OBSZAR · DZIAŁANIE', question: 'Jak wyglądało działanie?', description: 'Nazwij tempo, skuteczność i odczuwany koszt.' },
  { id: 'relations', label: 'Relacje', short: 'Kontakt i obecność', kicker: 'OBSZAR · RELACJE', question: 'Ile było prawdziwego kontaktu?', description: 'Oceń troskę o relacje i poczucie połączenia.' },
  { id: 'anchors', label: 'Kotwice', short: 'To, co warto pamiętać', kicker: 'KOTWICE REFLEKSJI', question: 'Trzy pytania, które porządkują tydzień', description: 'Zapisz tylko to, co naprawdę chcesz zabrać dalej.' },
  { id: 'journal', label: 'Dziennik', short: 'Własna synteza', kicker: 'DZIENNIK TYGODNIA', question: 'Zamknij tydzień własnymi słowami', description: 'Połącz fakty, oceny i kotwice w krótką syntezę.' },
]
const areas: Area[] = [
  { key: 'body', label: 'Ciało', hint: 'Energia, regeneracja i fizyczne napięcie.', icon: 'accessibility_new', step: 2, axes: [{ key: 'physicalCareRating', label: 'Wysiłek', hint: 'Ile świadomej troski włożyłeś?', tone: 'effort' }, { key: 'energyRating', label: 'Stan', hint: 'Jak ciało czuło się na koniec?', tone: 'state' }] },
  { key: 'emotions', label: 'Emocje', hint: 'Kontakt z emocjami i przestrzeń na przeżycie.', icon: 'cognition', step: 3, axes: [{ key: 'emotionalProcessingRating', label: 'Wysiłek', hint: 'Ile uwagi dałeś emocjom?', tone: 'effort' }, { key: 'moodRating', label: 'Stan', hint: 'Jaki był końcowy stan emocjonalny?', tone: 'state' }] },
  { key: 'action', label: 'Działanie', hint: 'Ruch w ważnym kierunku i koszt tempa.', icon: 'directions_run', step: 4, axes: [{ key: 'productivityRating', label: 'Wysiłek', hint: 'Ile świadomego działania włożyłeś?', tone: 'effort' }, { key: 'calmRating', label: 'Stan', hint: 'Na ile pozostałeś nad zadaniami?', tone: 'state' }] },
  { key: 'relations', label: 'Relacje', hint: 'Obecność, kontakt i wpływ relacji.', icon: 'diversity_1', step: 5, axes: [{ key: 'closeOnesSupportRating', label: 'Wysiłek', hint: 'Ile troski dałeś relacjom?', tone: 'effort' }, { key: 'connectionRating', label: 'Stan', hint: 'Na ile czułeś połączenie?', tone: 'state' }] },
]
const anchors = [
  { key: 'wentWell', label: 'Co poszło dobrze', icon: 'thumb_up' },
  { key: 'challenges', label: 'Co było trudne', icon: 'warning' },
  { key: 'lessons', label: 'Lekcje i spostrzeżenia', icon: 'lightbulb' },
]
const activeArea = computed(() => areas.find(area => area.step === current.value))
const weekEnd = computed(() => getPeriodBounds(props.weekRef).end as DayRef)
const periodTitle = computed(() => {
  const bounds = getPeriodBounds(props.weekRef)
  const format = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })
  return `${format.format(new Date(`${bounds.start}T12:00:00`))}–${format.format(new Date(`${bounds.end}T12:00:00`))}`
})
const completionSignal = computed(() => {
  const bundle = dataBundle.value
  if (!bundle?.weeklySummary.weeklyHabits.length) return 0
  const met = bundle.weeklySummary.weeklyHabits.filter(item => item.evaluationStatus === 'met').length
  return Math.round(met / bundle.weeklySummary.weeklyHabits.length * 100)
})
const canAdvance = computed(() => !saveError.value)
const weeklyRatingSummary = computed<SidebarRatingGroup[]>(() => [
  { title: 'Wysiłek', items: areas.map(area => ({ label: area.label, value: ratingValue(area.axes[0].key) })) },
  { title: 'Stan', items: areas.map(area => ({ label: area.label, value: ratingValue(area.axes[1].key) })) },
])
const summaryPriorities = computed<ReflectionPriorityLine[]>(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  const priorityKeys = new Set(topPriorityKeys.value)
  return bundle.weekObjectItems
    .filter(item => priorityKeys.has(item.key) || (objectComments.value[item.key] ?? '').trim().length > 0)
    .map(item => ({ title: item.subject.title, status: item.measurement.evaluationStatus, comment: objectComments.value[item.key] }))
})
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'weekly',
    periodLabel: `${props.weekRef} · ${periodTitle.value}`,
    ratings: weeklyRatingSummary.value.flatMap(group => group.items),
    anchors: anchors.map(anchor => ({ label: anchor.label, text: (promptResponses.value[anchor.key] ?? '').trim() })).filter(anchor => anchor.text.length > 0),
    freeform: freeformReflection.value,
    journalEntries: bundle?.journalEntries ?? [],
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    priorities: summaryPriorities.value,
  }
})

function go(index: number) {
  if (index < 0 || index >= steps.length) return
  current.value = index
  if (index === 1) goToStep('review')
  const area = areas.find(item => item.step === index)
  if (area) goToStep(area.key === 'action' ? 'tasks' : area.key === 'relations' ? 'closeOnes' : area.key as 'body' | 'emotions')
  if (index === 6) goToStep('anchors')
  if (index === 7) goToStep('journal')
}
function daySignal(day: DailyActivityBreakdown) { return day.habits.items.length + day.emotions.totalLogs + day.journal.items.length + day.exercises.count + day.keyResults.items.length + day.trackers.items.length }
function dayLabel(dayRef: string) { return new Intl.DateTimeFormat('pl-PL', { weekday: 'short', day: 'numeric' }).format(new Date(`${dayRef}T12:00:00`)).replace('.', '') }
function ratingValue(key: WeeklyRatingKey) { return ratingRefsByKey[key].value }
function setRating(key: WeeklyRatingKey, value: number) { ratingRefsByKey[key].value = ratingRefsByKey[key].value === value ? null : value }
function setAnchor(key: string, event: Event) { promptResponses.value = { ...promptResponses.value, [key]: (event.target as HTMLTextAreaElement).value } }
async function finish() { try { saveError.value = ''; await save(); emit('updated'); emit('close') } catch (error) { saveError.value = error instanceof Error ? error.message : String(error) } }
async function finishAndPlanNext() { try { saveError.value = ''; await save(); emit('updated'); emit('plan-next-week') } catch (error) { saveError.value = error instanceof Error ? error.message : String(error) } }
</script>
