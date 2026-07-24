<template>
  <NextRitualShell
    eyebrow="Refleksja miesiąca"
    :period-title="periodTitle"
    mode="reflect"
    :steps="steps"
    :current="current"
    :selected-count="selectedPriorityIds.length"
    selection-label="priorytety"
    :period-pulse="`${ratedDimensions}/5`"
    pulse-label="oceny kompasu"
    period-icon="calendar_view_month"
    :saving="isSaving"
    finish-label="Zapisz refleksję"
    @close="$emit('close')"
    @previous="go(current - 1)"
    @next="go(current + 1)"
    @go-to="go"
    @finish="finish"
  >
    <section v-if="current === 0" class="next-ritual__priority-review">
      <article v-for="(priority, index) in activePriorities" :key="priority.id" :class="`tone-${priorityTone(index)}`">
        <header><span><AppIcon :name="priority.icon || priorityIcon(index)" /></span><div><small>PRIORYTET <AppIcon v-if="selectedPriorityIds.includes(priority.id)" name="star" /></small><strong>{{ priority.title }}</strong><em>{{ priority.desiredDirection || 'Kierunek bez opisu' }}</em></div></header>
        <div class="next-ritual__priority-axis"><span><i />Wysiłek</span><div><button v-for="value in 5" :key="value" type="button" :class="{ active: assessmentFor(priority.id).effort === value }" @click="setEffort(priority.id, value)">{{ value }}</button></div></div>
        <div class="next-ritual__priority-rollup"><span><AppIcon name="calendar_view_week" /><strong>{{ focusCount(priority.id) }}</strong><small>tygodnie z fokusem</small></span><p>{{ focusObjects(priority.id).join(' · ') || 'Brak przypisanych obiektów' }}</p></div>
        <label><span>Werdykt</span><select :value="assessmentFor(priority.id).verdict ?? ''" @change="setVerdict(priority.id, $event)"><option value="">—</option><option value="continue">Kontynuuj</option><option value="adjust">Dostosuj</option><option value="pause">Wstrzymaj</option><option value="drop">Porzuć</option></select></label>
        <div v-for="kind in signalKinds" :key="kind.key" v-show="signalChips(priority, kind.key).length" class="next-ritual__priority-signals">
          <span>{{ kind.label }} <small>zauważone w tym miesiącu</small></span>
          <div>
            <button
              v-for="chip in signalChips(priority, kind.key)"
              :key="chip.label"
              type="button"
              :class="['signal-chip', `signal-chip--${kind.key}`, { active: chip.active }]"
              :aria-pressed="chip.active"
              @click="toggleObservedSignal(priority.id, kind.key, chip.label)"
            >{{ chip.label }}</button>
          </div>
        </div>
        <label><span>Dlaczego? <small>opcjonalnie</small></span><textarea :value="assessmentFor(priority.id).note" rows="2" placeholder="Dlaczego? (opcjonalnie)" @input="setNote(priority.id, $event)" /></label>
      </article>
    </section>

    <section v-else-if="current === 1" class="next-ritual__rating-list">
      <article v-for="dimension in dimensions" :key="dimension.key">
        <span><AppIcon :name="dimension.icon" /></span><span><strong>{{ dimension.label }}</strong><small>{{ dimension.hint }}</small></span>
        <div><button v-for="value in 5" :key="value" type="button" :class="{ active: dimension.ref.value === value }" @click="dimension.ref.value = dimension.ref.value === value ? null : value">{{ value }}</button></div>
      </article>
    </section>

    <section v-else-if="current === 2" class="next-ritual__anchors">
      <label v-for="(anchor, index) in anchors" :key="anchor.key" :class="{ open: openAnchor === index }">
        <button type="button" @click="openAnchor = openAnchor === index ? null : index"><span><AppIcon :name="anchor.icon" /><strong>{{ anchor.label }}</strong></span><AppIcon name="expand_more" /></button>
        <textarea v-if="openAnchor === index" :value="promptResponses[anchor.key] ?? ''" rows="4" placeholder="Krótko — tylko to, co chcesz pamiętać." @input="setAnchor(anchor.key, $event)" />
      </label>
    </section>

    <ReflectionJournalSidebar
      v-else
      class="next-ritual__journal-adapter"
      :model-value="freeformReflection"
      placeholder="Co chcesz zapamiętać z tego miesiąca?"
      :anchors="promptResponses"
      :anchor-categories="anchors"
      :rating-groups="monthlyRatingSummary"
      :ai-summary="aiSummary"
      :summary-context="summaryContext"
      @update:model-value="freeformReflection = $event"
      @update:ai-summary="aiSummary = $event"
    />
  </NextRitualShell>
</template>

<script setup lang="ts">
import { computed, ref, toRef, type Ref } from 'vue'
import type { MonthRef } from '@/domain/period'
import type { Priority } from '@/domain/planning'
import type { PriorityVerdict } from '@/domain/planningState'
import { useMonthlyReflectionWizard } from '@/composables/useMonthlyReflectionWizard'
import AppIcon from '@/components/shared/AppIcon.vue'
import ReflectionJournalSidebar from '@/components/calendar/ReflectionJournalSidebar.vue'
import type { SidebarRatingGroup } from '@/components/calendar/ReflectionJournalSidebar.vue'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'
import NextRitualShell, { type NextRitualStep } from './NextRitualShell.vue'

const props = defineProps<{ monthRef: MonthRef }>()
const emit = defineEmits<{ close: []; updated: [] }>()
const current = ref(0)
const openAnchor = ref<number | null>(0)
const saveError = ref('')
const {
  dataBundle, activePriorities, selectedPriorityIds, assessmentFor, updateAssessment, toggleObservedSignal, focusConfrontation,
  balanceRating, purposeRating, growthRating, coherenceRating, agencyRating,
  promptResponses, freeformReflection, aiSummary, isSaving, save, goToStep,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

const signalKinds = [
  { key: 'progress' as const, label: 'Sygnały postępu' },
  { key: 'risk' as const, label: 'Sygnały ryzyka' },
]

/**
 * Chips = the priority's currently-defined signals unioned with any already
 * checked (so a chip stays visible in history even if the signal was later
 * removed from the priority). `active` marks the ones noticed this month.
 */
function signalChips(priority: Priority, kind: 'progress' | 'risk'): Array<{ label: string; active: boolean }> {
  const defined = kind === 'progress' ? priority.progressSignals : priority.riskSignals
  const observed = kind === 'progress'
    ? assessmentFor(priority.id).observedProgressSignals
    : assessmentFor(priority.id).observedRiskSignals
  const labels = Array.from(new Set([...(defined ?? []), ...observed]))
  return labels.map((label) => ({ label, active: observed.includes(label) }))
}
const steps: NextRitualStep[] = [
  { id: 'priorities', label: 'Priorytety', short: 'Wysiłek i decyzje', kicker: 'PRIORYTETY MIESIĄCA', question: 'Jak wyglądała realna praca nad kierunkami?', description: 'Oceń wysiłek, zobacz dowody i zdecyduj, co zrobić dalej.' },
  { id: 'compass', label: 'Kompas', short: 'Pięć wymiarów', kicker: 'KOMPAS JAKOŚCIOWY', question: 'Jakiego miesiąca doświadczyłeś?', description: 'Brak oceny pozostaje brakiem danych — nie zerem.' },
  { id: 'anchors', label: 'Kotwice', short: 'To, co zabierasz dalej', kicker: 'KOTWICE MIESIĄCA', question: 'Co zabierasz dalej, a co zostawiasz?', description: 'Otwórz tylko pytania, które pomagają nazwać korektę.' },
  { id: 'journal', label: 'Dziennik', short: 'Synteza i korekta', kicker: 'SYNTEZA', question: 'Zamknij miesiąc własnymi słowami', description: 'Połącz priorytety, kompas i kotwice w jedną notatkę.' },
]
const dimensions: Array<{ key: string; label: string; hint: string; icon: string; ref: Ref<number | null> }> = [
  { key: 'balance', label: 'Balans', hint: 'Tempo, odpoczynek i napięcie.', icon: 'balance', ref: balanceRating },
  { key: 'purpose', label: 'Sens', hint: 'Kontakt z tym, co naprawdę ważne.', icon: 'explore', ref: purposeRating },
  { key: 'growth', label: 'Rozwój', hint: 'Uczenie się i realne przesunięcie.', icon: 'trending_up', ref: growthRating },
  { key: 'coherence', label: 'Spójność', hint: 'Zgodność działań z kierunkami.', icon: 'hub', ref: coherenceRating },
  { key: 'agency', label: 'Sprawczość', hint: 'Wpływ, wybór i możliwość działania.', icon: 'ads_click', ref: agencyRating },
]
const anchors = [
  { key: 'proudOf', label: 'Z czego jestem dumny', icon: 'workspace_premium' },
  { key: 'challenges', label: 'Największe wyzwania', icon: 'warning' },
  { key: 'growth', label: 'Jak się rozwinąłem', icon: 'trending_up' },
]
const periodTitle = computed(() => new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' }).format(new Date(`${props.monthRef}-15T12:00:00`)))
const ratedDimensions = computed(() => dimensions.filter(dimension => dimension.ref.value !== null).length)
const focusByPriority = computed(() => new Map((focusConfrontation.value?.perPriority ?? []).map(item => [item.priorityId, item])))
const monthlyRatingSummary = computed<SidebarRatingGroup[]>(() => [{
  title: 'Kompas miesiąca',
  items: dimensions.map(dimension => ({ label: dimension.label, value: dimension.ref.value })),
}])
const summaryPriorities = computed<ReflectionPriorityLine[]>(() => activePriorities.value
  .filter(priority => {
    const assessment = assessmentFor(priority.id)
    return selectedPriorityIds.value.includes(priority.id) || assessment.effort != null || assessment.verdict != null || assessment.note.trim().length > 0 || assessment.observedProgressSignals.length > 0 || assessment.observedRiskSignals.length > 0
  })
  .map(priority => {
    const assessment = assessmentFor(priority.id)
    return { title: priority.title, effort: assessment.effort, verdict: assessment.verdict, comment: assessment.note.trim() || undefined }
  }))
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'monthly',
    periodLabel: periodTitle.value,
    ratings: monthlyRatingSummary.value.flatMap(group => group.items),
    priorities: summaryPriorities.value,
    anchors: anchors.map(anchor => ({ label: anchor.label, text: (promptResponses.value[anchor.key] ?? '').trim() })).filter(anchor => anchor.text.length > 0),
    freeform: freeformReflection.value,
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    weeklyTrends: (bundle?.weeklyRatingTrends ?? []).map(trend => ({
      weekLabel: trend.weekRef,
      mood: trend.moodRating,
      energy: trend.energyRating,
      calm: trend.calmRating,
      connection: trend.connectionRating,
    })),
    weeklyExcerpts: (bundle?.weeklyReflectionDetails ?? []).map(detail => ({ weekLabel: detail.weekRef, text: detail.freeformReflection })).filter(item => item.text.trim().length > 0),
    goals: (bundle?.goalSummaries ?? []).map(goal => ({ title: goal.goal.title, metKRs: goal.keyResults.filter(result => result.evaluationStatus === 'met').length, totalKRs: goal.keyResults.length })),
    habits: (bundle?.habitDetails ?? []).map(habit => ({ title: habit.title, status: habit.evaluationStatus })),
    trackers: (bundle?.trackerDetails ?? []).map(tracker => ({ title: tracker.title, latest: tracker.latestValue ?? null })),
  }
})

function go(index: number) {
  if (index < 0 || index >= steps.length) return
  current.value = index
  goToStep(index === 0 ? 'priorities-review' : index === 1 ? 'ratings' : index === 2 ? 'anchors' : 'journal')
}
function setEffort(priorityId: string, value: number) { updateAssessment(priorityId, { effort: assessmentFor(priorityId).effort === value ? null : value }) }
function setVerdict(priorityId: string, event: Event) { const value = (event.target as HTMLSelectElement).value; updateAssessment(priorityId, { verdict: (value || null) as PriorityVerdict | null }) }
function setNote(priorityId: string, event: Event) { updateAssessment(priorityId, { note: (event.target as HTMLTextAreaElement).value }) }
function focusCount(priorityId: string) { return focusByPriority.value.get(priorityId)?.focusWeekRefs.length ?? 0 }
function focusObjects(priorityId: string) { return (focusByPriority.value.get(priorityId)?.objects ?? []).map(item => item.title) }
function setAnchor(key: string, event: Event) { promptResponses.value = { ...promptResponses.value, [key]: (event.target as HTMLTextAreaElement).value } }
function priorityTone(index: number) { return index === 1 ? 'lavender' : index === 2 ? 'mint' : 'blue' }
function priorityIcon(index: number) { return index === 0 ? 'directions_run' : index === 1 ? 'rocket_launch' : 'favorite' }
async function finish() { try { saveError.value = ''; await save(); emit('updated'); emit('close') } catch (error) { saveError.value = error instanceof Error ? error.message : String(error) } }
</script>
