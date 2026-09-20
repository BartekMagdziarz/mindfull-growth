<template>
  <QuietRitualShell
    scale="month"
    eyebrow="Refleksja miesiąca"
    :period-title="periodTitle"
    :steps="steps"
    :current="current"
    :wide="current === 3"
    :saving="isSaving"
    :finished="saved"
    finish-label="Zapisz refleksję"
    finished-label="Zapisano"
    alternate-label="Zapisz i zaplanuj kolejny miesiąc"
    @close="emit('close')"
    @go="go"
    @finish="finish"
    @alternate="finishAndPlanNext"
  >
    <!-- 1 · Priorytety — one direction open at a time -->
    <section v-if="current === 0" class="qm-priorities">
      <article v-for="priority in activePriorities" :key="priority.id" class="qm-priority">
        <button
          type="button"
          class="qm-priority-head"
          :aria-expanded="openPriority === priority.id"
          @click="openPriority = openPriority === priority.id ? '' : priority.id"
        >
          <AppIcon :name="priority.icon || 'explore'" /><strong>{{ priority.title }}</strong>
          <AppIcon v-if="selectedPriorityIds.includes(priority.id)" name="star" />
          <span v-if="assessmentFor(priority.id).effort != null">{{ assessmentFor(priority.id).effort }}/5</span>
          <small v-if="assessmentFor(priority.id).verdict">{{ VERDICT_LABEL[assessmentFor(priority.id).verdict ?? ''] }}</small>
          <AppIcon name="expand_more" />
        </button>
        <div v-if="openPriority === priority.id" class="qm-priority-body">
          <QuietRatingBar
            :model-value="assessmentFor(priority.id).effort"
            label="Wysiłek"
            effort
            hint="Ile świadomej uwagi i energii poświęciłeś temu kierunkowi? To nie ocena rezultatu."
            @update:model-value="setEffort(priority.id, $event)"
          />
          <div class="qm-decisions">
            <div class="qm-verdicts" role="group" :aria-label="`Decyzja: ${priority.title}`">
              <button
                v-for="verdict in VERDICT_OPTIONS"
                :key="verdict"
                type="button"
                class="qr-quiet"
                :aria-pressed="assessmentFor(priority.id).verdict === verdict"
                @click="setVerdict(priority.id, verdict)"
              >
                {{ VERDICT_LABEL[verdict] }}
              </button>
            </div>
            <details>
              <summary>Uzasadnienie</summary>
              <textarea
                :value="assessmentFor(priority.id).note"
                rows="3"
                :aria-label="`Uzasadnienie: ${priority.title}`"
                @input="setNote(priority.id, $event)"
              />
            </details>
            <details>
              <summary>Kontekst kierunku</summary>
              <p v-if="priority.desiredDirection">{{ priority.desiredDirection }}</p>
              <p class="qm-focus-line">
                <AppIcon name="calendar_view_week" />{{ focusWeekCount(priority.id) }}
                {{ plural(focusWeekCount(priority.id), 'tydzień z fokusem', 'tygodnie z fokusem', 'tygodni z fokusem') }}
              </p>
              <ul v-if="evidenceFor(priority.id).length" class="qm-evidence">
                <li v-for="entry in evidenceFor(priority.id)" :key="entry.title">
                  <strong>{{ entry.title }}</strong><span>{{ entry.readout }}</span>
                </li>
              </ul>
              <p v-else>Brak powiązanych obiektów z zapisem w tym miesiącu.</p>
              <details v-for="kind in SIGNAL_KINDS" :key="kind.key">
                <summary>{{ kind.label }}</summary>
                <div class="qm-signals">
                  <button
                    v-for="chip in signalChips(priority, kind.key)"
                    :key="chip.label"
                    type="button"
                    class="qr-quiet"
                    :aria-pressed="chip.active"
                    @click="toggleObservedSignal(priority.id, kind.key, chip.label)"
                  >
                    {{ chip.label }}
                  </button>
                  <span v-if="!signalChips(priority, kind.key).length">Brak zdefiniowanych sygnałów.</span>
                </div>
              </details>
            </details>
          </div>
        </div>
      </article>
      <p v-if="!activePriorities.length" class="qr-empty">Brak kierunków. Możesz przejść do kompasu miesiąca.</p>
    </section>

    <!-- 2 · Kompas -->
    <section v-else-if="current === 1" class="qm-compass">
      <QuietRatingBar
        v-for="axis in COMPASS"
        :key="axis.key"
        :label="axis.label"
        :hint="axis.hint"
        compact
        :model-value="axis.ref.value"
        :previous="previousCompass[axis.key] ?? null"
        previous-label="Poprzedni miesiąc"
        @update:model-value="setCompass(axis, $event)"
      />
    </section>

    <!-- 3 · Kotwice -->
    <section v-else-if="current === 2" class="qm-anchors">
      <article v-for="(anchor, index) in ANCHORS" :key="anchor.key">
        <button
          type="button"
          class="qm-anchor-head"
          :aria-expanded="openAnchor === index"
          @click="openAnchor = openAnchor === index ? null : index"
        >
          <AppIcon :name="anchor.icon" /><strong>{{ anchor.label }}</strong><AppIcon name="expand_more" />
        </button>
        <textarea
          v-if="openAnchor === index"
          :value="promptResponses[anchor.key] ?? ''"
          :aria-label="anchor.label"
          rows="4"
          placeholder="Zapisz własnymi słowami…"
          @input="setAnchor(anchor.key, $event)"
        />
        <p v-else-if="promptResponses[anchor.key]">{{ promptResponses[anchor.key] }}</p>
      </article>
    </section>

    <!-- 4 · Dziennik -->
    <section v-else class="qm-journal" :class="{ 'qm-journal--open': contextOpen }">
      <div>
        <textarea
          v-model="freeformReflection"
          aria-label="Refleksja miesiąca"
          rows="13"
          placeholder="Co chcesz zapamiętać z tego miesiąca?"
        />
        <div class="qm-journal-tools">
          <small>{{ wordCount }} {{ plural(wordCount, 'słowo', 'słowa', 'słów') }}</small>
          <button type="button" class="qr-quiet" :aria-expanded="contextOpen" @click="contextOpen = !contextOpen">
            <AppIcon name="view_sidebar" />Kontekst
          </button>
          <button type="button" class="qr-quiet" :aria-expanded="aiOpen" @click="aiOpen = !aiOpen">
            <AppIcon name="auto_awesome" />AI
          </button>
        </div>
        <QuietJournalAi
          v-if="aiOpen"
          :summary-context="summaryContext"
          :ai-summary="aiSummary"
          @update:ai-summary="aiSummary = $event"
          @insert="insertIntoJournal"
        />
      </div>

      <aside v-if="contextOpen" class="qm-context" aria-label="Kontekst miesiąca">
        <section v-if="assessedPriorities.length">
          <h3>Kierunki</h3>
          <article v-for="priority in assessedPriorities" :key="priority.id">
            <strong>{{ priority.title }}</strong>
            <p>
              Wysiłek {{ assessmentFor(priority.id).effort ?? '—' }} ·
              {{ VERDICT_LABEL[assessmentFor(priority.id).verdict ?? ''] ?? 'Bez decyzji' }}
            </p>
            <blockquote v-if="assessmentFor(priority.id).note">{{ assessmentFor(priority.id).note }}</blockquote>
            <p v-if="assessmentFor(priority.id).observedProgressSignals.length">
              {{ assessmentFor(priority.id).observedProgressSignals.join(' · ') }}
            </p>
            <p v-if="assessmentFor(priority.id).observedRiskSignals.length">
              {{ assessmentFor(priority.id).observedRiskSignals.join(' · ') }}
            </p>
          </article>
        </section>

        <section v-if="COMPASS.some(axis => axis.ref.value != null)">
          <h3>Kompas</h3>
          <div class="qm-mini-compass">
            <span v-for="axis in COMPASS" :key="axis.key">
              <i :style="{ height: `${(axis.ref.value ?? 0) * 12}px` }" /><b>{{ axis.ref.value ?? '—' }}</b>
              <small>{{ axis.label }}</small>
            </span>
          </div>
        </section>

        <section v-if="filledAnchors.length">
          <h3>Kotwice</h3>
          <button
            v-for="anchor in filledAnchors"
            :key="anchor.key"
            type="button"
            class="qr-quiet qm-anchor-link"
            @click="editAnchor(anchor.key)"
          >
            <strong>{{ anchor.label }}</strong>{{ anchor.text }}
          </button>
        </section>

        <section v-if="weeklyExcerpts.length || weekSeriesRated">
          <h3>Z tygodni</h3>
          <div v-if="weekSeriesRated" class="qm-ctx-weeks" aria-label="Obciążenie i stan w tygodniach miesiąca">
            <div v-for="area in AREAS" :key="area.key" class="qm-ctx-weeks__row">
              <span><AppIcon :name="area.icon" />{{ t(areaTitleKey(area.key)) }}</span>
              <LoadStateRibbon :points="weekSeries[area.key]" :label="t(areaTitleKey(area.key))" :height="60" quiet @select="weekRef => emit('open-week', weekRef)" />
            </div>
            <div class="qm-ctx-weeks__axis" aria-hidden="true"><span v-for="week in weeks" :key="week.weekRef">{{ week.label }}</span></div>
          </div>
          <details v-for="excerpt in weeklyExcerpts" :key="excerpt.weekRef">
            <summary>{{ excerpt.label }}</summary>
            <p>{{ excerpt.text }}</p>
            <button type="button" class="qr-quiet" @click="emit('open-week', excerpt.weekRef)">
              Otwórz tydzień<AppIcon name="arrow_forward" />
            </button>
          </details>
        </section>

        <section v-if="emotionTotal">
          <h3>Emocje <small>{{ emotionTotal }}</small></h3>
          <div class="qm-emotion-weeks">
            <span>
              <QuietEmotionStack :emotions="monthQuadrants" slot-label="cały miesiąc" />
              <small>miesiąc</small>
            </span>
            <span v-for="week in emotionWeeks" :key="week.weekRef">
              <i class="qm-emotion-bar" :style="{ height: `${week.height}px` }" :title="`${week.range}: ${week.count}`" />
              <small>{{ week.label }}</small>
            </span>
          </div>
          <ul class="qm-emotion-chips">
            <li
              v-for="emotion in topEmotions"
              :key="emotion.name"
              :style="{
                background: `var(--color-quadrant-${emotion.quadrant}-tint)`,
                color: `var(--color-quadrant-${emotion.quadrant}-text)`,
              }"
            >
              {{ emotion.name }} <b>×{{ emotion.count }}</b>
            </li>
          </ul>
        </section>

        <section v-if="objectEvidence.length">
          <h3>Obiekty</h3>
          <details v-for="entry in objectEvidence" :key="entry.title">
            <summary>{{ entry.title }}</summary>
            <p>{{ entry.readout }}</p>
          </details>
        </section>
      </aside>
    </section>
  </QuietRitualShell>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, toRef, type Ref } from 'vue'
import type { MonthRef, WeekRef } from '@/domain/period'
import { QUADRANTS_IN_ORDER } from '@/domain/emotion'
import type { Priority } from '@/domain/planning'
import type { PriorityVerdict } from '@/domain/planningState'
import AppIcon from '@/components/shared/AppIcon.vue'
import { useMonthlyReflectionWizard } from '@/composables/useMonthlyReflectionWizard'
import { goalDexieRepository } from '@/repositories/goalDexieRepository'
import { habitDexieRepository } from '@/repositories/habitDexieRepository'
import { keyResultDexieRepository } from '@/repositories/keyResultDexieRepository'
import { structuredReflectionDexieRepository } from '@/repositories/structuredReflectionDexieRepository'
import { trackerDexieRepository } from '@/repositories/trackerDexieRepository'
import {
  emotionContextFromSummary,
  type ReflectionPriorityLine,
  type ReflectionSummaryContext,
} from '@/services/reflectionSummaryService'
import { getPeriodBounds, getPreviousPeriod } from '@/utils/periods'
import QuietEmotionStack from './QuietEmotionStack.vue'
import QuietJournalAi from './QuietJournalAi.vue'
import QuietRatingBar from './QuietRatingBar.vue'
import QuietRitualShell, { type QuietRitualStep } from './QuietRitualShell.vue'
import { formatQuietNumber, monthTitle, plural, quietMonthAreaSeries, quietMonthWeeks } from './quietRitualModel'
import LoadStateRibbon from '@/components/shared/charts/LoadStateRibbon.vue'
import { useT } from '@/composables/useT'
import { REFLECTION_MATRIX_AREAS, areaTitleKey } from '@/domain/reflectionMatrix'

const props = defineProps<{ monthRef: MonthRef }>()
const emit = defineEmits<{ close: []; updated: []; 'plan-next-month': []; 'open-week': [weekRef: WeekRef] }>()

const {
  dataBundle,
  activePriorities,
  selectedPriorityIds,
  assessmentFor,
  updateAssessment,
  toggleObservedSignal,
  focusConfrontation,
  balanceRating,
  purposeRating,
  growthRating,
  coherenceRating,
  agencyRating,
  promptResponses,
  freeformReflection,
  aiSummary,
  isSaving,
  save,
  goToStep,
} = useMonthlyReflectionWizard(toRef(props, 'monthRef'))

interface CompassAxis {
  key: 'balance' | 'purpose' | 'growth' | 'coherence' | 'agency'
  label: string
  hint: string
  ref: Ref<number | null>
}

/**
 * Compass labels stay the product's own (Spójność / Sprawczość). The Lab
 * proposed renaming them to "Zasady / Wpływ"; the keys and the stored meaning
 * are unchanged either way, so the rename is a separate decision.
 */
const COMPASS: CompassAxis[] = [
  { key: 'balance', label: 'Balans', hint: 'Miejsce na działanie i odpoczynek.', ref: balanceRating },
  { key: 'purpose', label: 'Sens', hint: 'Kontakt z tym, co naprawdę ważne.', ref: purposeRating },
  { key: 'growth', label: 'Rozwój', hint: 'Uczenie się i poszerzanie możliwości.', ref: growthRating },
  { key: 'coherence', label: 'Spójność', hint: 'Zgodność działań z własnymi kierunkami i wartościami.', ref: coherenceRating },
  { key: 'agency', label: 'Sprawczość', hint: 'Poczucie wyboru i możliwości działania.', ref: agencyRating },
]

const ANCHORS = [
  { key: 'proudOf', label: 'Z czego jestem dumny', icon: 'workspace_premium' },
  { key: 'challenges', label: 'Największe wyzwania', icon: 'mountain_flag' },
  { key: 'growth', label: 'Jak się rozwinąłem', icon: 'trending_up' },
]
const VERDICT_OPTIONS: PriorityVerdict[] = ['continue', 'adjust', 'pause', 'drop']
const VERDICT_LABEL: Record<string, string> = {
  continue: 'Kontynuuj',
  adjust: 'Dostosuj',
  pause: 'Wstrzymaj',
  drop: 'Porzuć',
}
const SIGNAL_KINDS = [
  { key: 'progress' as const, label: 'Sygnały postępu' },
  { key: 'risk' as const, label: 'Sygnały ryzyka' },
]

const steps: QuietRitualStep[] = [
  { id: 'priorities', label: 'Priorytety', question: 'Jaką uwagę poświęciłeś swoim kierunkom?' },
  { id: 'compass', label: 'Kompas', question: 'Jakiego miesiąca doświadczyłeś?' },
  { id: 'anchors', label: 'Kotwice', question: 'Co warto zapamiętać?' },
  { id: 'journal', label: 'Dziennik', question: 'Zamknij miesiąc własnymi słowami' },
]

const current = ref(0)
const openPriority = ref('')
const openAnchor = ref<number | null>(0)
const contextOpen = ref(false)
const aiOpen = ref(false)
const saved = ref(false)
const previousCompass = ref<Partial<Record<CompassAxis['key'], number | null>>>({})
/** `subjectType:id` → linked priority ids (key results inherit their goal's). */
const priorityIdsBySubject = ref(new Map<string, string[]>())

const periodTitle = computed(() => monthTitle(props.monthRef))
const weeks = computed(() => quietMonthWeeks(props.monthRef))
const { t } = useT()
const AREAS = REFLECTION_MATRIX_AREAS
const weekSeries = computed(() => quietMonthAreaSeries(weeks.value, dataBundle.value?.weeklyReflectionDetails ?? []))
const weekSeriesRated = computed(() => AREAS.some(area => weekSeries.value[area.key].some(point => point.load != null && point.state != null)))
const wordCount = computed(() => freeformReflection.value.trim().split(/\s+/).filter(Boolean).length)
const filledAnchors = computed(() =>
  ANCHORS.map(anchor => ({ ...anchor, text: (promptResponses.value[anchor.key] ?? '').trim() })).filter(anchor => anchor.text),
)
const assessedPriorities = computed(() =>
  activePriorities.value.filter(priority => {
    const assessment = assessmentFor(priority.id)
    return (
      assessment.effort != null ||
      assessment.verdict != null ||
      assessment.note.trim().length > 0 ||
      assessment.observedProgressSignals.length > 0 ||
      assessment.observedRiskSignals.length > 0
    )
  }),
)
const focusByPriority = computed(() => new Map((focusConfrontation.value?.perPriority ?? []).map(item => [item.priorityId, item])))

/** Object read-outs for the month, reused by the direction context and the journal panel. */
const objectEvidence = computed(() => {
  const bundle = dataBundle.value
  if (!bundle) return []
  return [
    ...bundle.goalSummaries.flatMap(goal =>
      goal.keyResults.map(result => ({
        key: `keyResult:${result.id}`,
        title: result.title,
        readout: readout(result.actualValue, result.target?.value),
      })),
    ),
    ...bundle.habitDetails.map(habit => ({
      key: `habit:${habit.id}`,
      title: habit.title,
      readout: readout(habit.actualValue, habit.target?.value),
    })),
    ...bundle.trackerDetails.map(tracker => ({
      key: `tracker:${tracker.id}`,
      title: tracker.title,
      readout: tracker.latestValue == null ? 'Brak zapisów' : `ostatnio ${formatQuietNumber(tracker.latestValue)}`,
    })),
  ].filter(entry => entry.readout !== 'Brak zapisów')
})

const weeklyExcerpts = computed(() =>
  (dataBundle.value?.weeklyReflectionDetails ?? [])
    .filter(detail => detail.freeformReflection.trim().length > 0)
    .map(detail => ({
      weekRef: detail.weekRef,
      label: weeks.value.find(week => week.weekRef === detail.weekRef)?.range ?? detail.weekRef,
      text: detail.freeformReflection,
    })),
)

const emotionTotal = computed(() => dataBundle.value?.emotionSummary.totalLogs ?? 0)
const topEmotions = computed(() => (dataBundle.value?.emotionSummary.topEmotions ?? []).slice(0, 5))
/**
 * The month bundle carries a quadrant distribution for the whole month (no
 * per-week split), so the stack shows the month and the weeks show how many
 * logs each one holds — a real rhythm without inventing per-week quadrants.
 */
const monthQuadrants = computed(() => {
  const distribution = dataBundle.value?.emotionSummary.quadrantDistribution
  if (!distribution) return []
  return QUADRANTS_IN_ORDER.flatMap(quadrant =>
    Array.from({ length: distribution[quadrant] ?? 0 }, () => ({ name: quadrant, quadrant })),
  )
})
const emotionWeeks = computed(() => {
  const logs = dataBundle.value?.emotionLogs ?? []
  const perWeek = weeks.value.map(week => {
    const bounds = getPeriodBounds(week.weekRef)
    const dayRefs = logs.map(log => log.createdAt.slice(0, 10))
    return { ...week, count: dayRefs.filter(dayRef => dayRef >= bounds.start && dayRef <= bounds.end).length }
  })
  const max = Math.max(1, ...perWeek.map(week => week.count))
  return perWeek.map(week => ({ ...week, height: Math.max(3, (week.count / max) * 36) }))
})

const summaryPriorities = computed<ReflectionPriorityLine[]>(() =>
  assessedPriorities.value.map(priority => {
    const assessment = assessmentFor(priority.id)
    return {
      title: priority.title,
      effort: assessment.effort,
      verdict: assessment.verdict,
      comment: assessment.note.trim() || undefined,
    }
  }),
)
const summaryContext = computed<ReflectionSummaryContext>(() => {
  const bundle = dataBundle.value
  return {
    kind: 'monthly',
    periodLabel: periodTitle.value,
    ratings: COMPASS.map(axis => ({ label: axis.label, value: axis.ref.value })),
    priorities: summaryPriorities.value,
    anchors: filledAnchors.value.map(anchor => ({ label: anchor.label, text: anchor.text })),
    freeform: freeformReflection.value,
    emotionLogs: bundle?.emotionLogs ?? [],
    emotions: bundle ? emotionContextFromSummary(bundle.emotionSummary) : undefined,
    weeklyExcerpts: weeklyExcerpts.value.map(excerpt => ({ weekLabel: excerpt.label, text: excerpt.text })),
    goals: (bundle?.goalSummaries ?? []).map(goal => ({
      title: goal.goal.title,
      metKRs: goal.keyResults.filter(result => result.evaluationStatus === 'met').length,
      totalKRs: goal.keyResults.length,
    })),
    habits: (bundle?.habitDetails ?? []).map(habit => ({ title: habit.title, status: habit.evaluationStatus })),
    trackers: (bundle?.trackerDetails ?? []).map(tracker => ({ title: tracker.title, latest: tracker.latestValue ?? null })),
  }
})

onMounted(async () => {
  openPriority.value = activePriorities.value[0]?.id ?? ''
  const previous = await structuredReflectionDexieRepository.getMonthly(getPreviousPeriod(props.monthRef) as MonthRef)
  if (previous) {
    previousCompass.value = {
      balance: previous.balanceRating,
      purpose: previous.purposeRating,
      growth: previous.growthRating,
      coherence: previous.coherenceRating,
      agency: previous.agencyRating,
    }
  }
  await loadPriorityLinks()
})

async function loadPriorityLinks() {
  const [goals, keyResults, habits, trackers] = await Promise.all([
    goalDexieRepository.listAll(),
    keyResultDexieRepository.listAll(),
    habitDexieRepository.listAll(),
    trackerDexieRepository.listAll(),
  ])
  const byGoal = new Map(goals.map(goal => [goal.id, goal.priorityIds ?? []]))
  priorityIdsBySubject.value = new Map([
    ...keyResults.map(result => [`keyResult:${result.id}`, byGoal.get(result.goalId) ?? []] as const),
    ...habits.map(habit => [`habit:${habit.id}`, habit.priorityIds ?? []] as const),
    ...trackers.map(tracker => [`tracker:${tracker.id}`, tracker.priorityIds ?? []] as const),
  ])
}

function go(index: number) {
  current.value = Math.max(0, Math.min(steps.length - 1, index))
  saved.value = false
  goToStep(current.value === 0 ? 'priorities-review' : current.value === 1 ? 'ratings' : current.value === 2 ? 'anchors' : 'journal')
}

function readout(actual: number | undefined, target: number | undefined): string {
  if (actual === undefined) return 'Brak zapisów'
  return target === undefined ? formatQuietNumber(actual) : `${formatQuietNumber(actual)} / ${formatQuietNumber(target)}`
}

function focusWeekCount(priorityId: string): number {
  return focusByPriority.value.get(priorityId)?.focusWeekRefs.length ?? 0
}

function evidenceFor(priorityId: string) {
  const linked = objectEvidence.value.filter(entry =>
    (priorityIdsBySubject.value.get(entry.key) ?? []).includes(priorityId),
  )
  if (linked.length) return linked
  // Fall back to the weekly focus roll-up: objects the user actually picked for
  // this direction, even when the object itself carries no priority link.
  return (focusByPriority.value.get(priorityId)?.objects ?? []).map(object => ({
    title: object.title,
    readout: `fokus w ${object.weekRefs.length} ${plural(object.weekRefs.length, 'tygodniu', 'tygodniach', 'tygodniach')}`,
  }))
}

/**
 * Chips = the priority's currently-defined signals unioned with any already
 * checked, so a chip stays visible in history after the signal is removed.
 */
function signalChips(priority: Priority, kind: 'progress' | 'risk'): Array<{ label: string; active: boolean }> {
  const defined = kind === 'progress' ? priority.progressSignals : priority.riskSignals
  const assessment = assessmentFor(priority.id)
  const observed = kind === 'progress' ? assessment.observedProgressSignals : assessment.observedRiskSignals
  return [...new Set([...(defined ?? []), ...observed])].map(label => ({ label, active: observed.includes(label) }))
}

function setEffort(priorityId: string, value: number | null) {
  updateAssessment(priorityId, { effort: value })
  saved.value = false
}
function setVerdict(priorityId: string, verdict: PriorityVerdict) {
  updateAssessment(priorityId, { verdict: assessmentFor(priorityId).verdict === verdict ? null : verdict })
  saved.value = false
}
function setNote(priorityId: string, event: Event) {
  updateAssessment(priorityId, { note: (event.target as HTMLTextAreaElement).value })
  saved.value = false
}
function setCompass(axis: CompassAxis, value: number | null) {
  axis.ref.value = value
  saved.value = false
}
function setAnchor(key: string, event: Event) {
  promptResponses.value = { ...promptResponses.value, [key]: (event.target as HTMLTextAreaElement).value }
  saved.value = false
}
function editAnchor(key: string) {
  openAnchor.value = ANCHORS.findIndex(anchor => anchor.key === key)
  go(2)
}
function insertIntoJournal(text: string) {
  freeformReflection.value = `${freeformReflection.value}${freeformReflection.value ? '\n\n' : ''}${text}\n`
}

async function finish() {
  await save()
  saved.value = true
  emit('updated')
}
async function finishAndPlanNext() {
  await save()
  saved.value = true
  emit('updated')
  emit('plan-next-month')
}
</script>
